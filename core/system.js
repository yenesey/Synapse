'use strict'
/*
	- системные функции
	- конфигурация системы <system.tree>
*/

const path = require('path')
const util = require('util')
const assert = require('assert')
const chalk = require('chalk')
const fs = require('fs')
const ROOT_DIR = path.join(__dirname, '..')
const promisify = util.promisify
const recurse = require('./lib').recurse
const db = require('./sqlite')(path.join(ROOT_DIR, 'db/synapse.db'))
const treeMapper = require('./sqlite-tree-mapper')(db, 'system')
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
		res.json({ success: false, error: err.message })
	}
	return false
}

// ---------------------------------------------------------------------------------------------

system.dateStamp = function () {
	let dt = new Date()
	//return dt.getFullYear() + '-' + String(dt.getMonth()+1) + '-' + dt.getDate() + ' ' + dt.getHours() + ':' + dt.getMinutes() + ':' + dt.getMilliseconds()
	return dt.toLocaleDateString('ru', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + dt.toLocaleTimeString('ru', { hour12: false })
}

system.log = function (...args) {
	let stamp = this.dateStamp()
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
	/*
	if ('object' in options) {
		return { granted: userAcl.includes(options.object),  this.tree.objects._id() }
	}
	*/
	let map = []
	let obj
	let _class
	let objFound = recurse(this.tree.objects, 1, (node, key, level) => {
		if (level === 0) {
			_class = key
		} else {
			let id = node.$(key).id
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

system.getUser = function (login) {
	let { users } = this.tree
	assert(login in users, 'Пользователь ' + login + ' не зарегистрирован')
	return { login: login, ...users.$(login) }
}

system.checkAccess = function (user, object) {
	assert(!user.disabled, 'Пользователь ' + user.login + ' заблокирован')
	let access = this.access(user, { object: object })
	assert(access && access.granted, 'Не разрешен доступ к операции')
	return access
}

system.getUsersHavingAccess = function (objectId) {
	let users = []
	for (let key in this.tree.users) {
		let user = this.tree.users[key]
		if (!user.disabled && user._acl && user._acl.split(',').includes(String(objectId))) users.push(user)
	}
	return users
}

/// /////////////////////////////////////////////////////////////////////
module.exports = treeMapper().then(tree => {
	system.tree = tree
	system.config = system.tree.config
	const config = system.config
	// eslint-disable-all
	for (var key in config.path) {
		if (!path.isAbsolute(config.path[key])) { // достраиваем относительные пути до полных
			config.path._[key] = path.join(ROOT_DIR, config.path[key])
		}
	}
	config.path._.root = ROOT_DIR

	if (config.ssl.cert) {
		return promisify(fs.readFile)(path.join(ROOT_DIR, 'sslcert', config.ssl.cert))
			.then(cert => {
				config.ssl._.certData = cert
			})
			.catch(err => system.errorHandler(err))
			.then(() => system)
	}

	return system
})
