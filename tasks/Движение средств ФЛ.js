/////////////////////////////////////////////
// Уведомление о движении денежных средств //
// на счетах ФЛ (депозиты и текущие счета) // 
//                                         //
// ©	Дмитрий Хмелев                       //
/////////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    ibso = require('synapse/ibso')(system.config.ibs),
    db = require('synapse/sqlite')('./db/Движение средств ФЛ.db');
/*****************************/

  var deps = '002-00';

/////////////////////////////////////////////
/////// если запущено из Планировщика ///////
/////////////////////////////////////////////
  if (!param.task.user) {
    // завершаем, если сегодня нет ОД
    if (!await ibso.existOD(moment()))
      process.exit(2);
  }
/////////////////////////////////////////////

  // Проверяем на корректность исходных данных
  if (param.dateBegin) 
    var dateBegin = moment(param.dateBegin);
  else {
    console.log('Не указано начало периода расчета');
  	process.exit(1);
  }
  
  if (param.dateEnd) 
    var dateEnd = moment(param.dateEnd);
  else {
    console.log('Не указан конец периода расчета');
  	process.exit(1);
  }
  
  if (dateEnd < dateBegin) {
    console.log('Дата начала периода больше даты окончания');
  	process.exit(1);
  }  

  var exclude = "";

  if (!param.task.user) {
    // получаем список счетов, по которым уже были отправлены уведомления  
    var rsSent = await db("SELECT id FROM sent WHERE date >= '"+dateBegin.format('YYYY-MM-DD HH:mm:ss')+"'"); 
    if (rsSent && rsSent.length)
      exclude = "AND DOC.ID not in (" + rsSent.map(el=>el.id).join(",") + ")";
  }

  // поступление средств
  var SQL = `SELECT
               DOC.ID as DOCID,
               TO_CHAR(DOC.C_1, 'YYYY.MM.DD') as DATEOP,
               ACC.C_3 as CLIENT,
               ACC.C_1 as ACCOUNT,
               NVL(( SELECT concat(concat(' (',C_10),') ') FROM IBS.VW_CRIT_DEPN WHERE REF3 = ACC.ID ),' ') as DEPOSIT,
               ACC.C_2 as VAL,
               DOC.C_4 as SUMMA
             FROM 
               IBS.VW_CRIT_AC_FIN ACC,
               IBS.VW_CRIT_MAIN_DOCUM DOC
             WHERE 
               ACC.ID = DOC.REF8
               AND DOC.C_9 = 'Проведен'
               AND (DOC.C_31 is NULL OR DOC.C_31 not like 'RECONT%')
               AND DOC.C_11 not like 'Выплата процентов%'
               AND DOC.C_10 BETWEEN TO_DATE('${dateBegin.format('YYYY-MM-DD 00:00:00')}', 'YYYY-MM-DD hh24:mi:ss') and TO_DATE('${dateEnd.format('YYYY-MM-DD 23:59:59')}', 'YYYY-MM-DD hh24:mi:ss') 
               AND (DOC.C_8 like '40817%' OR DOC.C_8 like '423%')
               AND ACC.C_31 like '${deps}%'
               ${exclude}
             ORDER BY
               DOC.C_1,
               ACC.C_3,
               ACC.C_1`;
  var rsKt = await ibso.query(SQL);
  if (rsKt && rsKt.length){
    console.log('Поступление средств:');
    rsKt.map( el => {
      console.log(`${el.DATEOP} ${el.CLIENT} ${el.ACCOUNT}${el.DEPOSIT}${el.VAL} ${el.SUMMA}`);
      if (!param.task.user)
        // добавляем запись реестра в БД
        db("INSERT INTO sent VALUES ('" + moment().format('YYYY-MM-DD HH:mm:ss') + "'," + el.DOCID + ")");  
    });
  }

  // расход средств
  var SQL = `SELECT
               DOC.ID as DOCID,
               TO_CHAR(DOC.C_1, 'YYYY.MM.DD') as DATEOP,
               ACC.C_3 as CLIENT,
               ACC.C_1 as ACCOUNT,
               NVL(( SELECT concat(concat(' (',C_10),') ') FROM IBS.VW_CRIT_DEPN WHERE REF3 = ACC.ID ),' ') as DEPOSIT,
               ACC.C_2 as VAL,
               DOC.C_4 as SUMMA
             FROM 
               IBS.VW_CRIT_AC_FIN ACC,
               IBS.VW_CRIT_MAIN_DOCUM DOC 
             WHERE 
               ACC.ID = DOC.REF7
               AND DOC.C_9 = 'Проведен'
               AND (DOC.C_31 is NULL OR DOC.C_31 not like 'RECONT%')
               AND DOC.C_11 not like 'Выплата процентов%'
               AND DOC.C_10 BETWEEN TO_DATE('${dateBegin.format('YYYY-MM-DD 00:00:00')}', 'YYYY-MM-DD hh24:mi:ss') and TO_DATE('${dateEnd.format('YYYY-MM-DD 23:59:59')}', 'YYYY-MM-DD hh24:mi:ss') 
               AND (DOC.C_7 like '40817%' OR DOC.C_7 like '423%')
               AND ACC.C_31 like '${deps}%'
               ${exclude}
             ORDER BY
               DOC.C_1,
               ACC.C_3,
               ACC.C_1`;
  var rsDt = await ibso.query(SQL);
  if (rsDt && rsDt.length){
    console.log('Расход средств:');
    rsDt.map( el => {
      console.log(`${el.DATEOP} ${el.CLIENT} ${el.ACCOUNT}${el.DEPOSIT}${el.VAL} ${el.SUMMA}`);
      if (!param.task.user)
        // добавляем запись реестра в БД
        db("INSERT INTO sent VALUES ('" + moment().format('YYYY-MM-DD HH:mm:ss') + "'," + el.DOCID + ")");  
    });
  }

  if (!param.task.user && !rsKt && !rsDt)
    process.exit(2);
}