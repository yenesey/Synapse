'use strict'

/*
  <<Synapse>>

  запуск через "node":
    \> node synapse [--development] [--ssl] [--service] [--port=N]
     параметры:
      --development  - запуск в режиме разработки, аналог переменной окружения NODE_ENV=development,
      --dev-server   - только фронт (сборка клиента webpack + hot)
      --base-url     - дает знать клиенту, куда бросать AJAX запросы (по умолчанию совпадает с <server>)
      --port=N       - задать прослушиваемый порт, аналог переменной окружения PORT
      --ssl          - запуск в режиме https, нужны сертификаты в конфигурации (не рекомендуется для --development)
      --service      - запустить как службу (влияет на обработку сигналов прерывания и закрытия процесса)

  запуск через "npm run":
    \> npm run dev-api    - бэкенд для разработки
    \> npm run dev-server - сборка и отдача клиентского приложения на лету

    \> npm run build      - сборка статического клиентского приложения (bundle) для production

  ------------------------------------------------------------------------------------------------
  Сервер, клиент, ./core модули (за исключением отмеченных отдельно) © Денис Богачев <d.enisei@yandex.ru>
  ------------------------------------------------------------------------------------------------
*/

const path    = require('path')
const CronJob = require('cron').CronJob
const express = require('express')
const morgan  = require('morgan')
const https   = require('https')
const http    = require('http')
const compression = require('compression')

var server = null

// Cross Origin Resource Sharing for 'development' mode
function cors (req, res, next) {
	const method = req.method && req.method.toUpperCase && req.method.toUpperCase()
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', req.protocol + '://' + req.hostname + ':3000')
	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true)

	// res.setHeader('Vary', 'Origin')
	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST')

	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept')
	// res.setHeader('Access-Control-Max-Age', '-1')
	if (method === 'OPTIONS') {
		res.statusCode = 204
		res.setHeader('Content-Length', '0')
		res.end()
	} else {
		next() // Pass to next layer of middleware
	}
}

/// /////////////Обрабатываем командную строку////////////////
// todo: make likewise @burn-token project
process.argv.forEach(arg => {
	let pv = arg.split('=')
	switch (pv[0]) {
	case '--ssl': process.env.SSL = true; break
	case '--port': process.env.PORT = pv[1]; break
	case '--development': process.env.NODE_ENV = 'development'; break
	case '--service': process.env.SERVICE = true; break
	case '--dev-server': process.env.DEV_SERVER = true; break
	case '--base-url': process.env.BASE_URL = pv[1]; break
	}
})

/*
-------------------------------------------------------------------------------------
*/
require('synapse/system').then(system => {
	const app = express()
	const config = system.config

	server = process.env.SSL
		? server = https.Server({ passphrase: String(config.ssl.password), pfx: config.ssl.certData }, app)
		: server = http.Server(app)

	server.on('error', err => {
		system.log(err)
		process.exit()
	})

	process.env.PORT = process.env.PORT || (process.env.SSL ? '443' : '80')

	server.listen(process.env.PORT, function () {
		system.info = system.info.bind(this) // for this.address

		// eslint-disable-next-line no-new
		new CronJob('00 00 * * *',  function () {
			console.log(system.info())
		}, null, true, null, null, true)

		app.use([
			compression({ threshold: 0 }),
			express.static(config.path.users, { // каталог с пользовательскими папками
				setHeaders: function (res, path) {
					res.attachment(path) // добавляем в каджый заголовок инфу о том, что у нас вложение
				}
			})
		])

		if (process.env.DEV_SERVER) {
			app.use(require('synapse/dev-middleware'))
			return
		}	else {
			app.use(express.static(path.join(__dirname, 'client')))
		}

		if (process.env.NODE_ENV === 'development') {
			// console.log('Backend api mode. Type "rs + [enter]" to restart manually')
			app.use(cors)
			app.use(morgan('tiny', { stream: { write: msg => system.log(msg) } }))
		}

		const api = require('synapse/api.js')(system)
		if (config._bool('cft-web-proxy.on')) app.use(api('cft-web-proxy'))
		if (config._bool('telebot.on')) app.use(api('telebot'))
		if (config._bool('cards.on')) app.use(api('cards'))

		api.useNtlm() // отныне и далее у нас есть userName из AD
		app.use(api(['access', 'dlookup', 'dbquery', 'tasks', 'jobs', 'system'])) /* 'forms' */
		app.use(system.errorHandler)
	})

	function close () {
		system.log('server going down now...')
		server.close(function () {
			system.log('all requests finished')
			process.exit()
		})
		setTimeout(function () {
			server.emit('close')
		}, 5000)
	}

	// ----------------в случае получения сигнала корректно закрываем--------------------
	process.on('SIGHUP', close).on('SIGTERM', close).on('SIGINT', close)

	if (!process.env.SERVICE) { // если не служба,
	// то будет полезно обработать некоторые нажатия клавиш в консоли
		let stdin = process.stdin
		if (typeof stdin.setRawMode === 'function') {
			stdin.setRawMode(true)
			stdin.resume()
			stdin.setEncoding('utf8')
			stdin.on('data', function (input) {
				switch (input) {
				case 'm':
				case 't':
				case 'u': console.log(system.info())
					break
				case '\u0003': close(); break  // Ctrl+C
				default: console.log(system.easterEgg())
				}
			})
		}
	}
}).catch(console.log)
