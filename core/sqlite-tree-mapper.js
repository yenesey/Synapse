'use strict'

/*
	отображение древовидных структур в таблицу базы данных
	 - поддерживается автоматический CRUD через операции с объектом
*/

module.exports = function (db, table) {
	//
	let insertPendings = []

	function addNode (id, target, key, value) {
		if (Reflect.set(target, key, value)) {
			insertPendings.push(
				saveKey(id, key, value).then(_id => {
					if (value instanceof Object) { // typeof unusable due to null values
						for (let k in value) {
							addNode(_id, value, k, value[k])
						}
						Reflect.set(target, key, proxify(value, _id))
					}
				}).catch(console.log)
			)
			return true
		}
		return false
	}

	function deleteNode (id, target, key) {
		if (Reflect.has(target, key) && Reflect.deleteProperty(target, key)) {
			Promise.all(insertPendings).then(() => {
				insertPendings = []
				deleteKey(id, key)
			})
			return true
		}
		return false
	}

	function proxify (node, idp) {
		return new Proxy(node, {
			set (target, key, value, receiver) { // about to set target[key] = value
				return addNode(idp, target, key, value)
			},

			get (target, property, receiver) {
				if (property === '_id') {
					return idp
				}
				return target[property]
			},

			deleteProperty (target, key) {
				return deleteNode(idp, target, key)
			}
		})
	}

	function buildNode (_id = -1, flags = null) { // well... brainfu..ng, but works :)
		let node = {}
		return db(`select * from ${table} where idp = ? and id != idp`, [_id])
			.then(children => {
				if (children.length > 0 || _id === -1) {
					return children.reduce((p, child) =>
						p.then(() =>
							buildNode(child.id, child.value)
								.then(childNode => {
									node[child.key] = childNode
								})
						)
					, Promise.resolve(null)
					).then(() => flags && flags.indexOf('+u') !== -1
						? node // (+u) - flag means (u)nproxified node
						: proxify(node, _id)
					)
				} else { // no children means we're at the 'leaf'
					return db(`select value from ${table} where id = ?`, [_id])
						.then(([ { value } ]) => {
							if (typeof value === 'string' && value === '{}') {
								return proxify(node, _id)
							}
							return value
						})
				}
			})
	}

	// common rule for select thisNode - [idp] & [key]
	// db(`select * from ${table} where idp = $idp and key = $key`, { $idp: idp, $key: key })

	function saveKey (idp, key, value = null) {
		return db(`replace into ${table} (idp, [key], value) values ($idp, $key, $value)`, { $idp: idp, $key: key, $value: value })
	}

	function deleteKey (idp, key) {
		return db(`delete from ${table} where idp = $idp and key = $key`, { $idp: idp, $key: key })
	}

	return (_id) => buildNode(_id)
}
