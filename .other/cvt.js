'use strict'

/*
	конвертация settings, objects, objects_meta, users -> в config
	положить в каталог с synapse.db, или прописать путь.
	\> node cvt
	\> node cvt --import
*/
const db = require('synapse/sqlite')('../db/synapse.db')
const treeMap = require('synapse/sqlite-tree-mapper')(db, 'system')

// -------------------------------------------
let sql = `
DROP TABLE system;
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
			db('SELECT * FROM users')
	])
		.then(([tree, settings, objects, users]) => {
			
			// Мапим конфиг в объект
			var oldConfig = settings.reduce((all, item) => {
				if (!(item.group in all))	{
					all[item.group] = {}
				}
				all[item.group][item.key] = item.value
				return all
			}, {})
			
			// сохраняем конфиг (по идее system.id=1)
			tree.system = oldConfig // -- вот такая магия. просто присваиваем старый конфиг и данные льются в таблицу [config]

			setTimeout(() => {
				db('update system set value = "+u" where idp = 1 and key = "ssl" ')
				db('update system set value = "+u" where idp = 1 and key = "path" ')
			}, 1000)

			// Мапим объекты
			var oldObjects = objects.reduce((all, item) => {
				if (!(item.class in all))	{
					all[item.class] = {}
				}
				all[item.class][item.name] = {}
				if (item.description) {
					all[item.class][item.name]['description'] = item.description
				}	
				if (item.meta) {
					let meta = JSON.parse(item.meta)
					for (let key in meta)
						all[item.class][item.name][key] = meta[key]
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
			/*
				!!!Поскольку все 3 присвоения tree. = {}  в реале стартуют практически одновременно,
			то в теории сначала будут созданы корневые разделы {config : {id: 1}, objects: {id: 2}, users: {id: 3}}
			но лучше это дело проверить!!!!
			*/

			console.log('Успешно выполнено!!!')
		}).catch(console.log)
} else {
	db.serialize(function () {
		let counter = 0
		for (let q of sql) {
			db(q).then(() => {
				counter++
				if (counter === 5) {
					console.log('[system] - структура создана')
				}
				if (counter === 7) {
					console.log('[vw_system_recursive] - вьюха создана')
				}
			})
		}
	})
}