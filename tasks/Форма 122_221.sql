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
  (CASE WHEN ${saldoOperAVG} > 40000000 THEN '2.2.3.5' ELSE '2.2.1.2' END) as STRF122
FROM 
  IBS.VW_CRIT_AC_FIN A, 
  IBS.VW_CRIT_CL_ORG C, 
  IBS.VW_CRIT_OKVED_PERIOD O, 
  IBS.VW_CRIT_FORM_PROPETY P 
WHERE 
  O.COLLECTION_ID=C.REF8 
  and O.C_7 = 1
  and O.C_4 <= TO_DATE(${dateRep})
  and (O.C_5 is NULL or O.C_5 > TO_DATE(${dateRep}))
  and C.ID=A.REF3 
  and P.ID=C.REF6 
  and SUBSTR(O.C_2,1,2) not in ('64','65','66') 
  and A.C_5 = 'пассивный' 
  and A.C_30<>'47426' 
  and A.C_31 LIKE ${deps}
  and A.C_23 <> 'Депозиты физических лиц' 
  and F.a_saldo_short(${dateRep}, A.ID, 'с', 0) <> 0 
  and (C.C_6='ИП' or C.C_13 in('Микропредприятия','Субъект малого предпринимательства','Субъект среднего предпринимательства','Субъект малого и среднего предпринимательства') or P.C_3 = 'Финансовые')
ORDER BY 
  C.C_2