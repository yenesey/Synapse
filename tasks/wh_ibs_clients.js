const { processData } = require('./wh_util')

module.exports = function () {
	processData(`
		select
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
}
