////////////////////////////////////////////
// Уведомление о первой операции по счету // 
// клиента на сумму более 600000 руб      //
//                                        //
// ©	Дмитрий Хмелев                      //
////////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require('path'),
    ibso = require('synapse/ibso')(system.config.ibs),
    db = require('synapse/sqlite')('./db/Обязательный контроль.db');
/*****************************/

  if (param.deps[0]) 
    var deps = param.deps[0];
  else {
    console.log('Нет доступа к выбранному подразделению.\r\nОбратитесь к Администратору');
		process.exit(1);
  }

/////////////////////////////////////////////
/////// если запущено из Планировщика ///////
/////////////////////////////////////////////
  if (!param.task.user) {
    // завершаем, если сегодня нет ОД
    if (!await ibso.existOD(moment()))
      process.exit(2);
  }
/////////////////////////////////////////////

  var include = "";
  var exclude = "";

  // получаем список счетов, которые необходимо контролировать   
  var acc = ['40502','40503','40601','40602','40603','40701','40702','40703','40802','40804','40805','40807','40813','40814','40815','40821','411','412','413','414','415','416','417','418','419','420','421','422','424','425','426','438','440'];
  include = "(" + acc.map(el=>"ACC.C_1 like '" + el + "%'").join(" OR ") + ")";

  if (!param.task.user) {
    // получаем список счетов, по которым уже были отправлены уведомления  
    var rsSent = await db("SELECT id FROM sent"); 
    if (rsSent && rsSent.length)
      exclude = "AND ACC.ID not in (" + rsSent.map(el=>el.id).join(",") + ")";
  }

  var SQL = `SELECT
               (CASE WHEN ACC.REF3 in (83840,23750754,649940719,2183557041) THEN ACC.C_20 ELSE ACC.C_3 END) as CLIENT,
               ACC.C_1 as ACCOUNT,
               ACC.ID as ACCID
             FROM 
               IBS.VW_CRIT_FULL_RECORDS REC, 
               IBS.VW_CRIT_AC_FIN ACC 
             WHERE 
               REC.COLLECTION_ID=ACC.REF8 
               AND REC.C_7 >= 600000 
               AND REC.C_1 >= SYSDATE-10
               AND REC.ID = ( SELECT 
                                MIN(id)
                              FROM 
                                IBS.VW_CRIT_FULL_RECORDS
                              WHERE 
                                COLLECTION_ID=REC.COLLECTION_ID )
               AND ACC.C_32 = ${deps}
               AND ${include}
               ${exclude}`;

  var rs = await ibso.query(SQL);
  if (rs && rs.length){
    rs.forEach( el => {
      // формируем текст уведомления
      console.log(el.CLIENT + ' первая операция по счету ' + el.ACCOUNT);
      if (!param.task.user)
        // добавляем запись реестра в БД
        db("INSERT INTO sent VALUES ('" + moment().format('YYYY-MM-DD HH:mm:ss') + "','" + el.ACCOUNT + "'," + el.ACCID + ")");  
    });
  }
  else 
    if (!param.task.user) 
      process.exit(2);
}