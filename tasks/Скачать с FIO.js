//////////////////////////////
// Копирование файлов с FIO //
// из указанного каталога   //
//                          //
// ©	Дмитрий Хмелев        //
//////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var path = require('path'),
    moment = require('moment'),
    ibso = require('synapse/ibso')(system.config.ibs, true);
/*****************************/

	ibso.oxch(
		param.src,  //источник
		param.task.path,  //приемник
		param.mask ? moment().format(param.mask) : '*.*',   //маска файлов
		true   //скачать с сервера?
	);

}
