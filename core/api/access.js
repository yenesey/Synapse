'use strict'

/*
	бывший uac (UAC - User Access Control) - работа с пользователями, контроль доступа,
	- требуется NTLM, или ошибка гарантирована
	- идентификация
	- авторизация
	- добавление / удаление пользователя
*/

const bodyParser = require('body-parser')
const assert = require('assert')

module.exports = function (system) {
	// -
	this.get('/map', function (req, res) {
		// выдача полной карты доступа заданного пользователя (req.query.user)
		// если пользователь не задан - выдается собственная карта доступа
		var opt = {}
		assert(req.ntlm, 'В запросе отсутствуют необходимые поля ntlm. Подключите api.useNtlm')
		var queryUser = req.ntlm.UserName

		if ('class' in req.query) opt.class = req.query.class
		if ('user' in req.query) queryUser = Number(req.query.user) || req.query.user

		return system.userCheck(queryUser)
			.then(user =>
				(('user' in req.query) // запрос по другому пользователю?
					? system.accessCheck(req.ntlm.UserName, system.ADMIN_USERS) // тогда нужны привилегии!
					: Promise.resolve() // если запрос по "себе", привилегии не нужны
				)
					.then(() => system.access(queryUser, opt))
					.then(access => {
						if (access)	user.access = access
						res.json(user)
					})
			)
			.catch(err => system.errorHandler(err, req, res))
	})

	this.put('/map', bodyParser.json(), function (req, res) {
		// операция выдачи/прекращения доступа к заданному объекту
		// req.body = {userId:Number, objectId: Number, granted: Number(1|0)}
		assert(req.ntlm, 'В запросе отсутствуют необходимые поля ntlm. Подключите api.useNtlm')
		return system.accessCheck(req.ntlm.UserName, system.ADMIN_USERS)
			.then(() =>
				system.db(
					(req.body.granted)
						? `REPLACE INTO user_access VALUES (${req.body.userId}, ${req.body.objectId}, null)`
						: `DELETE FROM user_access WHERE user=${req.body.userId} AND object=${req.body.objectId}`
				)
			)
			.then(result => res.json({
				result
			}))
			.catch(err => system.errorHandler(err, req, res))
	})

	this.put('/user', bodyParser.json(), function (req, res) {
		// операция добавления(создания) пользователя
		assert(req.ntlm, 'В запросе отсутствуют необходимые поля ntlm. Подключите api.useNtlm')
		return system.accessCheck(req.ntlm.UserName, system.ADMIN_USERS)
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

	this.get('/members', function (req, res) {
		system.users(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
	})

	this.get('/tasks', function (req, res) {
		system.tasks(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
	})
}
