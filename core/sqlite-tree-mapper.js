'use strict'

/*
	отображение древовидных структур в таблицу базы данных
	 - поддерживается автоматический CRUD через операции с объектом
*/

module.exports = function (db, commonName) {
	// -
	function _add (id, target, keystore) {
		return function (node, nameMaker) {
			let tempKey = String(Date.now()) + String(Math.random())
			return addNode(id, target, tempKey, node)
				.then(_id => {
					let name = nameMaker ? nameMaker(id) : _id
					target[name] = target[tempKey]
					delete target[tempKey]
					keystore.set(name, _id)
					return db.run(`update ${commonName}_nodes set name = $name where id = $id`, { $id: _id, $name: _id }).then(() => _id)
				})
		}
	}

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
					let node = proxify({}, id, new Map()) // empty node & empty map
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

	function deleteNode (idp, target, key) {
		if (Reflect.has(target, key) && Reflect.deleteProperty(target, key)) {
			return (idp
				? db.run(`delete from ${commonName}_nodes where idp = $idp and name = $name`, { $idp: idp, $name: key })
				: db.run(`delete from ${commonName}_nodes where idp is null and name = $name`, { $name: key })
			).catch(err => {
				console.log(err)
			})
		}
		return Promise.resolve(true)
	}

	function proxify (node, id, keystore) {
		// -
		return new Proxy(node, {
			set (target, key, value, receiver) { // about to set target[key] = value
				addNode(id, target, key, value)
					.then(_id => keystore.set(key, _id))
					.catch(err => console.log(err.message + ' while setting ' + key))

				return Reflect.set(target, key, value)
			},

			get (target, key, receiver) {
				if (Reflect.has(target, key)) {
					let value = target[key]
					// experimental: proxify null values
					if (value === null) return proxify({}, keystore.get(key), keystore)
					return value
				}

				switch (key) {
				case '_': return target
				case '_id': return (key) => keystore.get(key)
				case '_add': return _add(id, target, keystore)
				}
				return undefined
			},

			deleteProperty (target, key) {
				return deleteNode(id, target, key).then(_id => keystore.delete(key))
			}
		})
	}

	function buildNode (id = null) { // well... brainf..ng, but works :)
		let node = {}
		let keystore = new Map() // node && keystore works parallel

		return (id
			? db(`select * from ${commonName}_nodes where idp = ?`, [id])
			: db(`select * from ${commonName}_nodes where idp is null`)
		)
			.then(children => {
				if (id && children.length === 0) { // no children means we're at the 'leaf' or single value
					return db(`select value from ${commonName}_values where id = ?`, [id])
						.then(result => {
							if (result.length === 0) return 0
							else if (result.length === 1) return result[0].value
							return result.map(el => el.value)
						})
				}
				return children.reduce((p, child) =>
					p.then(() =>
						buildNode(child.id)
							.then(childNode => {
								keystore.set(child.name, child.id)
								node[child.name] = childNode
							})
					)
				, Promise.resolve(null)
				).then(() => proxify(node, id, keystore))
			})
	}

	return (id) => buildNode(id)
}
