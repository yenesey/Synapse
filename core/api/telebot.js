"use strict";

/*
	API для телеграмм бота
*/

var express = require('express'),
		router = express.Router({strict:true})

module.exports = function(system){

var ibso = require('../ds-oracle')(system.config.ibs)
ibso("alter session set NLS_DATE_FORMAT='dd.mm.yyyy hh24:mi:ss'")
console.log('Telebot backend connected')

// выписка
router.get('/telebot/receipt', function(req, res){
	console.log(req.query)
	const query = req.query
	ibso(`
		select 
			DECODE( REC.C_5, 'Дебет', 'D', 'Кредит', 'С') as "dk",
			TO_CHAR(REC.C_1, 'dd.mm.yyyy hh24:mi:ss') as "date",
			REC.C_3 as "in",
			REC.C_4 as "in_v",
			REC.C_6 as "sum",
			REC.C_7 as "sum_v",
			REC.C_8 as "out",
			REC.C_9 as "out_v"
		from 
			VW_CRIT_AC_FIN AC,--фин. счета
			VW_CRIT_DEPART DP,    --подразд.
			VW_CRIT_CL_PART_IN PR, --уч. расч
			VW_CRIT_FULL_RECORDS REC --выписка
		where	
			--DOC.C_27 --ун. номер док-та
			AC.REF31 = DP.ID and 
			DP.REF5 = PR.ID and
			REC.COLLECTION_ID = AC.REF8 and
			PR.C_3 = '${query.bik}' and AC.C_1 = '${query.acc}' and
			REC.C_1 >= TO_DATE('${query.date}', 'dd.mm.yyyy hh24:mi:ss')
	`)
	.then(data => res.json(data))
	.catch(err=>{
		console.log(err);
		console.log('remote:' + req.connection.remoteAddress); 
		res.json(err.message)
	}) 
})
 

return router

}


