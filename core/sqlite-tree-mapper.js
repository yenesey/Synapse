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
					`CREATE UNIQUE INDEX ${commonName}_nodes_unique ON ${commonName}_nodes (idp, name)`
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
					`        idp is null\n` +
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

	function addNode (idp, target, key, value) {
		return db.run(`replace into ${commonName}_nodes (idp, name) values ($idp, $name)`, { $idp: idp, $name: key })
			.then(id => {
				if (!(value instanceof Object)) {
					return db.run(`replace into ${commonName}_values (id, [value]) values ($id, $value)`, { $id: id, $value: value })
				}
				return id
			})
			.then(id => {
				if (value instanceof Object) {
					let node = createProxy({}, id, new Map()) // empty node & empty map
					// todo: ??? проксировать уже после присвоения. в базу писать по рекурсивному обходу как в _.recurse
					for (let subKey in value) {
						node[subKey] = value[subKey] // assign proxified 'node' causes recursive call of 'addNode'
					}
					target[key] = node // replace already assigned by just created
				}
				return id
			})
			.catch(err => {
				console.log(err) // db.run(`rollback`)
			})
	}

	function createProxy (node, id, keystore) {
		// -
		return new Proxy(node, {
			set (target, key, value, receiver) {
				addNode(id, target, key, value)
					.then(_id => keystore.set(key, _id))
					.catch(err => console.log(err.message + ' while setting ' + key))

				return Reflect.set(target, key, value)
			},

			get (target, key, receiver) {
				if (Reflect.has(target, key)) {
					let value = target[key]
					// experimental: createProxy for null values
					if (value === null) return createProxy({}, keystore.get(key), keystore)
					return value
				}

				switch (key) {
				case '_': return target // access not proxified object
				case '_id': return (key) => keystore.get(key)
				case '_add': return (key, value) => addNode(id, target, key, value)
					.then((id) => {
						keystore.set(String(key), id)
						return id
					})
				case '_rename': return (oldName, newName) => {
					let id = keystore.get(oldName)
					if (!id) throw new Error('Key not defined')
					target[newName] = target[oldName]
					keystore.set(newName, id)
					delete target[oldName]
					keystore.delete(oldName)
					return db.run(`update ${commonName}_nodes set name = $name where id = $id`, { $id: id, $name: newName }).then(() => newName)
				}
				}
				return undefined
			},

			deleteProperty (target, key) {
				if (Reflect.has(target, key)) {
					let id = keystore.get(key)
					keystore.delete(String(key))
					db.run(`delete from ${commonName}_nodes where id = $id`, { $id: id })
					return Reflect.deleteProperty(target, key)
				}
				return false
			}
		})
	}

	function build (id = null, depth) {
	/*
		recursive build from database. returns Promise.then => Proxy(Object)
		builds from given node <id>, to given <depth> level
		if (<id> == null) - builds from root
		if (<depth> is not defined or 0) - builds whole tree deep
	*/
		function _build (id, level) {
			let node = {}
			let keystore = new Map() // node && keystore works parallel

			return _ensureStruct.then(() => (id
				? db(`select * from ${commonName}_nodes where idp = ?`, [id])
				: db(`select * from ${commonName}_nodes where idp is null`)
			)
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
					level = level + 1
					return children.reduce((p, child) =>
						p.then(() =>
							_build(child.id, level)
								.then(childNode => {
									keystore.set(String(child.name), child.id) // ensure String because of SQLite type affinity
									node[child.name] = childNode
								})
						)
					, Promise.resolve(null)
					).then(() => createProxy(node, id, keystore))
				})
			)
		}
		return _build(id, 0)
	}

	return build
}
