///////////////////////////////////////////
// Формирование и печать                 // 
// Распоряжения и Реестра по переоценке  //
//                                       //
// ©	Дмитрий Хмелев                     //
///////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require('path'),
    _ = require('synapse/lib'),
    office = require('synapse/office'),
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

  var dateRep = moment(param.dateRep);
  if (param.deps[0]) {
    var deps = param.deps[0];
    switch(deps) {
      case "001": { var branch = "АКЦИОНЕРНОЕ ОБЩЕСТВО АКЦИОНЕРНОГО КОММЕРЧЕСКОГО БАНКА \"МЕЖДУНАРОДНЫЙ ФИНАНСОВЫЙ КЛУБ\""; 
                    var user = "Автоматический Пользователь ЗОД"; 
                    break; }
      case "002": { var branch = "СИБИРСКИЙ ФИЛИАЛ АКЦИОНЕРНОГО ОБЩЕСТВА АКЦИОНЕРНОГО КОММЕРЧЕСКОГО БАНКА \"МЕЖДУНАРОДНЫЙ ФИНАНСОВЫЙ КЛУБ\""; 
                    var user = "Автоматический Пользователь Зод 002"; 
                    break; }
      case "003": { var branch = "ЯКУТСКИЙ ФИЛИАЛ АКЦИОНЕРНОГО ОБЩЕСТВА АКЦИОНЕРНОГО КОММЕРЧЕСКОГО БАНКА \"МЕЖДУНАРОДНЫЙ ФИНАНСОВЫЙ КЛУБ\"";
                    var user = "Автоматический Пользователь Зод 003"; 
                    break; }
      case "004": { var branch = "ПЯТИГОРСКИЙ ФИЛИАЛ АКЦИОНЕРНОГО ОБЩЕСТВА АКЦИОНЕРНОГО КОММЕРЧЕСКОГО БАНКА \"МЕЖДУНАРОДНЫЙ ФИНАНСОВЫЙ КЛУБ\"";
                    var user = "Автоматический Пользователь Зод 004"; 
                    break; }
    }
  }
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
    // Формирование Распоряжения на переоценку
    buildRasp();
    // Формирование Реестра переоценки
    buildReestr();
  }
  else 
    console.log("Нет ОД на "+dateRep.format('DD.MM.YYYY'));

  ///////////////////////////////////////////////////
  ///   Формирование Распоряжения на переоценку   ///
  ///////////////////////////////////////////////////
  async function buildRasp(){
    var arCur = await ibso.curVal(["EUR","USD","XAU","XAG","XPT","XPD","CNY","CHF","GBP"],dateRep);
    if(arCur) {
      var doc = new office.Word(path.join(__dirname,'templates','Переоценка_Распоряжение.docx'));
      
      var glavBuh = await ibso.query(`SELECT C_1 as FIO, C_5 as POST FROM IBS.VW_CRIT_USER WHERE ID = ${param.glavBuh}`);    
    	if (!glavBuh.length){
    		console.log('Не найден указанный Подписант Распоряжения');
    		process.exit(1);
    	}
    	glavBuh = glavBuh[0];

      doc.replace({
        "NAME_BRANCH": branch,
        "DATE": (await ibso.nearOD(dateRep.clone().add(-1, 'days'))).format('DD/MM/YYYY'),
        "DATE_RECONT": dateRep.format('DD/MM/YYYY'),
        "DATE_KURS": moment(arCur["EUR"].date).format('DD/MM/YYYY'),
        "EUR_ED": arCur["EUR"].ed,    "EUR_CUR": arCur["EUR"].cur,
        "USD_ED": arCur["USD"].ed,    "USD_CUR": arCur["USD"].cur,
//        "XAU_ED": arCur["XAU"].ed,    "XAU_CUR": arCur["XAU"].cur, 
//        "XAG_ED": arCur["XAG"].ed,    "XAG_CUR": arCur["XAG"].cur,
//        "XPT_ED": arCur["XPT"].ed,    "XPT_CUR": arCur["XPT"].cur,
//        "XPD_ED": arCur["XPD"].ed,    "XPD_CUR": arCur["XPD"].cur,
        "CNY_ED": arCur["CNY"].ed,    "CNY_CUR": arCur["CNY"].cur,
        "CHF_ED": arCur["CHF"].ed,    "CHF_CUR": arCur["CHF"].cur,
        "GBP_ED": arCur["GBP"].ed,    "GBP_CUR": arCur["GBP"].cur,
        "POST_BUH": glavBuh.POST,
        "FIO_BUH": glavBuh.FIO
      });
    
      doc.save(path.join(param.task.path,dateRep.format('YYYY.MM.DD') + ' - Распоряжение.docx'));
    }
    else
      console.log("Не заданы курсы валют на " + moment(dateRep).format('DD.MM.YYYY'));    
  }
  
  ///////////////////////////////////////////
  ///   Формирование Реестра переоценки   ///
  ///////////////////////////////////////////
  async function buildReestr(){
    var excel = new office.Excel(path.join(__dirname,'templates','Переоценка_Реестр.xlsx'));
  
    // создаем Листы Реестра
    await createSh("А", "Переоценка");  // создание Реестра Глава А (Переоценка)
    await createSh("А", "Дооценка");    // создание Реестра Глава А (Дооценка)
    await createSh("В", "Переоценка");  // создание Реестра Глава В (Переоценка)
    await createSh("В", "Дооценка");   // создание Реестра Глава В (Дооценка) 
  
    if (excel.xlsx.sheets.length > 1) {
      excel.deleteSheet("Template");
      excel.save(path.join(param.task.path,dateRep.format('YYYY.MM.DD') + ' - Реестр.xlsx'));
    }
    else
      console.log('Нет документов по заданным параметрам');
  
    ////////////////////////////////
    ///   создает лист реестра   ///
    ////////////////////////////////
    async function createSh(glava, operType){
      switch (glava){
        case "А": var vnb = "<>"; break;
        case "В": var vnb = "="; break;
      }
    
      switch (operType){
        case "Переоценка": var knp = "RECONT"; break;
        case "Дооценка": var knp = "RECONT+"; break;
      }
  
      var sheetName = "Глава "+glava+" ("+operType+")";
     
      var SQL = `SELECT 
                    TO_CHAR(C_1,'DD.MM.YYYY') as DATEOP, 
                    C_3 as NUM,
                    '${glava}' as GLAVA, 
                    C_7 as ACCDT, 
                    C_8 as ACCKT, 
                    C_4 as SUM, 
                    C_5 as SUMRUB, 
                    C_6 as VAL, 
                    C_11 as NP 
                FROM 
                    IBS.VW_CRIT_MAIN_DOCUM 
                WHERE
                    C_1=TO_DATE('${dateRep.format('YYYY-MM-DD')}', 'YYYY-MM-DD') 
                    and C_9='Проведен' 
                    and C_20 in ('${user}','Служебный Пользователь Системы')
                    and C_36='${deps}' 
                    and C_31='${knp}' 
                    and (substr(C_7,1,1) ${vnb} '9' or substr(C_8,1,1) ${vnb} '9')`;
  
      var rs = await ibso.query(SQL);
  
      if (rs) {
        var sum = rs.reduce((all, el) => all + el.SUM, 0);
        var sumRub = rs.reduce((all, el) => all + el.SUMRUB, 0);
        excel.copySheet(1, sheetName);
  
        excel.replace(sheetName, {
    			date : dateRep.format('DD.MM.YYYY'),
          glava: glava,
          operType: operType,
          kol: rs.length,
          sum: sum,
          sumRub: sumRub,
          sumPhrase: sumRub.toPhrase(1,2,true),
    			doc: rs
        });
      }
    } 
  }
}

