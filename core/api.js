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
const express = require('express')
const router = express.Router({ strict: true })
const path = require('path')
const ntlm = require('express-ntlm')

module.exports = function (system) {
	const config = system.config
	//console.log(config)

	function load (moduleName) {
		const apiModule = require(path.join(__dirname, 'api', moduleName))
		const apiRouter = express.Router({ strict: true })
		apiModule.call(apiRouter, system)
		router.use('/' + moduleName, apiRouter)
		return router
	}

	function api (moduleName) {
		if (typeof moduleName === 'string') return load(moduleName)
		if (typeof moduleName === 'object') for (let el of moduleName) load(el)
		return router
	}

	api.useNtlm = function () {
		// basic-auth через Active Directory (ntlm)
		router.use([
			/*
			ntlm({
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
				},
				// debug: function () { var args = Array.prototype.slice.apply(arguments); console.log.apply(null, args) },
				domain: config.ntlm.domain,
				domaincontroller: config.ntlm.dc
			}),*/
			function (req, res, next) {
				req.ntlm = {}
				req.ntlm.UserName = 'bogachev'
				req.user = system.getUser(req.ntlm.UserName)
				next()
			}
		])
	}

	return api
}
