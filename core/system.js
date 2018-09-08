"use strict";

/*
	system, бывший uac (UAC - User Access Control)
	- работа с пользователями, контроль доступа,
	- идентификация
	- аутентификация (через Active Directory / express-ntlm basic auth)
	- авторизация

	- системная база данных system.db = function(<SQL>, [<params>])
	- конфигурация системы  system.config = {} 
*/

var express = require('express'),
	path = require('path'),
	promisify = require('util').promisify,
	fs = require('fs'),
	ntlm = require('express-ntlm'),
	bodyParser = require('body-parser'),
	_root = path.join(__dirname, '..'),
	_ = require('./lib');


var system = Object.create(null);

Object.defineProperties(
		system,
		{
			ADMIN_USERS: {
				value: 1,
				enumerable: true
			},
			ADMIN_SCHEDULER: {
				value: 2,
				enumerable: true
			},
			ADMIN_SQLQUERY: {
				value: 3,
				enumerable: true
			},
			ADMIN_TASKS: {
				value: 4,
				enumerable: true
			},
			ERROR: {
				value: 'SYNAPSE_SYSTEM',
				enumerable: true
			}
		}
)

////////////////////////////////////////////////////////////////////////
function equals(number, string, _var){
	if (typeof _var === 'number')	return number + '=' + _var
	if (typeof _var === 'string')	return string + '=' + '\'' + _var + '\''
} 

system.db = require('./sqlite')(path.join(_root, 'db/synapse.db')); //основная БД приложения
////////////////////////////////////////////////////////////////////////
system.user = function(user){ //данные пользователя по login или id
	return system.db(`SELECT id, login, name, email, disabled FROM users WHERE ${equals('id', 'login', user)} COLLATE NOCASE`)
	.then(select => select.length ? select[0] : null)
}

system.users = function(object){//users of given <object>
	return system.db(`
		select
			users.id, users.name, users.email
		from
			users, objects, user_access
		where
			user_access.user = users.id
			and	(users.disabled = 0 or users.disabled is null)
			and user_access.object = objects.id
			and ${equals('id', 'name', object)}`
	)
}

system.tasks = function(object){//users of given <object>
	return system.db(`
		select
			users.id, users.name, users.email,
			users.disabled,
			case when 
				(select 
					users.id 
				from
					objects,
					user_access
				where
					user_access.user = users.id 
					and user_access.object = objects.id
					and ${equals('id','name', object)} 
					collate nocase
				) 
			is null then 0 else 1 end as granted 
		from
			users
		order by
			users.name`
	)
}

system.access = function(user, options){ 
// карта доступа
// это главная функция, через нее почти весь доступ работает
	var cast = (access)=>access;
	var userCondition = 'users.' + equals('id','login', user)

	var whereCondition = '';
	if (typeof options !== 'undefined'){
		if ('class' in options)	whereCondition += ' and objects.' + equals('', 'class', options.class)

		if ('object' in options){
			cast = (access) => access[0];
			whereCondition += ' and objects.' + equals('id', 'name', options.object)
		}
	}
	
	return system.db(`
		SELECT
			objects.id, 
			objects.name, 
			objects.class, 
			objects.description,	 
			objects_meta.meta,
			case when 
				(select 
					users.id 
				from
					users,
					user_access
				where
					users.id = user_access.user 
					and	objects.id = user_access.object 
					and	${userCondition} 
					collate nocase
				)
			is null then 0 else 1 end as granted 
		FROM
			objects
			LEFT OUTER JOIN objects_meta ON objects_meta.object = objects.id
		WHERE
			1=1	
			${whereCondition}
		ORDER BY objects.class, objects.name`
	)
	.then(access => {
		access = access.reduce((all, el, index) => {
			if (index > 0 && (el.id === all[all.length-1].id)) //если id текущего и прежнего элементов совпадают
				all[all.length-1].meta.push(el.meta);	
			else {
				if (el.meta) el.meta = [el.meta];
				all.push(el);
			}
			return all;
		}, [])
		return cast(access)
	})		
}

////////////////////////////////////////////////////////////////////////
system.error = function(message){
	var err = new Error(message)
	err.code = system.ERROR 
	return err
}

system.errorHandler = function(err, req, res){
	if (err.code === system.ERROR){
		if (res) res.json({error : err.message})
		return true // с запланированной ошибкой расправляемся быстро
	} 
	if (req) {
		err.user = req.ntlm.UserName;
		err.userAddr = req.connection.remoteAddress;
	}
	console.log(err) //неизвестную ошибку пишем в журнал
	if (res) res.json({error : 'Ошибка!'})
	return false
}
////////////////////////////////////////////////////////////////////////
//проверка наличия пользователя
system.userCheck = function(_user){ 
	return system.user(_user) 
	.then(user => {
		if (user) return user
		throw system.error('Пользователь ' + _user + ' не зарегистрирован')
	})
}

//проверка прав доступа пользователя к заданному объекту (блокировка тоже проверяется)
system.accessCheck = function(_user, object){
	return system.userCheck(_user)
	.then(user => {
		if (user.disabled) throw system.error('Пользователь ' + _user + ' заблокирован')
		return system.access(_user, {object : object})
		.then(access => {
			if (access && access.granted)	return access
			throw system.error('Не разрешен доступ к операции')
		})
	})	
}

////////////////////////////////////////////////////////////////////////
var _access = express.Router({strict:true})
////////////////////////////////////////////////////////////////////

_access.get('/access/map', function(req, res){
//выдача полной карты доступа заданного пользователя (req.query.user)
//если пользователь не задан - выдается собственная карта доступа
	var opt = {};
	var queryUser = req.ntlm.UserName;

	if ('class' in req.query) opt.class = req.query.class;
	if ('user' in req.query) queryUser = Number(req.query.user) || req.query.user;

	return system.userCheck(queryUser)
	.then(user => 
		(('user' in req.query) //запрос по другому пользователю?
			?system.accessCheck(req.ntlm.UserName, system.ADMIN_USERS) //тогда нужны привилегии!
			:Promise.resolve() //если запрос по "себе", привилегии не нужны
		)
		.then(()=>system.access(queryUser, opt))
		.then(access=>{
			if (access){
				access.forEach(el => delete el.meta);
				user.access = access;	
			}	
			res.json(user)
		})
	)
	.catch(err => system.errorHandler(err, req, res))
});

_access.put('/access/map', bodyParser.json(), function(req, res){
// операция выдачи/прекращения доступа к заданному объекту 
// req.body = {userId:Number, objectId: Number, granted: Number(1|0)}
	return system.accessCheck(req.ntlm.UserName, system.ADMIN_USERS)
	.then(()=>
		system.db(
			(req.body.granted)
			? `REPLACE INTO user_access VALUES (${req.body.userId}, ${req.body.objectId}, null)`
			: `DELETE FROM user_access WHERE user=${req.body.userId} AND object=${req.body.objectId}`
		)
	)
	.then(result => res.json({result}))
	.catch(err => system.errorHandler(err, req, res))
})

_access.put('/access/user', bodyParser.json(), function(req, res){
// операция добавления(создания) пользователя 
	return system.accessCheck(req.ntlm.UserName, system.ADMIN_USERS)
	.then(()=>{
		if ('id' in req.body)
			return system.db('UPDATE users SET disabled = :1, name = :2, login = :3, email = :4 WHERE id = :5', 
				[Number(req.body.disabled), req.body.name, req.body.login, req.body.email, req.body.id] 
			)
		if ('login' in req.body)
			return system.db(`INSERT INTO users VALUES (null, '${req.body.login.toLowerCase()}', null, '${req.body.name}', '${req.body.email}')`)
	})
	.then(result => res.json({result}))
	.catch(err => system.errorHandler(err, req, res))
})

_access.get('/access/members',function(req, res){
	system.users(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
})

_access.get('/access/tasks',function(req, res){
	system.tasks(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
})

module.exports = system.db('SELECT * FROM settings')
.then(select=>{
	var config = select.reduce((all, item)=>{
		if (!(item.group in all))
			all[item.group] = Object.create(null);
		all[item.group][item.key] = String(item.value);
		return all;
	}, Object.create(null));
 
	for (var key in config.path)
		if (!path.isAbsolute(config.path[key])) //достраиваем относительные пути до полных
			config.path[key] = path.join(_root, config.path[key]);

	config.path.root = _root;	
	system.config = config;

	system.uac = _.combineMiddleware([
		ntlm({//basic-auth через Active Directory (ntlm)
			badrequest : function(req, res, next) {
				res.sendStatus(400);
			},
			forbidden : function(req, res, next) {
				res.statusCode = 401;	//!!!!
				res.setHeader('WWW-Authenticate', 'NTLM');
				next();
			},
			internalservererror	: function(req, res, next) {
				res.status(500).send('NTLM auth error')
//				res.sendStatus(500); 
			},
			//debug: function() {	//	var args = Array.prototype.slice.apply(arguments); console.log.apply(null, args)},
			domain : config.ntlm.domain,
			domaincontroller : config.ntlm.dc
		}),

//		function(req, res, next){ req.ntlm = {UserName :'bogachev_di'};next()}	//заглушка имени, если нет ntlm
/*		,function(req, res, next){
			system.user( req.ntlm.UserName ).then(user=>{
				req.user = {};
				Object.assign(req.user, user);
				console.log(req.user);
				next();
			})
		}*/
		_access //access management
	]);

	if (system.config.ssl.cert)
		return promisify(fs.readFile)(path.join(_root,'sslcert',system.config.ssl.cert))
			.then(cert=>{ 
				system.config.ssl.certData = cert; 
				return system
			})

	return system
})

