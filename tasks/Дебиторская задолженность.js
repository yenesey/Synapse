/*
	"Распоряжение об отражении дебиторской задолженности"

										(c)	Денис Богачев <d.enisei@yandex.ru>

		Note:
		-------------------------------------------------------------------
		здесь демонстрируются все	базовые техники создания задачи	для Synapse:
			- обработка входных параметров
			- обращение в СУБД АБС
			- использование шаблонов Word и Excel

		а также преимущества node v.7^:
			- async/await "из коробки"
			- бэктики <``> для шаблонизации строк
			- подстановка переменных в шаблоны строк ${}
*/
var fs = require("fs"),
	path = require("path"),
	XlsxTemplate = require('xlsx-template');

module.exports = async function(param, system){

	var ora = require('synapse/ds-oracle')(system.config.ibs); 

	// !!! ora({..}) возвращает Promise (если не знаем - RTFM)
	// await ждет Promise.resolve(<result>) и возвращает <result>
	// await можно делать только внутри async (см. спецификации ES2015 (ES6),  ES2017)
	var chief = await ora(`SELECT C_1, C_4, C_5 FROM IBS.VW_CRIT_USER WHERE ID = ${param.user_chief}`); 
	if (!chief.length){
		console.log('Не найден указанный руководитель');
		process.exit(1);
	}
	chief = chief[0];

	var table = await ora(`
			SELECT
				TO_CHAR(C_10, 'DD.MM.YYYY') AS DATE_PROV,
				(SELECT C_3 FROM IBS.VW_CRIT_AC_FIN AC WHERE AC.ID = MAIN_DOCUM.REF7) AS CLIENT,
				C_11 AS NAZN_PLAT,
				C_6 AS VAL,
				C_4 AS SUMMA
			FROM
				IBS.VW_CRIT_MAIN_DOCUM MAIN_DOCUM
			WHERE
				C_10 between TO_DATE('${param.date}') and TO_DATE('${param.date}' || ' 23:59:59', 'yyyy-mm-dd hh24:mi:ss')
				AND C_7 LIKE '47423%'
				AND C_8 LIKE '706%'
				AND REF19 = ${param.user}`,
			{},	
			{maxRows : 10000}
	)

	if (!table.length){
		console.log('Нет данных для вывода по указанным параметрам.');
		process.exit(0);
	}
	
  var sheetData = {
		date : param.date.split("-").reverse().join("."), //переделать строку YYYY-MM-DD в DD.MM.YYYY без конверсии в дату (учись, студент!!!),
		chief_post : chief.C_5,
		chief_initials : chief.C_1.split(" ").reduce((all, item)=>all + ' ' + item.substr(0,1)+ '.'),
		td: table
	}
	var binData = fs.readFileSync(path.join(__dirname, 'templates', 'Дебиторская задолженность.xlsx'));
  var template = new XlsxTemplate(binData);
  template.substitute(1, sheetData);
  binData = template.generate();
  fs.writeFileSync(`${param.task.path}/Распоряжение об отражении дебиторской задолженности на ${param.date}.xlsx`, binData, 'binary');

}