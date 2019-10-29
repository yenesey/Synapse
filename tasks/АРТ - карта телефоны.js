
const oracle = require('oracledb')
// const day = require('dayjs')
const fs = require('fs')
const iconv = require('iconv-lite')
const path = require('path')

module.exports = async function (params, system) {
	const config = system.config
	const ibso = await oracle.getConnection(config.ibs)

	let result = await ibso.execute(`
		SELECT 
			 F.C_3 phone
		FROM 
				VW_CRIT_DEPN_PLPLUS D,
				VW_CRIT_FAKTURA_LITE F
		WHERE 
				D.C_10 = 'Таврический максимум + "Купил-Накопил"'
				and D.C_6 = TO_DATE('${params.date1}', 'yyyy-mm-dd')
				and D.REF2 = F.REF2 
				and F.C_7 = 'Работает'
	`, [])

	fs.writeFileSync(
		path.join(params.task.path, `${params.date1}.csv`),
		iconv.encode(
			result.rows.reduce((all, el) => all + el[0] + ';' + '\r\n', ''),	'windows-1251'
		)
	)
}
