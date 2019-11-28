'use strict'

/*
	just sqlite3 wrapper (with promises)
	usage:
		 var sqlite = require('./sqlite.js');
		 var db = sqlite('c:\\dbfileName.db');
		 db('select * from users').then(result => ... )
		 db.run('delete * from users where id = 1').then(deletedCount => ... )
*/
const sqlite3 = require('sqlite3').verbose()

module.exports = function (fileName) {
	// -
	const db = new sqlite3.Database(fileName, function (err) {
		if (err) {
			err.message += ' ' + fileName // -- пусть инфы будет немножко больше
			throw err
		}
	})
	// db.loadExtension(path.join( __dirname, 'sqlite3_unicode.sqlext') , err=>{if (err) {}))
	db.run('PRAGMA foreign_keys=ON')

	const _default = function (sql, params) {
		return new Promise(function (resolve, reject) {
			db.all(sql, params, function (err, result) {
				err ? reject(err) : resolve(result)
			})
		})
	}

	_default.run = function (sql, params) {
		return new Promise(function (resolve, reject) {
			db.run(sql, params, function (err) {
				err ? reject(err) : resolve(this.lastID || this.changes)
			})
		})
	}

	_default.close = function () {
		return new Promise(function (resolve, reject) {
			db.close(function (err) {
				err ? reject(err) : resolve()
			})
		})
	}

	return _default
}
