const { importIbso } = require('../core/wh-util')

module.exports = function (params) {
	importIbso(
		`SELECT /*+ FIRST_ROWS(1) */
			ID,         
			C_1 as CODE ,        
			C_3 as DEP_NAME,
			C_4 as NUM,
			C_9 as FILIAL,
			REF9 as FILIAL_ID,         
			REF7 as HIGH      
		FROM 
			IBS.VW_CRIT_DEPART
			WHERE (CLASS_ID = 'DEPART')  
			ORDER BY C_1`
		,
		{},
		'IBS_DEPART',
		{ merge: true }
	)
}
