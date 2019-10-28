'use strict'

/*
	node-sqlite3 wrapper (with promises)
	usage:
		 var sqlite = require('./sqlite.js');
		 var db = sqlite('c:\\dbfileName.db');
		 db('select * from users').then((result)=>)
		 db.run('delete * from users where id = 1').then((delCount)=>)
*/
const sqlite3 = require('sqlite3').verbose()

module.exports = function (fileName) {
	// -
	let db = new sqlite3.Database(fileName, function (err) {
		if (err) {
			err.message += ' ' + fileName // -- пусть инфы будет немножко больше
			throw err
		}
	})
	// db.loadExtension(path.join( __dirname, 'sqlite3_unicode.sqlext') , err=>{if (err) console.log('db.loadExtension:' + err)})
	db.run('PRAGMA foreign_keys=ON')

	const _default = function (sql, params) {
		return new Promise(function (resolve, reject) {
			db.all(sql, params,	function (err, result) {
				if (err) reject(err)
				resolve(result)
			})
		})
	}

	_default.run = function (sql, params) {
		return new Promise(function (resolve, reject) {
			db.run(sql, params,	function (err) {
				if (err) reject(err)
				console.log(sql.substr(0, 12), ' ..... ->>> ', params,  this.lastID)
				resolve(this.lastID || this.changes)
			})
		})
	}

	_default.transact = function (statements) {
		// statements = [  [sql: String, <binds: Object> ] ..., [...], [...] ]
		if (!(statements instanceof Array)) return Promise.reject(new Error('statements are not properly defined'))

		return statements.reduce((chain, current) =>
			chain.then(() => _default.run(...current)),
		_default.run('begin')
		)
			.then((r) => console.log('sadf')  )/*_default.run('commit') */
			/*
			.catch(err => {
				console.log(err.message)
				_default.run('rollback')
			})
			.then(() => console.log('sadf'))
			*/
			// .then(r => {results.push[r] })
	}

	return _default
}
