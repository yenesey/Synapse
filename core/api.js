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

module.exports = function (system) {
	return function (moduleName) {
		const apiModule = require(path.join(__dirname, 'api', moduleName))
		const apiRouter = express.Router({ strict: true })
		apiModule.call(apiRouter, system)
		router.use('/' + moduleName, apiRouter)
		return router
	}
}
