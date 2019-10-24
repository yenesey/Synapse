'use strict'

/*
	конвертация [settings], [objects], [objects_meta], [users] -> в [system]
	выполнить последовательно:
	\> node migrate
	\> node migrate --import
*/
const db = require('synapse/sqlite')('../db/synapse.db')
const treeMap = require('synapse/sqlite-tree-mapper')(db, 'system')

// -------------------------------------------
let sql = `

DROP TABLE IF EXISTS system;
CREATE TABLE system (
    id    INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    idp   INTEGER REFERENCES system (id) ON DELETE CASCADE,--  NOT NULL,
    name  STRING  NOT NULL,
    value STRING
);
INSERT INTO system (id, idp, name, value ) VALUES (-1, -1, 'root', NULL);
CREATE UNIQUE INDEX node_unique ON system (idp, name);

DROP VIEW vw_system_recursive;
CREATE VIEW vw_system_recursive AS
WITH RECURSIVE Node (
    id,
    level,
    path
)
AS (
    SELECT id,
           0,
           name
      FROM system
     WHERE idp = -1 AND 
           id != -1
    UNION
    SELECT system.id,
           Node.level + 1,
           Node.path || '/' || name
      FROM system,
           Node
     WHERE system.idp = Node.id
)
SELECT Node.path,
       system.id,
       substr('                       ', 1, level * 6) || name AS name,
       system.value
  FROM Node,
       system
 WHERE system.id = Node.id
 ORDER BY Node.path;

`.split(';')

// -------------------------------------------

if (process.argv[2] === '--import') {
	Promise.all([
		treeMap(-1),
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

			setTimeout(() => {
				db('update system set value = "{-}" where idp = 1 and name = "ssl" ')
				db('update system set value = "{-}" where idp = 1 and name = "path" ')
			}, 1000)

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
				for (let key in params) {
					all[job.id]['params'][key] = params[key]
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
			}, 1000)
			
		}).catch(console.log)
} else {
	db.serialize(function () {
		let counter = 0
		for (let q of sql) {
			db(q).then(() => {
				counter++
				if (counter === 5) {
					console.log('[system] - таблица создана')
				}
				if (counter === 6) {
					console.log('[vw_system_recursive] - вьюха создана')
				}

			})
		}
	})
}