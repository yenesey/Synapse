
const oracle = require('oracledb')
const NUM_ROWS = 10000

function generateStatement (metaData, table) {
	let len = metaData.length
	let heads = metaData.reduce((result, el, index) => result + el.name + (index < len - 1 ? ', ' : ')'), '(')
	let values = metaData.reduce((result, el, index) => result + ':' + String(index + 1) + (index < len - 1 ? ', ' : ')'), '(')
	return 'insert into\n' + table + ' ' + heads + '\nvalues ' + values
}

module.exports = async function (params, system) {
	const config = system.config
	const ibso = await oracle.getConnection(config.ibs)
	const t2000 = await oracle.getConnection(config.wh)

	let result = await ibso.execute(`
		select
			T.ID,
			T.C_1 CREATED,
			T.C_2 PROCEEDED,
			T.C_25 BUSINESS_TYPE,
			T.C_47 TRANS_DTIME,
			T.C_34 SLIP_NUMBER,
			T.C_41 TRG_AMOUNT,
			T.C_42 TRG_CUR,
			T.nvl(REF4, -1) CARD_REF,
			T.REF12 TRN_TYPE_REF,
			T.C_12 TRN_TYPE,
			T.C_68 DIRECTION,
			TT.C_4 TERM_TYPE
		from
			VW_CRIT_OWS_TRANSACTION T left join VW_CRIT_ALL_TRANS TT on T.REF12 = TT.ID

		where
			C_1 >= TO_DATE('01.08.2019', 'dd.mm.yyyy') and C_1 < TO_DATE('01.09.2019', 'dd.mm.yyyy')
	`, [], { resultSet: true })

	const rs = result.resultSet
	let rows, info
	let statement = generateStatement(result.metaData, 'WH.IBS_TRANSACTIONS')

	do {
		rows = await rs.getRows(NUM_ROWS)
		if (rows.length > 0) {
			info = await t2000.executeMany(statement, rows,	{ autoCommit: true })
			console.log(info)
		}
	} while (rows.length === NUM_ROWS)

	await rs.close()
}
