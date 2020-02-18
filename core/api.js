'use strict'
/*
  Сборка всех endpoints, которые лежат в ./api/ в один express.router

  Запросы ./api/ требуют ntlm-авторизацию
  Запросы к ./api/external НЕ требуют авторизации

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

	function loadModules (dir) {
		if (!path.isAbsolute(dir)) dir = path.join(__dirname, dir)
		return fs.readdirSync(dir, { withFileTypes: true })
			.filter(el => path.extname(el.name) === '.js' && !el.isDirectory())
			.map(el => path.basename(el.name, '.js'))
			.map(name => {
				let _entry = config.api ? config.api[name] : undefined // если есть настройка в конфиге, берем ее
				if (_entry && !_entry.enabled) return null // если в настройке явно прописано отключение - выходим

				let apiModule = require(path.join(dir, name))
				let apiEntry = '/' + name
				let apiRouter = express.Router({ strict: true })
				apiModule.call(apiRouter, system)
				apiRouter.use(apiEntry, apiRouter)
				return apiRouter
			})
	}

	router.use(loadModules('api/external'))
	router.use(function (req, res, next) {
		if (req.headers.upgrade === 'websocket') return next() // skip ntlm when ws:// todo: need some other auth scenario
		return ntlmHandler(req, res, next) // basic-auth через Active Directory (ntlm)
	})
	router.use(userHandler)
	router.use(loadModules('api'))

	// return api
	return router
}
