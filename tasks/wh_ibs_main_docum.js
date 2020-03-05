const { getConnection, importIbso } = require('./wh_util')

module.exports = async function () {
	let warehouse = await getConnection('warehouse')
	let maxId = await warehouse.execute(`select max(id) maxId from IBS_MAIN_DOCUM`).then(r => r.rows[0][0] || 0)
	// let maxId = 4327198491
	console.log('Loading from ID = ', maxId)

	await importIbso(
		`select
			D.ID,             
			D.STATE_ID STATE,
			D.C_1 DATE_DOC,
			D.C_2 TYPE_DOC
			D.C_10 DATE_PROV,
			D.C_29 DATE_VAL,
			D.C_6 VAL,
			D.C_4 SUM,
			D.C_5 SUM_NT,
			D.REF7 ACC_DT_REF,
			D.REF8 ACC_KT_REF,
			substr(D.C_11, 1, 1024) PURPOSE,
			D.REF36 DEPARTMENT_REF,
			D.REF19 CREATOR_REF,
			D.REF20 CONDUCTOR_REF,

			VD.REF42 PAYER_REF,
			VD.REF46 PAYER_BANK_REF,
			VD.REF43 PAYER_ACC_REF,
			VD.C_48 PAYER_NAME,
			VD.C_47 PAYER_ACC,

			VD.REF50 RECIPIENT_REF,
			VD.REF54 RECIPIENT_BANK_REF,
			VD.REF51 RECIPIENT_ACC_REF,
			VD.C_56 RECIPIENT_NAME,
			VD.C_55 RECIPIENT_ACC
		from
			VW_CRIT_MAIN_DOCUM D, VW_CRIT_VND_DOC VD
		where
			D.ID = VD.ID
--			(D.C_10 is not null and D.C_10 >= SYSDATE - 15) and 	D.id = 5941605904
			D.ID > :maxId
		`,
		{ maxId: maxId },
		'IBS_MAIN_DOCUM',
		{ merge: false }
	)

}
