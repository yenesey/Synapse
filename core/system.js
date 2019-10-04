'use strict'
/*
	- системные функции и константы
    - системная база данных system.db = function(<SQL>, [<params>])
	- конфигурация системы  config = { system: {..}, .. }
*/

const path = require('path')
const util = require('util')
const assert = require('assert')
const chalk = require('chalk')
const fs = require('fs')
const ROOT_DIR = path.join(__dirname, '..')
const promisify = util.promisify
const db = require('./sqlite')(path.join(ROOT_DIR, 'db/synapse.db')) // основная БД приложения
const treeMapper = require('./sqlite-tree-mapper')(db, 'system')
// ---------------------------------------------------------------------------
const system = { db: db }

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

system.log = function (...args) {
	var dt = new Date()
	let stamp = dt.toLocaleDateString('ru', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + dt.toLocaleTimeString('ru', { hour12: false })
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
		if (key in info[key]) {
			let value = String(info[key][key])
			if (value.length) result[key] = value
		}
		return result
	}, {})
	return format(info, chalk.green.bold)
}

system.easterEgg = function () {
	return '\n (.)(.)\n  ).(  \n ( v )\n  \\|/'
}

// -------------------------------------------------------------------------------
/*
system.users = function (object) { // users of given <object>
	let _object = this.system.objects.groups[object]
	return system.db(`select id1 id from [system_links] where id2 = $id2`, { $id2: _object._id })
		.then(users => Promise.all(users.map(user => treeMapper(user.id))))
}

system.tasks = function (object) { // users of given <object>
	let _object = this.system.objects.groups[object]
	return system.db(`select id1 id from [system_links] where id2 = $id2`, { $id2: _object._id })
		.then(users => Promise.all(users.map(user => treeMapper(user.id))))
	
	return system.db(`
		select
			users.id, users.name, users.email,	users.disabled,
			case when 
				(select 
					users.id 
				from
					objects,
					user_access
				where
					user_access.user = users.id 
					and user_access.object = objects.id
					and ${equals('id', 'name', object)} 
					collate nocase
				) 
			is null then 0 else 1 end as granted 
		from
			users
		order by
			users.name`
	)
	
}
*/

system.access = function (user, options = {}) {
// карта доступа
// это главная функция, через нее почти весь доступ работает
// options = { _class: _className || object: objectId }

	let idList = String(user._acl).split(',').map(el => Number(el))

	if (!('object' in options)) {
		let map = []
		this.acl.forEach(el => {
			if (!('_class' in options) || el._class === options._class) {
				map.push(Object.assign({ granted: idList.includes(el.id) }, el))
			}
		})
		return map
	}
	assert(this.acl.has(options.object), 'Отсутствует объект доступа')
	let obj = this.acl.get(options.object)
	return Object.assign({ granted: idList.includes(obj.id) }, obj)
}

system.getUser = function (login) {
	assert(login in this.tree.users, 'Пользователь ' + login + ' не зарегистрирован')
	return { id: this.tree.users._id(login), ...this.tree.users[login] }
}

// проверка прав доступа пользователя к заданному объекту (блокировка тоже проверяется)
system.checkAccess = function (user, object) {
	assert(!user.disabled, 'Пользователь ' + user.login + ' заблокирован')
	let access = this.access(user, { object: object })
	assert(access && access.granted, 'Не разрешен доступ к операции')
	return access
}

/// /////////////////////////////////////////////////////////////////////
module.exports = treeMapper(-1).then(systemTree => {
	system.tree = systemTree
	system.config = system.tree.config
	const config = system.config

	system.acl = new Map()
	for (let _class in systemTree.objects) {
		for (let object in systemTree.objects[_class]) {
			let id = systemTree.objects[_class]._id(object)
			system.acl.set(id,  { id: id, name: object, class: _class, ...systemTree.objects[_class][object] })
		}
	}

	// eslint-disable-all
	for (var key in config.path) {
		if (!path.isAbsolute(config.path[key])) { // достраиваем относительные пути до полных
			config.path[key] = path.join(ROOT_DIR, config.path[key])
		}
	}
	config.path.root = ROOT_DIR

	if (config.ssl.cert) {
		return promisify(fs.readFile)(path.join(ROOT_DIR, 'sslcert', config.ssl.cert))
			.then(cert => {
				config.ssl.certData = cert
				return system
			})
	}

	return system
})
