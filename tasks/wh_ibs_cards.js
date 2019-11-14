
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
			C.ID, 
			C.REF2 TYPE_REF,
			C.C_2 TYPE_NAME,
			C.REF3 CLIENT_REF,
			CT.C_3 IS_MAIN,
			CT.C_8 IS_OVERDRAFT,

			C.REF5 ACC_REF,
			C.C_5 ACC_NUM,
			C.C_6 ACC_DOG_NUM,
			C.REF7 ACC_PRODUCT_REF,
			nvl(DP.C_10, RKO.C_2) ACC_PRODUCT_NAME,

			C.C_10 DATE_BEGIN, -- дата создания
			C.C_9  DATE_BEGINING, --начала действия
			C.C_11 DATE_CLOSE, -- закрытия
			C.C_12 DATE_ENDING, -- окончания действия 

			C.REF14 PRODUCT_REF,
			C.C_14  PRODUCT_NAME,

			C.STATE_ID STATE,
			C.C_8 STATE_NAME,
			C.REF16 PC_STATUS_REF,
			C.C_16 PC_STATUS,

			C.REF23 DEPART_REF,
			C.C_23  DEPART_NAME
		from 
			VW_CRIT_VZ_CARDS C
				left join VW_CRIT_IP_CARD_TYPE CT on C.REF2 = CT.ID
				left join VW_CRIT_DEPN_PLPLUS DP on C.REF7 = DP.ID
				left join VW_CRIT_RKO RKO on C.REF7 = RKO.ID
		where
			(C.C_11 is null or C.C_11 >= SYSDATE - 15)`,
	[], { resultSet: true }
	)

	const rs = result.resultSet
	let rows, info
	let statement = generateMergeStatement(result.metaData, 'WH.IBS_CARDS')
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
