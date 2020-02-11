const { importData } = require('./wh_util')

module.exports = async function () {
	await importData(
		`select
			ID,
			C_1 NAME,
			C_2 FULL_NAME,
			C_3 HANDLE_TYPE,
			C_4 TERM_TYPE
		from
			VW_CRIT_ALL_TRANS
		where
			1=1
		`,
		{},
		'IBS_TRANS_TYPES',
		{ merge: true }
	)
}
