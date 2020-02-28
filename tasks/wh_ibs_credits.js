const { importData } = require('./wh_util')

module.exports = async function () {

	console.log('Импорт кредитов')
	await importData(
		`select 
			ID, 
			CLASS_ID,
			REF1 CLIENT_REF,
			C_2 NUM_DOG,
			REF3 ACC_REF,
			C_4 SUM_DOG,
			C_6 DATE_BEGIN,
			C_32 DATE_BEGINING,
			C_7 DATE_END,
			C_18 DATE_CLOSE,
			REF8 CRED_TYPE_REF,
			C_11 PRC,
			REF35 UPPER_CRED_REF,
			REF46 DEPART_REF
		from 
			VW_CRIT_PR_CRED
		where
			1=1
		`,
		{},
		'IBS_CRED',
		{ merge: true }
	)
}
