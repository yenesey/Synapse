'use strict'

/*
const N = 10000000000
console.time('db')
for (var i = 1; i < N; i++) ;
console.timeEnd('db')
*/
/*
var sqlite3 = require('sqlite3').verbose()
var db1 = new sqlite3.Database('../db/synapse.db')

function qry (sql, param) {
	return new Promise(function (resolve, reject) {
		var data = []
		db1.each(sql, param, function (err, row) {
			if (err) reject(err)
			data.push(row)
			console.log(row)
		}, function (err, count) {
			if (err) reject(err)
			resolve(data)
		})
	})
}
qry('select * from conf order by id_p').then(console.log)
*/

const sleep = require('sleep')
var sqlite = require('synapse/sqlite.js')
var db = sqlite('../db/synapse.db')
db('select * from conf order by id_p').then(console.log)

//sleep.sleep(10)
/*
const N = 10000000000
console.time('db')
for (var i = 1; i < N; i++);
console.timeEnd('db')
console.log('loop ', i, ' times')
*/
