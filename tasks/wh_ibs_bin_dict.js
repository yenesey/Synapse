const { getConnection, importData } = require('./wh_util')

module.exports = async function () {
	let warehouse = await getConnection('warehouse')
	// Нужно загружать заново, т.е. DELETE ALL, а затем загружать!!!
	console.log('Выполняю очистку [IBS_BIN_DICT]')
	await warehouse.execute(`delete from IBS_BIN_DICT`)
	console.log('Выполнено')

	await importData(
		`select
			ID,
			C_1 NAME,
			C_2 START_BIN,
			C_3 END_BIN,
			C_4 IS_RESIDENT,
			C_5 IS_ACTIVE,
			REF6 PAY_SYSTEM_REF
		from
			VW_CRIT_ALL_BIN_TBL
		where
			1=1
		`,
		{},
		'IBS_BIN_DICT'
	)
}
