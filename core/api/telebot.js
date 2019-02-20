"use strict";

/*
	API для телеграмм-бота
*/

var express = require('express'),
		router = express.Router({strict:true})

module.exports = function(system){

var ibso = require('../ds-oracle')(system.config.ibs)

console.log('Telebot backend connected')

// выписка
router.get('/telebot/receipt', function(req, res){
	console.log(req.query)
	const query = req.query
	ibso(`
		select 
			DECODE( REC.C_5, 'Дебет', '-', 'Кредит', '+') "change",
			TO_CHAR(DOC.C_28, 'dd.mm.yyyy hh24:mi:ss') "date",
			REC.C_3 "in",
			REC.C_6 "sum",
			REC.C_8 "out",
			DOC.C_27 "doc_uno"
		from 
			VW_CRIT_AC_FIN ACC,--фин. счета
			VW_CRIT_FULL_RECORDS REC, --выписка
			VW_CRIT_MAIN_DOCUM DOC
		where	
			ACC.ID = ${query.acc_id} and
			REC.COLLECTION_ID = ACC.REF8 and
			REC.C_1 > TO_DATE('${query.date}', 'dd.mm.yyyy hh24:mi:ss') and
			REC.REF2 = DOC.ID
	`)
	.then(data => res.json(data))
	.catch(err => {
		console.log(err)
		console.log('remote:' + req.connection.remoteAddress)
		res.json(err.message)
	}) 
})
 
// авторизация
router.get('/telebot/auth', function(req, res){
	console.log(req.query)
	const query = req.query

	for (let key of ['acc', 'bik', 'phone_num']){ // simple check qry params
		if (!(key in query)) {
			res.json({success: false})
			return
		}
	}

	if (!query.phone_num || query.phone_num.length < 10) { //phone_num must be 10 signs at least
		res.json({success: false})
		return
	}

	ibso(`
		select
			(select C_1 from VW_CRIT_CL_PRIV where ID = acc.REF3) "client_name",
			acc.REF3 "client_id",
			acc.ID "account_id",
			acc.C_6 "balance",
			-- TO_CHAR(acc.C_9, 'dd.mm.yyyy hh24:mi:ss') "balance_date"

			(select 
			 distinct TO_CHAR(DOC.C_28, 'dd.mm.yyyy hh24:mi:ss') "date"
			from 
			 VW_CRIT_MAIN_DOCUM doc
			where
			  (doc.REF7 = acc.ID or doc.REF8 = acc.ID) and
			   doc.C_28 = (select max(C_28) from VW_CRIT_MAIN_DOCUM where (REF7 = acc.ID or REF8 = acc.ID) )
			)  "balance_date"

		from 
			VW_CRIT_AC_FIN acc,
			VW_CRIT_BRANCH fil
		where
			acc.C_1 = '${query.acc}' and fil.C_3 = '${query.bik}' and acc.REF32 = fil.ID`
	)
	.then(data => {
		if (data.length === 0) {
			res.json({success: false})
			return
		}	

		let client_id = data[0].client_id

		return ibso(`
			select 
				PROP.C_7 "num"
			from 
				VW_CRIT_VZ_CARDS CRD,
				VW_CRIT_CARD_SERVICES SRV,
				VW_CRIT_PROPERTY PROP
			where
				CRD.REF3 = ${client_id} and CRD.STATE_ID = 'WRK' and
				SRV.C_3 = CRD.ID and 
				PROP.COLLECTION_ID = SRV.REF8 and PROP.C_1 = 'Номер мобильного телефона'

			union
				select C_3 "num" 
				from VW_CRIT_FAKTURA_LITE 
				where REF2 = ${client_id}

			union
				select 
					CT.C_4 "num"
				from 
					VW_CRIT_CL_PRIV CL,
					VW_CRIT_CONTACTS CT
				where 
					CL.ID = ${client_id}
					and CT.COLLECTION_ID = CL.REF8
			`)
			.then(phones => {
				if (
					phones.length === 0 ||
					typeof phones.find(({num}) => num.indexOf(query.phone_num) !== -1) === 'undefined'
				) return res.json({success: false})
				
				delete data[0].client_id
				res.json({
					success: true,
					...data[0]
				})
			})	
	})
	.catch(err => {
		console.log(err)
		console.log('remote:' + req.connection.remoteAddress)
		res.json(err.message)
	}) 
})


return router

}


