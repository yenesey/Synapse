///////////////////////////////////////////////////
// Расчет доходности по активной клиентской базе // 
//                                               //
// ©	Дмитрий Хмелев                             //
///////////////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require("path"),
    office = require('synapse/office'),
    ibso = require('synapse/ibso')(system.config.ibs);
/*****************************/

  // Проверяем на корректность исходных данных
  if (param.dateBegin) 
    var dateBegin = moment(param.dateBegin);
  else {
    console.log('Не указано начало периода расчета');
  	process.exit(1);
  }
  
  if (param.dateEnd) 
    var dateEnd = moment(param.dateEnd);
  else {
    console.log('Не указан конец периода расчета');
  	process.exit(1);
  }
  
  if (dateEnd < dateBegin) {
    console.log('Дата начала периода больше даты окончания');
  	process.exit(1);
  }  
  
  var deps = '002';
  
  // трансфертные ставки
  var transf = {  //   год    янв    фев    мар    апр    май    июн    июл    авг    сен    окт    ноя    дек
                      2011: [3.60,  3.90,  3.90,  3.90,  3.90,  3.90,  3.90,  3.90,  3.90,  5.00,  5.54,  5.70],
                      2012: [5.70,  5.56,  5.13,  5.57,  5.96,  6.34,  6.39,  5.69,  5.62,  5.39,  5.83,  6.06],
                      2013: [6.12,  6.12,  6.12,  6.17,  6.32,  6.49,  6.32,  6.33,  6.30,  6.28,  6.26,  6.33],
                      2014: [6.33,  6.56,  8.10,  8.34,  7.97,  8.30,  8.41,  8.37,  8.37,  8.21,  8.24,  11.49],
                      2015: [14.74, 16.10, 15.23, 14.80, 14.07, 12.98, 12.21, 12.09, 10.87, 11.28, 11.49, 11.70],
                      2016: [11.79, 11.48, 11.26, 11.19, 11.14, 11.05, 11.15, 10.38, 10.44, 10.53, 10.27, 10.20],
                      2017: [10.20, 10.20, 10.21, 10.15, 9.9,   9.9,   9.9,   9.9,   9.07,  8.58,  8.12,  8.16],
                      2018: [8.16]
               };
  
  // трансфертные ставки ГПКК "ЦРКК"
  var transf_CRKK = {
                      2014: [9.27,  9.27,  9.27,  9.27,  9.27,  9.27,  9.27,  11.00, 11.00, 11.00, 11.00, 11.00],
                      2015: [17.82, 17.82, 17.82, 17.82, 17.82, 17.82, 17.82, 17.82, 17.82, 17.82, 17.82, 17.82],
                      2016: [14.04, 14.04, 14.04, 14.04, 14.04, 14.04, 14.04, 14.04, 14.04, 14.04, 14.04, 14.04],
                      2017: [10.20, 10.20, 10.21, 10.15, 9.9,   9.9,   9.9,   9.9,   9.07,  8.58,  8.12,  8.16],
                      2018: [8.16]
                    };
  
  // чтобы прописать суммы в записях на конец месяца (на основе таблиц трансфертных ставок)
  var summSQL = "NVL(SUMM";
  // формирование таблицы трансфертных ставок
  var transfSQL = tableSQL(dateBegin, dateEnd);

  // выборка договоров РКО
  var RKO = `SELECT 
                * 
             FROM 
                IBS.VW_CRIT_RKO 
             WHERE 
                C_1 like '_________0200%' 
                and ${(param.active) ? 
                      "C_13 is NULL" : 
                      "C_7<=TO_DATE('" + dateEnd.format('YYYY-MM-DD') + "', 'YYYY-MM-DD') and (C_9 is NULL or C_9>=TO_DATE('" + dateBegin.format('YYYY-MM-DD') + "', 'YYYY-MM-DD'))"}`; 
  // выборка Клиентов
  var CLIENTS = `SELECT 
                    C.ID as ID, 
                    C.C_2 as NAME, 
                    (SELECT C_1 FROM IBS.VW_CRIT_IFC_LOAN_INSPECTOR WHERE COLLECTION_ID = C.REF37 and C_3 is NULL) as MANAGER, 
                    (CASE WHEN C.C_6 = 'ИП' THEN C.C_6 ELSE C.C_13 END) as CATEGORY, C.C_22 as FILIAL 
                 FROM 
                    IBS.VW_CRIT_CL_ORG C`;
  // выборка Гарантий
  var GARANT = `SELECT DISTINCT
                  G.* 
                FROM 
                  IBS.VW_CRIT_ALL_GUARANTIES G, 
                  RKO R 
                WHERE 
                  G.REF1 in R.REF4 
                  and G.C_33 = '${deps}' 
                  and G.C_4 <= TO_DATE('${dateEnd.format('YYYY-MM-DD')}', 'YYYY-MM-DD') 
                  and G.C_6 >= TO_DATE('${dateBegin.format('YYYY-MM-DD')}', 'YYYY-MM-DD')`;
  // выборка Кредитных договоров
  var KREDIT = `SELECT DISTINCT
                  K.* 
                FROM 
                  IBS.VW_CRIT_PR_CRED K, 
                  RKO R 
                WHERE 
                  K.REF1 in R.REF4 
                  and K.CLASS_ID = 'KRED_CORP' 
                  and K.C_2 like '%КЮР%' 
                  and K.C_6<=TO_DATE('${dateEnd.format('YYYY-MM-DD')}', 'YYYY-MM-DD') 
                  and (K.C_16 is NULL or K.C_16>=TO_DATE('${dateBegin.format('YYYY-MM-DD')}', 'YYYY-MM-DD')) 
                  and ${(deps == '003') ? 
                        "(K.C_37 like '" + deps + "%' or K.C_37 = '002-00-50-01')" : 
                        "(K.C_37 like '" + deps + "%' and K.C_37 <> '002-00-50-01')"}`;
  
  var sql = [];
  // Текущая задолженность
  sql[0] = `SELECT K.REF1 as CLIENT, (NVL(SUM(A.C_3),0)/1000) as C_1 
            FROM KREDIT K, IBS.VW_CRIT_HOZ_OP_ACC A 
            WHERE A.COLLECTION_ID=K.REF27 and A.C_5 = 'ACCOUNT - Ссудный счет' 
            GROUP BY K.REF1`;
  // Просроченная задолженность
  sql[1] = `SELECT K.REF1 as CLIENT, NVL(SUM(A.C_3),0)/1000 as C_2 
            FROM KREDIT K, IBS.VW_CRIT_HOZ_OP_ACC A 
            WHERE A.COLLECTION_ID=K.REF27 and A.C_5 = 'ACC_DEBTS_CR - Счет просроченной задолженности по кредиту' 
            GROUP BY K.REF1`;
  // Процентные доходы по кредитам
  sql[2] = `SELECT K.REF1 as CLIENT, NVL(SUM(F.C_4),0)/1000 as C_3 
            FROM KREDIT K, IBS.VW_CRIT_FACT_OPER F 
            WHERE F.COLLECTION_ID=K.REF10 and F.C_1 BETWEEN TO_DATE('${dateBegin.format('YYYY-MM-DD 00:00:00')}', 'YYYY-MM-DD hh24:mi:ss') and TO_DATE('${dateEnd.format('YYYY-MM-DD 23:59:59')}', 'YYYY-MM-DD hh24:mi:ss') and F.C_5 like 'Гашение учтенных процентов%' 
            GROUP BY K.REF1`;
  // Комиссии за открытие кредитной линии
  sql[3] = `SELECT K.REF1 as CLIENT, NVL(SUM(F.C_4),0)/1000 as C_4 
            FROM KREDIT K, IBS.VW_CRIT_FACT_OPER F 
            WHERE F.COLLECTION_ID=K.REF10 and F.C_1 BETWEEN TO_DATE('${dateBegin.format('YYYY-MM-DD 00:00:00')}', 'YYYY-MM-DD hh24:mi:ss') and TO_DATE('${dateEnd.format('YYYY-MM-DD 23:59:59')}', 'YYYY-MM-DD hh24:mi:ss') and F.C_5 = 'Комиссия за выдачу ссуды' 
            GROUP BY K.REF1`;
  // Доходы по остаткам на р/счетах и депозитам (135409056 - ID ГПКК "ЦРКК")
  sql[4] = `SELECT CLIENT, SUM((PRC_TRANSF-PRC)*SUMM*D_COUNT/100/D_YEAR)/1000 as C_5 
            FROM ( SELECT CLIENT, 
                           DOG, 
                           DATE_OP, 
                           ${summSQL} SUMM, 
                           DATE_OP - (LAG (DATE_OP, 1) OVER (ORDER BY CLIENT, DOG, DATE_OP)) D_COUNT,  
                           (SELECT (CASE WHEN (CLIENT = 135409056) THEN C_5 ELSE C_4 END) FROM TRANSF WHERE C_1 <= DATE_OP and C_2 > DATE_OP-1) PRC_TRANSF, 
                           NVL((SELECT C_5 FROM IBS.VW_CRIT_STRING_CALC_PRC WHERE COLLECTION_ID = DOG and C_1 <= DATE_OP and C_2 >= DATE_OP and C_5<>0),0) PRC, 
                           (SELECT C_3 FROM TRANSF WHERE C_1 <= DATE_OP and C_2 > DATE_OP-1) D_YEAR 
                   FROM ( 
                          SELECT CLIENT, DOG, DATE_OP, SUMM 
                          FROM ( SELECT D.REF4 CLIENT, D.REF16 DOG, TRUNC(REC.C_1) DATE_OP, REC.C_4 SUMM, dense_rank() over(partition by ACC.C_1, TRUNC(REC.C_1) order by ACC.C_1, REC.C_1, REC.ID) rnk 
                                 FROM RKO D, IBS.VW_CRIT_FULL_RECORDS REC, IBS.VW_CRIT_AC_FIN ACC 
                                 WHERE REC.COLLECTION_ID=ACC.REF8 AND ACC.C_1 = D.C_5 AND REC.C_1 BETWEEN TO_DATE('${dateBegin.format('YYYY-MM-DD 00:00:00')}', 'YYYY-MM-DD hh24:mi:ss') and TO_DATE('${dateEnd.format('YYYY-MM-DD 23:59:59')}', 'YYYY-MM-DD hh24:mi:ss') ) 
                          WHERE rnk = 1 
                          UNION SELECT D.REF4 CLIENT, D.REF16 DOG, TO_DATE('${dateBegin.clone().add(-1, 'days').format('YYYY-MM-DD')}', 'YYYY-MM-DD') DATE_OP, 0 SUMM FROM RKO D 
                          UNION SELECT D.REF4 CLIENT, D.REF16 DOG, TO_DATE('${dateEnd.format('YYYY-MM-DD')}', 'YYYY-MM-DD') DATE_OP, (SELECT C_7 FROM IBS.VW_CRIT_AC_FIN_TURN WHERE C_1=D.C_5) SUMM FROM RKO D 
                          UNION SELECT D.REF4 CLIENT, D.REF16 DOG, T.C_2 DATE_OP, null SUMM FROM TRANSF T, RKO D 
                        ) 
                 ) 
            GROUP BY CLIENT`;
  // Доходы по РКО
  sql[5] = `SELECT D.REF4 as CLIENT, NVL(SUM(C.C_8),0)/1000 as C_6 
            FROM RKO D, IBS.VW_CRIT_DOC_COM_JOUR C 
            WHERE C.COLLECTION_ID=D.REF22 and C.C_2 BETWEEN TO_DATE('${dateBegin.format('YYYY-MM-DD 00:00:00')}', 'YYYY-MM-DD hh24:mi:ss') and TO_DATE('${dateEnd.format('YYYY-MM-DD 23:59:59')}', 'YYYY-MM-DD hh24:mi:ss') and C.C_4 in ('МФК СФ 8.6 Выдача устройства для генерации одноразовых паролей ОТР','МФК СФ 8.4 Выдача устройства для генерации одноразовых паролей MAC-токен','МФК СФ 8.5 Выдача устройства считывания смарт-карты \"iBank2 Key\"','МФК СФ 8.4 Выдача смарт-карты \"iBank2 Key\" для создания ключей ЭЦП клиента','МФК СФ 8.4 Выдача USB-токена \"iBank2 Key\" для создания ключей ЭЦП клиента','МФК СФ 1.5.1 Выдача справок  об опл уставн капитала, об открытых счетах, об отсутствии опер 100','МФК СФ ЗОЛ 1.5.1 Выдача справок  об опл уставн капитала, об открытых счетах, об отсутствии опер 100','МФК СФ 1.5.2 Выдача справок  об опл уставн капитала, об открытых счетах, об отсутст опер  1000','МФК СФ ЗОЛ 1.5.2 Выдача справок  об опл уставн капитала, об открытых счетах, об отсутствии оп 500 ','МФК СФ 090601 1.4 Составление дубл. выписок по расч-му (текущему) счёту, авизующих и платёжных док','МФК СФ Составление дубл. выписок по расч-му (текущему) счёту, авизующих и платёжных док для золотодо','МФК СФ Заверение копий документов для открытия расчетного счета','МФК СФ Заверение копий документов для открытия расчетного счета золотодобывающие','МФК СФ Заверение копий документов для открытия расчетного счета золотодобывающие нал','МФК СФ Заверение копий документов для открытия расчетного счета наличными','МФК СФ 090601 4.1 Предоставление копий договоров и дополнений к ним заверенных Банком','МФК СФ Предоставление копий договоров и дополнений к ним заверенных Банком для золотодобывающих','МФК СФ 090601 8.2.2 Замена сертификата ключа ЭЦП (1000 р)','МФК СФ ЗОЛ Изменение условий инкассового поручения','МФК СФ 090601 Разовая комиссия за предоставление услуги СМС-информирования клиент_банк наличными','МФК СФ 090601 Разовая комиссия за предоставление услуги СМС-информирования клиент_банк','МФК СФ 090601 1.7 Оформление карточки с образцами подписей и оттиска печати','МФК СФ Оформление карточки с образцами подписей и оттиска печати для золотодобывающих','МФК СФ Комиссия за срочное открытие счета','МФК СФ Комиссия за срочное открытие счета для золотодобывающих','МФК СФ Комиссия за срочное открытие счета для золотодобывающих наличными','МФК СФ Комиссия за срочное открытие счета наличными','МФК СФ 090601 1.1 Комиссия за открытие счета','МФК СФ Комиссия за открытие счета для золотодобывающих','МФК СФ 090601 2.6 Оформление сотрудником Банка распоряжений Клиента на совершение операций по счету','МФК СФ Оформление сотрудником Банка распоряжений Клиента на совершение операций по счету для золотод','МФК СФ 090601 Комиссия за подключение услуги СМС-информирования клиент_банк','МФК СФ 090601 2.7 Прием от Клиента расчетных документов на инкассо','МФК СФ Прием от Клиента расчетных документов на инкассо для золотодобывающих','МФК СФ 090601 4.2 Предоставление письменных расчетов сумм платежей, осуществляемых по кред-му догово','МФК СФ Предоставление письменных расчетов сумм платежей, осуществляемых по кред-му догово для золото','МФК СФ 090601 2.4 РУБ Направление по исполненному Банком платежу запроса для уточ-ия плат.  инструкц','МФК СФ РУБ Направление по исполненному Банком плат запроса для уточ-ия плат.  инстр для золотодоб','МФК СФ 090601 2.5 РУБ Направление по исполненному Банком платежу запр. на отзыв ранее перечис. средс','МФК СФ 090601 8.2 Регистрация сертификата ключа ЭЦП (500 р)','МФК СФ  Справка о наличии обеспечения по кред.договорам (линиям)','МФК СФ 090601 4.4 Справка о наличии ссудной задолженности','МФК СФ  Справка об отсутствии ссудной задолженности','МФК СФ 090601 4.3 Предоставление информации о средних ставках кредитования за определенный период','МФК СФ Предоставление информации о средних ставках кредитования за определенный период для золотодоб','МФК СФ 090601 8.3 Организация установки системы интернет-банк','МФК СФ Организация установки системы интернет-банк для золотодобывающих','МФК СФ ЗОЛ 3.1 Оформление чековой книжки 25 листов','МФК СФ ЗОЛ 3.1 Оформление чековой книжки 50 листов','МФК СФ ЗОЛ 8.4 Выдача USB-токена \"iBank2 Key\" для создания ключей ЭЦП клиента','МФК СФ 2.5 РУБ Направл по исполненному Банком платежу запр. на отзыв ранее перечис. средс для зол','МФК СФ 090601 3.6. Обмен банкнот (монет)','МФК СФ 090601 3.5. Прием денежной наличности','МФК СФ Выдача со счета денежной наличности для золотодобывающих','МФК СФ 090601 3.4 Выдача со счета денежной наличности (рубли)','МФК СФ 090601 8.1 Комиссия за обслуживание клиент_банка','МФК СФ 090601 1.2 Комиссия за ведение счета','МФК СФ 090601 1.2 Комиссия за ведение счета для золотодобывающих','МФК СФ 2.8.1 Плата за подключение к услуге \"Корпоративное бюджетирование\"','МФК СФ 2.8.2 Ежемесячная плата за  \"Корпоративное бюджетирование\"','МФК СФ 090601 2.3 Перевод средств в другой банк','МФК СФ Перевод средств в другой банк для золотодобывающих') 
            GROUP BY D.REF4`;
  // Доходы от валютных операций
  sql[6] = `SELECT D.REF4 as CLIENT, NVL(SUM(C.C_8),0)/1000 as C_7 
            FROM RKO D, IBS.VW_CRIT_DOC_COM_JOUR C 
            WHERE C.COLLECTION_ID=D.REF22 and C.C_3 BETWEEN TO_DATE('${dateBegin.format('YYYY-MM-DD 00:00:00')}', 'YYYY-MM-DD hh24:mi:ss') and TO_DATE('${dateEnd.format('YYYY-MM-DD 23:59:59')}', 'YYYY-MM-DD hh24:mi:ss') and C.C_4 in ('МФК СФ 090601 2.4 ВАЛ Направление по исполненному Банком платежу запроса для уточ-ия плат. инструкци','МФК СФ 090601 2.5 ВАЛ Направление по исполненному Банком платежу запр. на отзыв ранее перечис. средс','МФК СФ 090601 Выдача ведомости БК, ПС, копий док., помещённых в досье ВК','МФК СФ 090601 Выдача ведомости БК, ПС, копий док., помещённых в досье ВК для золотодобывающих','МФК СФ 090601 5.4.Дт_Кт.ВАЛЮТА.Выполнение функций агента ВК по ВО,проводимым резид. без оформл ПС','МФК СФ Выполнение функций агента ВК по ВО, проводимым резидентами без оформления ПС для золотодобыв','МФК СФ 090601 5.4.Дт_Кт РУБЛИ.Выполнение функций агента ВК по ВО,проводимым резид. без оформл ПС','МФК СФ 090601 5.1.Дт_Кт.ВАЛЮТА.Осуществление ВК по ПС,оформленным по внешнеторг. догов. (контракту)','МФК СФ Осуществление ВК по ПС, оформленным по внешнеторговому договору (контракту) для золотодобываю','МФК СФ 090601 5.1.Дт_Кт РУБЛИ.Осуществление ВК по ПС,оформленным по внешнеторг. догов. (контракту)','МФК СФ 090601 5.2.Дт_Кт.ВАЛЮТА.Осуществление ВК по ПС, оформленным по кредитным договорам,дог.займа','МФК СФ Осуществление ВК по ПС, оформленным по кредитным договорам (договорам займа) для золотодобыва','МФК СФ 090601 5.2.Дт_Кт.РУБЛИ.Осуществление ВК по ПС, оформленным по кредитным договорам,дог.займа','МФК СФ 090601 5.3 Самостоятельное оформление Банком ПС для клиента или иных документов ВК','МФК СФ Самостоятельное оформление Банком проекта ПС для клиентов (золотодобывающие)','МФК СФ 090601 Оформление закрытия ПС с переводом контракта в другой Банк','МФК СФ 090601 Оформление закрытия ПС с переводом контракта в другой Банк для золотодобывающих','МФК СФ 090601 5.4 Составление Банком проектов иных документов валютного контроля','МФК СФ 090601 Срочное оформление (переоформление) паспорта сделки','МФК СФ 090601 Срочное оформление (переоформление) паспорта сделки для золотодобывающих','МФК СФ ЗОЛ Выдача со счета денежной наличности (валюта)','МФК СФ 090601 3.3. Прием для зачисления на счет клиента наличной иностранной валюты','МФК СФ Прием для зачисления на счет клиента наличной иностранной валюты для золотодобывающих','МФК СФ ЗОЛ 5.4 Составление Банком проектов иных документов валютного контроля') 
            GROUP BY D.REF4`;
  // Доходы по документарным операциям
  sql[7] = `SELECT G.REF1 as CLIENT, (NVL(SUM(S.C_4),0)-NVL(SUM(S.C_3),0))/1000 as C_8 
            FROM GARANT G, IBS.VW_CRIT_AC_FIN A, IBS.VW_CRIT_RECORDS S 
            WHERE (A.C_1 like '70601%27502%' or A.C_1 like '70601%12301%') and A.C_32 = '${deps}' and 
                   S.COLLECTION_ID=A.REF8 and S.C_8 like '%'||G.C_2||'%' and S.C_1 BETWEEN TO_DATE('${dateBegin.format('YYYY-MM-DD 00:00:00')}', 'YYYY-MM-DD hh24:mi:ss') and TO_DATE('${dateEnd.format('YYYY-MM-DD 23:59:59')}', 'YYYY-MM-DD hh24:mi:ss') 
            GROUP BY G.REF1`;
  
  var SQL_ALL = sql[0];
  var fields = "NVL(t1.C_1,0) as C_1";
  for(var i=1;i<sql.length;i++) {
    SQL_ALL = `SELECT NVL(t1.CLIENT,t2.CLIENT) as CLIENT, ${fields}, t2.C_${(i+1).toString()}
               FROM (${SQL_ALL}) t1 
               FULL OUTER JOIN (${sql[i]}) t2 
               ON t1.CLIENT = t2.CLIENT`;
    fields = fields + ", NVL(t1.C_"+(i+1).toString()+",0) as C_"+(i+1).toString();
  }
  
  SQL_ALL = `WITH 
              CLIENTS AS (${CLIENTS}), 
              RKO AS (${RKO}), 
              GARANT AS (${GARANT}), 
              KREDIT AS (${KREDIT}),
              TRANSF AS (${transfSQL}) 
  
            SELECT C.NAME, C.CATEGORY, C.MANAGER, ${fields}
            FROM CLIENTS C, (${SQL_ALL}) t1 
            WHERE C.ID = t1.CLIENT 
            ORDER BY C.CATEGORY, C.NAME`;
  
  var context = `IBS.EXECUTOR.SET_CONTEXT('$REP$_ACC_D1', '${dateEnd.format('DD/MM/YYYY')}'); 
                 IBS.EXECUTOR.SET_CONTEXT('$REP$_ACC_D2', '${dateEnd.clone().add(1, 'days').format('DD/MM/YYYY')}');`;

  var rsClient = await ibso.query(context + SQL_ALL);
  if (rsClient){
    var excel = new office.Excel(path.join(__dirname,'templates','Активные Клиенты.xlsx'));
   	await Promise.all(
      rsClient.map( item => { item['C_3_4']=item.C_3 + item.C_4; 
                              item['C_5_6_7_8']=item.C_5 + item.C_6 + item.C_7 + item.C_8; 
                              item['C_3_4_5_6_7_8']=item.C_3 + item.C_4 + item.C_5 + item.C_6 + item.C_7 + item.C_8;
      })
    ); 
  
    excel.replace(1, {
      dateBegin: dateBegin.format('DD.MM.YYYY'),
      dateEnd: dateEnd.format('DD.MM.YYYY'),
  		client: rsClient
    });
  
    excel.save(path.join(param.task.path,'Активные Клиенты.xlsx'));
  }
  else
    console.log('Нет данных по заданным параметрам');
  
  ///////////////////////////////////////
  //  Формирование SQL строки таблицы  //
  //  трансфертных %% ставок           //
  //  за указанный период              //
  ///////////////////////////////////////
  function tableSQL(dB, dE){
    var resStr = "";
    var d = moment(dB.clone().date(1)); // устанавливаем первое число месяца
    var p = 1;
  
    while (d <= dE) {
      // проверка полноты заданных трансфертных ставок
      if (!transf[d.year()] || !transf[d.year()][d.month()]) {
        console.log('Не заданы трансфертные ставки за указанный период.\nОбратитесь к Администратору');
      	process.exit(0);
      }
      if (!transf_CRKK[d.year()] || !transf_CRKK[d.year()][d.month()]) {
        console.log('Не заданы трансфертные ставки ГПКК "ЦРКК" за указанный период.\nОбратитесь к Администратору');
      	process.exit(0);
      }
  
      resStr = resStr + ((resStr) ? " UNION " : "") + `SELECT 
                                                          TO_DATE('${d.format('YYYY-MM-DD')}','YYYY-MM-DD') as C_1, 
                                                          TO_DATE('${d.clone().month(0).date(31).month(d.month()).format('YYYY-MM-DD')}','YYYY-MM-DD') as C_2, 
                                                          TO_CHAR(TO_DATE('${d.format('YYYY-12-31')}', 'YYYY-MM-DD'), 'ddd') as C_3, 
                                                          ${transf[d.year()][d.month()]} as C_4, 
                                                          ${transf_CRKK[d.year()][d.month()]} as C_5 
                                                       FROM DUAL`;
      d.add(1, 'months');
  
      // формирование строки SUMM
      summSQL = summSQL + ",NVL(LEAD (SUMM,"+p+") OVER (ORDER BY CLIENT, DOG, DATE_OP)";                                                                                                       
      p=p+1;
    }
  
    // окончание строки SUMM
    summSQL = summSQL + ",LEAD (SUMM,"+p+") OVER (ORDER BY CLIENT, DOG, DATE_OP))";
    for (var i=0;i<p-1;i++)
      summSQL = summSQL + ")";
  
    return resStr;
  }
}