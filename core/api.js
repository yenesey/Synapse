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
	function api (moduleName) {
		const apiModule = require(path.join(__dirname, 'api', moduleName))
		const apiRouter = express.Router({ strict: true })
		apiModule.call(apiRouter, system)
		router.use('/' + moduleName, apiRouter)
		return router
	}

	api.useNtlm = function () {
		// basic-auth через Active Directory (ntlm)
		router.use(
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
					res.status(500).send('NTLM auth error')
				},
				// debug: function () { var args = Array.prototype.slice.apply(arguments); console.log.apply(null, args) },
				domain: system.config.ntlm.domain,
				domaincontroller: system.config.ntlm.dc
			})
		)
	}

	return api
}