/* eslint-disable camelcase */

const path = require('path')
const dayjs = require('dayjs')
const XlsxPopulate = require('xlsx-populate')

/**
* список полей с именами продуктов из вьюхи V_IBS_CARDS_PRODUCTS
*/
const FIELDS = [
	'visa_platinum',
	'visa_k_n',
	'visa_infinite',
	'visa_gold',
	'visa_electron',
	'visa_classic',
	'mir',
	'mc_world_elite',
	'mc_std_paypass',
	'mc_platinum',
	'mc_maestro_express',
	'mc_gold',
	'mc_express',
	'mc_clock',
	'mc_k_n',
	'mc_art'
]

/**
 * Карт. продукты Таврического (для задания набора и порядка полей)
 */
const PRODUCTS_TB = [
	// 'visa_electron',
	'visa_classic',
	'visa_gold',
	'visa_platinum',
	'visa_infinite',
	'visa_k_n',
	'mc_maestro_express',
	'mc_express',
	'mc_std_paypass',
	'mc_gold',
	'mc_platinum',
	'mc_world_elite',
	'mc_clock',
	'mc_k_n',
	'mc_art',
	'mir'
]

/**
 * Карт. продукты МФК (для задания набора и порядка полей)
 */
const PRODUCTS_MFK = [
	'visa_classic',
	'visa_gold',
	'visa_platinum',
	'visa_infinite',
	'mc_std_paypass', // 'ex mc_standard'
	'mc_gold',
	'mc_platinum',
	'mc_world_elite'
]

function fold (res, el) {
	for (let key in el) res[key] += el[key]
	return res
}

/**
 *  createRow суммирует объекты select поле-в-поле через fold
 *  сворачивает select в одну строку через fold (суммирование)
 */
function createRow (select) {
	let initial = () => FIELDS.reduce((all, f) => { all[f] = 0; return all }, {})
	let row = []
	let _tb = select.filter(el => el.mfk === 0).reduce(fold, initial())
	let _mfk =  select.filter(el => el.mfk === 1).reduce(fold, initial())
	for (let prod of PRODUCTS_TB) row.push(_tb[prod] || 0)
	for (let prod of PRODUCTS_MFK) row.push(_mfk[prod] || 0)
	return row
}

module.exports = async function (param, system) {
	const { warehouse } = system.config.oracle
	const oracle = require('../core/ds-oracle')(warehouse)

	const date1 = dayjs(param.period).startOf('month').toDate()
	const date2 = dayjs(param.period).endOf('month').toDate()
	// console.log(date1, date2)

	/**
	 * Три первых строчки по количеству карт
	 */
	let sum_fields = FIELDS.reduce((all, f, i) => all + `sum(${f}) "${f}"` + (i < FIELDS.length - 1 ? ',' : ''), '')
	let result = await oracle(`with report as ( 
		select
			C.*,
			(case 
				when exists (select id from IBS_TRANSACTIONS where CARD_REF = C.ID and CREATED between :date1 and :date2) 
				then 1 
				else 0 
			end) ACT 
		from 
			V_CARDS_BY_PRODUCTS C
		where 
			(DATE_CLOSE is null or DATE_CLOSE > :date2) and DATE_BEGIN < :date2
		)       
		select
			mfk "mfk", act "act", zp "zp",
			${sum_fields}	
		from 
			report
		group by
			mfk, act, zp
		`,
	{ date1, date2 }
	)

	let amount = createRow(result) // всего

	result = result.filter(el => el.act === 1)  // из них активных
	let amount_act = createRow(result)

	result = result.filter(el => el.zp === 1) // из них активных по зарплатным
	let amount_act_zp = createRow(result)

	/**
	 * Выпущенных на дату
	 * DATE_BEGIN between to_date('01.08.2019', 'dd.mm.yyyy') and to_date('31.08.2019', 'dd.mm.yyyy')
	 */
	result = await oracle(`select mfk "mfk", ${sum_fields} from V_CARDS_BY_PRODUCTS
		where (DATE_BEGIN >= :date1 and  DATE_BEGIN < :date2) and PAN is not null
		group by mfk
	`,
	{ date1, date2 }
	)

	let emitted = createRow(result)

	/**
	 * Эмбоссированных на дату
 	*/

	result = await oracle(`select mfk "mfk", ${sum_fields} from V_CARDS_BY_PRODUCTS 
		where DATE_BEGIN <= :date2 and (DATE_CLOSE is null or DATE_CLOSE >= :date2) and PAN is not null
		group by mfk
	`,
	{ date2 }
	)
	let embossed = createRow(result)

	/**
	* Суммы по транзакциям за период
 	*/

	sum_fields = FIELDS.reduce((all, f, i) => all + `sum(case when ${f}=1 then T.SUM_NT else 0 END) "${f}"` + (i < FIELDS.length - 1 ? ',\r\n' : ''), '')
	var sql_amount_trn = `
		select 
			C.MFK "mfk",
			T.PC_CUR "cur",
			${sum_fields}
		from 
			IBS_TRANSACTIONS T inner join V_CARDS_BY_PRODUCTS C on T.CARD_REF = C.ID
		where 
			lower(TRN_TYPE) like :bank_other
			and (PROCEEDED between :date1 and :date2)
		group by MFK, PC_CUR
	`
	result = await oracle(sql_amount_trn, { date1, date2, bank_other: '%получ%наше%' })
	let	trn_bank = createRow(result)

	result = await oracle(sql_amount_trn, { date1, date2, bank_other: '%получ%чуж%' })
	let	trn_other = createRow(result)
	let	trn_other_rub = createRow(result.filter(el => el.cur === 'RUB')) // из них рубли
	let	trn_other_val = createRow(result.filter(el => el.cur !== 'RUB')) // из них валюта

	/**
	* Объем транзакций в торговых сетях
 	*/

	var sql_trn_merch = `
		select 
			C.MFK "mfk",
			T.PC_CUR "cur",
			${sum_fields}
		from 
		 	IBS_TRANSACTIONS T inner join V_CARDS_BY_PRODUCTS C on T.CARD_REF = C.ID
		where 
			(lower(TRN_TYPE) like '%безналичная покупка%' or lower(TRN_TYPE) like '%эмиссия. операция квази-кэш%')
		 	and (PROCEEDED between :date1 and :date2)
		group by MFK, PC_CUR
 	`
	result = await oracle(sql_trn_merch, { date1, date2 })
	let	trn_merch = createRow(result)
	let trn_merch_rub = createRow(result.filter(el => el.cur === 'RUB')) // из них рубли
	let trn_merch_val = createRow(result.filter(el => el.cur !== 'RUB')) // из них валюта
	result = await oracle(`
		select 
			C.MFK "mfk",
			${sum_fields}
		from 
			 IBS_TRANSACTIONS T inner join V_CARDS_BY_PRODUCTS C on T.CARD_REF = C.ID
		where 
			(lower(TRN_TYPE) like '%возврат по без%' or lower(TRN_TYPE) like '%эмиссия. реверсал на операцию безналичной покупки%')
			 and (PROCEEDED between :date1 and :date2)
		group by MFK
	 `, { date1, date2 }
	)
	let trn_merch_return = createRow(result)
	let period = param.period.split('-').reverse().join('.')

	let workbook = await XlsxPopulate.fromFileAsync('templates/Отчет по доходности в разрезе карт продуктов.xlsx')
	let sheet = workbook.sheet('template').name(period)
	sheet.cell('C1').find(/period/, match => period)
	sheet.cell('C6').value([amount])
	sheet.cell('C7').value([amount_act])
	sheet.cell('C8').value([amount_act_zp])
	sheet.cell('C9').value([emitted])
	sheet.cell('C11').value([embossed])
	sheet.cell('C19').value([trn_bank])
	sheet.cell('C21').value([trn_other])
	sheet.cell('C22').value([trn_other_rub])
	sheet.cell('C23').value([trn_other_val])
	sheet.cell('C25').value([trn_merch])
	sheet.cell('C26').value([trn_merch_rub])
	sheet.cell('C27').value([trn_merch_val])
	sheet.cell('C38').value([trn_merch_return])
	await workbook.toFileAsync(`${param.task.path}/Отчет по доходности в разрезе карт продуктов.xlsx`)
}
