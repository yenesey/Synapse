'use strict'
/*
	Режим разработчика
	Если данный модуль запущен,	сервер выполняет сборку и
	отдачу клиента на лету с Hot Module Reload (HMR)
*/
const config = require('../client_source/webpack.config')
const compiler = require('webpack')(config)
const dev = require('webpack-dev-middleware')
const hot = require('webpack-hot-middleware')
const combineMiddleware = require('./lib').combineMiddleware

module.exports = combineMiddleware([
	dev(compiler, {
		logLevel: 'error',
		publicPath: config.output.publicPath // reporter : log
	}),
	hot(compiler, { log: null })
])
