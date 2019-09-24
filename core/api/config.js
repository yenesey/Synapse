'use strict'

/*
	простой api для просмотра/редактирования config

	/config - выводит всю конфигурацию
	/config/system  - выводит системную
	/config/objects={} - создает ветку
	/config/counter=100 - создает простое значение
	/config/objects! - удаляет ветку или значение
*/

module.exports = function (system) {
	//
	const getNode = system.configGetNode.bind(system)

	this.get('*', function (req, res) {
		let url = decodeURIComponent(req.url).substring(1)
		let path = url.split('/')
		let last = path.slice(-1).pop()
		let node = null

		if (last.indexOf('=') !== -1) {
			path.pop()
			let [key, value] = last.split('=')
			node = getNode(path.join('/'), '/')
			value = JSON.parse(value)
			node[key] = value
		} else if (last.charAt(last.length - 1) === '!') {
			path.pop()
			let [key, _value] = last.split('!')
			node = getNode(url, '/')
			delete node[key]
		} else {
			node = getNode(url, '/')
		}
		res.json(node)
	})
}
