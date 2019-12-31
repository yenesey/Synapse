/*****************************************
* Библиотека вспомогательных функций     *
* для работы с АБС-ЦФТ                   *
*                                        *
* ©	Дмитрий Хмелев / Денис Богачев       *
*****************************************/ 
//////////////////////////////////////////
//  IBS.VW_CRIT_AC_FIN_TURN     - Финансовые счета (Оборотно-сальдовая ведомость)
//  IBS.VW_CRIT_HOZ_OP_ACC      - массив Счета договора *** Кредиты юридическим лицам (Список всех кредитов) 
//  IBS.VW_CRIT_FACT_OPER       - массив Фактические операции *** Кредиты юридическим лицам (Список всех кредитов)
//  IBS.VW_CRIT_DEBT_COMIS_ALL  - массив Комиссии и процентные схемы *** Кредиты юридическим лицам (Список всех кредитов)   
//  IBS.VW_CRIT_PRC_SCHEME      - Схемы начисления процентов 
//  IBS.VW_CRIT_ARC_SCH_PRC     - массив История ставок % *** Комиссии и процентные схемы
//  IBS.VW_CRIT_MAIN_DOCUM      - Платежные документы (Список документов)
//////////////////////////////////////////

var dayjs = require('dayjs');
var ora;
var ibso = {};

module.exports = function(config, noConnect){
  // если соединение с БД не нужно (noConnect = false/null) - не устанавливаем
	if (!noConnect)
    ora = require('synapse/ds-oracle')(config);
  ibso.config = config;
	return ibso;
}

ibso.query = async function(sql){
  try{
  	var res = await ora(sql, {}, {maxRows: 10000});
    if (res && res.length==0)	
      return false;
  	return res;
  }
  catch(err){
    console.log(err);
    console.log(sql);
  }
} //query

ibso.existOD = async function(OD){
// проверка OD на существование в этот день Опердня в ГО ('10024372') ('13358897' - в Сибирском филиале)
	var SQL = `select 
                C_1 
             from 
                IBS.VW_CRIT_JOURNAL_OP_DAYS 
						 where 
                COLLECTION_ID = '47321790' 
                and C_1 = TO_DATE('${OD.format('YYYY-MM-DD')}', 'YYYY-MM-DD')`;
	rs = await ibso.query(SQL);
	if (rs)
    return true;
  else
    return false;
} //existOD

ibso.nearOD = async function(OD){
// проверка OD на существование в этот день Опердня
// если Опердень не существует, возвращается ближайший назад Опердень
	if (await ibso.existOD(OD))
		return OD;
	else
		return ibso.nearOD(OD.clone().add(-1, 'days'));
} //nearOD


ibso.getRate = function(iso, date){
	return ora(
		'begin :rate := Z$DOCUMENT_LIB_CUR.GET_RATE_FOR_DATE_REP_ISO(:iso, :date, :units); end;', 
		{
			iso : iso,
			date : date,
			rate : ora.GET_NUMBER,
			units: ora.GET_NUMBER
		}
	)	
}


ibso.curVal = async function(val, OD){
// получаем курс валюты 'val' за день 'date'
// если Опердень 'date' не существует, возвращается курс за ближайший назад Опердень
  var res = {};
	var strVal = '\''+val.join('\',\'')+'\''; //вот так лучше всего

	var SQL = `select 
                VAL.C_1 as VAL, 
                CUR.C_1 as CUR_DATE, 
                CUR.C_2 as CUR, 
                VAL.C_5 as VAL_ED  
             from 
                IBS.VW_CRIT_RECONT_SORT CUR, 
                IBS.VW_CRIT_FT_MONEY VAL 
						 where 
                CUR.COLLECTION_ID = VAL.REF7 
                and VAL.C_1 in(${strVal}) 
                and CUR.C_1 > TO_DATE('${OD.format('YYYY-MM-DD')}', 'YYYY-MM-DD')-20
                and CUR.C_1 = (SELECT MAX(C_1) FROM IBS.VW_CRIT_RECONT_SORT WHERE COLLECTION_ID = CUR.COLLECTION_ID and C_1 <= TO_DATE('${OD.format('YYYY-MM-DD')}', 'YYYY-MM-DD'))`;
	rs = await ibso.query(SQL);
	if (rs){
		rs.forEach(item => { res[item.VAL] = {cur: +item.CUR.toFixed(4), // округляем до 4 знаков после запятой
                                          date: dayjs(item.CUR_DATE), 
                                          ed: item.VAL_ED} 
                       }); 
		return res;
  }
	else
		return false;
} //curVal

ibso.saldoOperSQL = function(oper, accID, dateBegin, dateEnd, val){
// получаем SQL строку для выполнения операции 'oper' (суммы,ср.арифметическое и пр.) с входящими остатками по счету 'accID' за период с 'dateBegin' по 'dateEnd'
  return `( SELECT 
              ${oper}( F.a_saldo_short(TO_DATE('${dateBegin.format('YYYY-MM-DD')}') + n - 1, ${accID}, 'с', ${val}) ) 
            FROM 
              ( select 
                  level as n 
                from 
                  dual connect by level <= TO_DATE('${dateEnd.format('YYYY-MM-DD')}') - TO_DATE('${dateBegin.format('YYYY-MM-DD')}') + 1) )`;
} //saldoOperSQL

ibso.oxch = function(src, dst, mask, download){ 
	//Обмен файлами с сервером АБС посредством интерфейса приемопередатчика	<Oxch.CInterfaces>

	var ActiveX = require('winax');
	  
	var oxch = new ActiveX.Object('Oxch.CInterfaces', {
		activate: false, // Allow activate existance object instance, false by default
		async: false, // Allow asynchronius calls, true by default (for future usage)
		type: true	// Allow using type information, true by default
	});
	  
	if (oxch == null) {
		console.log('oxch: не удалось создать объект <Oxch.CInterfaces>');
		return -1;
	};
	  
	oxch.Schema = ibso.config.schema;
	oxch.Owner = ibso.config.owner;
	oxch.User = ibso.config.user;
	oxch.Password = ibso.config.password;
//	oxch.App.LogPath = __dirname;
//	oxch.App.LogFile = 'oxch.log';
	
	var task = oxch.CreateTaskConfigurator();
	if (task == null) {
		console.log('oxch: не удалось создать конфигурацию');
		return -1;
	} else {
		task.FromServer = download;
		task.SourceFolder = src;
		task.TargetFolder = dst;
		task.FileMask =  mask;
	//	task.MoveSubfolders = false; //свойство работает только в VBS. скорее всего здесь не работает из-за CHARCASE
		task.DeleteSource = false;
		task.AppendMode = true;
		task.OverwriteMode = 'Replace';
		task.UseTempFolder = true;
	}   
	  
	if (oxch.StartProcessByConfigurator(task)) return 0;
	  
	var errStack = oxch.ErrorStack()
	if (errStack == null)
	  console.log('Не удалось взять ErrorStack');
	else {
	  var errList = '';
	  for (var i = 0; i < errStack.Count; i++) 
	    errList = errList + errStack(i).Number + ' : ' + errStack(i).Description + '\r\n';
	  console.log( errList );
	}
	return -1; 
} //oxch


