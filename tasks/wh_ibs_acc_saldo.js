
const dayjs = require('dayjs')
const { getConnection, importData } = require('./wh_util')
const check =  require('./wh_ibs_acc_saldo_checker')

module.exports = async function (params) {
	let warehouse = await getConnection('warehouse')

	var day = dayjs(params.date).startOf('day')
	var merge = false
	var bs = '%'
	if ('merge' in params) merge = params.merge
	if ('bs' in params) bs = params.bs + '%'

	console.log('Дата обработки: ' + day.format('DD.MM.YYYY'))

	if (!merge) {
		console.log('Выполняю предварительную очистку WAREHOUSE')
		await warehouse.execute(
			`delete from IBS_ACC_SALDO where ROWID in (
				select S.ROWID from
					IBS_ACC_SALDO S, IBS_ACC_FIN A 
				where 
					A.id = S.ACC_ID 
					and S.DATE_ON = :dateOn
					and A.ACCOUNT like :bs
			)`,
			{ dateOn: day.toDate(), bs },
			{ autoCommit: true }
		)
		console.log('Очистка выполнена')
	}
	await importData(
		`select
			ID ACC_ID,
			trunc(:dateOn) DATE_ON,
			f.a_saldo(:dateOn, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*com status*/, REF25 /*vid*/, C_6, C_7, 'c', 0) SALDO,
			f.a_saldo(:dateOn, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*com status*/, REF25 /*vid*/, C_6, C_7, 'c', 1) SALDO_NT,
			f.a_turn(:dateOn, :dateOn + 86399 / 86400, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, 1, 0) TURN_DT,
			f.a_turn(:dateOn, :dateOn + 86399 / 86400, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, 1, 1) TURN_DT_NT,
			f.a_turn(:dateOn, :dateOn + 86399 / 86400, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, 0, 0) TURN_KT,
			f.a_turn(:dateOn, :dateOn + 86399 / 86400, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, 0, 1) TURN_KT_NT
		from 
			VW_CRIT_AC_FIN
		where
			C_1 like :bs and  -- ACC
			(C_13 <= :dateOn) and  -- DATE_OPEN
			(C_16 is null or C_16 >= :dateOn)  -- DATE_CLOSE
		`,
		{ dateOn: day.toDate(), bs },
		'IBS_ACC_SALDO',
		{ merge: merge, keys: ['ACC_ID', 'DATE_ON'] }
	)

	return check({ date: day.format('YYYY-MM-DD') })
}
