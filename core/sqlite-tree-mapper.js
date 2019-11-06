'use strict'

/*
	RDM
*/

module.exports = function (db, commonName) {
	// -
	let _ensureStruct = (function () {
		let exists = (name, type) => `SELECT name FROM sqlite_master WHERE type='${type}' AND name='${name}'`

		let statements = [
			{
				exists: exists(commonName + '_nodes', 'table'),
				ddl: [
					`CREATE TABLE ${commonName}_nodes (id INTEGER PRIMARY KEY ASC AUTOINCREMENT, idp INTEGER REFERENCES ${commonName}_nodes (id) ON DELETE CASCADE, name STRING NOT NULL)`,
					`CREATE UNIQUE INDEX ${commonName}_nodes_unique ON ${commonName}_nodes (idp, name)`,
					`INSERT INTO ${commonName}_nodes (id, idp, name) values (0, 0, 'root')`
				]
			},
			{
				exists: exists(commonName + '_values', 'table'),
				ddl: [`CREATE TABLE ${commonName}_values (id INTEGER REFERENCES ${commonName}_nodes (id) ON DELETE CASCADE, value STRING)`,
					`CREATE INDEX ${commonName}_values_id ON ${commonName}_values (id ASC)`
				]
			},
			{
				exists: exists('vw_' + commonName + '_recursive', 'view'),
				ddl: [`SELECT name FROM sqlite_master WHERE type='view' AND name='vw_${commonName}_recursive'`,
					`CREATE VIEW vw_${commonName}_recursive AS\n` +
					`WITH RECURSIVE nested (id, level, path)\n` +
					`AS (\n` +
					`    SELECT \n` +
					`        id,\n` +
					`        0,\n` +
					`        name\n` +
					`    FROM \n` +
					`        ${commonName}_nodes\n` +
					`    WHERE \n` +
					`        idp = 0 and id != idp\n` +
					`    UNION\n` +
					`    SELECT \n` +
					`        n.id,\n` +
					`        nested.level + 1,\n` +
					`        nested.path || '/' || name\n` +
					`    FROM\n` +
					`        ${commonName}_nodes n,\n` +
					`        nested\n` +
					`    WHERE\n` +
					`        n.idp = nested.id\n` +
					`)\n` +
					`SELECT \n` +
					`    nested.path,\n` +
					`    n.id,\n` +
					`    replace(hex(zeroblob(level * 6)), '00', ' ') || n.name AS name,\n` +
					`    v.value\n` +
					`FROM \n` +
					`    nested,\n` +
					`    ${commonName}_nodes n left join ${commonName}_values v on n.id = v.id\n` +
					`WHERE\n` +
					`    n.id = nested.id\n` +
					`ORDER BY \n` +
					`    nested.path`]
			}
		]

		return statements.reduce((chain, statement) =>
			chain.then(() =>
				db(statement.exists)
					.then(([exists]) =>
						!exists
							? statement.ddl.reduce((chain, ddl) => chain.then(() => db.run(ddl)), Promise.resolve())
							: null
					)
			)
		, Promise.resolve()
		)
	})()

	function createProxy (id) {
		// -
		const meta = {}
		const node = {}

		const addChild = function (id, key, value) {
			node[key] = value
			meta[key] = {}
			meta[key].id = id
		}

		const proxy = new Proxy(node, {
			set (target, key, value, receiver) {
				if (Reflect.has(target, key)) {
					if (!(value instanceof Object)) {
						if (value !== target[key]) {
							db.run(`update ${commonName}_values set value = $value where id = $id`, { $id: meta[key].id, $value: value })
								.catch(err => console.log(err.message + '\nupdating ' + key))
						}
					} else {
						for (let subKey in value) {
							receiver[key][subKey] = value[subKey]
						}
					}
				} else {
					meta[key] = {}
					meta[key].pending = db.run(`insert into ${commonName}_nodes (idp, name) values ($idp, $name)`, { $idp: id, $name: key })
						.then(id => {
							if (!(value instanceof Object)) {
								return db.run(`insert into ${commonName}_values (id, [value]) values ($id, $value)`, { $id: id, $value: value })
							} else {
								let node = createProxy(id).node
								for (let subKey in value) {
									node[subKey] = value[subKey] // assign proxified 'node' causes recursive call of 'addNode'
								}
								target[key] = node // replace already assigned by just created
							}
							return id
						})
						.catch(err => console.log(err.message + '\ninserting ' + key))
				}
				return Reflect.set(target, key, value)
			},

			get (target, key, receiver) {
				if (Reflect.has(target, key)) {
					let value = target[key]
					if (value === null) return createProxy(meta[key].id).node
					return value
				}
				switch (key) {
				case '_': return target
				case '$': return (key) => ({ ...target[key], ...meta[key] })
				}
				return undefined
			},

			deleteProperty (target, key) {
				if (Reflect.has(target, key)) {
					db.run(`delete from ${commonName}_nodes where id = $id`, { $id: meta[key].id })
						.catch(err => console.log(err.message + ' while deleting ' + key))
					delete meta[key]
					return Reflect.deleteProperty(target, key)
				}
				return false
			}
		})
		return { node: proxy, addChild: addChild }
	}

	function build (id = 0, depth) {
	/*
		recursive build from database. returns Promise.then => Proxy(Object)
		builds from given node <id>, to given <depth> level
		if (<id> == 0) - builds from root
		if (<depth> is not defined or 0) - builds whole tree deep
	*/
		function _build (id, level) {
			const { node, addChild } = createProxy(id)

			return _ensureStruct.then(() => db(`select * from ${commonName}_nodes where idp = ? and id != idp`, [id])
				.then(children => {
					if (id && children.length === 0) { // no children means we're at the 'leaf' or single value
						return db(`select value from ${commonName}_values where id = ?`, [id])
							.then(result => {
								if (result.length === 0) return null
								else if (result.length === 1) return result[0].value
								return result.map(el => el.value) // fallback to Array
							})
					}
					if (depth && level >= depth) return

					return children.reduce((p, child) =>
						p.then(() => _build(child.id, level + 1)
							.then(childNode => addChild(child.id, child.name, childNode))
						)
					, Promise.resolve(null)
					).then(() => node)
				})
			)
		}
		return _build(id, 0)
	}

	return build
}
