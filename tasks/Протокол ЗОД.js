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
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

  var dateRep = moment(param.dateRep);

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
    // сдвигаем дату на ближайший ОД
    var dateRep = await ibso.nearOD(dateRep);
  }
/////////////////////////////////////////////

  if (await ibso.existOD(dateRep)){
  	ibso.oxch(
  		'LOGS/LOG_END_OD/' + deps,  //источник
  		param.task.path,  //приемник
  		dateRep.format('*MMDD*.*'),   //маска файлов
  		true   //скачать с сервера?
  	);
  }
  else 
    console.log("Нет ОД на "+dateRep.format('DD.MM.YYYY'));
}