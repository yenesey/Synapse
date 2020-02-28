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
const auth = require('./mids/auth')

// пробросил внутрь express, "зараженный" express-ws, чтобы во всех api можно было использовать одноименные ws-endpoint'ы
module.exports = function (system, express) {
	const config = system.config
	const router = express.Router({ strict: true })

	function loadModules (dir) {
		if (!path.isAbsolute(dir)) dir = path.join(__dirname, dir)
		return fs.readdirSync(dir, { withFileTypes: true })
			.filter(el => path.extname(el.name).toLowerCase() === '.js' && !el.isDirectory())
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
	router.use(auth(system))
	router.use(loadModules('api'))
	return router
}
