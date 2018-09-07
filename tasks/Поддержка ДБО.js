///////////////////////////////////////////
// Формирование сообщения для выполнения // 
// действий по договорам ДБО             //
//                                       //
// ©	Дмитрий Хмелев                     //
///////////////////////////////////////////

module.exports = async function(param, system){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var moment = require('moment'),
    path = require("path"),
    ibso = require('synapse/ibso')(system.config.ibs),
    email = require("emailjs/email");
/*****************************/
  var text = '';

  if (!param.dog) {
    console.log('Не выбран договор');
		process.exit(1);
  }

  if (typeof param.option != 'object') {
    param.option = [param.option];
    param.optionText = [param.optionText];
  }  

  if (param.closeDog) {
    text = text + '\r\n- закрыть договор';
  }

  var user = await system.user(param.task.user);
  var mailTo = "Димурина Татьяна Леонидовна <t.dimurina@mfk-bank.ru>; Любященко Виталий Валерьевич <vlyubyaschenko@mfk-bank.ru>";
  var mailFrom = user.name + " <" + user.email + ">";

  param.option.forEach((el,idx)=> {
    switch (el){
      case '1': { // 1 - Регистрация ключа ЭП
        if (!param.files.filename) {
          console.log('Нет приложенных Сертификатов');
        	process.exit(1);
        }
        text = text + '\r\n- зарегистрировать ключ ЭП ' + param.optionText[idx];
        mailTo = addMail(mailTo, 'Матюшев Артем Андреевич <amatyushev@mfk-bank.ru>');
        mailTo = addMail(mailTo, 'Шкаберин Николай Николаевич <n.shkaberin@mfk-bank.ru>');
        break;
      }
      case '9': { // 9 - Подключить "SMS-банкинг"
        if (!param.files.filename) {
          console.log('Нет приложенного Заявления на подключение услуги "SMS-банкинг"');
        	process.exit(1);
        }
        text = text + '\r\n- подключить услугу "SMS-банкинг" ' + param.optionText[idx];
        break;
      }
      case '7': { // 7 - Добавить счет
        if (param.optionText[idx].length != 20) {
          console.log('Проверьте корректность ввода добавляемого счета');
        	process.exit(1);
        }
      }
      case '2':   // 2 - Блокировка ключа ЭП 
      case '3':   // 3 - Подключить MAC-токен
      case '4':   // 4 - Блокировать MAC-токен 
      case '5':   // 5 - Подключить OTP-токен
      case '6':   // 6 - Блокировать OTP-токен
      case '8':   // 8 - Установить разрешенные IP-адреса
      case '10':  // 10 - Изменить Наименование 
      case '11':  // 11 - Изменить Полное наименование 
      case '12':  // 12 - Изменить Наименование (англ)
      case '13':  // 13 - Изменить КПП
      case '14':  // 14 - Изменить Юридический адрес
      case '15':  // 15 - Изменить Фактический адрес
      case '16':  // 16 - Изменить Адрес (англ) 
      case '17':  // 17 - Другое 
        text = text + '\r\n' + check(el, idx); 
    }
  });

  var SQL = `select
               D.C_1 as DOGNUM, 
               D.C_2 as DOGDATE,                           
               D.C_3 as CLIENT,
              ( select 
                  COUNT(*) 
                from 
                  IBS.VW_CRIT_BC_SIGN_RIGHTS 
                where 
                  COLLECTION_ID=D.REF7 ) as KOLACC
             from 
               IBS.VW_CRIT_BANK_CLIENT D
             where 
               D.ID=${param.dog}`;
  var rs = await ibso.query(SQL);
  if (rs && rs.length) {
    if (rs[0].KOLACC == 0) {
      console.log('Не указан счет для дебетования');
    	process.exit(1);
    }
    var dogNum = rs[0].DOGNUM;
    var dogDate = moment(rs[0].DOGDATE);
    var dogClient = rs[0].CLIENT;

    // формируем сообщение        
    var server = email.server.connect(system.config.mail);

    // добавляем в сообщение файлы
    var attachment = [];
    for (var key in param.files) {
      file = param.files[key];
      attachment.push({path:path.join(param.task.path,'upload',file), type:"text/html", name:file})
    }
  
    var message = {
       from:    mailFrom, 
       to:      "Поддержка ДБО <dbo-krsk@mfk-bank.ru>",
       cc:      addMail(mailTo, mailFrom),
       subject: dogClient,
       text:    `Прошу в системе расчетов Интернет-банкинга "iBank2" по договору № ${dogNum} от ${dogDate.format('DD.MM.YYYY')} Клиента ${dogClient}:${text}`,
       attachment
    };
  
    // отправка сообщения
    server.send(message ,function(err) { if(err) { console.error(err); process.exit(1) } });
  }
  else 
		console.log('Не найден договор в АБС \"ЦФТ\"');

  //////////////////////////////////////////////////
  ///   Проверка корректности введенных данных   ///
  //////////////////////////////////////////////////  
  function check(option, idOption) {
    var textErr = [ '','',
                    'Укажите ФИО блокируемого пользователя',
                    'Укажите № подключаемого MAC-токена',
                    'Укажите № блокируемого MAC-токена',
                    'Укажите № подключаемого OTP-токена',
                    'Укажите № блокируемого OTP-токена',
                    'Укажите добавляемый счет',
                    'Укажите разрешаемые IP-адреса',
                    '',
                    'Укажите новое значение Наименования',
                    'Укажите новое значение Полного наименования',
                    'Укажите новое значение Наименования (англ)',
                    'Укажите новое значение КПП',
                    'Укажите новое значение Юридического адреса',
                    'Укажите новое значение Фактического адреса',
                    'Укажите новое значение Адреса (англ)', 
                    'Укажите изменяемый реквизит и его значение' ]; 
    var textMes = [ '','',
                    'заблокировать ключ ЭП',
                    'подключить MAC-токен №',
                    'заблокировать MAC-токен №',
                    'подключить OTP-токен №',
                    'заблокировать OTP-токен №',
                    'подключить счет',
                    'установить разрешенные IP-адреса',
                    '',
                    'изменить Наименование на',
                    'изменить Полное наименование на',
                    'изменить Наименование (англ) на',
                    'изменить КПП на',
                    'изменить Юридический адрес на',
                    'изменить Фактический адрес на',
                    'изменить Адрес (англ) на',
                    'изменить' ];

    if (!param.files.filename && !param.optionText[idOption]) {
      console.log(textErr[option]);
      process.exit(1);
    }

    return '- ' + textMes[option] + ' ' + param.optionText[idOption];
  }

  //////////////////////////////////////////////
  ///   Проверка адресатов на дублирование   ///
  ///   (т.к. в случае дубля - ошибка)       ///
  //////////////////////////////////////////////  
  function addMail(mailStr, mail) {
    return (mailStr.indexOf(mail)<0) ? mailStr + "; " + mail : mailStr;
  }

}