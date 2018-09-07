///////////////////////////////////////////////
// Уведомление о незагруженных файлах из ФНС //
//                                           //
// ©	Дмитрий Хмелев                         //
///////////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    fs = require('fs'),
    path = require('path'),
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
  
  ibso.query(`SELECT DISTINCT
                 C_4
              FROM
                 IBS.VW_CRIT_DOC_TAX
              WHERE 
                 C_3 in ('APZ','PNO','ROO','RPO','ZSV')
                 and SUBSTR(C_2,0,10) >= TO_DATE('${moment().add(-10, 'days').format('YYYY-MM-DD')}','YYYY-MM-DD')`)
  .then(rs  => {
    if (rs && rs.length) {
      var cft = [];
      rs.map(item=> cft.push(item.C_4));
      var noMes = true;
      for (var i=-10; i<=0; i++) {
        var d = moment().add(i, 'days');
        src = path.join('\\\\ifcbank.loc','krfs','Resource','Exch_CB','ZAP','Checker4','backup','in',d.format('YYYY'),d.format('MM'),d.format('DD'));
        if (fs.existsSync(src)) 
          fs.readdirSync(src).forEach((file) => {
            if (/^(APZ|PNO|ROO|RPO|ZSV)\S*\.xml/.test(file))
              if(cft.indexOf(file)<0) {
                var stats = fs.statSync(path.join(src,file));
                console.log(moment(stats["birthtime"]).format('DD.MM.YYYY HH:mm:ss') + "   " + file);
                noMes = false;
              }
          });
      }
      if (noMes) {
        if (!param.task.user) 
          process.exit(2);
        console.log('Незагруженных файлов из ФНС нет');
      }
    }
  });
}