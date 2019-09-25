'use strict'

/*
	конвертация settings, objects, objects_meta, users -> в config
	положить в каталог с synapse.db, или прописать путь.
	\> node cvt
	\> node cvt --import
*/
const db = require('synapse/sqlite')('../db/synapse.db')
const config = require('synapse/sqlite-tree-mapper')(db, 'config')

// -------------------------------------------
let sql = `
DROP TABLE config;
CREATE TABLE config (
    id    INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    idp   INTEGER REFERENCES config (id) ON DELETE CASCADE
                  NOT NULL,
    [key] STRING  NOT NULL,
    value STRING
);
INSERT INTO config (id, idp, [key], value ) VALUES (-1, -1, '_root_', NULL);
CREATE INDEX "" ON config (idp ASC);
CREATE UNIQUE INDEX idp_and_key ON config (idp, "key");

DROP VIEW vw_config_recursive;
CREATE VIEW vw_config_recursive AS
WITH RECURSIVE Node (
        id,
        level,
        path
    )
    AS (
        SELECT id,
               0,
               [key]
          FROM config
         WHERE idp = -1 AND 
               id != -1
        UNION
        SELECT config.id,
               Node.level + 1,
               Node.path || '/' || [key]
          FROM config,
               Node
         WHERE config.idp = Node.id
    )
    SELECT Node.path,
           config.id,
           substr('                       ', 1, level * 6) || "key" AS [key],
           config.value
      FROM Node,
           config
     WHERE config.id = Node.id
     ORDER BY Node.path;
`.split(';')
// -------------------------------------------

if (process.argv[2] === '--import') {
	Promise.all([
		config,

		db('SELECT * FROM settings'),
		db('SELECT objects.*, (select meta from objects_meta where object = objects.id) as meta	FROM objects'),
		db('SELECT * FROM users')
	])
		.then(([config, settings, objects, users]) => {

			var oldConfig = settings.reduce((all, item) => {
				if (!(item.group in all))	{
					all[item.group] = {}
				}
				all[item.group][item.key] = item.value
				return all
			}, {})
			config.system = oldConfig // -- вот такая магия. просто присваиваем старый конфиг и данные льются в таблицу [config]

			setTimeout(() => {
				db('update config set value = "+u" where idp = 1 and key = "ssl" ')
				db('update config set value = "+u" where idp = 1 and key = "path" ')
			}, 1000)

			var oldObjects = objects.reduce((all, item) => {
				if (!(item.class in all))	{
					all[item.class] = {}
				}
				all[item.class][item.name] = {}
				if (item.description) all[item.class][item.name]['description'] = item.description
				if (item.meta) {
					let meta = JSON.parse(item.meta)
					for (let key in meta)
						all[item.class][item.name][key] = meta[key]
				}
				return all
			}, {})

			config.objects = oldObjects

			var oldUsers = users.reduce((all, user) => {
				if (!(user.login in all))	{
					all[user.login] = {}
				}
				all[user.login].email = user.email
				all[user.login].name = user.name
				if (user.disabled) all[user.login].disabled = user.disabled
				return all
			}, {})

			config.users = oldUsers

			console.log('Успешно выполнено!!!')
		}).catch(console.log)
} else {
	db.serialize(function () {
		let counter = 0
		for (let q of sql) {
			db(q).then(() => {
				counter++
				if (counter === 5) {
					console.log('Структура создана')
				}
			})
		}
	})
}