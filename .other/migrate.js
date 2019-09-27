'use strict'

/*
	конвертация settings, objects, objects_meta, users -> в config
	положить в каталог с synapse.db, или прописать путь.
	\> node migrate
	\> node migrate --import
*/
const db = require('synapse/sqlite')('../db/synapse.db')
const treeMap = require('synapse/sqlite-tree-mapper')(db, 'system')

// -------------------------------------------
let sql = `
	 
DROP TABLE IF EXISTS system_loops;

CREATE TABLE system_loops (
	id1  INTEGER   REFERENCES system (id) ON DELETE CASCADE ON UPDATE CASCADE,
	id2  INTEGER   REFERENCES system (id) ON DELETE CASCADE ON UPDATE CASCADE,
	attr CHAR (16) 
);

DROP TABLE IF EXISTS system;
CREATE TABLE system (
    id    INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    idp   INTEGER REFERENCES system (id) ON DELETE CASCADE  NOT NULL,
    [key] STRING  NOT NULL,
    value STRING
);
INSERT INTO system (id, idp, [key], value ) VALUES (-1, -1, 'root', NULL);
CREATE INDEX "" ON system (idp ASC);
CREATE UNIQUE INDEX idp_and_key ON system (idp, "key");

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
               [key]
          FROM system
         WHERE idp = -1 AND 
               id != -1
        UNION
        SELECT system.id,
               Node.level + 1,
               Node.path || '/' || [key]
          FROM system,
               Node
         WHERE system.idp = Node.id
    )
    SELECT Node.path,
           system.id,
           substr('                       ', 1, level * 6) || "key" AS [key],
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
				db('update system set value = "{-}" where idp = 1 and key = "ssl" ')
				db('update system set value = "{-}" where idp = 1 and key = "path" ')
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
				if (Object.keys(base[item.name]).length === 0) base[item.name] = '{+}'
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
				!!!Поскольку все присвоения tree. = {}  в реале стартуют практически одновременно,
			то в теории сначала будут созданы корневые разделы {config : {id: 1}, objects: {id: 2}, users: {id: 3}}
			а затем уже вложения с бОльшими id, но лучше это дело проверить!!!!
			*/

			console.log('Успешно выполнено!!!')
		}).catch(console.log)
} else {
	db.serialize(function () {
		let counter = 0
		for (let q of sql) {
			db(q).then(() => {
				counter++
				if (counter === 2) {
					console.log('[system_loops] - таблица создана')
				}
				if (counter === 7) {
					console.log('[system] - таблица создана')
				}
				if (counter === 9) {
					console.log('[vw_system_recursive] - вьюха создана')
				}

			})
		}
	})
}