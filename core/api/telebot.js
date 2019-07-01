'use strict'

/*
	API для телеграмм-бота
*/

const express = require('express')
const	router = express.Router({ strict: true })

function errorHandler (err, req, res) {
	console.log(err.message + ' while ' + req.url)
	console.log('remote:' + req.connection.remoteAddress)
	res.json({ success: false, error: err.message })
}

module.exports = function (system) {
	const t2000 = require('../ds-oracle')(system.config.t)
	const ibso = require('../ds-oracle')(Object.assign({ callTimeout: 120 * 1000, ping: 2, by: 'telebot->abs' }, system.config.ibs))

	// const t2000 = (query, params) => promiseTimeout(120 * 1000, _t2000(query, params))
	// const ibso = (query, params) => promiseTimeout(120 * 1000,	_ibso(query, params))

	//
	// авторизация
	router.get('/telebot/auth', function (req, res) { // /telebot/auth?phone_num=XXXXXXXXXX
		const query = req.query

		if (!query.phone_num || query.phone_num.length < 10) { // phone_num must be 10 signs at least
			res.json({ success: false })
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
			`
			/*, 
			выбор телефона из карточки клиента отключен по предложению разработчика бота
			`
			select 
				distinct CL.ID as "client_id"
			from 
				VW_CRIT_CL_PRIV CL,
				VW_CRIT_CONTACTS CT
			where 
				CT.COLLECTION_ID = CL.REF8 and
				CT.C_4 like :phone_num
			`*/
		]

		queryClientByPhone.reduce((result, queryItem) =>
			result.then(data => {
				if (!(data && data.length > 0)) return ibso(queryItem, { phone_num: '%' + query.phone_num + '%' })
				return data
			}),	Promise.resolve()
		).then(([{ client_id }]) => {
			if (!client_id) {
				res.json({ success: false })
				return
			}

			return ibso(`
				select
					fil.C_3 "bik",
					acc.C_1 "account",
					acc.C_2 "currency",
					cl.C_1 "client_name",
					acc.REF3 "client_id",
					acc.ID "account_id",
					(select ipc.C_2 from VW_CRIT_VZ_ACCOUNTS ipc, VW_CRIT_VZ_CARDS crd where crd.REF4 = ipc.ID and crd.REF5 = acc.ID and crd.STATE_ID = 'WRK') "account_id_pc",

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
			`,
			{ client_id: client_id }
			).then(data => {
				res.json({
					success: true,
					data: data
				})
			})
		}).catch(err => errorHandler(err, req, res))
	})

	//	баланс по карте из ПЦ
	router.get('/telebot/balance_pc', function (req, res) { //  /telebot/balance_pc?account_id_pc=NNNNNNNN
		const query = req.query
		return t2000(`select sysadm.pcardstandard.F_OnlineBalance_CSbyACCID(:acc_id) "balance" from dual`, { acc_id: query.account_id_pc })
			//.then(singleton('balance'))
			.then(([{ balance }]) =>
				res.json({
					success: true,
					balance_pc: balance
				})
			).catch(err => errorHandler(err, req, res))
	})

	//	баланс по карте из ПЦ
	router.get('/telebot/limitauth', function (req, res) { //  /telebot/limitauth?acc_id=NNNNNNNN
		const query = req.query
		return ibso(`
			select
				acc.C_6 "balance",
				vc.C_1 "pan",
				ovr.C_7 "limit"
			from
				VW_CRIT_DEPN dep
					left join
						VW_CRIT_OVER_OPEN ovr on ovr.REF3 = dep.ID,
				VW_CRIT_AC_FIN acc
					left join
						VW_CRIT_VZ_CARDS vc on vc.REF5 = acc.ID and vc.C_8 = 'Рабочая'
			where 
				dep.REF3 = acc.ID and 
				acc.ID = :acc_id
			`,
		{ acc_id: query.acc_id }
		).then(([card]) => {
			if (!card) {
				res.json({ success: false })
				return
			}
			// F_OnlineBalance_CSbyACCID(sACC_ID)
			return t2000(`select sysadm.pcardstandard.f_onlinebalance_cs(:pan) "balance" from dual`, { pan: card.pan }).then(data => {
				res.json({
					success: true,
					balance: card.balance,
					balance_pc: data.length > 0 ? data[0].balance : null,
					unused_limit: card.limit
				})
			})
			//
		}).catch(err => errorHandler(err, req, res))
	})

	// выписка
	router.get('/telebot/receipt', function (req, res) { // /telebot/receipt?acc_id=NNNNNNN&date=dd.mm.yyyy hh:mm:ss
		const query = req.query
		ibso(`
			select 
				CASE REC.C_5
          WHEN 'Дебет' THEN '-'
          WHEN 'Кредит' THEN '+'
          ELSE '?'
				END "change",
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
				VW_CRIT_AC_FIN ACC,
				VW_CRIT_FULL_RECORDS REC, -- выписка
				VW_CRIT_MAIN_DOCUM DOC
			where	
				ACC.ID = :acc_id and
				REC.COLLECTION_ID = ACC.REF8 and
				DOC.C_28 > TO_DATE(:operation_date, 'dd.mm.yyyy hh24:mi:ss') and
				REC.REF2 = DOC.ID
		`,
		{
			acc_id: query.acc_id,
			operation_date: query.date
		}).then(receipt =>
			ibso(`select ipc.C_2 "account_id_pc" from VW_CRIT_VZ_ACCOUNTS ipc, VW_CRIT_VZ_CARDS crd where crd.REF4 = ipc.ID and crd.REF5 = :acc_id and crd.STATE_ID = 'WRK'`, { acc_id: query.acc_id} )
				// .then(singleton('account_id_pc'))
				.then(([{ account_id_pc }]) =>
					res.json({
						success: true,
						account_id_pc: account_id_pc,
						receipt: receipt
					})
				)
		).catch(err => errorHandler(err, req, res))
	})

	return router
}
