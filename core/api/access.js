'use strict'

/*
	Работа с пользователями, контроль доступа,
	- требуется NTLM-middleware, иначе ошибка гарантирована
	- идентификация / авторизация
	- добавление / удаление пользователя
*/

const bodyParser = require('body-parser')
const assert = require('assert')

function createNode(node, level = 0) {
	return Object.keys(node).map(key => ({
		id: node._id(key),
		name: key,
		children: (node[key] instanceof Object && level < 1) ? createNode(node[key], level + 1) : undefined
	}))
}


module.exports = function (system) {
	// -
	const ADMIN_USERS = system.tree.objects.admin._id('Пользователи')

	this.get('/acl', function (req, res) {
		system.checkAccess(req.user, ADMIN_USERS)
		let acl = system.tree.users[req.query.user]._acl
		assert(acl, 'Отсутствуют реквизиты доступа')
		res.json(acl.split(',').map(Number))
	})

	this.put('/acl', bodyParser.json(), function (req, res) {
		system.checkAccess(req.user, ADMIN_USERS)
		system.tree.users[req.body.user]._acl = req.body.acl.join(',')
		res.json({success: true})
	})

	this.get('/object-map', function (req, res) {
		system.checkAccess(req.user, ADMIN_USERS)
		res.json(createNode(system.tree.objects))
	})

	this.get('/map', function (req, res) {
		// выдача полной карты доступа заданного пользователя (req.query.user)
		// если пользователь не задан - выдается собственная карта доступа
		assert(req.ntlm, 'Не удалось определить пользователя. NTLM?')

		var options = { 
			// granted: true 
		}
		let user = null
		if ('user' in req.query) { // запрос по другому пользователю? тогда нужны привилегии!
			system.checkAccess(req.user, ADMIN_USERS)
			user = system.getUser(req.query.user)
		} else {
			user = req.user
		}

		if ('class' in req.query) options.class = req.query.class
	
		let access = system.access(user, options)
		delete user.id
		delete user._acl
		res.json({ login: user.login, ...user, access: access })
	})

	this.put('/map', bodyParser.json(), function (req, res) {
		// операция выдачи/прекращения доступа к заданному объекту
		// req.body = {userId:Number, objectId: Number, granted: Number(1|0)}
		assert(req.ntlm, 'Не удалось определить пользователя. NTLM?')
		system.checkAccess(req.user, ADMIN_USERS)
		let user = system.getUser(req.body.user)
		if (user._acl_ === null) user._acl_ = {}
		if (req.body.granted) {
			user._acl_[req.body.objectId] = null
		} else {
			delete user._acl_[req.body.objectId]
		}
		res.json({ id : req.body.objectId })

	})

	this.put('/user', bodyParser.json(), function (req, res) {
		// операция добавления(создания) пользователя
		assert(req.ntlm, 'Не удалось определить пользователя. NTLM?')
		return system.checkAccess(req.user, ADMIN_USERS)
			.then(() => {
				if ('id' in req.body) {
					return system.db('UPDATE users SET disabled = :1, name = :2, login = :3, email = :4 WHERE id = :5',
						[Number(req.body.disabled), req.body.name, req.body.login, req.body.email, req.body.id]
					)
				}
				if ('login' in req.body) {
					return system.db(`INSERT INTO users VALUES (null, '${req.body.login.toLowerCase()}', null, '${req.body.name}', '${req.body.email}')`)
				}
			})
			.then(result => res.json({ result }))
			.catch(err => system.errorHandler(err, req, res))
	})

	this.get('/users', function (req, res) {
		system.checkAccess(req.user, ADMIN_USERS)
		let users = system.tree.users
		let map = Object.keys(users).map(user => ({id: users._id(user), login: user, ...users[user] }))
		res.json(map)
	})

	this.get('/members', function (req, res) {
		system.users(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
	})

	this.get('/tasks', function (req, res) {
		system.tasks(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
	})
}
