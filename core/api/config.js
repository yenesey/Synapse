'use strict'
/*
    	
/config

*/

const deepProxy = require('../deep-proxy')

module.exports = function (system) {
	//
	function buildNode (_id = null) { // well... brainfu..ng, but works :)
		let node = {}
		return system.db('select * from config where id_p ' + (_id == null ? 'is null' : '=' + String(_id)))
			.then(children => {
				if (children.length > 0) {
					return children.reduce((p, child) =>
						p.then(() => buildNode(child.id).then(childNode => { // childNode may be a single value or other node just built
							node[child.key] = childNode
							return node
						}))
					, Promise.resolve(null)
					)
				} else { // no children means we're at the 'leaf'
					return system.db('select * from config where id = ?', [_id]).then(select => select[0].value)
				}
			})
	}

	function pathToId (node, path) {
		return path.reduce((p, key) =>
			p.then((_id) => {
				return system.db('select * from config where id_p ' + (_id == null ? 'is null' : '=' + String(_id)) + ' and key = "' + key + '"')
					.then(select => {
						if (select.length) return select[0].id
						return null
					})
			})
		, Promise.resolve(null)
		)
	}

	function saveValue (node, path, value) {
		return pathToId(node, path)
			.then(_id => {
				if (_id) {
					system.db('update config set value = $value where id = $id', { $id: _id, $value: value })
				} else {
					let key = path.pop()
					pathToId(node, path).then(_id => {
						if (_id) {
							system.db('insert into config (id_p, [key], value) values ($id_p, $key, $value)', { $id_p: _id, $key: key, $value: value })
						}
					})
				}
			})
	}

	function deleteValue (node, path) {
		return pathToId(node, path)
			.then(_id => system.db('delete from config where id = $id', { $id: _id }))
	}

	var config = null
	buildNode().then(node => {
		config = deepProxy(node, {
			set (target, path, value, receiver) {
				saveValue(config, path, value)
			},
			deleteProperty (target, path) {
				deleteValue(config, path)
			}
		})
	})

	function getNode (path) {
		let node = config
		let level = 0
		while (level < path.length) {
			if (path[level] in node) node = node[path[level]]; else return node
			level++
		}
		return node
	}

	this.get('*', function (req, res) {
		let path = req.url.substring(1).split('/')
		let last = path.slice(-1).pop()
		let node = null
		if (last.indexOf('=') !== -1) {
			path.pop()
			let [key, value] = last.split('=')
			node = getNode(path)
			// todo: разобраться с созданием нод!
			// нода с пустым value должна иметь возможность стать контейнером без ругательств!!!
			if (value === '..' && (key in node) && typeof node[key] !== 'object') {
				node[key] = {}
			} else {
				node[key] = value
			}
		} else if (last.charAt(last.length - 1) === '!') {
			path.pop()
			let [key, value] = last.split('!')
			node = getNode(path)
			delete node[key]
		}
		node = getNode(path)
		res.json(node)
	})
}
