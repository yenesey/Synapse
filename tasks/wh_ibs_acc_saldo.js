
const dayjs = require('dayjs')
const { importData } = require('./wh_util')
const check =  require('./wh_ibs_acc_saldo_checker')

module.exports = async function (params) {
	var day = dayjs(params.date).startOf('day')
	var merge = false
	if ('merge' in params) merge = params.merge

	console.log('processing: ' + day.format('DD.MM.YYYY'))
	await importData(
		`select
			ID ACC_ID,
			:dateOn DATE_ON,
			f.a_saldo(:dateOn, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, REF25 /*vid*/, C_6, C_7, 'c', 0) SALDO, 
			f.a_saldo(:dateOn, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, REF25 /*vid*/, C_6, C_7, 'c', 1) SALDO_NT,
			f.a_turn(:dateOn, :dateOn + 86399 / 86400, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, 1, 0) TURN_DT,
			f.a_turn(:dateOn, :dateOn + 86399 / 86400, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, 1, 1) TURN_DT_NT,
			f.a_turn(:dateOn, :dateOn + 86399 / 86400, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, 0, 0) TURN_KT,
			f.a_turn(:dateOn, :dateOn + 86399 / 86400, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, 0, 1) TURN_KT_NT
		from 
			VW_CRIT_AC_FIN
		where
			-- ID = 1409526623 and
			(C_13 <= :dateOn) and  /* DATE_OPEN */
			(C_16 is null or C_16 >= :dateOn)  /* DATE_CLOSE */
		`,
		{ dateOn: day.toDate() },
		'WH.IBS_ACC_SALDO',
		{ merge: merge, keys: ['ACC_ID', 'DATE_ON'] }
	)
	return check({ date: day.format('YYYY-MM-DD') })
}
