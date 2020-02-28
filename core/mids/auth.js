'use strict'
/*
    Aутентификация и авторизация (middleware)
*/

const expressNtlm = require('express-ntlm')
const ActiveDirectory = require('activedirectory')

module.exports = function (system) {
	const config = system.config
	const ntlm = config.ntlm

	const ntlmHandler = expressNtlm({
		domain: ntlm.domain,
		domaincontroller: ntlm.dc,
		badrequest: function (req, res, next) {
			res.sendStatus(400)
		},
		forbidden: function (req, res, next) {
			res.statusCode = 401 // !!!!
			res.setHeader('WWW-Authenticate', 'NTLM')
			next()
		},
		internalservererror: function (req, res, next) {
			system.errorHandler(new Error('NTLM auth error'), req, res, next)
		}
		// debug: function () { var args = Array.prototype.slice.apply(arguments); console.log.apply(null, args) },
	})

	const activeDirectory = new ActiveDirectory({
		url: ntlm.dc,
		baseDN: ntlm.dn,
		username: ntlm.user + '@' + ntlm.domain,
		password: ntlm.password,
		attributes: { user: ['sAMAccountName', 'mail', 'displayName'] }
	})

	const userHandler = function (req, res, next) {
		const ntlm = req.ntlm
		if (ntlm && ntlm.Authenticated) {
			let login = ntlm.UserName
			if (!(login in system.db.users)) { // - пользователь еще не зарегистрирован?
				system.db.users[login] = {
					created: new Date(),
					remote: req.connection.remoteAddress
				}

				let justCreated = system.db.users[login]
				activeDirectory.findUsers(`|(sAMAccountName=${login})`, function (err, found) {
					if (err) return
					let adUser = found[0]
					// сохраняем найденные поля в базе:
					justCreated.name = adUser.displayName
					justCreated.email = adUser.mail
				})
			}
			req.user = { login: login, ...system.db.users[login] }
		}
		next()
	}

	return function (req, res, next) {
		if (req.headers.upgrade === 'websocket') return next() // skip ntlm when ws:// todo: need to implement some other auth scenario
		ntlmHandler(req, res, function (err) { // аутентификация (basic-auth (ntlm))
			if (err) {
				return next(err)
			}
			userHandler(req, res, next) // авторизация
		})
	}
}
