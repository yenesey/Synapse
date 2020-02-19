'use strict'
/*
  Сборка всех endpoints, которые лежат в ./api/ в один express.router

  Запросы к ./api/external НЕ требуют авторизации
  Запросы ./api/ требуют авторизацию

  Каждый модуль ./api/ должен экспортировать функцию
    module.exports = function (system) {
		this.get('/', (req, res) => {})
		this.put('/somepoint', (req, res) => {})
		this.ws('/', (ws, req) => {})
		.....
	}
*/

const fs = require('fs')
const path = require('path')
const expressNtlm = require('express-ntlm')
const ActiveDirectory = require('activedirectory')

// пробросил внутрь express, "зараженный" express-ws, чтобы во всех api можно было использовать одноименные ws-endpoint'ы
module.exports = function (system, express) {
	const config = system.config
	const ntlm = config.ntlm
	const router = express.Router({ strict: true })

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

	const authScenario = function (req, res, next) {
		if (req.headers.upgrade === 'websocket') return next() // skip ntlm when ws:// todo: need to implement some other auth scenario
		ntlmHandler(req, res, function (err) { // аутентификация (basic-auth (ntlm))
			if (err) {
				return next(err)
			}
			userHandler(req, res, next) // авторизация
		})
	}

	function loadModules (dir) {
		if (!path.isAbsolute(dir)) dir = path.join(__dirname, dir)
		return fs.readdirSync(dir, { withFileTypes: true })
			.filter(el => path.extname(el.name) === '.js' && !el.isDirectory())
			.map(el => path.basename(el.name, '.js')) // -- убрал расширение из имени
			.filter(name => {
				// модули могут быть выборочно отключены в конфигурации системы например:
				// config.api['cards'].enabled = false
				let entry = config.api ? config.api[name] : undefined
				if (entry && entry.enabled === false) return false
				return true
			})
			.map(name => {
				let apiModule = require(path.join(dir, name))
				let apiEntry = '/' + name
				let apiRouter = express.Router({ strict: true })
				apiModule.call(apiRouter, system)
				apiRouter.use(apiEntry, apiRouter)
				return apiRouter
			})
	}

	router.use(loadModules('api/external'))
	router.use(authScenario)
	router.use(loadModules('api'))
	return router
}
