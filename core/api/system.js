'use strict'

/*
	api для просмотра и редактирования дерева системы (в разработке)
*/

const { uuidv4 } = require('../lib')
const sockets = {}

function createNode (node) {
	return Object.keys(node).map(key => ({
		id: node._[key].id,
		name: key,
		description: node[key] && node[key].description ? node[key].description : '',
		children: ([Object, Array].includes(node[key].constructor)) ? createNode(node[key]) : undefined
	}))
}

module.exports = function (system) {
	//
	this.ws('/', (ws, req) => {
		// todo: сделать аутентификацию. например. первое сообщение должно содержать некий токен, иначе немедленное закрытие соединения
		let id = uuidv4()
		sockets[id] = ws
		ws.onerror = system.log
		// ws.onmessage = (m) => traverseIncomingActions(m.data, id)
		ws.onclose = (m) => {
			delete sockets[id]
		}
		try {
			let tree = createNode(system.config)
			ws.send(JSON.stringify(tree))
		} catch (e) {
			console.log(e)
		}
	})
}
