"use strict";

/*
  Серверная часть компонента dbquery
*/

const express = require('express')
const router = express.Router({strict:true})
const bodyParser = require('body-parser')

module.exports = function(system){

	const ora = require('../ds-oracle')(system.config.ibs)
	
	router.post('/dbquery', bodyParser.json({limit: '5mb'}), function(req, res){ 
		res.socket.setTimeout(Number(system.config.socket.timeout)); //ответ, возможно будет "долгим"
	
		system.accessCheck(req.ntlm.UserName, system.ADMIN_SQLQUERY)
		.then(()=>ora( String(req.body.sql), {} , {maxRows : Number(req.body.maxRows) || 100})
			.then(data=>res.json(data))
		) 
		.catch(err => system.errorHandler(err, req, res))
	})
	
	return router

}
