'use strict'

/*
	Работа с пользователями, контроль доступа (требуется NTLM-middleware см. ./api.js)
	- идентификация / авторизация
	- добавление / удаление пользователя
*/

const bodyParser = require('body-parser')
const ActiveDirectory = require('activedirectory')
const promisify = require('util').promisify

const assert = require('assert') // todo: !!! пересмотреть возможность убрать утверждения и заменить обычной логикой

function createNode (node, level = 0) {
	return Object.keys(node).map(key => ({
		id: node._[key].id,
		name: key,
		description: node[key] && node[key].description ? node[key].description : '',
		children: (node[key] instanceof Object && level < 1) ? createNode(node[key], level + 1) : undefined
	}))
}

module.exports = function (system) {
	// -
	function requireAdmin (req, res, next) {
		system.checkAccess(req.user, system.db.objects.admin._.users.id)
		next()
	}

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

	this.get('*', function (req, res, next) {
		assert(req.user, 'Не удалось определить пользователя. Копать в сторону [express-ntlm]')
		next()
	})

	this.get('/access', function (req, res) {
		// выдача полной карты доступа пользователя
		let user = req.user
		let access = system.access(user, { granted: true })
		delete user.id
		delete user._acl
		res.json({ ...user, access: access })
	})

	// this.get('/admin/*', requireAdmin) -- можно повесить требование админа на ветку, но пока решил сделать так как есть

	this.get('/ldap-users', requireAdmin, function (req, res) {
		searchActiveDirectory(req.query.filter).then(result => res.json(result))
	})

	this.get('/', requireAdmin, function (req, res) {
		let users = system.db.users
		let map = Object.keys(users).map(user => ({ id: users._[user].id, ...users[user], login: user }))
			.filter(el => (req.query['show-disabled'] === 'true' || !(el['disabled'])))
		res.json(map)
	})

	this.get('/objects', requireAdmin, function (req, res) {
		res.json(createNode(system.db.objects))
	})

	this.get('/user', requireAdmin, function (req, res) {
		let login = req.query.login
		assert(login, 'В запросе отсутствует ключевой реквизит - login')
		let users = system.db.users
		res.json({ id: users._[login].id, ...users[login] })
	})

	this.put('/user', bodyParser.json(), requireAdmin, function (req, res) { // операция добавления/редактирования пользователя
		let user = req.body
		let users = system.db.users
		assert(user.login, 'В запросе отсутствует ключевой реквизит - login')
		if (user.login in users) {
			// обновляем реквизиты
			for (let key in user) {
				users[user.login][key] = user[key]
			}
		} else {
			// создаем новую ветку в пользователях
			users[user.login] = user
		}
		res.json({ id: users._[user.login].id, ...users[user.login] })
	})
}
