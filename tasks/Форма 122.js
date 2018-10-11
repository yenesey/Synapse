///////////////////////////////////////////
// Формирование отчетов Форма 122:       //
// - п.2.2.4                             //
// - п.2.2.1 (включая п.2.2.3.5)         //
// - п.2.2.5 (включая п.2.2.3.5)         //
// - п.2.4.18                            //
// - п.3.5                               //
//                                       //
// ©	Дмитрий Хмелев                     //
///////////////////////////////////////////

module.exports = async function(params, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require('path'),
		fs = require('fs'),
    ldap = require('synapse/ds-ldap')(system.config.ntlm),
    office = require('synapse/office'),
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

  var dateRep = moment(params.dateRep);
  if (params.deps[0]) {
    var deps = params.deps[0];
    if(deps == '002%') 
      deps = '002-00%';
    switch(deps) {
      case "001%": var accdeps = '000'; break;
      case "002-00%": var accdeps = '0200'; break;
      case "002-01%": var accdeps = '0201'; break;
      case "003%": var accdeps = '0300'; break;
      case "004%": var accdeps = '0400'; break;
    }
  }
  else {
    console.log('Подразделение не указано \r\nлибо нет доступа к выбранному подразделению.\r\nОбратитесь к Администратору');
		process.exit(1);
  }

  var user = ( await ldap({ fields: ['displayName','telephoneNumber'],
                            query:'(sAMAccountname='+params.task.user+')' }) )[0];

	var reports = [
		{ rep : '2.2.4',  template : 'Форма 122_224'},
		{ rep : '2.2.1',  template : 'Форма 122_221'},
		{ rep : '2.2.5',  template : 'Форма 122_225'},
		{ rep : '3.5',    template : 'Форма 122_35'},
		{ rep : '2.4.18', template : 'Форма 122_2418',  postMethod : addOttok}
	]

	for (var report of reports){
		if (params[report.rep]){
//      console.log('Выполняю п.'+report.rep+'...');

			var SQL = fs.readFileSync('./' + report.template + '.sql')
				.toString()
				.replace(/\$\{deps\}/g, "'"+deps+"'")
				.replace(/\$\{accdeps\}/g, accdeps)
				.replace(/\$\{dateRep\}/g, "'"+dateRep.format('YYYY-MM-DD')+"'")
				.replace(/\$\{saldoOperAVG\}/g, ibso.saldoOperSQL('AVG', 'A.ID', dateRep.clone().add(-30, 'days'), dateRep, 1));

      var rs = await ibso.query(SQL);
      if (rs){
      	var excel = new office.Excel(path.join(__dirname,'templates',report.template+'.xlsx'));
        
        if (report.postMethod) 
          rs = await report.postMethod(rs, excel);
        
        excel.replace('Реестр', {
          performerFIO : user.displayName,
          performerTel: user.telephoneNumber,
    			dog: rs
        });
        excel.save(path.join(params.task.path, report.rep+'_'+params.deps_view.split(",")[0]+'_на '+dateRep.format('DD.MM.YYYY')+'.xlsx'));
      }
      else
        console.log('п.'+report.rep+' данных не найдено');
    }
  }

  ///////////////////////////////////////////
  // Расчет и добавление оттока к выгрузке //
  ///////////////////////////////////////////
  async function addOttok(rs, excel){
    excel.replace('2.4.18', {
      performerFIO : user.displayName,
      performerTel: user.telephoneNumber
    });
    
//   	await Promise.all(
//    	rs.map( (el, idx) => calcOttok(el, idx) )
//    );

   	for(i=0;i<rs.length;i++)
    	await calcOttok(rs[i]); 

    var dateCur = dateRep.clone().add(-1, 'days');
    var arCur = await ibso.curVal(["USD","EUR","CHF","GBP"], dateCur);
  
    if(arCur) {
      excel.replace('Курс валют', {
        dateCur : arCur["EUR"].date.format('DD.MM.YYYY'),
    		usd: arCur["USD"].cur,
    		eur: arCur["EUR"].cur,
        chf: arCur["CHF"].cur,
        gbp: arCur["GBP"].cur,
      });
    }
    else
      console.log("Не заданы курсы валют на " + moment(dateCur).format('DD.MM.YYYY')); 

    return rs;

    ///////////////////////////////
    // Расчет оттока по договору //
    ///////////////////////////////
    async function calcOttok(el){
      var dog = el.ID;
      var dBegin = moment(el.DATEBEGIN);
      var dEnd = moment(el.DATEEND);
    
      var ottok = 0;
      var sum = 0;
     
      if (dEnd > dateRep.clone().add(30, 'days')){
        var d = moment(dBegin);
        var prc = 0.01;
        el.PRC = prc;
      
        var SQL = `SELECT 
                      DATEOP, 
                      SUM(SUM_DAY) as SUMOP
                   FROM ( select 
                            F.C_1 as DATEOP, 
                            (CASE WHEN F.C_5 in ('Безналичное зачисление','Зачисление депозита') THEN F.C_4 ELSE -1*F.C_4 END) as SUM_DAY 
                          from 
                            IBS.VW_CRIT_DEPN D, 
                            IBS.VW_CRIT_FACT_OPER F 
                          where 
                            F.COLLECTION_ID = D.REF29 
                            and D.ID = '${dog}' 
                            and F.C_1 < TO_DATE('${dateRep.format('YYYY-MM-DD')}', 'YYYY-MM-DD') 
                            and F.C_5 in ('Безналичное зачисление','Зачисление депозита','Возврат депозита','Наличный возврат депозита','Комиссия за перевод') ) 
                   GROUP BY 
                      DATEOP 
                   ORDER BY 
                      DATEOP`;

        var rSum = await ibso.query(SQL);
        if (rSum)
          for (var i=0;i<rSum.length;i++){
            calcOttokPeriod(moment(rSum[i].DATEOP));
            sum = sum + rSum[i].SUMOP;
          }

          calcOttokPeriod(dateRep);
      }
      else{
        var d = moment(dateRep);
        var prc = el.PRC;

        sum = el.SALDO;
        ottok = sum * prc / 100 / moment([d.year(),11,31]).dayOfYear();
    
        // прибавляем 1 день, если dEnd выпадает на Сб или Вс
        while (dEnd.day() > 5 /*Сб, Вс*/ )
          dEnd.add(1, 'days');

        var SQL = `SELECT 
                      DATEOP, 
                      SUM(SUM_DAY) as SUMOP
                   FROM ( select 
                            F.C_1 as DATEOP, 
                            (CASE WHEN F.C_5 in ('Безналичное зачисление','Зачисление депозита','Причисление учтенных процентов') THEN F.C_4 ELSE -1*F.C_4 END) as SUM_DAY 
                         from 
                            IBS.VW_CRIT_DEPN D, 
                            IBS.VW_CRIT_FACT_OPER F 
                         where 
                            F.COLLECTION_ID = D.REF29 
                            and D.ID = '${dog}' 
                            and F.C_1 >= TO_DATE('${d.format('YYYY-MM-DD')}', 'YYYY-MM-DD') 
                            and F.C_1 < TO_DATE('${dEnd.format('YYYY-MM-DD')}', 'YYYY-MM-DD') 
                            and F.C_5 in ('Безналичное зачисление','Зачисление депозита','Возврат депозита','Наличный возврат депозита','Комиссия за перевод','Причисление учтенных процентов','Выплата причисленных процентов') ) 
                   GROUP BY 
                      DATEOP 
                   ORDER BY 
                      DATEOP`;

        var rSum = await ibso.query(SQL);
        if (rSum)
          for (var i=0;i<rSum.length;i++){
            calcOttokPeriod(moment(rSum[i].DATEOP));
            sum = sum + rSum[i].SUMOP;
          }
    
        calcOttokPeriod(dEnd);

        ottok = ottok + el.SALDOPRC;
      }
    
      el['OTTOK'] = ottok;

      /////////////////////////////////////
      // расчет оттока по указанную дату //
      /////////////////////////////////////
      function calcOttokPeriod(de){
        while (de.year() != d.year()) {
          var dpe = moment([d.year()+1, 0, 1]);
          k = (dpe - d)/(24*60*60*1000);
          ottok = ottok + k * sum * prc / 100 / moment([d.year(),11,31]).dayOfYear();
          d = dpe.clone();
        }                

        k = (de - d)/(24*60*60*1000);
        ottok = ottok + k * sum * prc / 100 / moment([d.year(),11,31]).dayOfYear();
        d = de.clone();
      } //function calcOttokPeriod
    } //function calcOttok
  } //function addOttok
 
}