'use strict'

/*
	конвертация [settings], [objects], [objects_meta], [users] -> в [system]
	\> node migrate <'admin-login'>
*/
const db = require('synapse/sqlite')('../db/synapse.db')
// const newDb = require('synapse/sqlite')('../db/newDb.db')
const treeMap = require('synapse/sqlite-tree-mapper')(db, 'system')
const fs = require('fs')

Promise.all([
	treeMap(),
	db('SELECT * FROM settings'),
	db('SELECT *, (select meta from objects_meta where object = objects.id) as meta	FROM objects'),
	db('SELECT * FROM users'),
	db('SELECT * FROM jobs')
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
		tree.config = oldConfig // -- вот такая магия. просто присваиваем старый конфиг и данные льются в таблицу [config]
		/*
		setTimeout(() => {
			db.run('update system_values set value = "{-}" where idp = 1 and name = "ssl" ')
			db.run('update system_values set value = "{-}" where idp = 1 and name = "path" ')
		}, 1000)
		*/
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
				for (let key in meta)
					base[item.name][key] = meta[key]
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
		var oldJobs = jobs.reduce((all, job) => {
			all[job.id] = {}
			for (let key in job) {
				all[job.id][key] = job[key]
			}
			let params = JSON.parse(job.params)
			all[job.id]['params'] = {}
			if ('argv' in params) all[job.id]['argv'] = params['argv']
			if ('pp' in params) {
				all[job.id]['emails'] = params['pp']['email']
				all[job.id]['print'] = params['pp']['print']
			}
			return all
		}, {})
		tree.jobs = oldJobs // (jobs.id=4)
		/*
		Поскольку все присвоения tree. = {}  в реале стартуют практически одновременно, а затем уже 
		бегут асинхронно вниз по "дереву" то в теории сначала будут созданы корневые разделы 
		config.id = 1, objects.id = 2, users.id = 3 ....
		а затем уже вложения каждой ветки с бОльшими id, но лучше это дело проверить
		*/
		setTimeout(() => {
			console.log('config.id  = ' + tree._id('config'))
			console.log('objects.id = ' + tree._id('objects'))
			console.log('users.id   = ' + tree._id('users'))
			console.log('jobs.id    = ' + tree._id('jobs'))
			console.log('Выполнено!')
			let admin = process.argv[3]
			if (tree.users[admin]) {
				tree.users[admin]._acl = String(tree.objects.admin._id('Пользователи'))
				console.log('Права администратора назначены: ', tree.users[admin])
			} else {
				console.log('Администратор не указан, или указан неверно. Права не назначены!')
			}
			/*
			Promise.all([db.close(), newDb.close()]).then(()=> {
				console.log('Переименовываю synapse.db => synapse.db.save')
				fs.renameSync('../db/synapse.db', '../db/synapse.db.save')
				fs.renameSync('../db/newDb.db', '../db/synapse.db')
			})
			*/

		}, 1000)
		
}).catch(console.log)
