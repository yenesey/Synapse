/*
	СМС по открытым овердрафтам
	(c) Денис Богачев <d.enisei@yandex.ru>

*/

module.exports = async function (param, system) {
	// -
	const { oracle } = system.config
	const ora = require('synapse/ds-oracle')(oracle.ibso)

	let rec = await ora(`
	SELECT
	 	OV.C_3 "date_begin",
		OV.C_13 "debt",
		OV.C_2 "fio",
		(select
			SUBSTR(VZ.C_1, 1, 4) ||'.......'|| SUBSTR(VZ.C_1, 13, 4)
		from 
			VW_CRIT_VZ_CARDS VZ
		where 
			VZ.ID = (
				select max(ID) from 
					VW_CRIT_VZ_CARDS
				where
					C_8 = 'Рабочая'
				    and lower(C_2) like '%главная%' 
				    and REF5 = (
						select 
							max(REF3)
						from
							VW_CRIT_DEPN_PLPLUS
						where
							REF2 = OV.REF2                     -- связь Депозит - Овер
							and (lower(C_10) like '%карт%' or lower(C_10) like '%пк%') 
							and C_9 = 'RUB' and not REF3 is null
					)
			)
		) "card",
		 NVL(
		(
			select regexp_replace(PROP.C_7,'[^[[:digit:]|\,]]*') from 
				VW_CRIT_VZ_CARDS CARD,
				VW_CRIT_CARD_SERVICES SERV,
				VW_CRIT_PROPERTY PROP
			where
				CARD.REF3 = OV.REF2  --связь через клиента
				and CARD.STATE_ID = 'WRK'
				and SERV.C_3 = CARD.ID
				and PROP.COLLECTION_ID = SERV.REF8 and lower(PROP.C_1) like '%номер%телефон%'
				and length(regexp_replace(PROP.C_7,'[^[[:digit:]|\,]]*')) >= 10
				and rownum = 1
		) ,
		NVL((
			select regexp_replace(CLIENT.C_11,'[^[[:digit:]|\,]]*') from 
				VW_CRIT_VZ_CLIENT CLIENT
			where
				CLIENT.REF1 = OV.REF2
				and length(regexp_replace(CLIENT.C_11,'[^[[:digit:]|\,]]*')) >= 10
				and rownum = 1
		),
		(
			select regexp_replace(CONT.C_4,'[^[[:digit:]|\,]]*') from 
				VW_CRIT_CONTACTS CONT,
				VW_CRIT_CL_PRIV CL
			where
				CL.ID = OV.REF2 --связь через клиента
				and CONT.COLLECTION_ID = CL.REF8
				and lower(CONT.C_3) like '%телефон%'
				and length(regexp_replace(CONT.C_4,'[^[[:digit:]|\,]]*')) >= 10
				and rownum = 1
		))
		) "tel"
	FROM 
		VW_CRIT_TVR_CARD_OVER OV
	WHERE 
		OV.C_5 = 'Технический овердрафт по карте'
		and OV.C_3 = TO_DATE('${param.date1}', 'yyyy-mm-dd')
		and OV.C_13 > 0
`)

	let debt = rec.reduce((all, el) => all + el.fio + ';' + el.tel + ';' +
			`Уважаемый клиент! Информируем о возникновении задолженности по карте ${el.card} в размере ${el.debt.toFixed(2)}` +
			'\r\n', '')

	rec = await ora(`
	SELECT 
		OV.C_3 "date_begin",
		OV.C_13 "debt",
		OV.C_2 "fio",
		(select
			SUBSTR(VZ.C_1, 1, 4) ||'.......'|| SUBSTR(VZ.C_1, 13, 4)
		from 
			VW_CRIT_VZ_CARDS VZ
		where 
			VZ.ID = (
				select max(ID) from 
					VW_CRIT_VZ_CARDS
				where
					C_8 = 'Рабочая'
				    and lower(C_2) like '%главная%'
				    and REF5 = (
						select 
							max(REF3)
						from
							VW_CRIT_DEPN_PLPLUS
						where
							REF2 = OV.REF2 -- связь Депозит - Овер
							and (lower(C_10) like '%карт%' or lower(C_10) like '%пк%') 
							and C_9 = 'RUB' and not REF3 is null
					)
			)
		) "card",
		NVL(
		(
			select regexp_replace(PROP.C_7,'[^[[:digit:]|\,]]*') from 
				VW_CRIT_VZ_CARDS CARD,
				VW_CRIT_CARD_SERVICES SERV,
				VW_CRIT_PROPERTY PROP
			where
				CARD.REF3 = OV.REF2  --связь через клиента
				and CARD.STATE_ID = 'WRK'
				and SERV.C_3 = CARD.ID
				and PROP.COLLECTION_ID = SERV.REF8 and lower(PROP.C_1) like '%номер%телефон%'
				and length(regexp_replace(PROP.C_7,'[^[[:digit:]|\,]]*')) >= 10
				and rownum = 1
		) ,
		NVL((
			select regexp_replace(CLIENT.C_11,'[^[[:digit:]|\,]]*') from 
				VW_CRIT_VZ_CLIENT CLIENT
			where
				CLIENT.REF1 = OV.REF2
				and length(regexp_replace(CLIENT.C_11,'[^[[:digit:]|\,]]*')) >= 10
				and rownum = 1
		),
		(
			select regexp_replace(CONT.C_4,'[^[[:digit:]|\,]]*') from 
				VW_CRIT_CONTACTS CONT,
				VW_CRIT_CL_PRIV CL
			where
				CL.ID = OV.REF2 --связь через клиента
				and CONT.COLLECTION_ID = CL.REF8
				and lower(CONT.C_3) like '%телефон%'
				and length(regexp_replace(CONT.C_4,'[^[[:digit:]|\,]]*')) >= 10
				and rownum = 1
		))
		) "tel"
	FROM 
		VW_CRIT_TVR_CARD_OVER OV
	WHERE 
		OV.C_5 = 'Технический овердрафт по карте' 
		and OV.C_13 > 0
		and exists (select ID from VW_CRIT_FACT_OPER where COLLECTION_ID = OV.REF25 and C_1 > OV.C_3 and C_5 = 'Выдача кредита' and C_1 = TO_DATE('${param.date1}','yyyy-mm-dd'))
`)

	let grow = rec.reduce((all, el) => all + el.fio + ';' + el.tel + ';' +
			`Уважаемый клиент! Информируем об увеличении задолженности по карте ${el.card} до размера ${el.debt.toFixed(2)}` +
			'\r\n', '')

	const t2000 = require('synapse/ds-oracle')(oracle.t)

	await t2000(`begin :result := SYSADM.EXCHANGE.F_CreateTask_SMS_Overdraft(:debt); end;`,
		{
			debt: debt.toString(),
			result: t2000.GET_NUMBER
		}
	)
		.then(result => {
			if (result === 0) console.log('АШИПКА!!!')
		})

	await t2000(`begin :result := SYSADM.EXCHANGE.F_CreateTask_SMS_Overdraft(:grow); end;`,
		{
			grow: grow.toString(),
			result: t2000.GET_NUMBER
		}
	)
		.then(result => {
			if (result === 0) console.log('АШИПКА!!!')
		})

	if (grow.length === 0 && debt.length === 0) console.log('Сегодня технические овердафты отсутствуют')

	if (debt.length > 0) {
		console.log('')
		console.log('[Овердрафты]')
		console.log(debt)
	}
	if (grow.length > 0) {
		console.log('')
		console.log('[Увеличение]')
		console.log(grow)
	}

	// .catch(err => system.errorHandler(err, req, res))
}
