'use strict'

/*
	отображение древовидных структур в таблицу базы данных
	 - поддерживается автоматический CRUD через операции с объектом
*/
const ROOT_ID = -1

module.exports = function (db, table) {
	//
	let insertPendings = []

	function addNode (idp, target, key, value) {
		if (Reflect.set(target, key, value)) {
			insertPendings.push(
				db(`replace into ${table} (idp, name, value) values ($idp, $name, $value)`, { $idp: idp, $name: key, $value: value })
					.then(_id => {
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

	function deleteNode (idp, target, key) {
		if (Reflect.has(target, key) && Reflect.deleteProperty(target, key)) {
			Promise.all(insertPendings).then(() => {
				insertPendings = []
				db(`delete from ${table} where idp = $idp and name = $name`, { $idp: idp, $name: key })
			})
			return true
		}
		return false
	}

	function proxify (node, id, keystore) {
		// -
		return new Proxy(node, {
			set (target, key, value, receiver) { // about to set target[key] = value
				return addNode(id, target, key, value)
			},

			get (target, property, receiver) {
				if (property === '_id') {
					return function (key) {
						return keystore.get(key)
					}
				}
				return target[property]
			},

			deleteProperty (target, key) {
				return deleteNode(id, target, key)
			}
		})
	}

	function buildNode (id = ROOT_ID, options = {}) {
		// well... brainf..ng, but works :)
		let node = {}
		let keystore = new Map() // node && keystore works in parallel

		return db(`select * from ${table} where idp = ? and id != idp`, [id])
			.then(children => {
				if (children.length === 0 && id !== ROOT_ID) { // no children means we're at the 'leaf' or single value
					return db(`select value from ${table} where id = ?`, [id]).then(([ { value } ]) => value)
				}

				return children.reduce((p, child) =>
					p.then(() =>
						buildNode(child.id, { unproxify: (typeof child.value === 'string' && child.value === '{-}') })
							.then(childNode => {
								keystore.set(child.name, child.id)
								node[child.name] = childNode
							})
					)
				, Promise.resolve(null)
				).then(() => options.unproxify ? node : proxify(node, id, keystore))
			})
	}

	return (id) => buildNode(id)
}
