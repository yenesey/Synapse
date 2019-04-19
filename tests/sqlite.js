'use strict'

//const db = require('./core/sqlite')('./db/synapse.db')
const N = 100000;

(async function () {
	//console.time('db')
	//for (var i = 1; i < N; i++) await db(`select * from objects where id = ${i}`)
	//console.timeEnd('db')

	var sqlite3 = require('sqlite3').verbose();
	var db1 = new sqlite3.Database('./db/synapse.db');

	db1.serialize(function () {
		console.time('db')
		var stmt = db1.prepare(`select * from objects where id = ?`)
		for (var i = 0; i < N; i++) stmt.run(i)
		stmt.finalize()
		console.timeEnd('db')
	})
})()

/*
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

db.serialize(function() {
	db.run("CREATE TABLE lorem (info TEXT)");

	var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
	for (var i = 0; i < 10; i++) {
		stmt.run("Ipsum " + i);
	}
	stmt.finalize();

	db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
		console.log(row.id + ": " + row.info);
	});
});
console.log('HI!')
db.close();
*/
