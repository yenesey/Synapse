
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
	const t2000 = await oracle.getConnection({ connectString: 'T2000', schema: 'T2000', user: 'WH', password: 'warehouse' })

	// let select = await t2000.execute(`select * from IBS_ACC_FIN`,{}, { maxRows: 10 })

	let result = await ibso.execute(`
		select
			ID, 
			C_1 ACCOUNT, 
			REF3 CLIENT_V, 
			REF20 CLIENT_R, 
			C_13 DATE_OPEN, 
			C_16 DATE_CLOSE, 
			C_4 NAME, 
			REF31 DEPART, 
			UPPER(SUBSTR(C_5,1,1)) TYPE, 
			REF15 USER_OPEN, 
			REF18 USER_CLOSE, 
			C_17 REASON_CLOSE,
			C_38 NOTES,
			C_19 STATUS
		from 
			VW_CRIT_AC_FIN
		where
			1=1
	`, [],  { resultSet: true })

	const rs = result.resultSet
	let rows, info
	let statement = generateStatement(result.metaData, 'WH.IBS_ACC_FIN')

	do {
		rows = await rs.getRows(NUM_ROWS)
		if (rows.length > 0) {
			info = await t2000.executeMany(statement, rows,	{ autoCommit: true })
			console.log(info)
		}
	} while (rows.length === NUM_ROWS)

	await rs.close()
}
