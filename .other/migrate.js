'use strict'

/*
	миграция старой базы на новую
	[settings], [objects], [objects_meta], [users] -> в [system_nodes][system_values]

	\> node migrate <admin-login>
*/

const sqlite = require('better-sqlite3')
const path = require('path')
const dbDir = path.join(require.main.path, '../db')

const db = sqlite(dbDir + '/synapse.db')
const newDb = sqlite(dbDir + '/newDb.db')

const treeStore = require('sqlite-tree-store')
const treeMap = treeStore(newDb, 'system')

const fs = require('fs')

Promise.all([
	treeMap(),
	db.prepare('SELECT * FROM settings').all(),
	db.prepare('SELECT *, (select meta from objects_meta where object = objects.id) as meta	FROM objects').all(),
	db.prepare('SELECT * FROM users').all(),
	db.prepare('SELECT * FROM jobs').all()
])
	.then(([tree, settings, objects, users, jobs]) => {
		// Мапим конфиг в объект
		var oldConfig = settings.reduce((all, item) => {
			if (!(item.group in all))	{
				all[item.group] = {}
			}
			all[item.group][item.key] = item.value
			return all
		}, {})

		// сохраняем конфиг (по идее system.id=1)
		tree.config = oldConfig // -- вот такая магия. просто присваиваем старый конфиг и данные льются в таблицу

		// Мапим объекты
		var oldObjects = objects.reduce((all, item) => {
			if (!(item.class in all))	{
				all[item.class] = {}
			}
			var base = all[item.class]
			base[item.name] = {}

			if (item.description) {
				base[item.name]['description'] = item.description
			}
			if (item.meta) {
				let meta = JSON.parse(item.meta)
				for (let key in meta) {
					base[item.name][key] = meta[key]
				}
			}
			return all
		}, {})
		tree.objects = oldObjects // Сохраняем объекты (objects.id=2)

		// Мапим пользователей
		var oldUsers = users.reduce((all, user) => {
			if (!(user.login in all))	{
				all[user.login] = {}
			}
			all[user.login].email = user.email
			all[user.login].name = user.name
			if (user.disabled) all[user.login].disabled = user.disabled
			return all
		}, {})
		tree.users = oldUsers // Сохраняем пользователей (users.id=3)

		// Мапим jobs
		var oldJobs = jobs.map((job) => {
			let ret = {}
			for (let key in job) {
				ret[key] = job[key]
			}
			let params = JSON.parse(job.params)
			ret['params'] = {}
			if ('argv' in params) ret['argv'] = params['argv']
			if ('pp' in params) {
				ret['emails'] = params['pp']['email']
				ret['print'] = params['pp']['print']
			}
			return ret
		})
		tree.jobs = oldJobs // (jobs.id=4)


		console.log('config.id  = ' + tree._.config.id)
		console.log('objects.id = ' + tree._.objects.id)
		console.log('users.id   = ' + tree._.users.id)
		console.log('jobs.id    = ' + tree._.jobs.id)
		console.log('Выполнено!')
		let admin = process.argv[2]
		if (tree.users[admin]) {
			tree.users[admin]._acl = String(tree.objects.admin._['Пользователи'].id)
			console.log('Права администратора назначены: ', tree.users[admin])
		} else {
			console.log('Администратор не указан, или указан неверно. Права не назначены!')
		}
		Promise.all([db.close(), newDb.close()]).then(() => {
			console.log('Переименовываю synapse.db => synapse.db.save')
			fs.renameSync(dbDir + '/synapse.db', dbDir + '/synapse.db.save')
			fs.renameSync(dbDir + '/newDb.db',  dbDir + '/synapse.db')
		}).catch(err => console.log('Не удается переименовать файлы баз. Возможно, база открыта где то еще?'))

	}).catch(console.log)
