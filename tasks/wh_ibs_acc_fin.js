const { importData } = require('./wh_util')

module.exports = function () {
	importData(
		`select
			ID, 
			C_1 ACCOUNT, 
			REF3 CLIENT_V, 
			REF20 CLIENT_R, 
			REF26 USER_RESP,
			C_13 DATE_OPEN, 
			C_16 DATE_CLOSE, 
			C_4 NAME, 
			REF31 DEPART, 
			UPPER(SUBSTR(C_5,1,1)) TYPE, 
			REF15 USER_OPEN, 
			REF18 USER_CLOSE,
			C_17 REASON_CLOSE,
			C_38 NOTES,
			C_19 STATUS
		from 
			VW_CRIT_AC_FIN
		where
			1=1
		--	(C_16 is null or C_16 >= SYSDATE - 15)
		`, 	{},
		'IBS_ACC_FIN',
		{ merge: true }
	)
}
