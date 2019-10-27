'use strict'

/*
	api для просмотра и редактирования дерева системы

	/system - выводит все системное дерево
	/system/config  - выводит конфигуру
	/system/objects/newNode={} - создает новую ветку
	/system/counter=100 - создает простое значение
	/system/objects! - удаляет ветку или значение
*/

function safeParse(str) {
	try {
		return JSON.parse(str)
	} catch (err) {
		return str
	}
}

module.exports = function (system) {
	//
	this.get('*', function (req, res) {
		// console.log(req.query)
		let rg = /^([\w|\/|\:\-\!]+)\=*\"?([\w\:\/\.\?\-\{\}]*)\"?/
		rg.test(decodeURIComponent(req.url).substring(1))

		let url = RegExp.$1
		let value = RegExp.$2
		let path = url.split('/')
		let last = path.slice(-1).pop()
		let node = null

		if (value) { // есть выражение за знаком '='
			path.pop()
			node = system.tree._path(path)
			node[last] = safeParse(value)
		} else if (last.charAt(last.length - 1) === '!') {
			path.pop()
			let [key, _value] = last.split('!')
			node = system.tree._path(path)
			delete node[key]
		} else {
			node = system.tree._path(url.split('/'))
		}
		res.json(node)
	})
}
