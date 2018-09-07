WITH 
  DEPN as ( -- список депозитных договоров
            SELECT 
              K.ID as ID,
              K.REF13 as ACCS_ID,
              K.C_1 as NUM,
              K.C_9 as VAL, 
              K.C_2 as CLIENT, 
              (CASE WHEN K.CLASS_ID = 'DEPOSIT_ORG' THEN 'ЮЛ' ELSE CASE WHEN K.CLASS_ID = 'DEPOSIT_PRIV' THEN 'ФЛ' ELSE '' END END) as TYPE, 
              K.C_6 as DATEBEGIN, 
              NVL(( SELECT 
                  C_14
                FROM 
                  IBS.VW_CRIT_PROL
                WHERE 
                  ID = K.ID
                  and C_6 > TO_DATE(${dateRep}, 'YYYY-MM-DD') ), K.C_7) as DATEEND, 
              NVL(( SELECT 
                  C_18
                FROM 
                  IBS.VW_CRIT_PROL
                WHERE 
                  ID = K.ID
                  and C_6 > TO_DATE(${dateRep}, 'YYYY-MM-DD') ), P.C_5) as PRC 
            FROM 
              IBS.VW_CRIT_DEPN K, 
              IBS.VW_CRIT_ARC_SCH_PRC P
            WHERE
              P.COLLECTION_ID = K.REF17 
              and K.C_6 < TO_DATE(${dateRep}, 'YYYY-MM-DD') 
              and (K.C_11 >= TO_DATE(${dateRep}, 'YYYY-MM-DD') or (K.C_11 is null and K.C_12 <> 'Закрыт')) 
              and K.C_3 like '_________${accdeps}%' 
              and K.C_3 not like '40817%'  
              and K.C_3 not like '40820%'  
              and K.C_3 not like '4231%'  
              and K.C_3 like '42%' 
          )

SELECT 
  DEPN.*,
  ACCS.*,
  ACCSPRC.*
FROM
  DEPN
LEFT JOIN ( -- выборка счетов договора
            SELECT 
              D.ID,
              A.C_2 as ACC,
              F.a_saldo_short(${dateRep}, A.REF2, 'с', 0) as SALDO
            FROM 
              DEPN D,
              IBS.VW_CRIT_HOZ_OP_ACC A
            WHERE 
              A.COLLECTION_ID = D.ACCS_ID 
              and A.C_5 = 'D_ACCOUNT - Счет депозитного договора'
              and A.C_1 = (SELECT MAX(C_1) FROM IBS.VW_CRIT_HOZ_OP_ACC WHERE COLLECTION_ID = A.COLLECTION_ID and C_5 = A.C_5 and C_1 <= TO_DATE(${dateRep}, 'YYYY-MM-DD'))   
          ) ACCS ON ACCS.ID = DEPN.ID
LEFT JOIN ( -- выборка счетов процентов
            SELECT 
              D.ID,
              A.C_2 as ACCPRC,
              F.a_saldo_short(${dateRep}, A.REF2, 'с', 0) as SALDOPRC
            FROM 
              DEPN D,
              IBS.VW_CRIT_HOZ_OP_ACC A
            WHERE 
              A.COLLECTION_ID = D.ACCS_ID 
              and A.C_5 = 'D_TRM_INTS_LBS_ACC - Счет обязательств банка по уплате %% без нарушения сроков'
              and A.C_1 = (SELECT MAX(C_1) FROM IBS.VW_CRIT_HOZ_OP_ACC WHERE COLLECTION_ID = A.COLLECTION_ID and C_5 = A.C_5 and C_1 <= TO_DATE(${dateRep}, 'YYYY-MM-DD'))   
          ) ACCSPRC ON ACCSPRC.ID = DEPN.ID
ORDER BY 
  DEPN.TYPE, 
  DEPN.CLIENT, 
  DEPN.NUM