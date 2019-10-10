'use strict'

/*
	отображение древовидных структур в таблицу базы данных
	 - поддерживается автоматический CRUD через операции с объектом
*/
const ROOT_ID = -1

function path (path, sep = '.') {
	let node = this
	let _path = path.split(sep)
	if (_path.length === 1 && _path[0] === '') return node
	for (let key of _path) {
		if ((typeof node === 'object') && (key in node)) {
			node = node[key]
		} else {
			return undefined
		}
	}
	return node
}

function bool (_path) {
	let value = path.call(this, _path, '.')
	if (typeof value === 'undefined' || value === null) return false
	switch (value.toString().toLowerCase().trim()) {
	case 'true': case 'yes': case '1': return true
	case 'false': case 'no': case '0': case null: return false
	default: return Boolean(value)
	}
}

function _recurse (node) {
	// return interface (deep: [zero based], callback: [function(node, key, level)])
	return function (deep, callback) {
		function recurse (node, level, deep) {
			if (node instanceof Object && level <= deep) {
				for (let key in node) {
					// callback first (parent first), then recurse children
					let result = callback(node, key, level) || recurse(node[key], level + 1, deep)
					if (result) return result // result break execution and pop through call stack
				}
			}
		}
		return recurse(node, 0, deep)
	}
}
function _reserve (idp, target) {
	return db(`insert into ${table} (idp, name) values ($idp, $name)`, { $idp: idp, $name: 'dummykey' })
		//.then(id => {})

}

module.exports = function (db, table) {
	// -
	function addNode (idp, target, key, value) {
		return db(`replace into ${table} (idp, name, value) values ($idp, $name, $value)`, { $idp: idp, $name: key, $value: value })
			.then(_id => {
				if (value instanceof Object) {
					let node = proxify({}, _id, new Map()) // empty node & empty map
					for (let subKey in value) {
						node[subKey] = value[subKey] // assigns to proxified 'node' causes recursive call of 'addNode'
					}
					target[key] = node // replace already assigned by just created
				}
				// console.log('done', idp, key, value, _id)
				return _id
			})
	}

	function deleteNode (idp, target, key) {
		if (Reflect.has(target, key) && Reflect.deleteProperty(target, key)) {
			return db(`delete from ${table} where idp = $idp and name = $name`, { $idp: idp, $name: key })
		}
		return Promise.resolve(true)
	}

	function proxify (node, id, keystore) {
		// -
		return new Proxy(node, {
			set (target, key, value, receiver) { // about to set target[key] = value
				addNode(id, target, key, value)
					.then(_id => keystore.set(key, _id))
					.catch(err => console.log(err.message + ' when create', key, '=', value))
				return Reflect.set(target, key, value)
			},

			get (target, key, receiver) {
				if (Reflect.has(target, key)) return target[key]

				switch (key) {
				case '_id': return (key) => keystore.get(key)
				case '_path': return path.bind(target)
				case '_bool' : return bool.bind(receiver)
				case '_recurse' : return _recurse(receiver)
				case '_reserve' : return addNode(id, target, '_dummy_', null)
				}
				return undefined
			},

			deleteProperty (target, key) {
				return deleteNode(id, target, key).then(_id => keystore.delete(key))
			}
		})
	}

	function buildNode (id = ROOT_ID, options = {}) { // well... brainf..ng, but works :)
		let node = {}
		let keystore = new Map() // node && keystore works parallel

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
