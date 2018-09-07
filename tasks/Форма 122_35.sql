SELECT
   C_7 as ACC, 
   C_6 as VAL, 
   C_25 as CLIENT, 
   SUM(C_4) as SUMMA, 
   SUM(C_5) as SUMMARUB 
FROM 
   IBS.VW_CRIT_MAIN_DOCUM 
WHERE 
   (C_7 like '405%' or C_7 like '406%' or C_7 like '407%' or C_7 like '40802%' or C_7 like '40807%' or C_7 like '40821%') 
   and C_8 like '70601%' 
   and C_9='Проведен' 
   and C_36 like ${deps}
   and C_10 between TO_DATE(${dateRep}||' 00:00:00','YYYY-MM-DD hh24:mi:ss') and TO_DATE(${dateRep}||' 23:59:59','YYYY-MM-DD hh24:mi:ss')
GROUP BY 
   C_7, C_6, C_25 
ORDER BY 
   C_25