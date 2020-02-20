const { importData } = require('./wh_util')

module.exports = async function () {
/*
	console.log('Импорт истории ставок')
	await importData(
		`select 
			ID, 
			COLLECTION_ID,
			C_1 DATE_BEGIN,
			C_2 DATE_END,
			C_3 TIME_BASE,
			C_4 TYPE,
			C_5 SIMPLE_VAL,
			REF6 COMPLEX_REF
		from 
			VW_CRIT_ARC_SCH_PRC
		where
			1=1
		`,
		{},
		'IBS_ARC_SCH_PRC',
		{ merge: true }
	)
*/
/*
	console.log('Импорт видов договоров')
	await importData(
		`select 
			ID, 
			C_1 CLASS,
			C_2 CODE,
			C_3 NAME
		from 
			VW_CRIT_VID_DEPOSIT
		where
			1=1
		`,
		{},
		'IBS_DEPN_TYPES',
		{ merge: true }
	)
*/
	console.log('Импорт депозитов')
	await importData(
		`select 
			ID, 
			CLASS_ID,
			C_1 NUM_DOG,
			REF2 CLIENT_REF,
			REF3 ACC_REF,
			C_5 DATE_DOG,
			C_6 DATE_BEGIN,
			C_7 DATE_END,
			REF10 DEPN_TYPE_REF,
			C_11 DATE_CLOSE,
			C_12 STATE,
			REF26 DEPART_REF,
			REF17 PRC_SCHEME
			(select C_5	from VW_CRIT_ARC_SCH_PRC where COLLECTION_ID = VW_CRIT_DEPN.REF17 and (C_2 is NULL or C_2 >= SYSDATE) and rownum = 1) PRC
		from 
			VW_CRIT_DEPN
		where
			1=1
		`,
		{},
		'IBS_DEPN',
		{ merge: true }
	)
}
