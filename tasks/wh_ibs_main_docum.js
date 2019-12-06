const { processData } = require('./wh_util')

module.exports = function () {
	processData(`
		select
			ID,             
  			STATE_ID STATE,
  			C_1 DATE_DOC,
  			C_10 DATE_PROV,
  			C_29 DATE_VAL,
  			C_6 VAL,
  			C_4 SUM,
  			C_5 SUM_NT,
  			REF7 ACC_DT_REF,
  			REF8 ACC_KT_REF,
  			substr(C_11, 1, 1024) PURPOSE,
  			REF36 DEPARTMENT_REF
		from
			VW_CRIT_MAIN_DOCUM
		where
			(C_10 is not null and C_10 >= SYSDATE - 15)
		`,
	{},
	'WH.IBS_MAIN_DOCUM',
	{ merge: true }
	)
}
