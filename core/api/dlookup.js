'use strict'
/*
  Серверная часть компонента dlookup
  NOTE: УСТАРЕЛО! - оставлено для совместимости
*/
const bodyParser = require('body-parser')

const sqlite = require('better-sqlite3')
const dbs = {} // кэш баз sqlite

function sqliteq(query) { // query = {db:'<db file name>', sql:'select...'}
	if (!(query.db in dbs))	{
		dbs[query.db] = sqlite(query.db)
	}
	return dbs[query.db].prepare(query.sql).all()
}

function iif (entry, pre, pos) {
	// макро для вставки строки (entry) с заданными (опционально) префиксом и постфиксом
	if (!pre) pre = ''
	if (!pos) pos = ''
	return (entry ? pre + entry + pos : '')
}

function dedupe (str) { // fix для sqlite
	//	функция заменяет задвоения в SQL строке между "select" и "from" на их номерные дубли
	str = str.replace(/\%|\s/g, '')
	var cols = str.split(',').map(item => item.toLowerCase())

	var dupes = cols.map((item, index) => {
		var count = 0
		for (var i = index - 1; i >= 0; i--) if (cols[i] === item) count++
		return count
	})
	cols = cols.map((item, index) => {
		if (dupes[index]) {
			return item + ' as ' + item + '_' + dupes[index]
		} else {
			return item
		}
	})
	return cols.join(',')
}

function _sql (query) {
	// формирование SQL строки из объекта query
	return 'SELECT ' +
		dedupe(query.fields || query.lookIn) + ' ' +
		'FROM ' +
		query.table + ' ' +
		'WHERE (' +
		query.lookIn.split(',').reduce((all, field) => {
			/(%)?([\w|\d|\.]+)(%)?/.test(field)
			return iif(all, '', ' OR ') + '(lower(' + RegExp.$2 + ') LIKE lower(\'' + RegExp.$1 + query.request + RegExp.$3 + '\'))'
		}, '') + ') ' + iif(query.where, ' AND (', ') ') +
		iif(query.order, ' ORDER BY ')
}

module.exports = function (system) {
	// -
	const config = system.config
	const ora = require('../ds-oracle')(config.oracle.ibso)

	this.post('/', bodyParser.json(), function (req, res) {
		//
		//  query spec
		//  {	db: <имя базы|псевдоним :ldap>
		//		table: <имя таблицы/вьюхи>
		//    lookIn: <колонки где ищем через запятую>
		//    request: <строка поиска>
		//    where: <конструкция sql where>, допускается использование %userId%
		//    order: <конструкция sql order by>
		//    fields: <колонки для результата через запятую>
		//  }
		//
		let query = req.body
		let user = req.user

		if (/(select|update|replace|delete)\s/mig.test(JSON.stringify(query))) {
			res.json({ error: 'Syntax error: SQL statements not allowed!' })
			return
		}

		if (query.where) query.where = query.where.replace(/%userId%/g, user.id)

		if (query.db) {
			res.json(
				sqliteq({ sql: _sql(query),	db: query.db })
			)
			return
		}

		// файл|ldap не указан? значит это запрос в ibso
		let access = system.access(user, { object: system.db.objects.ibs._[query.table].id })
		if (!access.granted) {
			res.json({ error: 'Access denied!' })
			return
		}

		return ora(_sql(query))
			.then(data => res.json(data))
			.catch(err => system.errorHandler(err, req, res))
	})
}
