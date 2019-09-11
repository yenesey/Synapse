'use strict'

/*
  <<Synapse>>

  запуск через "node":
    \> node synapse [--development] [--ssl] [--service] [--port=N]
     параметры:
      --development  - запуск в режиме разработки, аналог переменной окружения NODE_ENV=development,
      --dev-server   - только фронт (сборка клиента webpack + hot)
      --port=N       - задать прослушиваемый порт, аналог переменной окружения PORT
      --ssl          - запуск в режиме https, нужны сертификаты в конфигурации (не рекомендуется для --development)
      --service      - запустить как службу (влияет на обработку сигналов прерывания и закрытия процесса)

  запуск через "npm run":
    \> npm run dev:api    - бэкенд для разработки
    \> npm run dev:server - сборка и отдача клиентского приложения на лету

    \> npm run build      - сборка статического клиентского приложения (bundle) для production

  ------------------------------------------------------------------------------------------------
  Сервер, клиент, ./core модули (за исключением отмеченных отдельно) © Денис Богачев <d.enisei@yandex.ru>
  ------------------------------------------------------------------------------------------------
*/

const path    = require('path')
const util    = require('util')
const moment  = require('moment')
const CronJob = require('cron').CronJob
const chalk   = require('chalk')
const express = require('express')
const morgan  = require('morgan')
const https   = require('https')
const http    = require('http')
const compression = require('compression')
require('moment-precise-range-plugin')

var server = null

// вывод в консоль в своем формате
console._log = console.log
console.log = function () {
	var args = Array.prototype.slice.apply(arguments)
	console._log(chalk.reset.cyan.bold(moment().format('HH:mm:ss ')) +
		args.reduce((all, arg) => all + ((typeof arg === 'object') ? util.inspect(arg) : arg), '')
	)
}

function boolAffinity (value) {
	if (typeof value === 'undefined') return false
	switch (value.toString().toLowerCase().trim()) {
	case 'true': case 'yes': case '1': return true
	case 'false': case 'no': case '0': case null: return false
	default: return Boolean(value)
	}
}

function errorHandler (err, req, res, next) {
	if (res.headersSent) return next(err)
	console.log(err.stack)
	res.status(500).send(err.message)
}

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

function obj2Str (obj, tag) {
	var str = chalk.cyan.bold('[' + tag + '] ')
	for (var key in obj) {
		if (obj[key])	{
			str = str + key + ':' + chalk.reset.yellow(
				String(obj[key]).replace(/(\d)(?=(\d{3})+([^\d]|$))/g, '$1,')
			) + ' '
		}
	}
	return str
}

function memUsage () {
	return obj2Str(process.memoryUsage(), 'mem usage')
}

function upTime () {
	return obj2Str(
		moment().subtract(process.uptime(), 'seconds').preciseDiff(moment(), true), 'up time'
	)
}

function easterEgg () {
	return '\n (.)(.)\n  ).(  \n ( v )\n  \\|/'
}

/// /////////////Обрабатываем командную строку////////////////
process.argv.forEach(arg => {
	let pv = arg.split('=')
	switch (pv[0]) {
	case '--ssl': process.env.SSL = true; break
	case '--port': process.env.PORT = pv[1]; break
	case '--development': process.env.NODE_ENV = 'development'; break
	case '--service': process.env.SERVICE = true; break
	case '--dev-server': process.env.DEV_SERVER = true; break
	}
})

function close () {
	console.log('server going down now...')
	server.close(function () {
		console.log('all requests finished')
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
			case 'm': console.log(memUsage()); break
			case 'u': console.log(upTime()); break
			case '\u0003': close(); break  // Ctrl+C
			default:  console.log(easterEgg())
			}
		})
	}
}

/*
-------------------------------------------------------------------------------------
*/
require('synapse/system').then(system => {
	const app = express()

	if (process.env.SSL) {
		let ssl = system.ssl
		server = https.Server({ passphrase: String(system.config.ssl.password), pfx: ssl.certData }, app)
	} else server = http.Server(app)

	server.on('error', err => {
		console.log(chalk.red.bold('[error]:') + JSON.stringify(err, null, ''))
		process.exit()
	})

	process.env.PORT = process.env.PORT || (process.env.SSL ? '443' : '80')

	server.listen(process.env.PORT, function () {
		var format = (obj, color) => Object.keys(obj).reduce((all, key) =>
			all + key + ':' + ((typeof color === 'function') ? color(obj[key]):obj[key]) + ' | ', '| '
		)

		var args = {
			args: process.argv.length > 2 ? process.argv.slice(2) : []
		}

		var info = [
			[process.versions, ['node', 'v8']],
			[process,          ['arch']],
			[this.address(),   ['port']],
			[process.env,      ['node_env']],
			[args,             ['args']],
			[process,          ['execArgv']]
		].reduce((obj, el) => {
			el[1].forEach(key => {
				if (el[0][key] && String(el[0][key]))	obj[key] = String(el[0][key])
			})
			return obj
		}, {})

		var l = format(info).length - 1
		// выводим системную инфу в отформатированном виде

		console._log('-'.repeat(l) + '\n' + format(info, chalk.green.bold) + '\n' + '-'.repeat(l))

		// eslint-disable-next-line no-new
		new CronJob('00 00 * * *',  function () {
			console._log('[' + chalk.green.bold('#' + moment().format('YYYY-MM-DD') + ']\n' + upTime() + '\n' + memUsage()))
		}, null, true, null, null, true)

		app.use([
			errorHandler,
			compression({ threshold: 0 }),
			express.static(system.config.path.users, { // каталог с пользовательскими папками
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
			console.log('Backend api mode. Type "rs + [enter]" to restart manually')
			app.use(cors)
			app.use(morgan('tiny', { stream: { write: msg => console.log(msg) } }))
		}

		if (system.config.telebot && boolAffinity(system.config.telebot.on)) {
			app.use(require('synapse/api/telebot')(system)) // telegram bot
		}
		if (system.config.cards && boolAffinity(system.config.cards.on)) {
			app.use(require('synapse/api/cards')(system))  // запрос инфы по картам для сайта
		}

		app.use([
			require('synapse/api/access')(system), // -- с этого момента и далее вниз контролируется доступ через AD
			require('synapse/api/dlookup')(system),
			require('synapse/api/dbquery')(system),
			require('synapse/api/tasks')(system),
			require('synapse/api/forms')(system),
			require('synapse/api/jobs')(system)
		])
	})
})
	.catch(console.error)
