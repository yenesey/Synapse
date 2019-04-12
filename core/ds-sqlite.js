'use strict'
/*
  источник данных Sqlite
*/
var	dbs = {} // кэш баз данных

module.exports = function () {
	return function (query) { // query = {db:'<db file name>', sql:'select...'}
		if (!(query.db in dbs))	{
			dbs[query.db] = require('./sqlite')(query.db)
		}
		return dbs[query.db](query.sql)
	}
}
