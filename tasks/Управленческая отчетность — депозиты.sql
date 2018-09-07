WITH
	CLIENT AS ( ${CLIENT} ),
	DEPOSIT AS (
		SELECT 
			DEPO.ID,
			DEPO.REF2 as CLIENT_ID,
			DEPO.REF3 as ACCOUNT_ID,
			DEPO.C_1 as NUM,
			DEPO.C_3 as ACCOUNT,
			DEPO.C_10 as KIND,
			DEPO.C_9 as CURRENCY,
			TO_CHAR(DEPO.C_6, 'DD.MM.YYYY') as DATE_BEGIN,
			TO_CHAR(DEPO.C_7, 'DD.MM.YYYY') as DATE_END,
			DEPO.C_26 as DEPARTMENT,
			(select 
				NVL(LISTAGG(C_5, ',') within group(order by C_1),'-') 
			from
				IBS.VW_CRIT_ARC_SCH_PRC 
			where 
				COLLECTION_ID = DEPO.REF17 and (C_2 is NULL or C_2 >= ${dateBegin})
			) as PRC
		FROM 
			IBS.VW_CRIT_DEPN DEPO
		WHERE 
			DEPO.CLASS_ID in('DEPOSIT_ORG') -- Депозиты ЮЛ
			and DEPO.C_10 not like '%ПК%'
			and DEPO.C_6 <= ${dateEnd}
			and (DEPO.C_11 is NULL or DEPO.C_11 >= ${dateBegin})
	),
	TURN AS (
		SELECT
			ID,
    		F.a_saldo_short(${dateBegin}, ID, 'с', 1) / 1000 as BL_IN,
    		F.a_turn_short(${dateBegin}, ${dateEnd},  ID, 1, 1) / 1000 as TURN_DT,
    		F.a_turn_short(${dateBegin}, ${dateEnd},  ID, 0, 1) / 1000 as TURN_KT,
    		F.a_saldo_short(${dateEnd}, ID, 'с', 1) / 1000 as BL_OUT,
				--  !!!!   (+ n) дает остаток на след день, т.е. исходящий - так считает ЦФТ, (+ n - 1) даст остаток на тек. день
			(select AVG(F.a_saldo_short(${dateBegin} + n, ID,  'с', 1)) from (select level as n from dual connect by level <= (${dateEnd} - ${dateBegin} + 1))) / 1000 as BL_AVG,
			(select MIN(F.a_saldo_short(${dateBegin} + n, ID,  'с', 1)) from (select level as n from dual connect by level <= (${dateEnd} - ${dateBegin} + 1))) / 1000 as BL_MIN
		FROM 
			IBS.VW_CRIT_AC_FIN
		WHERE
			(C_19 is null or C_19 <> 'Помечен к открытию')
	)
SELECT
	CLIENT.*,	DEPOSIT.*,	TURN.*
FROM
	 DEPOSIT, CLIENT, TURN
WHERE
	DEPOSIT.CLIENT_ID = CLIENT.ID
	AND DEPOSIT.ACCOUNT_ID = TURN.ID


