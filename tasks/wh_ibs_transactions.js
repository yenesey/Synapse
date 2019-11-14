
const oracle = require('oracledb')
const NUM_ROWS = 10000

function generateInsertStatement (metaData, table) {
	let len = metaData.length
	let heads = metaData.reduce((result, el, index) => result + el.name + (index < len - 1 ? ', ' : ')'), '(')
	let values = metaData.reduce((result, el, index) => result + ':' + String(index + 1) + (index < len - 1 ? ', ' : ')'), '(')
	return 'insert into\n' + table + ' ' + heads + '\nvalues ' + values
}

module.exports = async function (params, system) {
	const config = system.config.oracle
	const ibso = await oracle.getConnection(config.ibso)
	const warehouse = await oracle.getConnection(config.warehouse)

	let maxId = await warehouse.execute(`select max(id) maxId from IBS_TRANSACTIONS`).then(r => r.rows[0][0])
	system.log('Loading from ID = ', maxId)

	let result = await ibso.execute(`
		select
			T.ID,
			T.C_1 CREATED,
			T.C_2 PROCEEDED,
			T.C_47 TRANS_DTIME,
			T.C_22 TERMINAL,
			T.C_25 BUSINESS_TYPE,
			T.C_34 SLIP_NUMBER,
			T.C_41 TRG_AMOUNT,
			T.C_42 TRG_CUR,
			T.C_18 PC_AMOUNT,
			T.C_19 PC_CUR,
			nvl(T.REF4, -1) CARD_REF,
			T.REF12 TRN_TYPE_REF,
			T.C_12 TRN_TYPE,
			T.C_68 DIRECTION,
			T.C_53 MERCHANT_MCC,
			T.C_58 DESCRIPTION,
			T.C_60 COUNTRY_CODE,
			T.C_79 CONDITIONS,
			(select C_1 from VW_CRIT_IP_BELONG_TRANS where ID = T.REF10) TRN_OWNER,
			(select C_1 from VW_CRIT_TERMINAL_FUL where ID = TT.REF4) TERM_TYPE,
			TT.C_6 PC,
			TB.C_1 TRN_HANDLING_TYPE,
			TB.C_3 DT_CARD,
			TB.C_4 DT_TERM
		from
			VW_CRIT_OWS_TRANSACTION T 
				left join VW_CRIT_ALL_TRANS TT on T.REF12 = TT.ID
				left join VW_CRIT_TYPE_BELONG_TR TB on TB.ID = TT.REF3
		where
			T.ID > :maxId
	`, { maxId: maxId }, { resultSet: true })
	// T.C_1 >= TO_DATE('01.01.2019', 'dd.mm.yyyy') and T.C_1 < TO_DATE('01.02.2019', 'dd.mm.yyyy')

	const rs = result.resultSet
	let rows, info
	let statement = generateInsertStatement(result.metaData, 'WH.IBS_TRANSACTIONS')
	// console.log(statement)
	let count = 0
	do {
		rows = await rs.getRows(NUM_ROWS)
		if (rows.length > 0) {
			info = await warehouse.executeMany(statement, rows,	{ autoCommit: true })
			count = count + info.rowsAffected
		}
	} while (rows.length === NUM_ROWS)
	await rs.close()
	system.log('DONE! ', count, ' rows affected ')
}
