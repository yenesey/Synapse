'use strict'
/*
    	
/config

*/

module.exports = function (system) {
	//

	function addNode (target, key, value, _id) {
		if (Reflect.set(target, key, value)) {
			save(_id, key, value).then(newId => {
				if (typeof value === 'object') {
					value = proxify(value, newId)
				}
				for (let k in value) {
					addNode(target[key], k, value[k], newId)	
				}
			}).catch(console.log)
			return true
		}
		return false
	}

	function proxify (node, _id) { 
		// console.log('proxify ', node, ' ', _id)
		return new Proxy(node, {
			set (target, key, value, receiver) { // about target[key] := value
				return addNode(target, key, value, _id)
			},

			deleteProperty (target, key) {
				// console.log('del id_p=', _id, '    ', key)
				if (Reflect.has(target, key)) {
					Reflect.deleteProperty(target, key)
					del(_id, key)
					return true
				}
				return false
			}
		})
	}

	function buildNode (_id = -1) { // well... brainfu..ng, but works :)
		let node = {} // Object.create(null)
		return system.db('select * from config where id_p = ? and id != id_p', [_id])
			.then(children => {
				if (children.length > 0) {
					return children.reduce((p, child) =>
						p.then(() => 
							buildNode(child.id)
								.then(childNode => {
									node[child.key] = childNode
								})
						)
					, Promise.resolve(null)
					).then(() => proxify(node, _id))
				} else { // no children means we're at the 'leaf'
					return system.db('select * from config where id = ?', [_id])
						.then(select => select[0].value)
				}
			})
	}

	function save (id_p, key, value = null) {
		return system.db('replace into config (id_p, [key], value) values ($id_p, $key, $value)', { $id_p: id_p, $key: key, $value: value })
	}

	function del (id_p, key) {
		return system.db('delete from config where id_p = $id_p and key = $key', { $id_p: id_p, $key: key })
	}

	var config = null
	buildNode().then(node => { 
		config = node

		//node.admin = {}
		//config.admin.panel = true
		console.log(node)
	})

	// -------------------------------------------------------------------------------------------
	function getNode (path) {
		let node = config
		let level = 0
		if (config == null) return null
		while (level < path.length) {
			if (path[level] !== '') node = node[path[level]]
			level++
		}
		return node
	}

	this.get('*', function (req, res) {
		let path = req.url.substring(1).split('/')
	
		/*
		let last = path.slice(-1).pop()
		let node = null
		if (last.indexOf('=') !== -1) {
			path.pop()
			let [key, value] = last.split('=')
			node = getNode(path)
			// todo: разобраться с созданием нод!
			// нода с пустым value должна иметь возможность стать контейнером без ругательств!!!
			node[key] = value
		} else if (last.charAt(last.length - 1) === '!') {
			path.pop()
			let [key, value] = last.split('!')
			node = getNode(path)
			delete node[key]
		}
		*/
		let node = getNode(path)
		res.json(node)
	})
}
