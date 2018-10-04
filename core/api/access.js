"use strict";

/*
	бывший uac (UAC - User Access Control) - работа с пользователями, контроль доступа,
	- идентификация
	- аутентификация (через Active Directory / express-ntlm basic auth)
	- авторизация
	- добавление / удаление пользователя
*/

const express = require('express')
const bodyParser = require('body-parser')
const ntlm = require('express-ntlm')
const combineMiddleware	= require('../lib').combineMiddleware
const access = express.Router({strict:true})

module.exports=function(system){

access.get('/access/map', function(req, res){
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
			if (access)
				user.access = access;	
			res.json(user)
		})
	)
	.catch(err => system.errorHandler(err, req, res))
});

access.put('/access/map', bodyParser.json(), function(req, res){
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

access.put('/access/user', bodyParser.json(), function(req, res){
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

access.get('/access/members',function(req, res){
	system.users(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
})

access.get('/access/tasks',function(req, res){
	system.tasks(parseInt(req.query.object, 10) || 0).then(result => res.json(result))
})


return combineMiddleware([
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
			domain : system.config.ntlm.domain,
			domaincontroller : system.config.ntlm.dc
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
		access //access management endpoints
])

}
