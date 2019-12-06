
const dayjs = require('dayjs')
const { processData } = require('./wh_util')

module.exports = function (params) {
	params.date = '2019-12-01'
	const dateOn = dayjs(params.date).startOf('day').toDate()

	return processData(`
		select
			ID ACC_ID,
			:dateOn DATE_ON,
			f.a_saldo_short(:dateOn, ID, 'c', 0) SALDO,
			f.a_saldo_short(:dateOn, ID, 'c', 1) SALDO_NT,
			f.a_turn_short(:dateOn, :dateOn + 86399 / 86400, ID, 1, 0) TURN_DT,
			f.a_turn_short(:dateOn, :dateOn + 86399 / 86400, ID, 1, 1) TURN_DT_NT,
			f.a_turn_short(:dateOn, :dateOn + 86399 / 86400, ID, 0, 0) TURN_KT,
			f.a_turn_short(:dateOn, :dateOn + 86399 / 86400, ID, 0, 1) TURN_KT_NT
		from 
			VW_CRIT_AC_FIN
		where
			1=1
			and (C_16 is null or C_16 >= :dateOn - 10)
			-- and ID = 4092525553
	`, { dateOn }, 'WH.IBS_ACC_SALDO', { merge: true, keys: ['ACC_ID', 'DATE_ON'] }
	)
}
