SELECT
	CLIENT.*,	
	RKO.*,	
	TURN.*
FROM
	(${CLIENT}) CLIENT, 
	(
		SELECT 
			RKO.ID,
			RKO.CLASS_ID,
			RKO.REF6 as CLIENT_ID,
			RKO.REF3 as ACCOUNT_ID,
			RKO.C_11 as NUM,
			RKO.C_3 AS ACCOUNT,
			RKO.C_5 as CURRENCY,
			TO_CHAR(RKO.C_13, 'DD.MM.YYYY') as DATE_BEGIN,
			TO_CHAR(RKO.C_16, 'DD.MM.YYYY') as DATE_END,
			TO_CHAR(RKO.C_15, 'DD.MM.YYYY') as DATE_CLOSE,
			RKO.C_8 as DEPARTMENT
		FROM 
			IBS.VW_CRIT_VND_RKO RKO
		WHERE 
			RKO.CLASS_ID in ('RKO', 'RKO_CUR') 
			AND RKO.C_13 <= ${dateEnd} and (RKO.C_15 is NULL or RKO.C_15 >= ${dateBegin})
	) RKO, 
	(
		SELECT
			ID,
    		F.a_saldo_short(${dateBegin}, ID, 'с', 1) / 1000 as BL_IN,
    		F.a_turn_short(${dateBegin}, ${dateEnd},  ID, 1, 1) / 1000 as TURN_DT,
    		F.a_turn_short(${dateBegin}, ${dateEnd},  ID, 0, 1) / 1000 as TURN_KT,
    		F.a_saldo_short(${dateEnd}, ID, 'с', 1) / 1000 as BL_OUT,
			--  !!!!   (+ n) дает остаток на след день, т.е. исходящий - так считает ЦФТ, (+ n - 1) даст остаток на тек. день
			(select AVG(F.a_saldo_short(${dateBegin} + n, ID,  'с', 1)) from (select level as n from dual connect by level <= ${dateEnd} - ${dateBegin} + 1)) / 1000 as BL_AVG,
			(select MIN(F.a_saldo_short(${dateBegin} + n, ID,  'с', 1)) from (select level as n from dual connect by level <= ${dateEnd} - ${dateBegin} + 1)) / 1000 as BL_MIN
		FROM 
			IBS.VW_CRIT_AC_FIN
		WHERE
			(C_19 is null or C_19 <> 'Помечен к открытию')
	) TURN	
WHERE
	RKO.CLIENT_ID = CLIENT.ID
	AND RKO.ACCOUNT_ID = TURN.ID
