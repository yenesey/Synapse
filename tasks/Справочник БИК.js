////////////////////////////
// Выгрузка протокола ЗОД //
//                        //
// ©	Дмитрий Хмелев      //
////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require("path"),
    fs = require("fs"),
  	iconv = require('iconv-lite'), //кодировка 
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

/////////////////////////////////////////////
/////// если запущено из Планировщика ///////
/////////////////////////////////////////////
/*  if (!param.task.user) {
    // завершаем, если сегодня нет ОД
    if (!await ibso.existOD(moment()))
      process.exit(2);
  }*/
/////////////////////////////////////////////

  var dateRep = moment();

  ibso.oxch(
  	'trc2',  //источник
  	path.join(param.task.path,'upload'),  //приемник
  	dateRep.format('YY-MM-DD')+'_MBR.log',   //маска файлов
  	true   //скачать с сервера?
  );

  if (fs.existsSync(path.join(param.task.path,'upload',dateRep.format('YY-MM-DD')+'_MBR.log'))) {
    var report = iconv.decode(fs.readFileSync(path.join(param.task.path,'upload',dateRep.format('YY-MM-DD')+'_MBR.log')), 'windows-1251').toString();
    dateRep = dateRep.format('YYYY-MM-DD ');
    report.replace(/(\d{2}:\d{2}:\d{2} Начало импорта файла ED807\S{5}.EDS[\s\S]*?\d{2}:\d{2}:\d{2} Завершение импорта файла ED807\S{5}.EDS)/g, function replacer(match, key) {
      if (key) console.log(key);
      console.log('\r\n');
    });
  }
  else {
    console.log('Нет Журнала РЦ за '+dateRep.format('YYYY-MM-DD'));
    if (!param.task.user) 
      process.exit(2);
  }
}
