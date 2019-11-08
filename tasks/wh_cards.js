
const orNull = (value) => value ? "'" + String(value) + "'" : null
const escape = (s) => s ? s.replace(/'/g, "''") : null

module.exports = async function (params, system) {
	const config = system.config
	const ora = require('synapse/ds-oracle')
	const ibso = ora(config.ibs)
	const t2000 = ora({ connectString: 'T2000', schema: 'T2000', user: 'WH', password: 'warehouse' }, { keepAlive: true })

/*
	let rows = await ibso(`
		select
			ID,
			TO_CHAR(C_1, 'dd.mm.yyyy') CREATED,
			TO_CHAR(C_2, 'dd.mm.yyyy') PROCEEDED,
			TO_CHAR(C_47, 'dd.mm.yyyy') TRANS_DTIME,
			C_34 SLIP_NUMBER,
			C_41 TRG_AMOUNT,
			C_42 TRG_CUR,
			nvl(REF4, -1) CARD_REF,
			REF12 TRN_TYPE_REF,
			C_12 TRN_TYPE,
			C_68 DIRECTION
		from
			VW_CRIT_OWS_TRANSACTION
		where
			C_25 = 'ISSUING' and
			C_1 >= TO_DATE('01.08.2019', 'dd.mm.yyyy') and C_1 < TO_DATE('01.09.2019', 'dd.mm.yyyy')`,
	{}, { maxRows: 0 }
	)

	for (let row of rows) {
		let ins = `
			insert into
				WH.IBS_TRANSACTIONS (ID, CREATED, PROCEEDED, TRANS_DTIME, SLIP_NUMBER, TRG_AMOUNT, TRG_CUR, CARD_REF,  TRN_TYPE_REF, TRN_TYPE, DIRECTION)
			values
			(
				${row.ID},
				${row.CREATED ? "TO_DATE('" + row.CREATED + "','dd.mm.yyyy')" : null },
				${row.PROCEEDED ? "TO_DATE('" + row.PROCEEDED + "','dd.mm.yyyy')" : null },
				${row.TRANS_DTIME ? "TO_DATE('" + row.TRANS_DTIME + "','dd.mm.yyyy')" : null },
				'${row.SLIP_NUMBER}',
				${row.TRG_AMOUNT},
				'${row.TRG_CUR}',
				${row.CARD_REF},
				${row.TRN_TYPE_REF},
				'${row.TRN_TYPE}',
				'${row.DIRECTION}'
			)`
		try {
			await t2000(ins)
		} catch (err) {
			console.log(err)
			console.log(ins)
		}
	}
	await t2000.commit()
	*/

	// --cards
	/*
	let rows = await ibso(`
		select
			ID, 
			REF2 TYPE_REF,
			C_2 TYPE_NAME,

			REF3 CLIENT_REF,
			C_3 CLIENT_NAME,

			REF5 ACCOUNT_REF,
			C_5 ACCOUNT_NAME,

			TO_CHAR(C_10, 'dd.mm.yyyy') DATE_BEGIN, -- дата создания
			TO_CHAR(C_9, 'dd.mm.yyyy')  DATE_BEGINING, --начала действия
			TO_CHAR(C_11, 'dd.mm.yyyy') DATE_CLOSE, -- закрытия
			TO_CHAR(C_12, 'dd.mm.yyyy') DATE_ENDING, -- окончания действия 

			REF14 PRODUCT_REF,
			C_14  PRODUCT_NAME,

			REF16 STATUS_REF,
			C_16 STATUS_NAME,

			REF23 DEPART_REF,
			C_23  DEPART_NAME
		from 
			VW_CRIT_VZ_CARDS
		where 
			C_10 >= TO_DATE('01.08.2019', 'dd.mm.yyyy') and C_10 < TO_DATE('01.09.2019', 'dd.mm.yyyy')`,
	{}, { maxRows: 0 }
	)

	for (let row of rows) {
		let ins = `
			insert into 
				WH.IBS_CARDS (ID, TYPE_REF, TYPE_NAME, CLIENT_REF, CLIENT_NAME, ACCOUNT_REF, ACCOUNT_NAME, DATE_BEGIN, DATE_BEGINNING, DATE_CLOSE, DATE_ENDING, PRODUCT_REF, PRODUCT_NAME, STATUS_REF, STATUS_NAME, DEPART_REF, DEPART_NAME)
			values 
			(
				${row.ID},
				${row.TYPE_REF},
				'${row.TYPE_NAME}',
				${row.CLIENT_REF},
				'${row.CLIENT_NAME}',
				${row.ACCOUNT_REF},
				'${row.ACCOUNT_NAME}',
				${row.DATE_BEGIN ? "TO_DATE('" + row.DATE_BEGIN + "','dd.mm.yyyy')" : null},
				${row.DATE_BEGINNING ? "TO_DATE('" + row.DATE_BEGINNING + "','dd.mm.yyyy')" : null},
				${row.DATE_CLOSE ? "TO_DATE('" + row.DATE_CLOSE + "','dd.mm.yyyy')" : null},
				${row.DATE_ENDING ? "TO_DATE('" + row.DATE_ENDING + "','dd.mm.yyyy')" : null},
				${row.PRODUCT_REF},
				'${row.PRODUCT_NAME}',
				${row.STATUS_REF},
				'${row.STATUS_NAME}',
				${row.DEPART_REF},
				'${row.DEPART_NAME}'
			)`
		try {
			await t2000(ins)
		} catch (err) {
			console.log(err)
			console.log(ins)
		}
	}
	await t2000.commit()
	*/

}
