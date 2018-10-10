/*
	Управленческая отчетность - основной модуль
*/

module.exports = async function(param, system){

var moment = require('moment'),
		path = require('path'),
		fs = require('fs'),
		office = require('synapse/office'),
		ora = require('synapse/ds-oracle')(system.config.ibs);

	function clients(data){
			data.forEach((item, index)=>{
				item.IS_ACTIVE   = `=IF(OR(N${index+2}=1,P${index+2}=1,R${index+2}=1,T${index+2}=1),1,0)`
				//
				item.TURN_ACT =    '=IF(H'+(index+2)+'="Микро", IF(AND(M'+(index+2)+'>0,OR(L'+(index+2)+'>50,K'+(index+2)+'>50)),1,0),' +
				 										'IF(H'+(index+2)+'="Малый", IF(AND(M'+(index+2)+'>0,OR(L'+(index+2)+'>150,K'+(index+2)+'>150)),1,0),' + 
				 										'IF(H'+(index+2)+'="Средний", IF(AND(M'+(index+2)+'>0,OR(L'+(index+2)+'>300,K'+(index+2)+'>300)),1,0),'+
				 										'IF(H'+(index+2)+'="Крупный", IF(AND(M'+(index+2)+'>0,OR(L'+(index+2)+'>1000,K'+(index+2)+'>1000)),1,0), 0) )))'
				
				
				item.RKO_AVG_ACT = '=IF(H'+(index+2)+'="Микро", IF(AND(ISNUMBER(Q'+(index+2)+'),Q'+(index+2)+'>50),1,0),' +
				 										'IF(H'+(index+2)+'="Малый", IF(AND(ISNUMBER(Q'+(index+2)+'),Q'+(index+2)+'>150),1,0),' + 
				 										'IF(H'+(index+2)+'="Средний", IF(AND(ISNUMBER(Q'+(index+2)+'),Q'+(index+2)+'>300),1,0),'+
				 										'IF(H'+(index+2)+'="Крупный", IF(AND(ISNUMBER(Q'+(index+2)+'),Q'+(index+2)+'>1000),1,0), 0) )))'
				

				item.DEPO_ACT    = '=IF(H'+(index+2)+'="Микро", IF(AND(ISNUMBER(O'+(index+2)+'),O'+(index+2)+'>10),1,0),' +
				 										'IF(H'+(index+2)+'="Малый", IF(AND(ISNUMBER(O'+(index+2)+'),O'+(index+2)+'>30),1,0),' + 
				 										'IF(H'+(index+2)+'="Средний", IF(AND(ISNUMBER(O'+(index+2)+'),O'+(index+2)+'>100),1,0),'+
				 										'IF(H'+(index+2)+'="Крупный", IF(AND(ISNUMBER(O'+(index+2)+'),O'+(index+2)+'>100),1,0), 0) )))'

			})
	}	

	var reports = [
		{ kwd : 'credit',  sheet : 'Кредиты',	module : 'Управленческая отчетность — кредиты', dates : 0},
		{ kwd : 'deposit', sheet : 'Срочные депозиты',	module : 'Управленческая отчетность — депозиты', dates : 0},
		{ kwd : 'account', sheet : 'Расчетные текущие счета',	module : 'Управленческая отчетность — расчетные счета', dates : 0},
		{ kwd : 'clients', sheet : 'Активные клиенты',	module : 'Управленческая отчетность — активные клиенты', dates : 1, preProcess : clients}
	]

	var excel = new office.Excel(path.join(__dirname,'templates','Управленческая отчетность.xlsx'));

	//выборка клиентов общая для всех запросов
	const clientSql = fs.readFileSync('./Управленческая отчетность — клиенты.sql')
											.toString()
											.replace(/\$\{BANK\}/g, system.config.bank.prefix);

	for (var report of reports){
		if (param[report.kwd] ==='true'){
			console.log('Выполняю: ' + report.sheet);

			var sql = fs.readFileSync('./' + report.module + '.sql')
				.toString()
				.replace(/\$\{dateBegin\}/g, "TO_DATE('" + param.dateBegin[report.dates] + "')")
				.replace(/\$\{dateEnd\}/g,   "TO_DATE('" + param.dateEnd[report.dates]   + "')")
				.replace(/\$\{CLIENT\}/ig,    clientSql);

			var data = await ora(sql, {}, {maxRows : 20000})
		//	console.log(data)

			if (report.preProcess) report.preProcess(data);
			excel.replace(report.sheet, { 
				dateBegin: param.dateBegin[report.dates],
				dateEnd: param.dateEnd[report.dates],
				main: data
			}) 
		} else
			excel.deleteSheet(report.sheet);
	}

	excel.save(path.join(param.task.path,'Управленческая отчетность.xlsx'));
}