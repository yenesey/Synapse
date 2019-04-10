/*
    СМС по открытым овердрафтам
    (c) Денис Богачев <d.enisei@yandex.ru>

*/
const fs = require("fs")
const path = require("path")
const iconv = require('iconv-lite')


module.exports = async function(param, system){

  const ora = require('synapse/ds-oracle')(system.config.ibs)

  let rec = await ora(`
SELECT
  OV.C_3 "date_begin",
  OV.C_13 "debt",
  OV.C_2 "fio",
  (select
     SUBSTR(C_1, 1, 4) ||'.......'|| SUBSTR(C_1, 13, 4)
   from 
     VW_CRIT_VZ_CARDS 
   where 
     REF5 = OV.REF10 
     and lower(C_2) like '%главная%'
     and (C_11 is null or C_11 > OV.C_3)
  ) "card",
  NVL(
  (
    select PROP.C_7 from 
      VW_CRIT_VZ_CARDS CARD,
      VW_CRIT_CARD_SERVICES SERV,
      VW_CRIT_PROPERTY PROP
    where
      CARD.REF3 = OV.REF2 --связь через клиента
      and CARD.STATE_ID = 'WRK'
      and SERV.C_3 = CARD.ID
      and PROP.COLLECTION_ID = SERV.REF8 and lower(PROP.C_1) like '%номер%телефон%'
      and rownum = 1
  ) ,
  (
    select regexp_replace(CLIENT.C_11,'[^[[:digit:]|\,]]*') from 
      VW_CRIT_VZ_CLIENT CLIENT
    where
      CLIENT.REF1 = OV.REF2 --связь через клиента
     -- and regexp_like(regexp_replace(CLIENT.C_11,'[^[[:digit:]|\,]]*'),  '^\d{11}$')
      and rownum = 1
  )) "tel"
FROM 
  VW_CRIT_TVR_CARD_OVER OV
WHERE 
  OV.C_5 = 'Технический овердрафт по карте'
  and OV.C_3 = TO_DATE('${param.date1}')
  and OV.C_13 > 0
`)


  fs.writeFileSync(
    path.join(param.task.path, 'open.csv'),
    iconv.encode(
      rec.reduce((all, el)=> all + el.fio + ';' + el.tel + ';' + 
      	`Уважаемый клиент! Информируем о возникновении задолженности по карте ${el.card} в размере ${el.debt.toFixed(2)}` + 
      	'\r\n' , ''),
      'windows-1251'
    )  
  )
  
rec = await ora(`
SELECT 
  OV.C_3 "date_begin",
  OV.C_13 "debt",
  OV.C_2 "fio",
  (select
     SUBSTR(C_1, 1, 4) ||'.......'|| SUBSTR(C_1, 13, 4)
   from 
     VW_CRIT_VZ_CARDS 
   where 
     REF5 = OV.REF10 
     and lower(C_2) like '%главная%'
   --  and lower(C_2) like '%главная%' and C_10 = (select max(C_10) from VW_CRIT_VZ_CARDS where REF5 = OV.REF10 and lower(C_2) like '%главная%')
     and (C_11 is null or C_11 > OV.C_3)
  ) "card",
  NVL(
  (
    select PROP.C_7 from 
      VW_CRIT_VZ_CARDS CARD,
      VW_CRIT_CARD_SERVICES SERV,
      VW_CRIT_PROPERTY PROP
    where
      CARD.REF3 = OV.REF2  --связь через клиента
      and CARD.STATE_ID = 'WRK'
      and SERV.C_3 = CARD.ID
      and PROP.COLLECTION_ID = SERV.REF8 and lower(PROP.C_1) like '%номер%телефон%'
      and rownum = 1
  ) ,
  (
    select regexp_replace(CLIENT.C_11,'[^[[:digit:]|\,]]*') from 
      VW_CRIT_VZ_CLIENT CLIENT
    where
      CLIENT.REF1 = OV.REF2 --связь через клиента
    --  and regexp_like(regexp_replace(CLIENT.C_11,'[^[[:digit:]|\,]]*'),  '^\d{11}$')
      and rownum = 1
  )) "tel"
FROM 
  VW_CRIT_TVR_CARD_OVER OV
WHERE 
  OV.C_5 = 'Технический овердрафт по карте' 
  and OV.C_13 > 0
  and exists (select ID from VW_CRIT_FACT_OPER where COLLECTION_ID = OV.REF25 and C_1 > OV.C_3 and C_5 = 'Выдача кредита' and C_1 = TO_DATE('${param.date1}'))
`)

  fs.writeFileSync(
    path.join(param.task.path, 'plus.csv'),
    iconv.encode(
      rec.reduce((all, el)=> all + el.fio + ';' + el.tel + ';' + 
      	`Уважаемый клиент! Информируем об увеличении задолженности по карте ${el.card} до размера ${el.debt.toFixed(2)}` + 
      	'\r\n' , ''),
      'windows-1251'
    )  
  )
  if (param.putFiles) {
  	fs.copyFileSync(path.join(param.task.path, 'plus.csv'), '\\\\zvonok1\\MAILBOX\\SMS\\overdraft\\' + 'plus.csv')
  	fs.copyFileSync(path.join(param.task.path, 'open.csv'), '\\\\zvonok1\\MAILBOX\\SMS\\overdraft\\' + 'open.csv')
  }
}