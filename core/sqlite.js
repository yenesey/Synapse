'use strict'

/*
	Обертка - "швейцарский нож" для SQLite
	пример:
		 var sqlite = require('./sqlite.js');
		 var db = sqlite('c:\\dbfile.db');
		 db('select * from users').then((result)=>)

	!!! result зависит от типа запроса (select / insert и т.п.)
	!!! большие объемы данных могут тормозить event loop, т.к. здесь НЕ используется сериализация
*/

module.exports = function (dbFile) {
	var openDatabase = new Promise(function (resolve, reject) {
		var sqlite3 = require('sqlite3').verbose()
		var db = new sqlite3.Database(dbFile, // начинаем открывать файл, не дожидаясь вызова запроса
			function (err) { // --sqlite3 не возвращает в callback ничего кроме ошибки - поэтому коряво без promiseify....
				if (err) {
					err.message += ' ' + dbFile // --пусть инфы будет немножко больше
					reject(err)
				} else resolve(db)
				// db.loadExtension(path.join( __dirname, 'sqlite3_unicode.sqlext') , err=>{if (err) console.log('db.loadExtension:' + err)})
			})
			db.run('PRAGMA foreign_keys=ON')
	})

	return function (sql, params) {
		return openDatabase // -- к этому моменту база данных может быть уже открыта, а может и нет...
			.then(function (db) {
				return new Promise(function (resolve, reject) {
					function _dbcb (err, result) {
						if (err) {
							reject(err)
						}	else {
							resolve(this.lastID || this.changes || result)
						}
					}

					if (sql.trim().substring(0, 6).toLowerCase() === 'select') {
						db.all(sql, params,	_dbcb)
					} else {
						db.run(sql, params,	_dbcb)
					}
				}) // Promise
			})
	}
}
