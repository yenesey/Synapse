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

Object.defineProperties(
	system,
	{
		CONFIG: {
			value: 1,
			enumerable: true
		},
		ADMIN_USERS: {
			value: 1,
			enumerable: true
		},
		ADMIN_SCHEDULER: {
			value: 2,
			enumerable: true
		},
		ADMIN_SQLQUERY: {
			value: 3,
			enumerable: true
		},
		ADMIN_TASKS: {
			value: 4,
			enumerable: true
		}
	}
)

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
system.user = function (user) { // данные пользователя по login или id
	return this.system.users[user]

	return system.db(`SELECT id, login, name, email, disabled FROM users WHERE ${equals('id', 'login', user)} COLLATE NOCASE`)
		.then(select => select.length ? select[0] : null)

}
*/

system.users = function (object) { // users of given <object>
	let _object = this.system.objects.groups[object]
	return system.db(`select id1 id from [system_links] where id2 = $id2`, { $id2: _object._id })
		.then(users => Promise.all(users.map(user => treeMapper(user.id))))
}

system.tasks = function (object) { // users of given <object>
	let _object = this.system.objects.groups[object]
	return system.db(`select id1 id from [system_links] where id2 = $id2`, { $id2: _object._id })
		.then(users => Promise.all(users.map(user => treeMapper(user.id))))
	/*
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
	*/
}

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
	let obj = system.checkObject(options.object)
	return Object.assign({ granted: idList.includes(obj.id) }, obj)
}

// проверка наличия пользователя
system.checkUser = function (login) {
	assert(login in this.tree.users, 'Пользователь ' + login + ' не зарегистрирован')
	return this.tree.users[login]
}

// проверка наличия объекта доступа
system.checkObject = function (id) {
	assert(this.acl.has(id), 'Отсутствует объект доступа')
	return this.acl.get(id)
}

// проверка прав доступа пользователя к заданному объекту (блокировка тоже проверяется)
system.checkAccess = function (_user, object) {
	let user = system.checkUser(_user)
	assert(!user.disabled, 'Пользователь ' + _user + ' заблокирован')
	let access = system.access(user, { object: object })
	assert(access && access.granted, 'Не разрешен доступ к операции')
	return access
}

/// /////////////////////////////////////////////////////////////////////

system.configGetBool = function (path) {
	let value = system.configGetNode(path)
	if (typeof value === 'undefined' || value === null) return false
	switch (value.toString().toLowerCase().trim()) {
	case 'true': case 'yes': case '1': return true
	case 'false': case 'no': case '0': case null: return false
	default: return Boolean(value)
	}
}

system.configGetNode = function (path, sep = '.') {
	let _node = this.tree
	let _path = path.split(sep)
	if (_path.length === 1 && _path[0] === '') return _node
	for (let key of _path) {
		if ((typeof _node === 'object') && (key in _node)) _node = _node[key]; else return null
	}
	return _node
}

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
