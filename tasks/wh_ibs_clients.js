const { importData } = require('./wh_util')

module.exports = async function () {
	// -
	await importData(
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
		'WH.IBS_CL_ORG',
		{ merge: true }
	)

	await importData(
		`select
			ID, 
			CLASS_ID, 
			C_3 NAME
		from 
			VW_CRIT_CLIENT
		where 
			1=1
			-- (C.C_11 is null or C.C_11 >= SYSDATE - 15)`,
		{},
		'WH.IBS_CLIENTS',
		{ merge: true }
	)

	await importData(
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
		'WH.IBS_CL_BANK_N',
		{ merge: true }
	)

	/*
	// WH.IBS_CL_PERSONS
	await importData(
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
