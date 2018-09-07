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
//    var report = iconv.decode(fs.readFileSync('C:\\18-07-02_MBR.log'), 'windows-1251').toString();
    dateRep = dateRep.format('YYYY-MM-DD ');

    report.replace(/(\d{2}:\d{2}:\d{2} Начало импорта файла ED807\S{5}.EDS)[\s\S]*?(?:(Ошибка[\s\S]*?)\r\n|(?:(Обнаружен ED807[\s\S]*?Полный справочник БИК)|(Обнаружен ED807[\s\S]*?Изменения в справочнике БИК)[\s\S]*?(Всего обновлено участников[\s\S]*?\r\n[\s\S]*?)\r\n))/g, function replacer(match, key1, key2, key3, key4, key5) {
      if (key1) console.log(key1);
      if (key2) console.log(key2);
      if (key3) console.log(key3);
      if (key4) console.log(key4);
      if (key5) console.log('\t '+key5);
      console.log('\r\n');
    });
  }
  else {
    console.log('Нет Журнала РЦ за '+dateRep.format('YYYY-MM-DD'));
//    if (!param.task.user) 
//      process.exit(2);
  }
}