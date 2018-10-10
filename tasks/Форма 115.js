//////////////////////////////////////////////////
// Формирование сведений о ссудах,              //
// которые должны отражаться в ф.0409115        //
// в соответствии с п. 3.10, п.3.14.3, п.3.12.3 // 
// Положения Банка России N 254-П:              //
//                                              //
// ©	Дмитрий Хмелев                            //
//////////////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require('path'),
    office = require('synapse/office'),
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

  var dateRep = moment(param.dateRep);
  if (param.deps[0]) {
    var deps = param.deps[0];
    switch(deps) {
      case "001": var nameRep = dateRep.format('ГО_на DD.MM.YYYY')+'.xlsx'; break;
      case "002": var nameRep = dateRep.format('СФ_на DD.MM.YYYY')+'.xlsx'; break;
      case "003": var nameRep = dateRep.format('ЯФ_на DD.MM.YYYY')+'.xlsx'; break;
      case "004": var nameRep = dateRep.format('ПФ_на DD.MM.YYYY')+'.xlsx'; break;
      default: var nameRep = dateRep.format('на DD.MM.YYYY')+'.xlsx';
    }
  }
  else {
    console.log('Подразделение не указано \r\nлибо нет доступа к выбранному подразделению.\r\nОбратитесь к Администратору');
		process.exit(1);
  }

  var sDateRep = `TO_DATE('${dateRep.format('YYYY-MM-DD')}')`;

   var SQL = `SELECT 
                ROWNUM, 
                D.*
              FROM 
                ( SELECT 
                    L.ACC, 
                    TO_CHAR(L.P310, 'DD.MM.YYYY') as P310,
                    TO_CHAR(L.P3143, 'DD.MM.YYYY') as P3143,
                    F.a_saldo_short(${sDateRep}, A.ID, 'с', 1) as SALDO,
                    A.C_4 as ACCNAME,
                    TO_CHAR(L.P3123, 'DD.MM.YYYY') as P3123
                  FROM ( SELECT 
                           ACC.C_1 as ACC, 
                           MAX(CASE WHEN H.C_1='P590_3.10' THEN H.C_3 END) as P310, 
                           MAX(CASE WHEN H.C_1='P590_3.14.3' THEN H.C_3 END) as P3143, 
                           MAX(CASE WHEN H.C_1='P590_3.12.3' THEN H.C_3 END) as P3123
                         FROM 
                           IBS.VW_CRIT_PR_CRED K, 
                           IBS.VW_CRIT_REPS_PRZ_HIST H, 
                           IBS.VW_CRIT_HOZ_OP_ACC A,
                           IBS.VW_CRIT_AC_FIN ACC 
                         WHERE 
                           K.C_37 like '${deps}%' 
                           and K.C_6 < ${sDateRep} 
                           and (K.C_16 >= ${sDateRep} or K.C_16 is NULL) 
                           and K.C_3 is not NULL 
            
                           and H.COLLECTION_ID=K.REF48 
                           and H.C_1 in ('P590_3.10','P590_3.14.3','P590_3.12.3') 
                           and H.C_3 <= ${sDateRep} 
                           and (H.C_4 > ${sDateRep} or H.C_4 is NULL) 
            
                           and A.COLLECTION_ID=K.REF27 
                           and A.C_5 in ('ACCOUNT - Ссудный счет','ACC_DEBTS_CR - Счет просроченной задолженности по кредиту') 
                           and A.C_1 <= ${sDateRep}
            
                           and ACC.ID = A.REF2
                           and (ACC.C_16 >= ${sDateRep} or ACC.C_16 is NULL)
                         GROUP BY
                           ACC.C_1
                        UNION 
                         SELECT 
                           C_5 as ACC,
                           MAX(CASE WHEN C_1='P590_3.10' THEN C_2 END) as P310, 
                           MAX(CASE WHEN C_1='P590_3.14.3' THEN C_2 END) as P3143, 
                           MAX(CASE WHEN C_1='P590_3.12.3' THEN C_2 END) as P3123
                         FROM 
                           IBS.VW_CRIT_REPS_PRZ_AC_FIN 
                         WHERE 
                           C_18 like '${deps}%' 
                           and C_1 in ('P590_3.10','P590_3.14.3','P590_3.12.3') 
                           and C_2 <= ${sDateRep} 
                           and (C_3 > ${sDateRep} or C_3 is NULL) 
                         GROUP BY
                           C_5 ) L
                  LEFT OUTER JOIN 
                    IBS.VW_CRIT_AC_FIN A 
                  ON 
                    A.C_1 = L.ACC
                  ORDER BY 
                    A.C_20 ) D
             WHERE
                SALDO <> 0`;

  var rsDog = await ibso.query(SQL);
  if (rsDog){
    var excel = new office.Excel(path.join(__dirname,'templates','Форма 115.xlsx'));

    var sum = rsDog.reduce((all, el)=>all+el.SALDO, 0);

    excel.replace(1, {
      date: dateRep.format('MM/DD/YYYY'),
      sum: sum,
      performerFIO : param.performerFIO,
      performerTel: param.performerTel,
			dog: rsDog
    });
    excel.save(path.join(param.task.path,'Форма 115_' + nameRep));
  }
  else
    console.log('Нет документов по заданным параметрам');
}