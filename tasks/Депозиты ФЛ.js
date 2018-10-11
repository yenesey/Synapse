///////////////////////////////////////////////
// Уведомление о незагруженных файлах из ФНС //
//                                           //
// ©	Дмитрий Хмелев                         //
///////////////////////////////////////////////

module.exports = async function(params, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

if (params.deps[0]) {
    var deps = params.deps[0];
    switch(deps) {
      case "001%": var accdeps = '000'; break;
      case "002%": var accdeps = '0200'; break;
      case "002-01%": var accdeps = '0201'; break;
      case "003%": var accdeps = '0300'; break;
      case "004%": var accdeps = '0400'; break;
    }
  }
  else {
    console.log('Подразделение не указано \r\nлибо нет доступа к выбранному подразделению.\r\nОбратитесь к Администратору');
		process.exit(1);
  }

  ibso.query(`SELECT 
                COUNT(CASE WHEN DEPN.C_10 not like '%VIP%' 
                            and DEPN.C_9 like (CASE WHEN DEPN.C_10 like '%Мультивалютный%' THEN 'RUB' ELSE '%%' END) 
                            and DEPN.C_5 >= '2017-05-19' 
                      THEN 1 
                      END) as NOVIP_COUNT, 
                NVL(SUM(CASE WHEN DEPN.C_10 not like '%VIP%' 
                              and DEPN.C_5 >= '2017-05-19' 
                        THEN F.a_saldo_short('${params.dateRep}', ACC.REF2, 'с', 1) 
                        END),0) as NOVIP_SUM,
                COUNT(CASE WHEN DEPN.C_10 like '%VIP%' 
                            and DEPN.C_9 like (CASE WHEN DEPN.C_10 like '%Мультивалютный%' THEN 'RUB' ELSE '%%' END) 
                      THEN 1 
                      END) as VIP_COUNT, 
                NVL(SUM(CASE WHEN DEPN.C_10 like '%VIP%' 
                        THEN F.a_saldo_short('${params.dateRep}', ACC.REF2, 'с', 1) 
                        END),0) as VIP_SUM
              FROM
                IBS.VW_CRIT_DEPN DEPN, 
                IBS.VW_CRIT_HOZ_OP_ACC ACC
              WHERE 
                ACC.COLLECTION_ID = DEPN.REF13
                and ACC.C_5 = 'D_ACCOUNT - Счет депозитного договора'
                and DEPN.C_3 like '423______${accdeps}%'
                and DEPN.C_5 < '${params.dateRep}'
                and (DEPN.C_11 >= '${params.dateRep}' or DEPN.C_11 is Null)`)
  .then(rs  => {
    if (rs && rs.length) {
      console.log('Информация по рознице: \r\n\t' + rs[0].NOVIP_COUNT + ' вкладов на сумму ' + rs[0].NOVIP_SUM.toString().replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ') + ' рублей\r\n');
      console.log('Информация по VIP:  \r\n\t' + rs[0].VIP_COUNT + ' вкладов на сумму ' + rs[0].VIP_SUM.toString().replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ') + ' рублей\r\n');
    }
  });
}