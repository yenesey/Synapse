SELECT
	CLIENT.*,
	(SELECT 
		SUM(F.a_turn_short(${dateBegin},  ${dateEnd}, ID, 1, 1))
	FROM 
		IBS.VW_CRIT_AC_FIN 
	WHERE
		REF3 = CLIENT.ID
		AND REF23 in (1942558, 1942562)  -- счет РКО/РКО валюта
	)/1000 as TURN_DT, 
	(SELECT 
		SUM(F.a_turn_short(${dateBegin},  ${dateEnd},  ID, 0, 1))
	FROM 
		IBS.VW_CRIT_AC_FIN 
	WHERE
		REF3 = CLIENT.ID
		AND REF23 in (1942558, 1942562)  -- счет РКО/РКО валюта
	)/1000 as TURN_KT,
	(SELECT
		COUNT(*)
	FROM
		IBS.VW_CRIT_AC_FIN
	WHERE
		REF3 = CLIENT.ID
		AND REF23 in (1942558, 1942562)  -- счет РКО/РКО валюта
		AND (C_16 is NULL or C_16 >= ${dateBegin})
	) as ACC_RKO,
	(SELECT SUM(AVG) FROM (
		SELECT 
			(SELECT
			    AVG(F.a_saldo_short(${dateBegin} + n, ID,  'с', 1))
				FROM 
					(select level as n from dual connect by level <= ${dateEnd} - ${dateBegin} + 1)  --!!!
			)	as AVG
		FROM 
			IBS.VW_CRIT_AC_FIN ACC
		WHERE
			REF3 = CLIENT.ID
			AND REF23 in (1942558, 1942562)  -- счет РКО/РКО валюта
	))/1000 as RKO_AVG,
	(SELECT 
		SUM(F.a_saldo_short(${dateEnd}+1, ID,  'с', 1))
	FROM 
		IBS.VW_CRIT_AC_FIN 
	WHERE
		REF3 = CLIENT.ID
		AND C_23 like 'Депозиты%'
	)/1000 as DEPO_BALANCE,
	(SELECT 
		SUM(F.a_saldo_short(${dateEnd}+1, ID,  'с', 1))
	FROM 
		IBS.VW_CRIT_AC_FIN 
	WHERE
		REF20 = CLIENT.ID --для расчетов с которым
		AND REF23 = 1942556 --Ссудные счета (дистрибутив)
		AND lower(C_24) like '%ссудный%' --		AND REF24 = 22523791 --Ссудный счет кредита
		AND (C_16 is NULL or C_16 >= ${dateBegin})
	)/1000 as CRED_BALANCE,

	(

		1000


	)/1000	as ARREARS,

	(
	CASE WHEN 
		EXISTS(
			SELECT 
				*
			FROM 
				IBS.VW_CRIT_PR_CRED CR
			WHERE 
				CR.REF1 = CLIENT.ID
				AND CR.CLASS_ID in('KRED_CORP','OVERDRAFTS') -- Кредиты ЮЛ и Овердрафты
				AND CR.C_6 < ${dateEnd} + 1 AND (CR.C_16 is NULL or CR.C_16 >= ${dateBegin}) 
				AND CR.REF26 is NULL --достаточно верхнего уровня
				AND NOT EXISTS (   -- == нет просрочки на дату
					SELECT 
						* 
					FROM 
						IBS.VW_CRIT_HOZ_OP_ACC ACC
					WHERE 
						ACC.COLLECTION_ID = CR.REF27
									--!!! в МФК было ACC.C_5!!! - надо проверить!!!
						AND	(ACC.C_4='ACC_DEBTS_CR - Счет просроченной задолженности по кредиту' OR	ACC.C_4='ACC_DEBTS_PRC - Счет просроченной задолженности по процентам') 
						AND F.a_saldo_short(${dateEnd}+1, ACC.REF2, 'с', 1) > 0
				) 
				AND (SELECT SUM(F.a_saldo_short(${dateEnd}+1, ID,  'с', 1)) FROM IBS.VW_CRIT_AC_FIN WHERE REF20 = CLIENT.ID	AND (REF23 = 1942556 AND lower(C_24) like '%ссудный%'))	> 0
	 	) 
		THEN 1 
		ELSE 0
	END
	) as CRED_ACT,
	(
		SELECT SUM(C_8)	FROM IBS.VW_CRIT_ALL_GUARANTIES	WHERE	REF1 = CLIENT.ID
	) /1000 as GUARANTEE

FROM
	( ${CLIENT} ) CLIENT
WHERE 
	DATE_BEGIN is not NULL

