"use strict";

/*
	API для телеграмм-бота
*/

var express = require('express'),
		router = express.Router({strict:true})

module.exports = function(system){

var ibso = require('../ds-oracle')(system.config.ibs)
var t2000 = require('../ds-oracle')(system.config.t)

console.log('Telebot backend connected')

// выписка
router.get('/telebot/receipt', function(req, res){
	const query = req.query
	console.log(query)
	ibso(`
		select 
			DECODE( REC.C_5, 'Дебет', '-', 'Кредит', '+') "change",
			TO_CHAR(DOC.C_28, 'dd.mm.yyyy hh24:mi:ss') "date",
			REC.C_3 "in",
			REC.C_6 "sum",
			REC.C_8 "out",
			NVL(	-- тут берем 1 из 2х: либо из РЦ (по цепочке) если есть, либо из самого документа...
				(
				select 
				  C_27
				from 
				  VW_CRIT_MAIN_DOCUM
				where 
				 id = (
				  select A.REF21 
				  from 
				    VW_CRIT_DOCUM_RC_ALL B,
				    VW_CRIT_DOCUM_RC_ALL A
				  where 
				  	B.C_5 = A.C_5 and -- даты
				    substr(B.C_17, 1, 34) = substr(A.C_18, 1,34) and  -- ident in / ident out
				    B.C_28 = A.C_28 and -- несист номер
				    B.ref21 = DOC.ID
				  )
				), DOC.C_27
			)	 "doc_uno"
		from 
			VW_CRIT_AC_FIN ACC,--фин. счета
			VW_CRIT_FULL_RECORDS REC, --выписка
			VW_CRIT_MAIN_DOCUM DOC
		where	
			ACC.ID = :acc_id and
			REC.COLLECTION_ID = ACC.REF8 and
			DOC.C_28 > TO_DATE(:operation_date, 'dd.mm.yyyy hh24:mi:ss') and
			REC.REF2 = DOC.ID
	`,{ acc_id: query.acc_id, operation_date: query.date })
	.then(data => {
		console.log(data)
		res.json(data)
	})
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
			console.log({success: false})
			res.json({success: false})
			return
		}
	}

	if (!query.phone_num || query.phone_num.length < 10) { //phone_num must be 10 signs at least
		console.log({success: false})
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
			acc.C_1 = :acc and fil.C_3 = :bik and acc.REF32 = fil.ID`, 
			{acc: query.acc, bik: query.bik}
	)
	.then(data => {
		if (data.length === 0) {
			console.log({success: false})
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
				CRD.REF3 = :client_id and CRD.STATE_ID = 'WRK' and
				SRV.C_3 = CRD.ID and 
				PROP.COLLECTION_ID = SRV.REF8 and PROP.C_1 = 'Номер мобильного телефона'

			union
				select C_3 "num" 
				from VW_CRIT_FAKTURA_LITE 
				where REF2 = :client_id

			union
				select 
					CT.C_4 "num"
				from 
					VW_CRIT_CL_PRIV CL,
					VW_CRIT_CONTACTS CT
				where 
					CL.ID = :client_id
					and CT.COLLECTION_ID = CL.REF8
			`,{client_id: client_id})
			.then(phones => {
				if (
					phones.length === 0 ||
					typeof phones.find(({num}) => num.indexOf(query.phone_num) !== -1) === 'undefined'
				) {
					console.log({success: false})
					return res.json({success: false})
				}
				
				delete data[0].client_id
				console.log(data)
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




// авторизация
router.get('/telebot/auth2', function(req, res){

	const query = req.query

	if (!query.phone_num || query.phone_num.length < 10) { //phone_num must be 10 signs at least
		console.log({success: false})
		res.json({success: false})
		return
	}

	let queryClientByPhone = [
	`
		select 
			distinct CRD.REF3 "client_id"
		from 
			VW_CRIT_VZ_CARDS CRD,
			VW_CRIT_CARD_SERVICES SRV,
			VW_CRIT_PROPERTY PROP
		where
			CRD.STATE_ID = 'WRK' and
			SRV.C_3 = CRD.ID and 
			PROP.COLLECTION_ID = SRV.REF8 and PROP.C_1 = 'Номер мобильного телефона' and
			PROP.C_7 like :phone_num
	`,

	`
		select 
			distinct REF2 "client_id"
		from 
			VW_CRIT_FAKTURA_LITE 
		where 
			C_3 like :phone_num
	`,

	`
		select 
			distinct CL.ID as "client_id"
		from 
			VW_CRIT_CL_PRIV CL,
			VW_CRIT_CONTACTS CT
		where 
			CT.COLLECTION_ID = CL.REF8 and
			CT.C_4 like :phone_num
	`
	]

	queryClientByPhone.reduce((result, queryItem) => 
		result.then(data => {
			if (!(data && data.length > 0)) return ibso(queryItem, {phone_num: '%' + query.phone_num + '%'})
			return data
		}),
		Promise.resolve()
	)
	.then(data=>{
		if (data.length !== 1) {
			console.log({success: false})
			res.json({success: false})
			return
		}
		let client_id = data[0].client_id

		return ibso(`
			select
				fil.C_3 "bik",
				acc.C_1 "account",
				acc.C_2 "currency",
				cl.C_1 "client_name",
				acc.REF3 "client_id",
				acc.ID "account_id",
				acc.C_6 "balance",
				(
				select 
					distinct TO_CHAR(DOC.C_28, 'dd.mm.yyyy hh24:mi:ss') "date"
				from 
					VW_CRIT_MAIN_DOCUM doc
				where
					(doc.REF7 = acc.ID or doc.REF8 = acc.ID) and
					 doc.C_28 = (select max(C_28) from VW_CRIT_MAIN_DOCUM where (REF7 = acc.ID or REF8 = acc.ID) )
				)  "balance_date"
			from 
				VW_CRIT_CL_PRIV cl,
				VW_CRIT_AC_FIN acc,
				VW_CRIT_BRANCH fil
			where
				cl.ID = :client_id and acc.REF3 = cl.ID and
				acc.C_1 like '40817810%' and
				(acc.C_19 is null or acc.C_19 != 'Закрыт') and
				acc.REF32 = fil.ID
		`,{client_id: client_id})
		.then(data => {
				console.log(data)
				res.json({
					success: true,
					data: data
				})
		})
	})
	.catch(err => {
		console.log(err)
		console.log('remote:' + req.connection.remoteAddress)
		res.json(err.message)
	}) 
})



//баланс по карте из ПЦ

router.get('/telebot/limitauth',	function(req, res){
	const query = req.query
	return ibso(`
		select 
			vc.C_1 "pan",
			acc.C_6 "balance",
			(select listagg(C_1, ',') within group(order by null) from vw_crit_vz_cards where REF4 = vc.REF4 and ID != vc.ID)	"card_add",
			vct.C_3 "is_main"
		from
			VW_CRIT_IP_CARD_TYPE vct,
			VW_CRIT_VZ_CARDS vc,
			VW_CRIT_AC_FIN acc
		where 
			vc.C_8 != 'Закрыта' and
			vc.REF2 = vct.ID and
			acc.ID = vc.REF5 and
			acc.ID = :acc_id
		`,{acc_id: query.acc_id}).then(data=>{
			if (data.length === 0) {
				console.log({success: false})
				res.json({success: false})
				return
			}	
			const card = data[0]

			return t2000(`select sysadm.pcardstandard.f_onlinebalance_cs(:pan) "balance" from dual`, {pan: card.pan})
				.then(data=>{
					if (data.length === 0) {
						res.json({success: false})
						return
					}	
					res.json({
						success: true,
						balance: card.balance,
						balance_pc: data[0].balance
					})
			})
	}) 
	.catch(err=>{
		console.log(err); 
		console.log('remote:' + req.connection.remoteAddress); 
		res.json(err.message)
	}) 
	
})



return router

}


