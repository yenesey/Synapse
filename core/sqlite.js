'use strict'

/*
	Обертка - "швейцарский нож" для SQLite
	пример:
		 var sqlite = require('./sqlite.js');
		 var db = sqlite('c:\\dbfileName.db');
		 db('select * from users').then((result)=>)

	!!! result зависит от типа запроса (select / insert и т.п.)
	!!! большие объемы данных могут тормозить event loop, т.к. здесь НЕ используется сериализация
*/
const sqlite3 = require('sqlite3').verbose()

module.exports = function (fileName) {
	// -
	let db = new sqlite3.Database(fileName, function (err) {
		if (err) {
			err.message += ' ' + fileName // --пусть инфы будет немножко больше
			throw err
		}
	})
	// db.loadExtension(path.join( __dirname, 'sqlite3_unicode.sqlext') , err=>{if (err) console.log('db.loadExtension:' + err)})
	db.run('PRAGMA foreign_keys=ON')

	function query (sql, params) {
		return new Promise(function (resolve, reject) {
			if (/update|replace|insert/mig.test(sql)) {
				db.run(sql, params,	function (err) {
					if (err) reject(err)
					resolve(this.lastID || this.changes)
				})
			} else {
				db.all(sql, params,	function (err, result) {
					if (err) reject(err)
					resolve(result)
				})
			}
		})
	}
	query.serialize = db.serialize.bind(db)
	return query
}
