'use strict'
/*
	- системные функции и константы
    - системная база данных system.db = function(<SQL>, [<params>])
	- конфигурация системы  config = { system: {..}, .. }
*/

const path = require('path')
const util = require('util')
const chalk = require('chalk')
const fs = require('fs')
const ROOT_DIR = path.join(__dirname, '..')
const promisify = util.promisify
const db = require('./sqlite')(path.join(ROOT_DIR, 'db/synapse.db')) // основная БД приложения
const config = require('./sqlite-tree-mapper')(db, 'config')
// ---------------------------------------------------------------------------
const system = { db: db }

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
			value = key + ':' + ((typeof color === 'function') ? color(value) : value) + ' │ '
			lengths.push(value.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').length - 1) // eslint-disable-line
			return result + value
		}, '│ ')

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

Object.defineProperties(
	system,
	{
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
		},
		ERROR: {
			value: 'SYNAPSE_SYSTEM',
			enumerable: true
		}
	}
)

// -------------------------------------------------------------------------------
function equals (number, string, _var) {
	if (typeof _var === 'number')	return number + '=' + _var
	if (typeof _var === 'string')	return string + '=' + '\'' + _var + '\''
}

system.user = function (user) { // данные пользователя по login или id
	return system.db(`SELECT id, login, name, email, disabled FROM users WHERE ${equals('id', 'login', user)} COLLATE NOCASE`)
		.then(select => select.length ? select[0] : null)
}

system.users = function (object) { // users of given <object>
	return system.db(`
		select
			users.id, users.name, users.email
		from
			users, objects, user_access
		where
			user_access.user = users.id
			and	(users.disabled = 0 or users.disabled is null)
			and user_access.object = objects.id
			and ${equals('id', 'name', object)}`
	)
}

system.tasks = function (object) { // users of given <object>
	return system.db(`
		select
			users.id, users.name, users.email,
			users.disabled,
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

system.access = function (user, options) {
// карта доступа
// это главная функция, через нее почти весь доступ работает
	var cast = (access) => access
	var userCondition = 'users.' + equals('id', 'login', user)

	var whereCondition = ''
	if (typeof options !== 'undefined') {
		if ('class' in options)	whereCondition += ' and objects.' + equals('', 'class', options.class)

		if ('object' in options) {
			cast = (access) => access[0]
			whereCondition += ' and objects.' + equals('id', 'name', options.object)
		}
	}

	return system.db(`
		SELECT
			objects.*, 
			(select meta from objects_meta where object = objects.id) as 'meta',
			case when 
				(select 
					users.id 
				from
					users,
					user_access
				where
					users.id = user_access.user 
					and	objects.id = user_access.object 
					and	${userCondition} 
					collate nocase
				)
			is null then 0 else 1 end as granted 
		FROM
			objects
		WHERE
			1=1
			${whereCondition}
		ORDER BY objects.class, objects.name`
	)
		.then(access => {
			access = access.map((obj, index) => {
				let meta = null
				try {
					meta = JSON.parse(obj.meta)
					delete obj.meta
				} catch (err) {
					system.log('[error]:'  + err.message.replace('\n', '') + '   object.id=' + access[index].id)
				}
				return { ...obj, ...meta }
			})
			return cast(access)
		})
}

/// /////////////////////////////////////////////////////////////////////
system.error = function (message) {
	var err = new Error(message)
	err.code = system.ERROR
	return err
}

system.errorHandler = function (err, req, res, next) {
	if (err.code === system.ERROR) {
		if (res) res.json({ error: err.message })
		return true // с запланированной ошибкой расправляемся быстро
	}
	var msg = {
		code: err.code,
		message: err.message
	}
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
/// /////////////////////////////////////////////////////////////////////
// проверка наличия пользователя
system.userCheck = function (_user) {
	return system.user(_user)
		.then(user => {
			if (user) return user
			throw system.error('Пользователь ' + _user + ' не зарегистрирован')
		})
}

// проверка прав доступа пользователя к заданному объекту (блокировка тоже проверяется)
system.accessCheck = function (_user, object) {
	return system.userCheck(_user)
		.then(user => {
			if (user.disabled) throw system.error('Пользователь ' + _user + ' заблокирован')
			return system.access(_user, { object: object })
				.then(access => {
					if (access && access.granted)	return access
					throw system.error('Не разрешен доступ к операции')
				})
		})
}

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
	let _node = this.config
	let _path = path.split(sep)
	if (_path.length === 1 && _path[0] === '') return _node
	for (let key of _path) {
		if ((typeof _node === 'object') && (key in _node)) _node = _node[key]; else return null
	}
	return _node
}

module.exports = config.then(cfg => {
	system.config = cfg
	let syscfg = cfg.system
	// eslint-disable-all
	for (var key in syscfg.path) {
		if (!path.isAbsolute(syscfg.path[key])) { // достраиваем относительные пути до полных
			syscfg.path[key] = path.join(ROOT_DIR, syscfg.path[key])
		}
	}
	syscfg.path.root = ROOT_DIR

	if (syscfg.ssl.cert) {
		return promisify(fs.readFile)(path.join(ROOT_DIR, 'sslcert', syscfg.ssl.cert))
			.then(cert => {
				syscfg.ssl.certData = cert
				return system
			})
	}

	return system
})
