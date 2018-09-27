"use strict";

/*
  Серверная часть компонента dlookup
*/

var express = require('express');
var router = express.Router({strict:true});
var bodyParser = require('body-parser');

function iif(entry, pre, pos){
//макро для вставки строки (entry) с заданными (опционально) префиксом и постфиксом
	if (!pre) pre = '';
	if (!pos) pos = '';
	return (entry? pre + entry + pos : '')
}

function dedupe(str){//fix для sqlite
//функция заменяет задвоения в SQL строке между "select" и "from" на их номерные дубли
	str = str.replace(/\%|\s/g, '');
	var cols = str.split(',').map(item=>item.toLowerCase());

	var	dupes = cols.map((item, index)=>{
		var count = 0;
		for (var i = index-1; i >= 0; i--)
			if (cols[i] == item) count++;
		return count
	})
	cols = cols.map((item, index)=>{
		if (dupes[index])
			return item + ' as ' + item + '_' + dupes[index];
		else 
			return item
	})
	return cols.join(',')
}

function _sql(query){
//формирование SQL строки из объекта query
	return "SELECT " + 
		dedupe( query.fields || query.lookIn ) + " " +
	"FROM " + 
		query.table + " " +
	"WHERE (" +	
		query.lookIn.split(",").reduce((all, field)=>{
			(/(%)?([\w|\d]+)(%)?/).test(field); 
			return iif(all, "", " OR ") + "(lower(" + RegExp.$2 + ") LIKE lower('" + RegExp.$1 + query.request + RegExp.$3 + "'))"
		}, "") + ") " + iif(query.where, " AND (", ") ") +
	iif(query.order, " ORDER BY ")
}

function _ldap(query){
	var lookIn = query.lookIn.replace(/%/g, "*").split(",").map(el=>el.trim());
	
	return {
		fields : query.lookIn.replace(/%|\s/g, "").split(","),
		query : query.request !== '%' 
			? lookIn.reduce((all, field)=>{
				(/(\*)?([\w|\d]+)(\*)?/).test(field); 
				return (all || "") + '(' + RegExp.$2 + "=" + RegExp.$1 + query.request + RegExp.$3 + ')'
			}, "|") 
			: ""
	}
}

module.exports=function(system){

function ibso(user, constraint){ //constraint = [{JSON}... {JSON}] в ibso используется для ограничения по реквизиту
	if (!constraint) return Promise.resolve('')
	if (!(constraint instanceof Array))	constraint = [constraint];

	return constraint.reduce((p, obj) => 
		p.then(clause => {
			if (!clause) clause = '';	
			return system.access(user, {class : obj.class})
				.then(access => access.filter(el => el.granted).map(el => el.name))
				.then(lst => clause +	(clause?' AND ':' ') +
					'(' + 
							lst.reduce((all, next) => all + (all?' OR ':'') + obj.column + ' ' + obj.operator + ' \'' + next + '\''	, obj.column + ' is null') + 
					')'
				)
		})
		,Promise.resolve("")
	)
}

var ldap = require('../ds-ldap')(system.config.ntlm);
var ora = require('../ds-oracle')(system.config.ibs);
var sqlite = require('../ds-sqlite')();

router.post('/dlookup', bodyParser.json(), function(req, res){ 

	var	query = req.body; 
// 
//  query spec 
//  {	db: <имя базы|псевдоним :ldap>, 
//		table: <имя таблицы/вьюхи>, 
//    lookIn: <колонки где ищем через запятую>, 
//    request: <строка поиска>,
//    where: <конструкция sql where>, допускается использование %userId% 
//    order: <конструкция sql order by>, 
//    fields: <колонки для результата через запятую>, 
//  }

	system.user(req.ntlm.UserName)
	.then(user=>{
		if (!user){
			res.json({error:`Пользователь ${req.ntlm.UserName} не зарегистрирован`});
			return;
		}

		if (/(select|update|replace|delete)\s/mig.test(JSON.stringify(query))){
			res.json({error:'Syntax error: SQL statements not allowed!'});
			return;
		}

		if (query.where) 
			query.where = query.where.replace(/%userId%/g, user.id);
  
		if (query.db){ 
			if (query.db === 'ldap:'){
				return ldap(_ldap(query))
					.then(result=>res.json(result))

			} //если дан файл db, считаем что это локальный sqlite
			return sqlite({
					sql: _sql(query),
					db:query.db
				})
				.then(result=>res.json(result))
		}	
		//файл|ldap не указан? значит это запрос в ibso c контролем доступа и всеми наворотами
		return system.access(user.id, {object : query.table, class:'ibs'})	
			.then(access=>{
				if (!access.granted){
					res.json({error:'Access denied!'});
					return 
				}
				
				return ibso(user.id, access.constraint)
				.then(clause =>{
					if (clause){
						if ('where' in query)
							query.where += ' AND ' + clause;
						else
							query.where = clause
					}
					return ora(_sql(query))	
				})
				.then(data=>res.json(data))
			})			
	})
	.catch(err=>system.errorHandler(err, req, res))

})

return router;

}
////////////////////////////////////////////////////////////////////
