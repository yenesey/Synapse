
const dayjs = require('dayjs')
const saldo =  require('./wh_ibs_acc_saldo')

module.exports = async function (params) {
	// params.date = '2019-12-01'
	const dateStart = dayjs(params.date1).startOf('day').toDate()
	const dateEnd = dayjs(params.date2).startOf('day').toDate()
	var day = dayjs(params.date1).startOf('day')

	if (isNaN(dateStart.getTime()) || isNaN(dateEnd.getTime()) || dateEnd < dateStart) {
		console.log('Неверные параметры. Проверьте даты!')
		return
	}

	let result = true
	while (result) {
		result = await saldo({ date: day.format('YYYY-MM-DD'), merge: params.merge })
		result = result || params.ignore
		console.log('**********')
		day = day.add(1, 'day')
		if (day.toDate() > dateEnd) result = false
	}
}
