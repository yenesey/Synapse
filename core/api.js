'use strict'
/*
  Обертка для упрощенного вызова endpoints, которые лежат в ./api/*
  Каждый модуль ./api/* по-прежнему должен экспортировать функцию
    exports = function (system) {
		// express.Router самому создавать не нужно, вместо этого:
		this.get('/somepoint', function(req, res) {

		})
	}
*/
const path = require('path')
const expressNtlm = require('express-ntlm')
const ActiveDirectory = require('activedirectory')

module.exports = function (system, express) {
	const ntlm = system.config.ntlm
	const router = express.Router({ strict: true })

	const activeDirectory = new ActiveDirectory({
		url: ntlm.dc,
		baseDN: ntlm.dn,
		username: ntlm.user + '@' + ntlm.domain,
		password: ntlm.password,
		attributes: { user: ['sAMAccountName', 'mail', 'displayName'] }
	})

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

	function loadModule (name) {
		const apiModule = require(path.join(__dirname, 'api', name))
		const apiRouter = express.Router({ strict: true })
		apiModule.call(apiRouter, system)
		router.use('/' + name, apiRouter)
		return router
	}

	function api (name) {
		if (typeof name === 'string') return loadModule(name)
		if (typeof name === 'object') for (let el of name) loadModule(el)
		return router
	}

	api.useNtlm = function () {
		// basic-auth через Active Directory (ntlm)
		router.use([
			function (req, res, next) {
				if (req.headers.upgrade === 'websocket') return next() // skip ntlm when ws:// todo: need some other auth scenario
				return ntlmHandler(req, res, next)
			},
			function (req, res, next) {
				const ntlm = req.ntlm
				if (ntlm && ntlm.Authenticated) {
					let login = ntlm.UserName
					req.user = system.getUser(login)
					if (req.user === null) { // - это значит пользователь еще не зарегистрирован
						system.db.users[login] = {
							created: new Date(),
							remote: req.connection.remoteAddress
						}
						req.user = system.getUser(login)
						let justCreated = system.db.users[login]
						activeDirectory.findUsers(`|(sAMAccountName=${login})`, function (err, found) {
							if (err) return
							let adUser = found[0]
							// сохраняем найденные поля в базе:
							justCreated.name = adUser.displayName
							justCreated.email = adUser.mail
						})
					}
				}
				next()
			}
		])
	}

	return api
}
