'use strict'
/*
	 - системная база данных system.db = function(<SQL>, [<params>])
	 - системные функции и константы
	 - конфигурация системы  system.config = {}
*/

const path = require('path')
const promisify = require('util').promisify
const fs = require('fs')
const ROOT_DIR = path.join(__dirname, '..')
const deepProxy = require('./deep-proxy')

const system = {}

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
system.db = require('./sqlite')(path.join(ROOT_DIR, 'db/synapse.db')) // основная БД приложения
// -------------------------------------------------------------------------------
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
					console.log('[error]:'  + err.message.replace('\n', '') + '   object.id=' + access[index].id)
				}
				return {...obj, ...meta}
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

system.errorHandler = function (err, req, res) {
	if (err.code === system.ERROR) {
		if (res) res.json({ error: err.message })
		return true // с запланированной ошибкой расправляемся быстро
	}
	if (req) {
		err.user = req.ntlm.UserName
		err.userAddr = req.connection.remoteAddress
	}
	console.log(err) // неизвестную ошибку пишем в журнал
	if (res) res.json({ error: 'Ошибка!' })
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

module.exports = system.db('SELECT * FROM settings')
	.then(select => {
		var config = select.reduce((all, item) => {
			if (!(item.group in all))	{
				all[item.group] = {}
			}
			all[item.group][item.key] = String(item.value)
			return all
		}, {}
		)

		for (var key in config.path) {
			if (!path.isAbsolute(config.path[key])) { // достраиваем относительные пути до полных
				config.path[key] = path.join(ROOT_DIR, config.path[key])
			}
		}

		config.path.root = ROOT_DIR

		system.config = deepProxy(config, { // мега-фича :) автозапись установок в случае изменения
			set (target, path, value, receiver) {
				var sql = Reflect.has(target, key)
					? `UPDATE settings SET value = $value WHERE [group] = $group AND [key] = $key`
					: `INSERT INTO settings ([group], [key], value, description) VALUES ($group, $key, $value, '')`
				system.db(sql, { $group: path[0], $key: path[1], $value: value })
					.then(() => console.log('[system]: config updated for ' + path.join('.')))
					.catch(console.log)
			},
			deleteProperty (target, path) {
				system.db(`DELETE FROM settings WHERE [group] = $group AND [key] = $key`, { $group: path[0], $key: path[1] })
					.then(() => console.log('[system]: delete ' + path.join('.')))
					.catch(console.log)
			}
		})

		if (system.config.ssl.cert)	{
			return promisify(fs.readFile)(path.join(ROOT_DIR, 'sslcert', system.config.ssl.cert))
				.then(cert => {
					system.ssl = {}
					system.ssl.certData = cert
					return system
				})
		}
		return system
	})
