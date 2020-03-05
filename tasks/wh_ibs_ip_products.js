const { importIbso } = require('../core/wh-util')

module.exports = function (params) {
	importIbso(
		`SELECT /*+ FIRST_ROWS(1) */
			ID,         
			C_1 as NAME,    
			C_2 as FULL_NAME,
			C_4 as ACC_PRODUCT,
			C_5 as ACTIVE,
			C_10 as TECH_PRODUCT,
			REF10 as TECH_PRODUCT_REF,
			C_11 as PC_CODE,
			C_12 as TARIFF_PLAN,
			REF12 as TARIFF_PLAN_REF
		FROM 
			IBS.VW_CRIT_IP_PRODUCTS
		`,
		{},
		'IBS_IP_PRODUCTS',
		{ merge: true }
	)
}
