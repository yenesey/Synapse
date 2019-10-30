'use strict'

/*
	конвертация [settings], [objects], [objects_meta], [users] -> в [system]
	выполнить последовательно:
	\> node migrate
	\> node migrate --import 'admin-login'
*/
const db = require('synapse/sqlite')('../db/synapse.db')
const treeMap = require('synapse/sqlite-tree-mapper')(db, 'system')

// -------------------------------------------
let transaction = `
BEGIN;

DROP TABLE IF EXISTS system_nodes;
CREATE TABLE system_nodes (
    id    INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    idp   INTEGER REFERENCES system_nodes (id) ON DELETE CASCADE,--  NOT NULL,
    name  STRING  NOT NULL
);
CREATE UNIQUE INDEX node_unique ON system_nodes (idp, name);

DROP TABLE IF EXISTS system_values;
CREATE TABLE system_values (
    id     INTEGER REFERENCES system_nodes (id) ON DELETE CASCADE,
    value  STRING  -- NOT NULL
);

DROP VIEW IF EXISTS vw_system_recursive;
CREATE VIEW vw_system_recursive AS
WITH RECURSIVE nested (
    id,
    level,
    path
)
AS (
    SELECT 
        id,
        0,
        name
    FROM 
        system_nodes
    WHERE 
        idp is null
    UNION
    SELECT 
        n.id,
        nested.level + 1,
        nested.path || '/' || name
    FROM
        system_nodes n,
        nested
    WHERE
        n.idp = nested.id
)
SELECT 
    nested.path,
    n.id,
    substr('                       ', 1, level * 6) || n.name AS name,
    v.value
FROM 
    nested,
    system_nodes n left join system_values v on n.id = v.id
WHERE
    n.id = nested.id
ORDER BY 
    nested.path;

COMMIT;
`
// -------------------------------------------

if (process.argv[2] === '--import') {
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
			}, 1000)
			
		}).catch(console.log)
} else {

	transaction.split(';')
	.reduce((chain, statement, index) => chain.then(() => db.run(statement).then((r) => {
		console.log(statement.substr(0,12), '..... ->>> ', r)
		if (index === 6) {
			console.log('[system] - таблица создана')
		}
		if (index === 8) {
			console.log('[vw_system_recursive] - вьюха создана')
		}
	})
	), Promise.resolve())

}