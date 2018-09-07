//////////////////////////////////////////////////
// Формирование сведений о ссудах,              //
// предоставленных юридическим лицам            //
//                                              //
// ©	Дмитрий Хмелев                            //
//////////////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require('path'),
    ldap = require('synapse/ds-ldap')(system.config.ntlm),
    office = require('synapse/office'),
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

  var dateRep = moment(param.dateRep);
  if (param.deps[0]) {
    var deps = param.deps[0];
    switch(deps) {
      case "001": var nameDep = '_ГО'; break;
      case "002-00": var nameDep = '_СФ'; break;
      case "002-01": var nameDep = '_Иркутск'; break;
      case "004": var nameDep = '_ПФ'; break;
    }
  }
  else {
    console.log('Нет доступа к выбранному подразделению.\r\nОбратитесь к Администратору');
		process.exit(1);
  }

  var user = ( await ldap({ fields: ['displayName','telephoneNumber'],
                            query:'(sAMAccountname='+param.task.user+')' }) )[0];

   var SQL = `WITH
                DEPOSIT as (SELECT
                              DEPO.CLASS_ID,
                              DEPO.REF2 as CLIENT_ID, 
                              DEPO.C_2 as NAME,
                              ( CASE WHEN DEPO.CLASS_ID='DEPOSIT_ORG' THEN 1 ELSE 5 END ) as CODE,
                            	'ДТ' as TYPE_O,
                            	ROUND(DOC.C_5/1000, 0) as SUM_O,
                            	TO_CHAR(DEPO.C_11,'DD.MM.YYYY') as DATE_O
                            FROM
                            	IBS.VW_CRIT_DEPN DEPO,
                            	IBS.VW_CRIT_DEPN_OPERS OPER,
                            	IBS.VW_CRIT_MAIN_DOCUM DOC
                            WHERE 
                            	DEPO.CLASS_ID in ('DEPOSIT_ORG','DEPOSIT_PRIV')
                            	and DEPO.C_36 like '${deps}%'
                            	and DEPO.C_11 = '${dateRep.format('YYYY-MM-DD')}'
                            	and OPER.COLLECTION_ID = DEPO.REF14
                            	and OPER.C_1 = '${dateRep.format('YYYY-MM-DD')}'
                            	and OPER.C_4 = 'Возврат депозита'
                            	and DOC.ID = OPER.REF5
                            ORDER BY
                              DEPO.CLASS_ID, DEPO.C_2)

              SELECT 
                ROWNUM, 
                DEPOSIT.*,
                ( CASE WHEN DEPOSIT.CLASS_ID='DEPOSIT_ORG' 
                  THEN (SELECT C_29 FROM IBS.VW_CRIT_CL_ORG WHERE ID = DEPOSIT.CLIENT_ID)
                  ELSE (SELECT C_5 FROM IBS.VW_CRIT_CL_PRIV WHERE ID = DEPOSIT.CLIENT_ID)
                  END ) as ID_NUM
              FROM 
                DEPOSIT`;

  var rsDog = await ibso.query(SQL);

  var excel = new office.Excel(path.join(__dirname,'templates','Исполненные обязательства.xlsx'));

  excel.replace(1, {
		dog: (rsDog) ? rsDog : [],
    performerFIO: user.displayName,
    performerTel: user.telephoneNumber
  });

  excel.save(path.join(param.task.path,'Приложение 4 за '+dateRep.format('DD.MM.YYYY')+nameDep+'.xlsx'));
}