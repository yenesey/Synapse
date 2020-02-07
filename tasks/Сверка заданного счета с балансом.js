
const dayjs = require('dayjs')
const { getConnection } = require('./wh_util')
const { declByNum, leftPad } = require('synapse/lib')

module.exports = async function (params) {
	const dateOn = dayjs(params.date).startOf('day').toDate()
	const ibso = await getConnection('ibso')
	
	let result
	var day = dayjs(params.date).startOf('day')
	do {
		console.log('Получаю баланс на ' + day.format('DD.MM.YYYY'))
		day = day.subtract(1, 'day')
		result = await ibso.execute(
			`select
				C_4 ACCOUNT, 
				sum(case when C_14 > 0 then -C_14 else C_15 end) SALDO
			from 
				VW_CRIT_PL_ARC_USV
			where
				C_2 = TRUNC(:dateOn) and C_4 = :bs
			group by 
				C_4
			`,
			{ dateOn: day.toDate(), bs: params.bs }
		)
	} while (result.rows.length === 0 &&
		Math.ceil((dateOn - day.toDate()) / (1000 * 3600 * 24)) < 12 // пока разница в днях < 12 (на случай отсутствия баланса в праздники и выходные)
	)

	let balance = result.rows

	console.log('Суммирую все остатки по счету: ' + params.bs)
	result = await ibso.execute(
		`select
			substr(C_1, 1,5) ACCOUNT,
			sum(f.a_saldo(:dateOn, ID, REF8 /*move*/, REF30 /*summary*/, REF19 /*comm status*/, REF25 /*vid*/, C_6, C_7, 'c', 1)) SALDO
		from
			VW_CRIT_AC_FIN
		where
			C_1 like :bs
		group by
			substr(C_1, 1,5)
		`,
		{ dateOn, bs: params.bs + '%' }
	)
	let saldo = result.rows

	let errors = []
	for (let i = balance.length - 1; i >= 0; i--) {
		let bal = balance[i]
		let test = saldo.find(el => el[0] === bal[0])
		if (test) {
			if ((bal[1] !== 0) && (test[1] !== bal[1])) {
				errors.push({
					account: bal[0],
					summa: leftPad(test[1], ' ', 20),
					balance: leftPad(bal[1], ' ', 20)
				})
			}
		} else if (bal[1] !== 0) {
			errors.push({
				account: bal[0],
				summa: 'не найден',
				balance: leftPad(bal[1], ' ', 20)
			})
		}
	}
	if (errors.length) {
		console.table(errors)
	}
	if (errors.length === 0) console.log('Ошибок не обнаружено: ' + saldo[0])
	return errors.length === 0
}
