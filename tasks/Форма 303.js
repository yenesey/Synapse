//////////////////////////////////////////////////
// Формирование сведений о ссудах,              //
// предоставленных юридическим лицам            //
//                                              //
// ©	Дмитрий Хмелев                            //
//////////////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require('path'),
    office = require('synapse/office'),
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

  var dateRep = moment(param.dateRep);
  if (param.deps[0]) {
    var deps = param.deps[0];
    switch(deps) {
      case "001": var nameRep = 'ГО_на '+dateRep.format('DD.MM.YYYY')+'.xlsx'; break;
      case "002": var nameRep = 'СФ_на '+dateRep.format('DD.MM.YYYY')+'.xlsx'; break;
      case "003": var nameRep = 'ЯФ_на '+dateRep.format('DD.MM.YYYY')+'.xlsx'; break;
      case "004": var nameRep = 'ПФ_на '+dateRep.format('DD.MM.YYYY')+'.xlsx'; break;
      default: var nameRep = 'на '+dateRep.format('DD.MM.YYYY')+'.xlsx';
    }
  }
  else {
    console.log('Нет доступа к выбранному подразделению.\r\nОбратитесь к Администратору');
		process.exit(1);
  }

  var sDateRep = `TO_DATE('${dateRep.format('YYYY-MM-DD')}')`;
  var sPeriodBegin = `TO_DATE('${dateRep.clone().add(-1, 'months').format('YYYY-MM-DD')}')`;
  var sPeriodEnd = `TO_DATE('${dateRep.clone().add(-1, 'days').format('YYYY-MM-DD 23:59:59')}', 'yyyy-mm-dd hh24:mi:ss')`;

  var SQL = `
    WITH
      KREDIT as ( -- список кредитных договоров
        SELECT
          KR.ID as ID,
          KR.REF48 as PRZ_ID,
          KR.REF9 as PLAN_ID,
          KR.REF10 as FACT_ID,
          KR.REF14 as PRC_ID,
          KR.C_1 as C1,
          KR.C_2 as C2,
          KR.C_4 as C2_1,
          ( CASE WHEN KR.C_26 is not NULL 
            THEN KR.C_4 
            ELSE (  SELECT
                      SUM(SALDO)
                    FROM (  SELECT DISTINCT 
                              A.REF2,
                              F.a_saldo_short(${sDateRep}, A.REF2, 'с', 0) as SALDO
                            FROM 
                              IBS.VW_CRIT_HOZ_OP_ACC A,
                              IBS.VW_CRIT_PR_CRED K
                            WHERE 
                              (K.ID = KR.ID or K.REF26 = KR.ID)
                              and A.COLLECTION_ID = K.REF27 
                              and A.C_5 in ('ACCOUNT - Ссудный счет','ACC_DEBTS_CR - Счет просроченной задолженности по кредиту','VNB_UNUSED_LINE - Неиспользованные кредитные линии')
                              and A.C_1 = (SELECT MAX(C_1) FROM IBS.VW_CRIT_HOZ_OP_ACC WHERE COLLECTION_ID = A.COLLECTION_ID and C_5 = A.C_5 and C_1 <= ${sDateRep})
                         )
                 )
            END ) as C2_2,
          ( SELECT C_3 FROM IBS.VW_CRIT_FT_MONEY WHERE ID=KR.REF5 ) as C3,
          ( SELECT C_3 FROM IBS.VW_CRIT_FT_MONEY WHERE ID=KR.REF5 ) as C4,
          ( SELECT 
                LISTAGG(NVL(SUBSTR(I.C_5,5,INSTR(I.C_5,'/')-5), 0),', ') WITHIN GROUP(order by I.C_3)
              FROM 
                IBS.VW_CRIT_IFC_DOP_INF I 
              WHERE 
                I.ID=KR.ID 
                and I.C_5 is NOT NULL 
                and I.C_5 like 'СТР:%' 
                and I.C_3<=${sDateRep} 
                and (I.C_4 is NULL or I.C_4>=${sDateRep}) 
          ) as C13
        FROM 
          IBS.VW_CRIT_PR_CRED KR
        WHERE 
          KR.C_37 like '${deps}%' 
          and KR.CLASS_ID in('KRED_CORP','OVERDRAFTS') 
          and KR.C_6 < ${sDateRep} 
          and (KR.C_16 is NULL or KR.C_16 >= ${sPeriodBegin}) 
      )

      SELECT 
        KREDIT.*,
        PRZ.*,
        PLAN.*,
        FACT.*,
        PRC.*,
        '' as C12,
        11 as C19 
      FROM 
        KREDIT
      LEFT JOIN ( -- выборка признаков для отчётности
                  SELECT 
                    KR.ID,
                    LISTAGG(CASE WHEN C_1 like 'Ф_303_ВИД_СТАВКИ_%' THEN C_1 END, ', ') WITHIN GROUP(order by C_1) as C5,  
                    LISTAGG(CASE WHEN C_1 like 'Ф_303_ПЕРИОД_СТАВКИ%' THEN C_1 END, ', ') WITHIN GROUP(order by C_1) as C9,
                    LISTAGG(CASE WHEN C_1 like 'Ф_303_ВИД_КОМП_СТ_%' THEN C_1 END, ', ') WITHIN GROUP(order by C_1) as C10,
                    LISTAGG(CASE WHEN C_1 like 'Ф_303_СПЕЦ_%' THEN C_1 END, ', ') WITHIN GROUP(order by C_1) as C11
                  FROM 
                    KREDIT KR,
                    IBS.VW_CRIT_REPS_PRZ_HIST 
                  WHERE 
                    COLLECTION_ID = KR.PRZ_ID
                    and C_3 <= ${sDateRep} 
                    and (C_4 is NULL or C_4 >= ${sDateRep})
                  GROUP BY KR.ID 
                ) PRZ ON PRZ.ID = KREDIT.ID
      LEFT JOIN ( -- выборка плановых операций
                  SELECT 
                    KR.ID,
                    SUM(CASE WHEN C_4 like 'Гашение кредита%' THEN C_5 END) as C14,
                    SUM(CASE WHEN C_4 like 'Гашение процентов%' THEN C_5 END) as C16
                  FROM 
                    KREDIT KR,
                    IBS.VW_CRIT_PLAN_OPER 
                  WHERE 
                    COLLECTION_ID = KR.PLAN_ID
                    and C_1 BETWEEN ${sPeriodBegin} and ${sPeriodEnd}
                  GROUP BY KR.ID 
                ) PLAN ON PLAN.ID = KREDIT.ID
      LEFT JOIN ( -- выборка фактических операций
                  SELECT 
                    KR.ID,
                    SUM(CASE WHEN F.C_5 in ('Гашение кредита','Гашение задолженности по кредиту') THEN F.C_4 END) as C15,
                    SUM(CASE WHEN F.C_5 in ('Гашение учтенных процентов','Гашение учтенных процентов за пр кредит (112)','Гашение учт на внеб процентов за пр кредит (112)','Гашение доучтенных на внебалансе процентов за пр кредит (112)','Авансовое гашение Неучтенные проценты за кредит','Гашение задолженности по процентам','Гашение задолженности по процентам 112','Гашение задолженности по процентам 112 внебаланс', 'МФК. Гашение учтенных доп. процентов','Гашение учтенных на внебалансе процентов','Гашение просроченных процентов на внебалансе','Комиссия за выдачу ссуды','МФК. Гашение комиссии за открытие кредитной линии (от ссудной задолженности)','МФК. Гашение просроченной комиссии за открытие кредитной линии (от ссудной задолженности)','МФК. Гашение учтенной (внесистемно) комиссии за открытие кредитной линии (от ссудной задолженности)','МФК. Гашение комиссии за предоставление/открытие кредитной линии','МФК. Гашение учтенной комиссии за выдачу кредита','Комиссия за открытие лимита / счета','МФК. Гашение комиссии за изменение условий кредитования','МФК. Гашение учтенной комиссии за открытие кредитной линии (от ссудной задолженности)','МФК. Гашение учтенной комиссии за предоставление/открытие кредитной линии') THEN F.C_4 END) as C17,
                    SUM(CASE WHEN F.C_5 in ('Гашение пени по кредиту','Гашение пени по процентам','Гашение учтенной госпошлины','Гашение внешних задолженностей') THEN DOCS.C_5 END) as C18
                  FROM 
                    KREDIT KR,
                    IBS.VW_CRIT_FACT_OPER F,
                    IBS.VW_CRIT_MAIN_DOCUM DOCS
                  WHERE 
                    F.COLLECTION_ID = KR.FACT_ID
                    and DOCS.ID=F.REF6
                    and F.C_1 BETWEEN ${sPeriodBegin} and ${sPeriodEnd}
                  GROUP BY KR.ID 
                ) FACT ON FACT.ID = KREDIT.ID
      LEFT JOIN ( -- выборка процентов
                  SELECT 
                    KR.ID,
                    LISTAGG( CASE WHEN 
                                PS.C_3='Неучтенные проценты за кредит'
                                and H.C_1=(SELECT MIN(C_1) FROM IBS.VW_CRIT_ARC_SCH_PRC WHERE COLLECTION_ID=H.COLLECTION_ID)
                             THEN
                                H.C_5+NVL(( SELECT 
                                        HB.C_5 
                                      FROM 
                                        IBS.VW_CRIT_PRC_SCHEME SB, 
                                        IBS.VW_CRIT_ARC_SCH_PRC HB 
                                      WHERE 
                                        SB.ID=S.REF12 
                                        and HB.COLLECTION_ID=SB.REF7 
                                        and HB.C_1<=H.C_1 
                                        and (HB.C_2 is NULL or HB.C_2>=H.C_1) ),0) 
                             END , ' | ') WITHIN GROUP(order by H.C_1) as C6,
                    LISTAGG( CASE WHEN 
                                PS.C_3='Неучтенные проценты за кредит'
                                and H.C_1=(SELECT MAX(C_1) FROM IBS.VW_CRIT_ARC_SCH_PRC WHERE COLLECTION_ID=H.COLLECTION_ID and C_1<=${sDateRep}) 
                             THEN
                                H.C_5+NVL(( SELECT 
                                        HB.C_5 
                                      FROM 
                                        IBS.VW_CRIT_PRC_SCHEME SB, 
                                        IBS.VW_CRIT_ARC_SCH_PRC HB 
                                      WHERE 
                                        SB.ID=S.REF12 
                                        and HB.COLLECTION_ID=SB.REF7 
                                        and HB.C_1<=${sDateRep} 
                                        and (HB.C_2 is NULL or HB.C_2>=${sDateRep}) ),0)
                             END , ' | ') WITHIN GROUP(order by H.C_1) as C7,
                    LISTAGG( CASE WHEN 
                                PS.C_3='Проценты на просроченный кредит (112)'
                                and H.C_1=(SELECT MAX(C_1) FROM IBS.VW_CRIT_ARC_SCH_PRC WHERE COLLECTION_ID=H.COLLECTION_ID and C_1<=${sDateRep})
                             THEN
                                H.C_5+NVL(( SELECT 
                                        HB.C_5 
                                      FROM 
                                        IBS.VW_CRIT_PRC_SCHEME SB, 
                                        IBS.VW_CRIT_ARC_SCH_PRC HB 
                                      WHERE 
                                        SB.ID=S.REF12 
                                        and HB.COLLECTION_ID=SB.REF7 
                                        and HB.C_1<=${sDateRep} 
                                        and (HB.C_2 is NULL or HB.C_2>=${sDateRep}) ),0)
                             END , ' | ') WITHIN GROUP(order by H.C_1) as C8                 
                  FROM 
                    KREDIT KR,
                    IBS.VW_CRIT_DEBT_COMIS_ALL PS, 
                    IBS.VW_CRIT_PRC_SCHEME S, 
                    IBS.VW_CRIT_ARC_SCH_PRC H 
                  WHERE 
                    PS.COLLECTION_ID=KR.PRC_ID
                    and S.ID=PS.REF5 
                    and H.COLLECTION_ID=S.REF7 
                  GROUP BY 
                    KR.ID 
                ) PRC ON PRC.ID = KREDIT.ID
      ORDER BY 
        KREDIT.C2`;

  var rsDog = await ibso.query(SQL);
  if (rsDog){
    var excel = new office.Excel(path.join(__dirname,'templates','Форма 303.xlsx'));

    rsDog.map((item) => {
      if(item.C5) item.C5 = przReplace(item.C5);
      if(item.C9) item.C9 = przReplace(item.C9);
      if(item.C10) item.C10 = przReplace(item.C10);
      if(item.C11) item.C11 = przReplace(item.C11);
    });

    excel.replace(1, {
      date: dateRep.format('DD.MM.YYYY'),
			dog: rsDog
    });

    excel.save(path.join(param.task.path,'Форма 303_' + nameRep));
  }
  else
    console.log('Нет документов по заданным параметрам');

  ////////////////////////////////////////////
  //   Замена строки на короткое значение   //
  ////////////////////////////////////////////
  function przReplace(text){
    var prz = { 'Ф_303_ВИД_СТАВКИ_М':"М",
                'Ф_303_ВИД_СТАВКИ_П':"П",
                'Ф_303_ВИД_СТАВКИ_Ф':"Ф",  
                'Ф_303_ПЕРИОД_СТАВКИ':"1",
                'Ф_303_ПЕРИОД_СТАВКИ_М_0_1':"2",
                'Ф_303_ПЕРИОД_СТАВКИ_М_1_3':"3",
                'Ф_303_ПЕРИОД_СТАВКИ_М_3_6':"4",
                'Ф_303_ПЕРИОД_СТАВКИ_М_6_12':"5",
                'Ф_303_ПЕРИОД_СТАВКИ_Г_1_3':"6",
                'Ф_303_ПЕРИОД_СТАВКИ_Г_3_5':"7",
                'Ф_303_ПЕРИОД_СТАВКИ_Г_5_0':"8",
                'Ф_303_ВИД_КОМП_СТ_КЛЮЧЕВАЯ':"1",
                'Ф_303_ВИД_КОМП_СТ_MOSPRIME_RATE':"2",
                'Ф_303_ВИД_КОМП_СТ_RUONIA':"3",
                'Ф_303_ВИД_КОМП_СТ_ROISFIX':"4",
                'Ф_303_ВИД_КОМП_СТ_LIBOR':"5",
                'Ф_303_ВИД_КОМП_СТ_ИНФЛ':"6",
                'Ф_303_ВИД_КОМП_СТ_ФИН':"7",
                'Ф_303_ВИД_КОМП_СТ_ИНОЕ':"8",
                'Ф_303_ВИД_КОМП_СТ_EURIBOR':"9",
                'Ф_303_СПЕЦ_Б':"Б",
                'Ф_303_СПЕЦ_В':"В",
                'Ф_303_СПЕЦ_К':"К",
                'Ф_303_СПЕЦ_ЛГ':"ЛГ",
                'Ф_303_СПЕЦ_ЛД':"ЛД",
                'Ф_303_СПЕЦ_ЛЗ':"ЛЗ",
                'Ф_303_СПЕЦ_ЛИ':"ЛИ",
                'Ф_303_СПЕЦ_М':"М",
                'Ф_303_СПЕЦ_Н':"Н",
                'Ф_303_СПЕЦ_О':"О",
                'Ф_303_СПЕЦ_П':"П",
                'Ф_303_СПЕЦ_Р':"Р",
                'Ф_303_СПЕЦ_С':"С",
                'Ф_303_СПЕЦ_У':"У",
                'Ф_303_СПЕЦ_Ф':"Ф",
                'Ф_303_СПЕЦ_Ч':"Ч" 
              };

    text = text.replace(/(\S+)(?:,\s|$)/g, function replacer(match, key) {
      if (prz[key])
        return ', ' + prz[key];
      else
        return ', ' + key;
    });

    return text.substr(2);
  }
}