const { importData } = require('./wh_util')

module.exports = function () {
	importData(
		`select 
			ID, 
			CLASS_ID,
			C_1 NUM_DOG,
			REF2 CLIENT_REF,
			REF3 ACC_REF,
			C_5 DATE_DOG,
			C_6 DATE_BEGIN,
			C_7 DATE_END,
			C_11 DATE_CLOSE,
			C_12 STATE,
			REF26 DEPART_REF
		from 
			VW_CRIT_DEPN
		where
			1=1
		`,
		{},
		'WH.IBS_DEPN',
		{ merge: true }
	)
}
