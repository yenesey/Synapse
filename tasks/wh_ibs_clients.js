
const oracle = require('oracledb')
const NUM_ROWS = 10000

function generateMergeStatement (metaData, table) {
	let len = metaData.length
	let heads = metaData.reduce((result, el, index) => result + el.name + (index < len - 1 ? ', ' : ')'), '(')
	let values = metaData.reduce((result, el, index) => result + ':' + String(index + 1) + (index < len - 1 ? ',' : ')'), '(')
	let pairs = metaData.reduce((result, el, index) => result + '    :' + String(index + 1) + ' ' + el.name + (index < len - 1 ? ',\n' : ''), '')
	let pairsRev = metaData.slice(1).reduce((result, el, index) => result +	'    ' + el.name + ' = :' + String(index + 2) + (index < len - 2 ? ',\n' : ''), '')

	return 'merge into\n    ' + table + '\n' +
		'using (\nselect ' + pairs + ' from dual\n)' + ' val on (\n    ' + table +
		'.ID = val.ID\n)\nwhen matched then\n' +
		'update set\n' + pairsRev + '\n' +
		'when not matched then insert\n    ' + heads + '\nvalues ' + values
}

module.exports = async function (params, system) {
	const config = system.config.oracle
	const ibso = await oracle.getConnection(config.ibso)
	const warehouse = await oracle.getConnection(config.warehouse)

	let result = await ibso.execute(`
		select
			ID, 
			CLASS_ID, 
			C_3 NAME
		from 
			VW_CRIT_CLIENT
		where 
			1=1
			--(C.C_11 is null or C.C_11 >= SYSDATE - 15)`,
	[], { resultSet: true }
	)

	const rs = result.resultSet
	let rows, info
	let statement = generateMergeStatement(result.metaData, 'WH.IBS_CLIENTS')
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
