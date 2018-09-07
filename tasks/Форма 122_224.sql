SELECT 
  A.C_1 as ACC, 
  A.C_2 as VAL, 
  A.C_32 as BRANCH, 
  A.C_4 as NAME, 
  A.C_20 as CLIENT, 
  A.C_3 as CLIENTOWNER, 
  (CASE WHEN A.C_5 = 'пассивный' THEN 'П' ELSE 'А' END) as ACCTYPE, 
  F.a_saldo_short(${dateRep}, A.ID, 'с', 0) as SALDO, 
  F.a_saldo_short(${dateRep}, A.ID, 'с', 1) as SALDORUB, 
  TO_CHAR(A.C_13, 'DD.MM.YYYY') as ACCDATE, 
  O.C_2 as OKVED, 
  C.C_13 as CATEGORY, 
  C.C_6 as OKOPF,
  'н' as STABILITY,
  '2.2.4.1' as STRF122
FROM 
  IBS.VW_CRIT_DEPN D,
  IBS.VW_CRIT_AC_FIN A, 
  IBS.VW_CRIT_CL_ORG C, 
  IBS.VW_CRIT_OKVED_PERIOD O, 
  IBS.VW_CRIT_FORM_PROPETY P 
WHERE 
  O.COLLECTION_ID=C.REF8 
  and O.C_7 = 1
  and O.C_4 <= TO_DATE(${dateRep})
  and (O.C_5 is NULL or O.C_5 > TO_DATE(${dateRep}))
  and D.REF3 = A.ID
  and C.ID=A.REF3 
  and P.ID=C.REF6 
  and A.C_5 = 'пассивный' 
  and A.C_30<>'47426' 
  and A.C_31 LIKE ${deps} 
  and A.C_23 = 'Депозиты юридических лиц' 
  and D.C_10 NOT in ('ЮЛ-ДЕПОЗИТ НАКОПИТЕЛЬНЫЙ','ЮЛ-ДЕПОЗИТ НАКОПИТЕЛЬНЫЙ ПЛЮС','ЮЛ-ДЕПОЗИТ КЛАССИЧЕСКИЙ','ЮЛ-ДЕПОЗИТ РАСХОДНЫЙ','ЮЛ-ДЕПОЗИТ ГИБКИЙ','ЮЛ-ДЕПОЗИТ РАСХОДНЫЙ ПЛЮС','ЮЛ-ДЕПОЗИТ ДО 2-Х НЕДЕЛЬ') 
  and D.C_7 > TO_DATE(${dateRep},'YYYY-MM-DD')+30
  and F.a_saldo_short(${dateRep}, A.ID, 'с', 0) <> 0 
  and NOT (P.C_3 = 'Финансовые' or (C.C_6='ИП' and NOT C.C_6 is NULL) or (C.C_13 in('Микропредприятия','Субъект малого предпринимательства','Субъект среднего предпринимательства','Субъект малого и среднего предпринимательства') 
  and NOT C.C_13 is NULL)) 
ORDER BY 
  C.C_2