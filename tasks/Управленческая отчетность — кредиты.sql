WITH KREDIT AS 
	(	
		SELECT 
			K.ID,
			K.CLASS_ID,
			K.REF1 as CLIENT_ID,
      K.REF10 as FACT_ID,
      K.REF27 as ACCS_ID,
      K.REF26 as LINE_ID,
			K.C_37 as DEP,
			K.C_2 as DOG,
			TO_CHAR(K.C_6, 'DD.MM.YYYY') as DATEBEGIN,
			TO_CHAR(K.C_7, 'DD.MM.YYYY') as DATEEND,
			K.C_5 as CUR,
			K.C_4/1000 as DOGSUM,
	    K.C_4/1000*( -- умножаем на курс валюты
    								SELECT 
                      r.C_2/r.C_3 
    								FROM 
                      IBS.VW_CRIT_RECONT_SORT r, 
                      IBS.VW_CRIT_FT_MONEY m
    								WHERE	
    									m.ID = K.REF5 
                      AND r.COLLECTION_ID = m.REF7
                      AND r.C_1 < ${dateEnd} + 1
    									AND r.C_1 = (select MAX(C_1) from IBS.VW_CRIT_RECONT_SORT where C_1 < ${dateEnd} + 1 and COLLECTION_ID = r.COLLECTION_ID) 
    							 ) as DOGSUMRUB,
  			( CASE WHEN K.CLASS_ID = 'OVERDRAFTS' 
  				THEN 'Овердрафт' 
  				ELSE (CASE WHEN (SELECT C_5 FROM IBS.VW_CRIT_KIND_CREDITS WHERE ID = K.REF8)='CRED_CONT' 
  							THEN 'Кредит' 
  							ELSE (CASE WHEN (SELECT C_5 FROM IBS.VW_CRIT_KIND_CREDITS WHERE ID = K.REF8)='CRED_LINE' 
  										THEN 'ВКЛ' 
  										ELSE 'НВКЛ' 
  										END) 
  							END) 
  				END) as PROD,
			( SELECT 
						H.C_5+NVL(( SELECT 
													HB.C_5 
												FROM 
													IBS.VW_CRIT_PRC_SCHEME SB, 
													IBS.VW_CRIT_ARC_SCH_PRC HB 
												WHERE 
													SB.ID=S.REF12 
													and HB.COLLECTION_ID=SB.REF7 
													and HB.C_1 < ${dateEnd} + 1 
													and (HB.C_2 is NULL or HB.C_2 >= ${dateEnd}) ),0) 
					FROM 
						IBS.VW_CRIT_DEBT_COMIS_ALL PS, 
						IBS.VW_CRIT_PRC_SCHEME S, 
						IBS.VW_CRIT_ARC_SCH_PRC H 
					WHERE 
						PS.COLLECTION_ID=K.REF14 
						and PS.C_3='Неучтенные проценты за кредит' 
						and S.ID=PS.REF5 
						and H.COLLECTION_ID=S.REF7 
						and H.C_1=(SELECT MAX(C_1) FROM IBS.VW_CRIT_ARC_SCH_PRC WHERE COLLECTION_ID=H.COLLECTION_ID and C_1 < ${dateEnd} + 1) ) as PRC
		FROM 
			IBS.VW_CRIT_PR_CRED K	 -- Кредиты
		WHERE 
			K.CLASS_ID in('KRED_CORP','OVERDRAFTS') -- Кредиты ЮЛ и Овердрафты
			and K.C_6 < ${dateEnd} + 1
			and (K.C_16 is NULL or K.C_16 >= ${dateBegin}) 
	)
SELECT
	KREDIT.*,
    CLIENT.*,
	SALDO.*,
    FACT.*,
	( SELECT 
			( CASE WHEN SUM(K.DOGSUM) > 0 
				THEN SUM(K.DOGSUM*K.PRC)/SUM(K.DOGSUM) 
				END )	
		FROM 
			KREDIT K 
		WHERE 
			K.ID = KREDIT.ID 
			or K.LINE_ID = KREDIT.ID ) as PRC_SV
FROM
	KREDIT 
LEFT JOIN ( ${CLIENT} ) CLIENT ON CLIENT.ID = KREDIT.CLIENT_ID 
  LEFT JOIN ( -- выборка остатков по счетам
              SELECT
      					NVL(KR.LINE_ID, KR.ID) as ID,
      					-- берем исходящий остаток по счету
      					NVL(SUM(CASE WHEN ACCS.C_5='ACCOUNT - Ссудный счет' THEN F.a_saldo_short(${dateEnd}, ACCS.REF2, 'с', 1) END),0)/1000 as ACCOUNT,
      					NVL(SUM(CASE WHEN ACCS.C_5='VNB_UNUSED_LINE - Неиспользованные кредитные линии' and KR.LINE_ID is NULL THEN F.a_saldo_short(${dateEnd}, ACCS.REF2, 'с', 1) END),0)/1000 as VNB_UNUSED_LINE,
      					NVL(SUM(CASE WHEN ACCS.C_5='ACC_DEBTS_CR - Счет просроченной задолженности по кредиту' THEN F.a_saldo_short(${dateEnd}, ACCS.REF2, 'с', 1) END),0)/1000 as ACC_DEBTS_CR,
      					NVL(SUM(CASE WHEN ACCS.C_5='ACC_RESERV - Счет резерва' THEN F.a_saldo_short(${dateEnd}, ACCS.REF2, 'с', 1) END),0)/1000 as ACC_RESERV
      				FROM 
      					KREDIT KR,
      					IBS.VW_CRIT_HOZ_OP_ACC ACCS		-- массив Счета договора *** Кредиты юридическим лицам (Список всех кредитов)
      				WHERE 
      					ACCS.COLLECTION_ID=KR.ACCS_ID
                and ACCS.C_1 < ${dateEnd} + 1
      					and ACCS.C_1 = (SELECT MAX(C_1) FROM IBS.VW_CRIT_HOZ_OP_ACC WHERE COLLECTION_ID = ACCS.COLLECTION_ID and C_5 = ACCS.C_5 and C_1 < ${dateEnd} + 1)
      				GROUP BY 
                NVL(KR.LINE_ID, KR.ID) 
          ) SALDO ON SALDO.ID = KREDIT.ID
  LEFT JOIN ( -- выборка фактических операций
              SELECT 
                NVL(KR.LINE_ID, KR.ID) as ID,
     					NVL(SUM(CASE WHEN FO.REF5 in (SELECT ID FROM IBS.VW_CRIT_VID_OPER_DOG_CRED WHERE C_7 in ('Обычная') and C_8 in ('Гашение кредита')) THEN DOCS.C_5 END),0)/1000 as PAYS,
      					NVL(SUM(CASE WHEN FO.REF5 in (SELECT ID FROM IBS.VW_CRIT_VID_OPER_DOG_CRED WHERE C_7 in ('Обычная') and C_8 in ('Выдача кредита')) THEN DOCS.C_5 END),0)/1000 as LOANS
      				FROM 
      					KREDIT KR,
      					IBS.VW_CRIT_FACT_OPER FO,	-- массив Фактические операции *** Кредиты юридическим лицам (Список всех кредитов)
      					IBS.VW_CRIT_MAIN_DOCUM DOCS	-- Платежные документы (Список документов)
      				WHERE 
      					FO.COLLECTION_ID=KR.FACT_ID
      					and DOCS.ID=FO.REF6 
      					and FO.C_1 >= ${dateBegin} and FO.C_1 < ${dateEnd} + 1
              GROUP BY 
                NVL(KR.LINE_ID, KR.ID) 
      			)	FACT ON FACT.ID = KREDIT.ID
  WHERE
    KREDIT.LINE_ID is NULL        -- убираем транши из списка
    AND CLIENT.NAME is not NULL  -- убираем овердрафты ФЛ из списка
