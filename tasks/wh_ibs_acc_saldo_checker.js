
const dayjs = require('dayjs')
const { getConnection } = require('./wh_util')
const { declByNum, leftPad } = require('synapse/lib')

module.exports = async function (params) {
	const dateOn = dayjs(params.date).startOf('day').toDate()
	const ibso = await getConnection('ibso')
	const wh = await getConnection('warehouse')

	let result
	var day = dayjs(params.date).startOf('day')
	do {
		console.log('Получаю баланс на ' + day.format('DD.MM.YYYY'))
		day = day.subtract(1, 'day')
		result = await ibso.execute(
			`select
				C_4 ACCOUNT, 
				sum(case when C_14 > 0 then -C_14 else C_15 end) SALDO/*,
				sum(C_12) TURN_DT,
				sum(C_13) TURN_KT*/
			from 
				VW_CRIT_PL_ARC_USV
			where
				C_2 = TRUNC(:dateOn)
			group by
				C_4
			order by
				C_4
			`,
			{ dateOn: day.toDate() }
		)
	} while (result.rows.length === 0 &&
		Math.ceil((dateOn - day.toDate()) / (1000 * 3600 * 24)) < 12 // пока разница в днях < 12 (на случай отсутсвия баланса в праздники и выходные)
	)

	let balance = result.rows

	console.log('Выполняю расчет баланса на базе [IBS_ACC_SALDO]')
	result = await wh.execute(
		`select 
			substr(A.ACCOUNT, 1,5) ACCOUNT,
			sum(S.SALDO_NT) SALDO/*,
			sum(S.TURN_DT_NT) TURN_DT,
			sum(S.TURN_KT_NT) TURN_KT*/
		from
			IBS_ACC_SALDO S,
			IBS_ACC_FIN A
		where
			S.ACC_ID = A.ID and
			S.DATE_ON = TRUNC(:dateOn)
		group by
			substr(A.ACCOUNT, 1,5)
		order by 
			substr(A.ACCOUNT, 1,5)
		`,
		{ dateOn }
	)
	let saldo = result.rows

	let errors = []
	for (let i = balance.length - 1; i >= 0; i--) {
		let bal = balance[i]
		let test = saldo.find(el => el[0] === bal[0])
		if (test) {
			if ((bal[1] !== 0) && (test[1] !== bal[1])) {
				errors.push({
					acc: bal[0],
					warehouse: leftPad(test[1], ' ', 20),
					ibs: leftPad(bal[1], ' ', 20)
				})
			}
		} else if (bal[1] !== 0) {
			errors.push({
				acc: bal[0],
				warehouse: 'не найден',
				ibs: leftPad(bal[1], ' ', 20)
			})
		}
	}
	if (errors.length) {
		console.table(errors)
	}
	console.log('Выполнено: ' + balance.length + ' ' + declByNum(['счет', '', 'а', 'ов'], balance.length) + ' сверено')
	return errors.length === 0
}
