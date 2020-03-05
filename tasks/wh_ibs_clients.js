const { importIbso } = require('../core/wh-util')

module.exports = async function () {
	// -
	console.log('Импорт пользователей')
	await importIbso(
		`select 
			ID,
			C_1 NAME,
			C_2 LOGIN,
			REF3 DEPART_REF,
			C_5 POST,
			REF9 CLIENT_REF
		from VW_CRIT_USER
		`,
		{},
		'IBS_USERS',
		{ merge: true }
	)

	console.log('Импорт клиентов')
	await importIbso(
		`select
			ID, 
			CLASS_ID,
			C_2 INN, 
			C_3 NAME,
			(select min(C_1) from VW_CRIT_CL_INFO_REQ R where R.REF2 = VW_CRIT_CLIENT.ID) FIRST_ACC_DATE
		from 
			VW_CRIT_CLIENT
		where 
			1=1
			-- (C.C_11 is null or C.C_11 >= SYSDATE - 15)`,
		{},
		'IBS_CLIENTS',
		{ merge: true }
	)

	console.log('Импорт организаций')
	await importIbso(
		`select
			ID, 
			C_13 MAIN_CATEGORY,
			C_40 PFO
		from 
			VW_CRIT_CL_ORG
		where 
			1=1
		`,
		{},
		'IBS_CL_ORG',
		{ merge: true }
	)

	console.log('Импорт банков')
	await importIbso(
		`select
			ID, 
			C_1 BIK,
			C_2 CORR_ACC
		from 
			VW_CRIT_CL_BANK_N
		where 
			1=1
			-- (C.C_11 is null or C.C_11 >= SYSDATE - 15)`,
		{},
		'IBS_CL_BANK_N',
		{ merge: true }
	)

	/*
	// WH.IBS_CL_PERSONS
	await importIbso(
		`select 
			(select ID from VW_CRIT_VND_CL_CORP where REF45 = P.COLLECTION_ID) CLIENT_REF,
			P.REF1 PERSON_REF,
			C_2 INFO
		from 
			VW_CRIT_PERSONS_POS P
		where 
			exists (select ID from VW_CRIT_VND_CL_CORP where REF45 = P.COLLECTION_ID)`,
		{},
		'WH.IBS_CL_PERSONS',
		{ merge: true, keys: ['CLIENT_REF', 'PERSON_REF'] }
	)
	*/
}
