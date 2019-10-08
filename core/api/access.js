'use strict'

/*
	Работа с пользователями, контроль доступа (требуется NTLM-middleware см. ./api.js)
	- идентификация / авторизация
	- добавление / удаление пользователя
*/

const bodyParser = require('body-parser')
const ActiveDirectory = require('activedirectory')
const promisify = require('util').promisify
const assert = require('assert')

function createNode (node, level = 0) {
	return Object.keys(node).map(key => ({
		id: node._id(key),
		name: key,
		children: (node[key] instanceof Object && level < 1) ? createNode(node[key], level + 1) : undefined
	}))
}

module.exports = function (system) {
	// -
	const ADMIN_USERS = system.tree.objects.admin._id('Пользователи')

	function searchActiveDirectory (search) {
		const config = system.config.ntlm
		const fields = ['sAMAccountName', 'mail', 'displayName']
		const ad = new ActiveDirectory({
			url: config.dc,
			baseDN: config.dn,
			username: config.user + '@' + config.domain,
			password: config.password,
			attributes: { user: fields }
		})
		const find = promisify(ad.findUsers).bind(ad)
		let query = fields.reduce((result, el) => result + '(' + el + '=*' + search + '*)', '|') // query = '|(field1=*search*)(field2=*search*)...
		// console.log(query)
		return find(query).then(result =>
			(typeof result === 'undefined')
				? []
				: result
		)
	} // query

	this.get('/ldap-users', function (req, res) {
		system.checkAccess(req.user, ADMIN_USERS)
		searchActiveDirectory(req.query.filter).then(result => res.json(result))
	})

	this.get('/users', function (req, res) {
		system.checkAccess(req.user, ADMIN_USERS)
		let users = system.tree.users
		let map = Object.keys(users).map(user => ({ id: users._id(user), login: user, ...users[user] }))
			.filter(el => (req.query['show-disabled'] === 'true' || !(el['disabled'])))
		res.json(map)
	})

	this.get('/object-map', function (req, res) {
		system.checkAccess(req.user, ADMIN_USERS)
		res.json(createNode(system.tree.objects))
	})

	this.get('/map', function (req, res) {
		// выдача полной карты доступа заданного пользователя (req.query.user)
		// если пользователь не задан - выдается собственная карта доступа
		assert(req.ntlm, 'Не удалось определить пользователя. NTLM?')

		var options = { /* granted: true */ }
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
		res.json({ ...user, access: access })
	})

	this.get('/user', function (req, res) {
		assert(req.ntlm, 'Не удалось определить пользователя. NTLM?')
		system.checkAccess(req.user, ADMIN_USERS)
		let login = req.query.login
		assert(login, 'В запросе отсутствует ключевой реквизит - login')
		let users = system.tree.users
		res.json({ id: users._id(login), ...users[login] })
	})

	this.put('/user', bodyParser.json(), function (req, res) {
		// операция добавления/редактирования пользователя
		assert(req.ntlm, 'Не удалось определить пользователя. NTLM?')
		system.checkAccess(req.user, ADMIN_USERS)

		let user = req.body
		assert(user.login, 'В запросе отсутствует ключевой реквизит - login')
		if (user.login in system.tree.users) {
			// обновляем реквизиты
			for (let key in user) {
				system.tree.users[user.login][key] = user[key]
			}
		} else {
			// создаем новую ветку в пользователях
			system.tree.users[user.login] = user
		}
		res.json({ id: system.tree.users._id(user.login), ...user })
	})

	/*
	this.put('/map', bodyParser.json(), function (req, res) {
		// операция выдачи/прекращения доступа к заданному объекту
		assert(req.ntlm, 'Не удалось определить пользователя. NTLM?')
		system.checkAccess(req.user, ADMIN_USERS)
		let user = system.getUser(req.body.user)
		if (user._acl_ === null) user._acl_ = {}
		if (req.body.granted) {
			user._acl_[req.body.objectId] = null
		} else {
			delete user._acl_[req.body.objectId]
		}
		res.json({ id: req.body.objectId })
	})
	*/

	/*
	this.get('/members', function (req, res) {
		system.users(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
	})

	this.get('/tasks', function (req, res) {
		system.tasks(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
	})
	*/
}
