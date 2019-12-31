const { getConnection, importData } = require('./wh_util')

module.exports = async function () {
	let warehouse = await getConnection('warehouse')
	// -
	let maxId = await warehouse.execute(`select max(id) maxId from IBS_TRANSACTIONS`).then(r => r.rows[0][0] || 0)
	console.log('Loading from ID = ', maxId)

	await importData(
		`select
			T.ID,
			T.C_1 CREATED,
			T.C_2 PROCEEDED,
			T.C_47 TRANS_DTIME,
			T.C_3 STATE_NAME,
			T.C_22 TERMINAL,
			T.C_25 BUSINESS_TYPE,
			T.C_34 SLIP_NUMBER,
			T.C_40 SENDER_CODE,
			T.C_41 TRG_AMOUNT,
			T.C_42 TRG_CUR,
			T.C_18 PC_AMOUNT,
			T.C_19 PC_CUR,
			nvl(T.REF4, -1) CARD_REF,
			T.REF12 TRN_TYPE_REF,
			T.C_12 TRN_TYPE,
			T.C_68 DIRECTION,
			T.C_53 MERCHANT_MCC,
			T.C_58 DESCRIPTION,
			T.C_60 COUNTRY_CODE,
			T.C_79 CONDITIONS,
			(select C_1 from VW_CRIT_IP_BELONG_TRANS where ID = T.REF10) TRN_OWNER,
			(select C_1 from VW_CRIT_TERMINAL_FUL where ID = TT.REF4) TERM_TYPE,
			TT.C_6 PC,
			TB.C_1 TRN_HANDLING_TYPE,
			TB.C_3 DT_CARD,
			TB.C_4 DT_TERM
		from
			VW_CRIT_OWS_TRANSACTION T 
				left join VW_CRIT_ALL_TRANS TT on T.REF12 = TT.ID
				left join VW_CRIT_TYPE_BELONG_TR TB on TB.ID = TT.REF3
		where
			-- T.C_1 >= TO_DATE('01.10.2019', 'dd.mm.yyyy')
			T.ID > :maxId
		`,
		{ maxId: maxId },
		'WH.IBS_TRANSACTIONS'
	)
}
