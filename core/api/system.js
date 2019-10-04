'use strict'

/*
	api для просмотра и редактирования дерева системы

	/system - выводит все системное дерево
	/system/config  - выводит конфигуру
	/system/objects/newNode={} - создает новую ветку
	/system/counter=100 - создает простое значение
	/system/objects! - удаляет ветку или значение
*/

module.exports = function (system) {
	//
	this.get('*', function (req, res) {
		let url = decodeURIComponent(req.url).substring(1)
		let path = url.split('/')
		let last = path.slice(-1).pop()
		let node = null

		if (last.indexOf('=') !== -1) {
			path.pop()
			let [key, value] = last.split('=')
			node = system.tree._path(path.join('/'), '/')
			value = JSON.parse(value)
			node[key] = value
		} else if (last.charAt(last.length - 1) === '!') {
			path.pop()
			let [key, _value] = last.split('!')
			node = system.tree._path(url, '/')
			delete node[key]
		} else {
			node = system.tree._path(url, '/')
		}
		res.json(node)
	})
}
