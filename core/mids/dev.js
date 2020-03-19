/*
  Режим разработчика
  Если данный модуль запущен,	сервер выполняет сборку и
  отдачу клиента на лету с Hot Module Reload (HMR)
*/
'use strict'
const config = require('../webpack.config')
const { combineMiddleware } = require('../lib')

const compiler = require('webpack')(config)
const dev = require('webpack-dev-middleware')
const hot = require('webpack-hot-middleware')

module.exports = combineMiddleware([
	dev(compiler, {
		logLevel: 'error',
		publicPath: config.output.publicPath // reporter : log
	}),
	hot(compiler, { log: null })
])
