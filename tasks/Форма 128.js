//////////////////////////////////////////////
// Формирование ф.128                       //
// с учетом кредитов с плавающей ставкой,   //
// а также формирование реестра кредитов    //
//                                          //
// ©	Дмитрий Хмелев                        //
//////////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require('path'),
    fs = require('fs'),
  	iconv = require('iconv-lite'), //кодировка 
    ldap = require('synapse/ds-ldap')(system.config.ntlm),
    office = require('synapse/office'),
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/
  moment.locale('ru');  // устанавливаем русский язык в названиях месяцев

  var dateRep = moment(param.dateRep);
  if (param.deps[0]) 
    var deps = param.deps[0];
  else {
    console.log('Нет доступа к выбранному подразделению.\r\nОбратитесь к Администратору');
		process.exit(1);
  }

  var sDateBegin = `TO_DATE('${dateRep.format('YYYY-MM-DD')}')`;
  var sDateEnd = `TO_DATE('${dateRep.clone().add(1, 'months').add(-1, 'days').format('YYYY-MM-DD 23:59:59')}', 'yyyy-mm-dd hh24:mi:ss')`;
 
  var user = ( await ldap({ fields: ['displayName','telephoneNumber'],
                            query:'(sAMAccountname='+param.task.user+')' }) )[0];

  var bank = ( await ibso.query(`SELECT DISTINCT
                                   N.C_4 as NAME,
                                   F.C_1 as BIC,
                                   F.C_4 as REGNUM,
                                   N.C_22 as OKPO,
                                   SUBSTR(C.C_9,0,5) as OKATO,
                                   A.C_8 as IND, 
                                   CONCAT(CONCAT(C.C_2,' '), A.C_2) as CITY,
                                   A.C_3 as STREET,
                                   CONCAT(CONCAT(A.C_4,' '), A.C_5) as HOME
                                 FROM 
                                   IBS.VW_CRIT_BRANCH B,
                                   IBS.VW_CRIT_CL_BANK_N F,
                                   IBS.VW_CRIT_VND_CL_CORP N,
                                   IBS.VW_CRIT_PERSONAL_ADDRESS A,
                                   IBS.VW_CRIT_NAMES_CITY_ALL C
                                 WHERE
                                   B.C_1 = ${deps}
                                   AND N.ID = B.REF4
                                   AND F.ID = B.REF4
                                   AND A.COLLECTION_ID = N.REF42
                                   AND C.ID = A.REF2`) )[0];

  var rs = await ibso.query(`SELECT 
                               K.C_1 as CLIENT, 
                               K.C_2 as DOG, 
                               L.C_7 as SUM, 
                               ( SELECT 
                                   H.C_5+NVL(( SELECT 
                                                 HB.C_5 
                                               FROM 
                                                 IBS.VW_CRIT_PRC_SCHEME SB, 
                                                 IBS.VW_CRIT_ARC_SCH_PRC HB 
                                               WHERE 
                                                 SB.ID=S.REF12 
                                                 and HB.COLLECTION_ID=SB.REF7 
                                                 and HB.C_1 <= ${sDateBegin} 
                                                 and (HB.C_2 is NULL or HB.C_2 > ${sDateEnd}) ),0) 
                                 FROM 
                                   IBS.VW_CRIT_DEBT_COMIS_ALL PS, 
                                   IBS.VW_CRIT_PRC_SCHEME S, 
                                   IBS.VW_CRIT_ARC_SCH_PRC H 
                                 WHERE 
                                   PS.COLLECTION_ID=K.REF14 
                                   and PS.C_3='Неучтенные проценты за кредит' 
                                   and S.ID=PS.REF5 
                                   and H.COLLECTION_ID=S.REF7 
                                   and H.C_1=(SELECT MAX(C_1) FROM IBS.VW_CRIT_ARC_SCH_PRC WHERE COLLECTION_ID=S.REF7 and C_1 < ${sDateEnd}) ) as PRC,
                               TO_CHAR(K.C_6, 'DD.MM.YYYY') as DATEBEGIN, 
                               TO_CHAR(K.C_7, 'DD.MM.YYYY') as DATEEND,
                               K.C_7-K.C_6 as SROK,
                               (CASE WHEN K.CLASS_ID = 'KRED_CORP' THEN (SELECT C_13 FROM IBS.VW_CRIT_CL_ORG WHERE ID = K.REF1) END) as CATEGORY,
                               T.C_2 as TYPE_CRED,
                               K.CLASS_ID,
                               Null as LONGING
                             FROM 
                               IBS.VW_CRIT_49108762_PR_CRED L,
                               IBS.VW_CRIT_PR_CRED K,
                               IBS.VW_CRIT_KIND_CREDITS T,
                               IBS.VW_CRIT_AC_FIN A
                             WHERE 
                               K.ID = L.ID
                               AND K.C_2 not like '%уступк%'
                               AND K.C_3 not like '454%'
                               AND L.CLASS_ID IN ('KRED_CORP','KRED_PERS')
                               AND L.C_5 BETWEEN ${sDateBegin} AND ${sDateEnd}
                               AND L.C_6 in ('Выдача кредита')
                               AND A.ID = L.REF3
                               AND A.C_32 = ${deps}
                               AND T.ID = K.REF8
                             UNION
                             SELECT 
                               K.C_1 as CLIENT, 
                               K.C_2 as DOG, 
                               DK.C_19 as SUM, 
                               ( SELECT 
                                   H.C_5+NVL(( SELECT 
                                                 HB.C_5 
                                               FROM 
                                                 IBS.VW_CRIT_PRC_SCHEME SB, 
                                                 IBS.VW_CRIT_ARC_SCH_PRC HB 
                                               WHERE 
                                                 SB.ID=S.REF12 
                                                 and HB.COLLECTION_ID=SB.REF7 
                                                 and HB.C_1 <= ${sDateBegin} 
                                                 and (HB.C_2 is NULL or HB.C_2 > ${sDateEnd}) ),0) 
                                 FROM 
                                   IBS.VW_CRIT_DEBT_COMIS_ALL PS, 
                                   IBS.VW_CRIT_PRC_SCHEME S, 
                                   IBS.VW_CRIT_ARC_SCH_PRC H 
                                 WHERE 
                                   PS.COLLECTION_ID=K.REF14 
                                   and PS.C_3='Неучтенные проценты за кредит' 
                                   and S.ID=PS.REF5 
                                   and H.COLLECTION_ID=S.REF7 
                                   and H.C_1=(SELECT MAX(C_1) FROM IBS.VW_CRIT_ARC_SCH_PRC WHERE COLLECTION_ID=S.REF7 and C_1 < ${sDateEnd}) ) as PRC,
                               TO_CHAR(D.C_7, 'DD.MM.YYYY') as DATEBEGIN, 
                               TO_CHAR(D.C_8, 'DD.MM.YYYY') as DATEEND,
                               D.C_8-D.C_7 as SROK,
                               (CASE WHEN K.CLASS_ID = 'KRED_CORP' THEN (SELECT C_13 FROM IBS.VW_CRIT_CL_ORG WHERE ID = K.REF1) END) as CATEGORY,
                               T.C_2 as TYPE_CRED,
                               K.CLASS_ID,
                               1 as LONGING
                             FROM 
                               IBS.VW_CRIT_IFC_DOP_S D,
                               IBS.VW_CRIT_PR_CRED K,
                               IBS.VW_CRIT_PROL_CONTRACT DK,
                               IBS.VW_CRIT_KIND_CREDITS T,
                               IBS.VW_CRIT_AC_FIN A
                             WHERE 
                               K.ID = D.ID
                               AND K.CLASS_ID IN ('KRED_CORP','KRED_PERS')
                               AND K.C_2 not like '%уступк%'
                               AND K.C_3 not like '454%'
                               AND D.C_7 BETWEEN ${sDateBegin} AND ${sDateEnd}
                               AND A.ID = K.REF3
                               AND A.C_32 = ${deps}
                               AND T.ID = K.REF8
                               AND D.C_4 = '1' 
                               AND D.C_10 is not NULL
                               AND DK.COLLECTION_ID = K.REF18
                               AND DK.C_1 = D.C_3
                             ORDER BY 
                               CLIENT`);
  if (rs) {
    var ul = {name: 'ul'};          //кредиты ЮЛ
    var ul_msb = {name: 'ul_msb'};  //кредиты ЮЛ (только МСБ)
    var fl = {name: 'fl'};          //кредиты ФЛ

    // разбиваем список на ФЛ, ЮЛ (в т.ч. заполняем ЮЛ (МСБ))  
    rs.map(item =>{
      var el = {
      	client: item.CLIENT,
      	dog: item.DOG,
      	sum: item.SUM/1000,
      	prc: item.PRC,
      	prc_sv: item.SUM/1000*item.PRC,
        dateBegin: item.DATEBEGIN,
        dateEnd: item.DATEEND,
        srok: item.SROK,
        srok_sv: item.SUM/1000*item.SROK,
        category: (item.CATEGORY == 'Микропредприятия' || item.CATEGORY == 'Субъект малого предпринимательства' || item.CATEGORY == 'Субъект среднего предпринимательства') ? item.CATEGORY : ''
      };

      if (item.CLASS_ID == 'KRED_PERS')
        add(fl, el, item.TYPE_CRED.substr(item.TYPE_CRED.length-4), item.LONGING);
      else {
        add(ul, el, item.TYPE_CRED.substr(item.TYPE_CRED.length-4), item.LONGING);
        if (el.category)
          add(ul_msb, el, item.TYPE_CRED.substr(item.TYPE_CRED.length-4), item.LONGING);
      }

      // добавляем запись в зависимости от наличия переменной ставки или срока    
      ////////////////////////////////////////////////////////////////////////  
      function add(obj, el, type_cred, type_oper) {
        if (type_cred == '_REF' || type_cred == '_KEY')
          (obj.kVP) ? obj.kVP.list.push(el) : obj.kVP = {list: [el]};
        else {
          if (type_oper)
            (obj.kL) ? obj.kL.list.push(el) : obj.kL = {list: [el]};
          if (el.srok <= 30)
            (obj.kM1) ? obj.kM1.list.push(el) : obj.kM1 = {list: [el]};
          if (el.srok == 1)
            (obj.kD1) ? obj.kD1.list.push(el) : obj.kD1 = {list: [el]};
          if (el.srok > 1 && el.srok <= 7)
            (obj.k2D7) ? obj.k2D7.list.push(el) : obj.k2D7 = {list: [el]};
          if (el.srok > 7 && el.srok <= 30)
            (obj.k8D30) ? obj.k8D30.list.push(el) : obj.k8D30 = {list: [el]};
          if (el.srok > 30 && el.srok <= 90)
            (obj.k1M3) ? obj.k1M3.list.push(el) : obj.k1M3 = {list: [el]};
          if (el.srok > 90 && el.srok <= 180)
            (obj.k3M6) ? obj.k3M6.list.push(el) : obj.k3M6 = {list: [el]};
          if (el.srok > 180 && el.srok <= 365)
            (obj.k6M12) ? obj.k6M12.list.push(el) : obj.k6M12 = {list: [el]};
          if (el.srok > 365 && el.srok <= 1096)
            (obj.k1Y3) ? obj.k1Y3.list.push(el) : obj.k1Y3 = {list: [el]};
          if (el.srok > 1096)
            (obj.k3Y) ? obj.k3Y.list.push(el) : obj.k3Y = {list: [el]};
        }
      }
    });

    // рассчитываем по разделам общую сумму и общую средневзвешенную ставку
    [ul, ul_msb, fl].forEach(item => {
      for (key in item) 
        if (key != 'name' && key != 'kL') {
          item[key].sum = item[key].list.reduce((all, el) => all+el.sum, 0);
          item[key].prc = item[key].list.reduce((all, el) => all+el.prc_sv, 0);
        }
    });

    var dataCB = Object.assign(excelData(ul), excelData(ul_msb), excelData(fl), {
      okato: bank.OKATO,
      okpo: bank.OKPO,
      regnum: bank.REGNUM,
      bic: bank.BIC,
      periodRep: dateRep.format('за MMMM YYYY г.'),
      branch: bank.NAME,
      postadr: [bank.IND, bank.CITY, bank.STREET, bank.HOME].join(', '),
      adr: [bank.CITY, bank.STREET, bank.HOME].join(', '),
      performerFIO : user.displayName,
      performerTel: user.telephoneNumber,
      dateRep: moment().format('DD MMMM YYYY г.')
    });

    var excel = new office.Excel(path.join(__dirname,'templates','Форма 128.xlsx'));

    excel.replace('ЮЛ', excelDataList(ul));
    excel.replace('ФЛ', excelDataList(fl));
    excel.replace('ЦБ', dataCB);

    excel.save(path.join(param.task.path,'Форма 128_'+deps+'_на '+dateRep.clone().add(1, 'months').format('DD.MM.YYYY')+'.xlsx'));

    // формируем файл для АС ПСД
    var ptkText = fs.readFileSync(path.join(__dirname,'templates','Форма 128.ptk')).toString();
    ptkText = psdData( ptkText, dataCB);
    fs.writeFileSync(path.join(param.task.path,'128.ptk'), iconv.encode(ptkText, 'windows-1251'));
  }
  else
    console.log('Нет документов по заданным параметрам');

  ///////////////////////////////////////////////////////
  // Преобразование данных для Реестра в шаблоне Excel //
  ///////////////////////////////////////////////////////
  function excelDataList(obj) {
    var result = {};
    for (key in obj) {
  		result[key] = obj[key].list;
      result[key+'sum'] = obj[key].sum;
      result[key+'prc_sv'] = obj[key].prc/obj[key].sum;
    }
    return result;
  }

  function excelData(obj) {
    var itog = 0;
    var result = {};
    ['kM1','kDV','kD1','k2D7','k8D30','k1M3','k3M6','k6M12','k1Y3','k3Y'].forEach(el => {
      result[obj['name']+'_'+el+'_sum'] = 0;
      result[obj['name']+'_'+el+'_prc'] = 0;      
    });
    result[obj['name']+'_kL_sum'] = 0;
    result[obj['name']+'_kVP_sum'] = 0;

    for (key in obj) {
      if (key != 'name' && key != 'kL' && key != 'kVP') {
        if (key != 'kM1') 
          itog = itog + Number(obj[key].sum.toFixed());
        result[obj['name']+'_'+key+'_sum'] = Number(obj[key].sum.toFixed());
        result[obj['name']+'_'+key+'_prc'] = Number((obj[key].prc/obj[key].sum).toFixed(3));
      }
			
    }    

    result[obj['name']+'_kitog_sum'] = itog;
    if (obj.kL) 
      result[obj['name']+'_kL_sum'] = obj.kL.list.reduce((all, el) => all+el.sum, 0);
    if (obj.kVP) 
      result[obj['name']+'_kVP_sum'] = obj.kVP.list.reduce((all, el) => all+el.sum, 0);

    return result;
  }

  //////////////////////////////////////
  // Преобразование данных для АС ПСД //
  //////////////////////////////////////
  function psdData(ptkText, obj) {
    var dataPTK = { bic: obj.bic.substr(1),
                    date_rep: dateRep.clone().add(1, 'months').format('DD.MM.YYYY'),
                    soato: obj.okato.substr(0,2),
                    okpo: obj.okpo,
                    regnom: obj.regnum,
                    fullname: obj.branch,
                    address: obj.adr,
  
                    stav_rub: '9.25',
                    stav_val: '9.00',
                    chiefpost: 'Директор СФ',
                    chiefname: 'Максимов Олег Александрович',
                    execpost: 'Главный специалист',
                    exec: 'Карпенко Олег Валериевич',
                    exectlf: '274-37-66 (доб.6161)',
                    exedate: dateRep.clone().add(1, 'months').format('DD.MM.YYYY') 
                  };

    ['kM1','kDV','kD1','k2D7','k8D30','k1M3','k3M6','k6M12','k1Y3','k3Y'].forEach(el => {
      dataPTK[el.substr(1)+'_2'] = obj['fl_'+el+'_prc'].toFixed(3);
      dataPTK[el.substr(1)+'_3'] = obj['fl_'+el+'_sum'].toFixed();
      dataPTK[el.substr(1)+'_6'] = obj['ul_'+el+'_prc'].toFixed(3);
      dataPTK[el.substr(1)+'_7'] = obj['ul_'+el+'_sum'].toFixed();
      dataPTK[el.substr(1)+'_8'] = obj['ul_msb_'+el+'_prc'].toFixed(3);
      dataPTK[el.substr(1)+'_9'] = obj['ul_msb_'+el+'_sum'].toFixed();
    });
    ['kitog','kL','kVP'].forEach(el => {
      dataPTK[el.substr(1)+'_3'] = obj['fl_'+el+'_sum'].toFixed();
      dataPTK[el.substr(1)+'_7'] = obj['ul_'+el+'_sum'].toFixed();
      dataPTK[el.substr(1)+'_9'] = obj['ul_msb_'+el+'_sum'].toFixed();
    });

    for (key in dataPTK) {
      var re = new RegExp('\\${'+key+'}','g');
      ptkText = ptkText.replace(re, dataPTK[key]);
    }
  
    return ptkText;
  }
}