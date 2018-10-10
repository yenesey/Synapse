//////////////////////////////////////////////////
// Уведомление о неотправленных сообщений в ФНС //
//                                              //
// ©	Дмитрий Хмелев                            //
//////////////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

/////////////////////////////////////////////
/////// если запущено из Планировщика ///////
/////////////////////////////////////////////
  if (!param.task.user) {
    // завершаем, если сегодня нет ОД
    if (!await ibso.existOD(moment()))
      process.exit(2);
  }
/////////////////////////////////////////////

  var dateBegin = `TO_DATE('${moment(param.dateRep).format('YYYY-MM-DD')}')`;
  if (param.deps[0]) 
    var deps = param.deps[0];
  else {
    console.log('Подразделение не указано \r\nлибо нет доступа к выбранному подразделению.\r\nОбратитесь к Администратору');
		process.exit(1);
  }

  var mes = "";

  /*
    //
   // Уведомление о необработанных файлах из ФНС
  ///////////////////////////////////////////////
  var SQL = "select C_1, C_2, C_3, C_4 " +
            "from IBS.VW_CRIT_GNI_JOUR " +
            "where C_2 like '_____0407592%' and (C_21 is NULL or C_21 not in('Принят НО','Забракован НО'))";
  var rs = await ibso.query(SQL);
  if (rs) 
    mes = mes + rs.rows.reduce((all, el) => all = all + moment(el[0]).format('DD.MM.YYYY') + " " + el[1] + " (" + el[2] + ") " + el[3] + "\r\n", "");
  */

    //
   // Уведомление о неотправленных сообщений в ФНС 
  ////////////////////////////////////////////////
  var filterAcc = `(C_1 like '20309%' or C_1 like '405%' or C_1 like '406%' or C_1 like '407%' or C_1 like '408%' or C_1 like '411%' or C_1 like '412%' or C_1 like '413%' or C_1 like '414%' or C_1 like '415%' or C_1 like '416%' or C_1 like '417%' or C_1 like '418%' or C_1 like '419%' or C_1 like '420%' or C_1 like '421%' or C_1 like '422%' or C_1 like '4230%' or C_1 like '424%' or C_1 like '425%' or C_1 like '426%' or C_1 like '427%' or C_1 like '428%' or C_1 like '429%' or C_1 like '430%' or C_1 like '431%' or C_1 like '432%' or C_1 like '433%' or C_1 like '434%' or C_1 like '435%' or C_1 like '436%' or C_1 like '437%' or C_1 like '438%' or C_1 like '439%' or C_1 like '440%') 
                  and C_1 not like '40____________7%' 
                  and C_1 not like '42309%'`;
  
  // открытые счета 
  var SQL = ` SELECT 
                * 
              FROM
    						( select
                    ACC_FIN.ID as ID, 
                    ACC_FIN.C_1 as ACCOUNT, 
                    ACC_FIN.C_13 as DATEOP,
                    ACC_FIN.C_19 as STATUS,
                    NVL(( select 
    												AD.C_2 
    											from 
    												IBS.VW_CRIT_AC_FIN A,
    												IBS.VW_CRIT_ACC_PROD P,
    												IBS.VW_CRIT_DEPN D,
    												IBS.VW_CRIT_HOZ_OP_ACC AD
    											where
    												A.ID = ACC_FIN.ID
    												and P.COLLECTION_ID = A.REF39
    												and D.ID = P.REF3
    												and AD.COLLECTION_ID = D.REF13
    												and AD.REF2 <> A.ID
    												and AD.C_5='D_ACCOUNT - Счет депозитного договора'
    												and AD.C_1 = (SELECT MAX(C_1) FROM IBS.VW_CRIT_HOZ_OP_ACC WHERE COLLECTION_ID = AD.COLLECTION_ID and C_5 = AD.C_5 and REF2 <> A.ID)
    										), '') as ACCOLD
                  from 
                    IBS.VW_CRIT_AC_FIN ACC_FIN
                  where 
                    ${filterAcc.replace(/C_1/g,'ACC_FIN.C_1')}
                    and ACC_FIN.C_32 = '${deps}' 
                    and ACC_FIN.C_13 >= ${dateBegin}
                  order by 
                    ACC_FIN.C_13 )
              WHERE
                (ACCOUNT not in (select NVL(C_3,0) from IBS.VW_CRIT_GNI_JOUR where C_2 like '___010407592%' and C_1 >= ${dateBegin}) and ACCOLD is NULL)
                or (ACCOUNT not in (select NVL(C_3,0) from IBS.VW_CRIT_GNI_JOUR where C_2 like '___110407592%' and C_1 >= ${dateBegin}) and ACCOLD is not NULL)`;
  var rs = await ibso.query(SQL);
  if (rs)
    mes = mes + rs.reduce((all, el) => all + moment(el.DATEOP).format('DD.MM.YYYY') + "   " + el.ACCOUNT + ((el.STATUS == 'Помечен к открытию') ? '   помечен к открытию ' : '   открыт ') + ((el.ACCOLD) ? '(переоформлен '+el.ACCOLD+')' : '') + "\r\n", "");
  
  // закрытые счета
  var SQL = `select 
                C_1 as ACCOUNT, 
                C_16 as DATEOP 
             from 
                IBS.VW_CRIT_AC_FIN 
             where 
                ${filterAcc} 
                and C_32 = '${deps}' 
                and C_16 >= ${dateBegin}
                and (C_17 <> 'Пролонгация' or C_17 is NULL)
                and C_1 not in (select NVL(C_3,0) from IBS.VW_CRIT_GNI_JOUR where C_2 like '___210407592%' and C_1 >= ${dateBegin}) 
             order by C_16`;     
  var rs = await ibso.query(SQL);
  if (rs)
    mes = mes + rs.reduce((all, el) => all + moment(el.DATEOP).format('DD.MM.YYYY') + "   " + el.ACCOUNT + "   закрыт " + "\r\n", "");

  // изменение реквизитов Клиента 
  var SQL = `select distinct 
                A.C_1 as ACCOUNT, 
                A.C_3 as CLIENT, 
                H.C_3 as DATEOP
             from 
                IBS.VW_CRIT_AC_FIN A, 
                IBS.VW_CRIT_CL_HIST H 
             where 
                ${filterAcc.replace(/C_1/g,'A.C_1')} 
                and A.C_13 <= H.C_3 
                and A.C_32 = '${deps}' 
                and (A.C_16 is NULL or A.C_16 >= ${dateBegin}) 
                and H.REF2 = A.REF3 
                and H.C_3 >= ${dateBegin} 
                and H.C_4 in ('DOC.NUM','DOC.SER') 
                and H.C_6 is not NULL 
                and A.C_1 not in (select C_3 from IBS.VW_CRIT_GNI_JOUR where C_2 like '___110407592%' and C_1 >= ${dateBegin})
             order by H.C_3`;
  var rs = await ibso.query(SQL);
  if (rs)
    mes = mes + rs.reduce((all, el) => all + moment(el.DATEOP).format('DD.MM.YYYY') + "   " + el.ACCOUNT + "   " + el.CLIENT + "\r\n", "");
  
  if (mes)
    console.log(mes);
  else
    console.log('Неотправленных сообщений по счетам нет');
}