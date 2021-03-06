/*
  - системные функции
  - конфигурация системы <system.db>
*/
'use strict'
const path = require('path')
const ROOT_DIR = path.join(__dirname, '..')

const util = require('util')
const assert = require('assert')
const chalk = require('chalk')
const fs = require('fs')

const recurse = require('./lib').recurse
const treeStore = require('sqlite-tree-store')(path.join(ROOT_DIR, 'db/synapse.db'), 'system')

// ---------------------------------------------------------------------------
const system = {}

system.errorHandler = function (err, req, res, next) {
	var msg = {
		code: err.code || null,
		message: err.message,
		at: err.stack.substr(err.stack.indexOf('at ') + 3)
	}
	msg.at = msg.at.substr(0, msg.at.indexOf('\n'))

	if (req) {
		if (req.ntlm) msg.user = req.ntlm.UserName
		msg.remote = req.connection.remoteAddress
		msg.url = req.url
	}
	system.log(msg)
	if (res) {
		if (res.headersSent && next) next()
		res.json({ status: 'error', message: err.message })
	}
	return false
}

// ---------------------------------------------------------------------------------------------
system.dateStamp = function () {
	let dt = new Date()
	// return dt.getFullYear() + '-' + String(dt.getMonth()+1) + '-' + dt.getDate() + ' ' + dt.getHours() + ':' + dt.getMinutes() + ':' + dt.getMilliseconds()
	return dt.toLocaleDateString('ru', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + dt.toLocaleTimeString('ru', { hour12: false })
}

system.log = function (...args) {
	let stamp = system.dateStamp()
	console.log(chalk.reset.cyan.bold(stamp) + ' ' +
		args.reduce((all, arg) => all + ((typeof arg === 'object') ? util.inspect(arg, { colors: true }) : arg), '')
	)
}

system.info = function () {
	let format = (obj, color) => {
		let keys = Object.keys(obj)
		let lengths = []
		let fmt =  keys.reduce((result, key, index) => {
			let value = String(obj[key]).replace(/(\d)(?=(\d{3})+([^\d]|$))/g, '$1,')
			value = key + ':' + ((typeof color === 'function') ? color(value) : value) + '│'
			lengths.push(value.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').length-1) // eslint-disable-line
			return result + value
		}, '│')

		let head = (op, md, cl) =>	lengths.reduce((result, times, index, { length }) =>
			result + '─'.repeat(times) + (index < length - 1 ? md : '')
		, op) + cl

		return head('┌', '┬', '┐') + '\n' + fmt + '\n' + head('└', '┴', '┘')
	}
	let mem = process.memoryUsage()
	let addr = this.address()
	let uptime = Math.round(process.uptime() / 36) / 100 + ' hrs'

	let info = {
		'arch': process,
		'node': process.versions,
		// 'v8': process.versions,
		'port': addr,
		// 'node_env': process.env,
		'args': { args: process.argv.slice(2) },
		'execArgv': process,
		'uptime': { uptime: uptime },
		'rss': mem,
		'heapTotal': mem
		// 'heapUsed': mem,
		// 'external': mem
	}
	info = Object.keys(info).reduce((result, key) => {
		if (info[key]) {
			if (key in info[key]) {
				let value = String(info[key][key])
				if (value.length) result[key] = value
			}
		}
		return result
	}, {})
	return format(info, chalk.greenBright)
}

system.easterEgg = function () {
	return '\n (.)(.)\n  ).(  \n ( v )\n  \\|/'
}

// ---------------------------------------------------------------------------------------------

system.access = function (user, options = {}) {
// карта доступа
// юзается в tasks и dlookup, а также в users/access
// options = { 'class': className, object: objectId, granted: true|false }
	let userAcl = String(user._acl).split(',').map(el => Number(el))

	let map = []
	let obj
	let _class
	let objFound = recurse(this.db.objects, 1, (node, key, level) => {
		if (level === 0) {
			_class = key
		} else {
			let id = node._[key].id
			let granted = userAcl.includes(id)
			if (
				(!('class' in options) || _class === options['class']) &&
				(!('granted' in options) || granted === options['granted'])
			)  {
				let _obj = { id: id, name: key, class: _class, ...node[key], granted: granted }
				map.push(_obj)
				if (options.object && id === options.object) {
					obj = _obj
					return true
				}
			}
		}
	})
	if (objFound) return obj
	return map
}

/**
 * Получить id элемента ветви, заданной через массив path
 * @param {object} node
 * @param {string[]} path
 */
function pathToId (node, path) {
	for (var i = 0; i < path.length - 1; i++) node = node[path[i]]
	return node._[path[i]].id
}

system.checkAccess = function (user, path, object) {
	assert(!user.disabled, 'Пользователь ' + user.login + ' заблокирован')
	if (path) object = pathToId(this.db.objects, path)
	let access = this.access(user, { object: object })
	assert(access && access.granted, 'Не разрешен доступ к операции')
	return access
}

system.getUsersHavingAccess = function (path) {
	let users = []
	let objectId = pathToId(this.db.objects, path)
	for (let key in this.db.users) {
		let user = this.db.users[key]
		if (!user.disabled && user._acl && user._acl.split(',').includes(String(objectId))) users.push(user)
	}
	return users
}

/// /////////////////////////////////////////////////////////////////////

const db = treeStore()
const config = db.config

// eslint-disable-all
for (let key in config.path) {
	if (!path.isAbsolute(config.path[key])) { // достраиваем относительные пути до полных
		config.path._[key] = path.join(ROOT_DIR, config.path[key])
	}
}
config.path._.root = ROOT_DIR
config.ssl._.cert = path.join(ROOT_DIR, 'sslcert', config.ssl.cert)

if (!config.ssl.certData && fs.existsSync(config.ssl.cert)) {
	config.ssl.certData = fs.readFileSync(config.ssl.cert)
	console.log(chalk.yellow.bold('Note: certificate is loaded into [synapse.db]:config.ssl.certData'))
}

system.db = db
system.config = config

module.exports = system
