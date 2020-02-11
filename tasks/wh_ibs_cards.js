const { importData } = require('./wh_util')

module.exports = function () {
	importData(
		`select
			C.ID, 
			C.C_1 PAN,
			C.REF2 TYPE_REF,
			C.C_2 TYPE_NAME,
			C.REF3 CLIENT_REF,
			CT.C_3 IS_MAIN,
			CT.C_8 IS_OVERDRAFT,

			C.REF5 ACC_REF,
			C.C_5 ACC_NUM,
			C.C_6 ACC_DOG_NUM,
			C.REF7 ACC_PRODUCT_REF,
			nvl(DP.C_10, RKO.C_2) ACC_PRODUCT_NAME,

			C.C_10 DATE_BEGIN, -- дата создания
			C.C_9  DATE_BEGINING, --начала действия
			C.C_11 DATE_CLOSE, -- закрытия
			C.C_12 DATE_ENDING, -- окончания действия 

			C.REF14 PRODUCT_REF,
			C.C_14  PRODUCT_NAME,
			PT.C_1  PRODUCT_CODE_PC,

			C.STATE_ID STATE,
			C.C_8 STATE_NAME,
			C.REF16 PC_STATUS_REF,
			C.C_16 PC_STATUS,

			C.REF23 DEPART_REF,
			C.C_23  DEPART_CODE
		from 
			VW_CRIT_VZ_CARDS C
				left join VW_CRIT_IP_CARD_TYPE CT on C.REF2 = CT.ID
				left join VW_CRIT_DEPN_PLPLUS DP on C.REF7 = DP.ID
				left join VW_CRIT_RKO RKO on C.REF7 = RKO.ID
				left join VW_CRIT_IP_PRODUCTS IP on C.REF14 = IP.ID
				left join VW_CRIT_OWS_PLASTIC_TYPE PT on IP.REF10 = PT.ID
		where
			-- 1=1
			(C.C_11 is null or C.C_11 >= SYSDATE - 15)`
		,
		{},
		'IBS_CARDS',
		{ merge: true }
	)
}
