<<<<<<< HEAD
'use strict'
=======
"use strict";
>>>>>>> update fix

/* для задачи Контроль отчетности */

const moment = require('moment'),
<<<<<<< HEAD
	os = require('os'),
	fs = require('fs'),
	path = require('path'),
	iconv = require('iconv-lite'), //кодировка 
	xml = require('xmldom').DOMParser,
	express = require('express'),
	router = express.Router({
		strict: true
	}),
	bodyParser = require('body-parser'),
	cronJob = require('cron').CronJob,
	request = require('request'),
	email = require("emailjs/email");

/////////////////////////////////////////////////////////////////////////

module.exports = function (system) {

	var offsetTime = -4; // смещение времени по Мск
	var crons = {}; //ассоциативный массив (ключ-значение). id : handle
	//где id соответствует forms.id , а handle - объект cron.schedule

	var db = require('../sqlite')('tasks/db/Контроль отчетности.db');
	if (typeof db === 'undefined') {
		res.json({
			error: 'Отсутствует база данных!!!'
		});
		return;
	}
	/*
	// по всем формам, срок сдачи которых приходится на сегодня, система направляет сообщение Исполнителям 1-го уровня контроля. 
	crons['now'] = new cronJob({
		cronTime: '00 09 * * *',
		onTick: function(){
			db(`SELECT date FROM holiday ORDER BY date DESC`)
			.then(res => res.map(item => item.date))
			.then(holiday => {   
				// не выполняем оповещение в выходные и праздничные дни
				if(holiday.indexOf(moment().add(offsetTime,'hours').format('YYYY-MM-DD')) == -1)         
					getForms(null, true)
					.then( forms => sendMessage('now', 'control1', forms.filter(el => el.datePlan == moment().add(offsetTime,'hours').startOf('day').format('YYYY-MM-DD')), true, false) )
			})
		},
		start: true,
		timeZone: 'Europe/Moscow'
	});
	*/
	router.route('/forms')
		.get(function (req, res) {
			//получение списка форм или записей указанной таблицы

			if ('crons' in req.query) {
				var jobs = [];
				for (var job in crons)
					jobs.push({
						id: job.split('control')[0],
						control: 'control' + job.split('control')[1],
						shedule: crons[job].cronTime.source
					})

				return res.json(jobs);
			}
			if ('holiday' in req.query)
				return db(`SELECT date FROM holiday ORDER BY date DESC`)
					.then(result => res.json(result))
					.catch(err => system.errorHandler(err, req, res));

			if ('send' in req.query)
				return db(`SELECT logSend.* FROM logSend ${req.query.send ? ", forms WHERE logSend.code = forms.code and (logSend.period=forms.period or logSend.period is NULL) and (logSend.type=forms.type or forms.type is NULL or forms.type='') and (logSend.dep=forms.dep or forms.dep is NULL or forms.dep='') and logSend.ies=1 and (logSend.rezCode!=2 or logSend.rezCode is NULL) and forms.id = "+req.query.send : ""}`)
					.then(result => res.json(result))
					.catch(err => system.errorHandler(err, req, res));

			if ('edit' in req.query)
				return db(`SELECT * FROM logEdit ${req.query.edit ? 'WHERE tableName=\'forms\' and record like \'{"id":'+req.query.edit+'%\'' : ''}`)
					.then(result => res.json(result))
					.catch(err => system.errorHandler(err, req, res));

			if ('alert' in req.query)
				return db(`SELECT * FROM logAlert`)
					.then(result => res.json(result))
					.catch(err => system.errorHandler(err, req, res));

			if ('user' in req.query)
				return db(`SELECT * FROM users ORDER BY name`)
					.then(result => res.json(result))
					.catch(err => system.errorHandler(err, req, res));

			return getForms(null, ('check' in req.query) ? true : false)
				.then(async forms => {
					// добавляем задачу в расписание
					await forms.filter((el, idx, self) => self.map(el => el.id).indexOf(el.id) == idx).map(el => addJob(el));

					return res.json(forms);
				})
				.catch(function (err) {
					console.log(err)
				});
		})

		.put(bodyParser.json(), function (req, res) {
			// операция редактирования указанной записи

			if ('holiday' in req.query) {
				db(`DELETE FROM holiday`)
					.then(function () {
						return db(`INSERT INTO holiday VALUES ${"('" + req.body.holiday.join("'),('") + "')"}`)
							.then(result => res.json({
								result
							}))
							.catch(err => system.errorHandler(err, req, res))
					})
					.catch(err => system.errorHandler(err, req, res))
			}

			if ('user' in req.query) {
				var userOld = {
					id: null,
					name: null,
					email: null,
					phone: null
				};
				if (req.body.id)
					db(`SELECT * FROM users WHERE id=${req.body.id}`)
					.then(result => result.length ? userOld = result[0] : 1)
					.catch(err => system.errorHandler(err, req, res))

				return db(`REPLACE INTO users VALUES (${req.body.id}, '${req.body.name}', '${req.body.email}', '${req.body.phone}')`)
					.then(result => {
						addLog((req.ntlm.DomainName == 'IFCBANK' ? req.ntlm.UserName : req.ntlm.DomainName + "\\" + req.ntlm.UserName), 'users', {
							id: result,
							name: req.body.name
						}, req.body, userOld);
						return res.json({
							result
						});
					})
					.catch(err => system.errorHandler(err, req, res))
			}

			var formOld = {
				id: null,
				code: null,
				type: null,
				dep: null,
				name: null,
				period: null,
				periodParam: null,
				control1: null,
				control2: null,
				control3: null
			};
			db(`SELECT * FROM forms WHERE id=${req.body.id}`)
				.then(result => result.length ? formOld = result[0] : 1)
				.catch(err => system.errorHandler(err, req, res))

			return db(`REPLACE INTO forms VALUES (${req.body.id}, '${req.body.code}', '${req.body.type}', '${req.body.dep}', '${req.body.name}', '${req.body.period}', '${req.body.periodParam}', '${req.body.control1}', '${req.body.control2}', '${req.body.control3}')`)
				.then(result => {
					addLog((req.ntlm.DomainName == 'IFCBANK' ? req.ntlm.UserName : req.ntlm.DomainName + "\\" + req.ntlm.UserName), 'forms', {
						id: result,
						name: req.body.code
					}, req.body, formOld);
					return res.json({
						result
					});
				})
				.catch(err => system.errorHandler(err, req, res))
		})

		.delete(bodyParser.json(), function (req, res) {
			// операция удаления указанной записи
			if ('user' in req.query) {
				var userOld = {
					id: null,
					name: null,
					email: null,
					phone: null
				};
				db(`SELECT * FROM users WHERE id=${req.body.id}`)
					.then(result => result.length ? userOld = result[0] : 1)
					.catch(err => system.errorHandler(err, req, res))

				return db(`UPDATE 
											forms 
										SET 
											control1 = replace(replace(replace(control1, ',"${req.body.name}"', ''), '"${req.body.name}",', ''), '"${req.body.name}"', ''),
											control2 = replace(replace(replace(control2, ',"${req.body.name}"', ''), '"${req.body.name}",', ''), '"${req.body.name}"', ''),
											control3 = replace(replace(replace(control3, ',"${req.body.name}"', ''), '"${req.body.name}",', ''), '"${req.body.name}"', '') 
										WHERE 
											control1 LIKE '%${req.body.name}%'
											or control2 LIKE '%${req.body.name}%'
											or control3 LIKE '%${req.body.name}%'`)
					.then(function () {
						return db(`DELETE FROM users WHERE id=${req.body.id}`)
							.then(function (result) {
								addLog((req.ntlm.DomainName == 'IFCBANK' ? req.ntlm.UserName : req.ntlm.DomainName + "\\" + req.ntlm.UserName), 'users', {
									id: result,
									name: userOld.name
								}, {
									name: null,
									email: null,
									phone: null
								}, userOld);
								return res.json({
									result
								});
							})
							.catch(err => system.errorHandler(err, req, res))
					})
					.catch(err => system.errorHandler(err, req, res))
			}

			var formOld = {
				id: null,
				code: null,
				type: null,
				dep: null,
				name: null,
				period: null,
				periodParam: null,
				control1: null,
				control2: null,
				control3: null
			};
			db(`SELECT * FROM forms WHERE id=${req.body.id}`)
				.then(result => result.length ? formOld = result[0] : 1)
				.catch(err => system.errorHandler(err, req, res))

			return db(`DELETE FROM forms WHERE id=${req.body.id}`)
				.then(result => {
					addLog((req.ntlm.DomainName == 'IFCBANK' ? req.ntlm.UserName : req.ntlm.DomainName + "\\" + req.ntlm.UserName), 'forms', {
						id: result,
						name: formOld.code
					}, {
						id: null,
						code: null,
						type: null,
						dep: null,
						name: null,
						period: null,
						periodParam: null,
						control1: null,
						control2: null,
						control3: null
					}, formOld);

					// удаляем задачу из расписания
					deleteJob(req.body.id + 'control1');
					deleteJob(req.body.id + 'control2');
					deleteJob(req.body.id + 'control3');

					return res.json({
						result
					});
				})
				.catch(err => system.errorHandler(err, req, res))
		})

	function addLog(user, table, record, newVal, oldVal) {
		var nowDate = moment().add(offsetTime, 'hours').format('YYYY-MM-DD HH:mm:ss')
		if (oldVal.id)
			if (newVal.id) {
				// изменена запись
				for (var key in oldVal)
					if (key != 'id' && oldVal[key] != newVal[key])
						db(`INSERT INTO logEdit VALUES ('${nowDate}', '${user}', '${table}', '${JSON.stringify(record)}', '${key}', ${newVal[key] == null ? null : "'" + newVal[key] + "'"}, ${oldVal[key] == null ? null : "'" + oldVal[key] + "'"})`)
						.catch(function (err) {
							console.log(err)
						});
			}
		else
			// удалена запись
			db(`INSERT INTO logEdit VALUES ('${nowDate}', '${user}', '${table}', '${JSON.stringify(record)}', '*удаление*', null, '${JSON.stringify(oldVal)}')`)
			.catch(function (err) {
				console.log(err)
			});
		else
			// добавлена запись
			db(`INSERT INTO logEdit VALUES ('${nowDate}', '${user}', '${table}', '${JSON.stringify(record)}', '*добавление*', '${JSON.stringify(newVal)}', null)`)
			.catch(function (err) {
				console.log(err)
			});
	}

	async function getForms(form_id, check) {
		return db(`SELECT date FROM holiday ORDER BY date DESC`)
			.then(res => res.map(item => item.date))
			.then(async holiday => {
				if (check)
					await checkKvit();

				return db(`SELECT 
									*,
									( SELECT MAX(dateRep) 
										FROM logSend 
										WHERE 
											code=forms.code 
											and (period=forms.period or period is NULL) 
											and (type=forms.type or forms.type is NULL or forms.type='') 
											and (dep=forms.dep or forms.dep is NULL or forms.dep='') 
											and ies=1 
											and (rezCode!=2 or rezCode is NULL) 
									) as dateRep
								FROM 
									forms
								${form_id ? 'WHERE id='+form_id : ''}`)
					.then(forms => {
						var periods = {
							'нерегулярная': 'day',
							'суточная': 'day',
							'декадная': 'day',
							'месячная': 'month',
							'квартальная': 'quarter',
							'полугодовая': 'quarter',
							'годовая': 'year'
						};

						forms = forms.map(function (item) {
							item.control1 = item.control1 ? JSON.parse(item.control1) : {
								name: [],
								shedule: null
							};
							item.control2 = item.control2 ? JSON.parse(item.control2) : {
								name: [],
								shedule: null
							};
							item.control3 = item.control3 ? JSON.parse(item.control3) : {
								name: [],
								shedule: null
							};
							item.periodParam = item.periodParam ? JSON.parse(item.periodParam) : {
								days: 1,
								holiday: false,
								offset: {
									kol: 0,
									period: 'day'
								},
								skip: []
							};
							var period = periods[item.period];

							switch (item.period) {
								case 'декадная': {
									var dateRep = (item.dateRep == null) ? moment().add(offsetTime, 'hours').startOf(period) : moment(item.dateRep).add(1, period);

									if (dateRep.date() >= 2 && dateRep.date() <= 10) dateRep.date(11);
									if (dateRep.date() >= 12 && dateRep.date() <= 20) dateRep.date(21);
									if (dateRep.date() >= 22 && dateRep.date() <= 31) dateRep.date(1).add(1, 'month');

									break;
								}
								case 'полугодовая': {
									var dateRep = (item.dateRep == null) ? moment().add(offsetTime, 'hours').startOf(period) : moment(item.dateRep).add(2, period);

									if (dateRep.quarter() == 2) dateRep.quarter(1);
									if (dateRep.quarter() == 4) dateRep.quarter(3);

									break;
								}
								default: {
									var dateRep = (item.dateRep == null) ? moment().add(offsetTime, 'hours').startOf(period) : moment(item.dateRep).add(1, period);

									// если пропускать период, смещаем дату 
									if (period == 'day') {
										// смещаем дату с учетом праздников и выходных  
										dateRep.add(diffHoliday(dateRep, dateRep), 'day');

										if (item.periodParam.skip && item.periodParam.skip.length) {
											var first = dateRep.clone().startOf('month');
											// смещаем дату с учетом праздников и выходных  
											first.add(diffHoliday(first, first), 'day');
											if (dateRep.format('YYYY-MM-DD') == first.format('YYYY-MM-DD')) {
												dateRep.add(1, period);
												// смещаем дату с учетом праздников и выходных  
												dateRep.add(diffHoliday(dateRep, dateRep), 'day');
											}
										}
									} else
										while (item.periodParam.skip && item.periodParam.skip.filter(el => dateRep.format('YYYY-MM-DD') == dateRep.format(el)).length)
											dateRep.add(1, period);
								}
							}

							var datePlan = dateRep.clone().add(item.periodParam.offset.kol, item.periodParam.offset.period).add(item.periodParam.days - 1, 'day');

							// смещаем дату с учетом праздников и выходных
							if (item.periodParam.holiday)
								datePlan.add(diffHoliday(dateRep.clone().add(item.periodParam.offset.kol, item.periodParam.offset.period), datePlan), 'day');

							// создаем новое поле с плановой датой отправки
							item['datePlan'] = datePlan.format('YYYY-MM-DD');
							// создаем новое поле с отчетной датой
							item['dateRep'] = dateRep.format('YYYY-MM-DD');

							return item;
						});

						forms.forEach(function (item) {
							var itemNew = Object.assign({}, item);
							var period = periods[itemNew.period];

							// если плановая дата уже прошла - создаем еще одну запись 
							while (itemNew.datePlan < moment().add(offsetTime, 'hours').format('YYYY-MM-DD')) {
								var itemNew = Object.assign({}, itemNew);

								switch (itemNew.period) {
									case 'декадная': {
										var dateRep = (itemNew.dateRep == null) ? moment().add(offsetTime, 'hours').startOf(period) : moment(itemNew.dateRep).add(1, period);

										if (dateRep.date() >= 2 && dateRep.date() <= 10) dateRep.date(11);
										if (dateRep.date() >= 12 && dateRep.date() <= 20) dateRep.date(21);
										if (dateRep.date() >= 22 && dateRep.date() <= 31) dateRep.date(1).add(1, 'month');

										break;
									}
									case 'полугодовая': {
										var dateRep = (itemNew.dateRep == null) ? moment().add(offsetTime, 'hours').startOf(period) : moment(itemNew.dateRep).add(2, period);

										if (dateRep.quarter() == 2) dateRep.quarter(1);
										if (dateRep.quarter() == 4) dateRep.quarter(3);

										break;
									}
									default: {
										var dateRep = (itemNew.dateRep == null) ? moment().add(offsetTime, 'hours').startOf(period) : moment(itemNew.dateRep).add(1, period);

										// если пропускать период, смещаем дату 
										if (period == 'day') {
											// смещаем дату с учетом праздников и выходных  
											dateRep.add(diffHoliday(dateRep, dateRep), 'day');

											if (itemNew.periodParam.skip && itemNew.periodParam.skip.length) {
												var first = dateRep.clone().startOf('month');
												// смещаем дату с учетом праздников и выходных  
												first.add(diffHoliday(first, first), 'day');
												if (dateRep.format('YYYY-MM-DD') == first.format('YYYY-MM-DD')) {
													dateRep.add(1, period);
													// смещаем дату с учетом праздников и выходных  
													dateRep.add(diffHoliday(dateRep, dateRep), 'day');
												}
											}
										} else
											while (itemNew.periodParam.skip && itemNew.periodParam.skip.filter(el => dateRep.format('YYYY-MM-DD') == dateRep.format(el)).length)
												dateRep.add(1, period);
									}
								}

								var datePlan = dateRep.clone().add(itemNew.periodParam.offset.kol, itemNew.periodParam.offset.period).add(itemNew.periodParam.days - 1, 'day');

								// смещаем дату с учетом праздников и выходных
								if (itemNew.periodParam.holiday)
									datePlan.add(diffHoliday(dateRep.clone().add(itemNew.periodParam.offset.kol, itemNew.periodParam.offset.period), datePlan), 'day');

								itemNew.datePlan = datePlan.format('YYYY-MM-DD');
								itemNew.dateRep = dateRep.format('YYYY-MM-DD');

								forms.push(itemNew);
							}
						});

						return forms;

						// сдвигаем дни с учетом праздников и выходных
						function diffHoliday(dBegin, dEnd) {
							var diff = holiday.reduce((holiday, el) => ((moment(el) <= dEnd) && (moment(el) >= dBegin)) ? holiday + 1 : holiday, 0);
							if (diff > 0)
								diff = diff + diffHoliday(dEnd.clone().add(1, 'day'), dEnd.clone().add(diff, 'day'))

							return diff;
						}
					})
					.catch(function (err) {
						console.log(err)
					});
			})
			.catch(function (err) {
				console.log(err)
			});
	}

	async function checkKvit() {
		// проверка входящих квитанций из БР РФ

		await system.db(`
		SELECT
			meta 
		FROM
			objects_meta 
		WHERE
			object = 120` // objects.id - Контроль отчетности
			)
			.then(async meta => {
				var dir = JSON.parse(meta[0].meta).dir;
				var items = fs.readdirSync(dir);
				for (var i = 0; i < items.length; i++) {
					if (!fs.statSync(path.join(dir, items[i])).isDirectory()) {
						if (items[i].substr(-8) == 'ies1.xml') {
							var file_text = fs.readFileSync(path.join(dir, items[i]));
							file_text = iconv.encode(iconv.decode(file_text, 'windows-1251'), 'utf8').toString();
							var doc = new xml().parseFromString(file_text, 'text/xml');

							var rec = {
								file: items[i],
								ies: 1,
								code: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('КодФормы'),
								period: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('Периодичность'),
								type: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('ВидОтчета'),
								dep: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('КодОрг'),
								dateRep: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('ОтчДата'),
								rezDate: moment(doc.getElementsByTagName('ИЭС1')[0].getAttribute('ДатаВремяКонтроля')).format('YYYY-MM-DD HH:mm:ss'),
								rezCode: doc.getElementsByTagName('ИЭС1')[0].getAttribute('КодРезКонтроля'),
								rezText: doc.getElementsByTagName('ИЭС1')[0].getAttribute('РезКонтроля'),
								errText: ''
							}
						}

						if (items[i].substr(-8) == 'ies2.xml') {
							var file_text = fs.readFileSync(path.join(dir, items[i]));
							file_text = iconv.encode(iconv.decode(file_text, 'windows-1251'), 'utf8').toString();
							var doc = new xml().parseFromString(file_text, 'text/xml');

							var rec = {
								file: items[i],
								ies: 2,
								code: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('КодФормы'),
								period: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('Периодичность'),
								type: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('ВидОтчета'),
								dep: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('КодОрг'),
								dateRep: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('ОтчДата'),
								rezDate: moment(doc.getElementsByTagName('ДанныеОЭС')[0].getAttribute('ДатаВремяКонтроля')).format('YYYY-MM-DD HH:mm:ss'),
								rezCode: doc.getElementsByTagName('ДанныеОЭС')[0].getAttribute('КодРезКонтроля'),
								rezText: doc.getElementsByTagName('ДанныеОЭС')[0].getAttribute('РезКонтроля'),
								errText: ''
							}
						}

						// считываем текст ошибки при их наличии
						if (rec && rec.rezCode == 2)
							for (var j = 0; j < doc.getElementsByTagName('ПротоколКонтроля')[0].childNodes.length; j++)
								rec.errText = rec.errText + doc.getElementsByTagName('ПротоколКонтроля')[0].childNodes[j].childNodes[0].nodeValue;

						if (items[i].substr(-5) == '.kvt1') {
							var file_text = fs.readFileSync(path.join(dir, items[i]));
							file_text = iconv.encode(iconv.decode(file_text, 'ibm866'), 'utf8').toString();

							if ((/^Тип ИЭС: ИЭС(\d)[\s\S]*Дата регистрации: ([\s\S]*?)\r\n[\s\S]*Код формы по ОКУД: ([\s\S]*?)\r\n[\s\S]*Тип отчета: ([\s\S]*?)\r\n[\s\S]*Рег. номер КО: ([\s\S]*?)\r\n[\s\S]*Отчетная дата: ([\s\S]*?)\r\n[\s\S]*(?:Результат|Результат контроля): ([\s\S]*?)\r\n/).test(file_text)) {
								var rec = {
									file: items[i],
									ies: RegExp.$1,
									rezDate: RegExp.$2,
									code: RegExp.$3,
									period: null,
									type: RegExp.$4,
									dep: RegExp.$5,
									dateRep: RegExp.$6,
									rezCode: null,
									rezText: RegExp.$7
								}
								rec.rezDate = moment(rec.date, 'YYYYMMDDHHmmss').format('YYYY-MM-DD HH:mm:ss');
								rec.dateRep = moment(rec.dateRep, 'YYYYMMDD').format('YYYY-MM-DD');
								if (!isNaN(rec.rezText.substr(0, 1))) {
									rec.rezCode = rec.rezText.substr(0, 1);
									rec.rezText = rec.rezText.substr(4)
								}
							}
						}

						// создаем запись в журнале отправки
						if (rec)
							await addKvit(dir, rec);

						if (items[i].substr(0, 5) == 'TKvit') fs.unlinkSync(path.join(dir, items[i]));
					}
				}

				function addKvit(dir, rec) {
					var nowDate = moment().add(offsetTime, 'hours').format('YYYY-MM-DD HH:mm:ss')
					// создаем запись в журнале отправки
					db(`REPLACE INTO logSend VALUES ('${nowDate}','${rec.file}',${rec.ies},'${rec.code}',${rec.period ? "'"+rec.period+"'" : null},'${rec.type}','${rec.dep}','${rec.dateRep}','${rec.rezDate}',${rec.rezCode},'${rec.rezText}')`)
						// оповещение об ошибке
						.then(() => {
							if (rec.rezCode == 2) {
								db(`SELECT * 
							FROM forms 
							WHERE 
								code='${rec.code}' 
								${rec.period ? "and period='"+rec.period+"'" : ""}
								and (type='${rec.type}' or type='' or type is NULL)
								and (dep='${rec.dep}' or dep='' or dep is NULL)`)
									.then(function (form) {
										if (form && form.length) {
											form[0]['file'] = rec.file;
											form[0]['dateRep'] = rec.dateRep;
											form[0]['rezText'] = rec.rezText;
											form[0]['errText'] = rec.errText;
											sendMessage('error', 'control1', form, true, true);
										}
									})
							}
						})
						// перемещаем файл в архив
						.then(() => {
							//если файл еще не перемещен в архив (параллельно запущенным процессом), перемещаем
							if (fs.existsSync(path.join(dir, rec.file)))
								fs.renameSync(path.join(dir, rec.file), path.join(dir, 'ARC', rec.file))
						})
						.catch((err) => console.log(err))
				}
			});
	}

	function sendMessage(type, control, forms, mail, sms) {
		db(`SELECT * FROM users ORDER BY name`)
			.then(users => {
				forms.map(el => {
					if (type == 'now')
						var subject = 'Сегодня срок сдачи формы отчетности ' + el.code + ' на ' + moment(el.dateRep).format('DD.MM.YYYY');

					if (type == 'expired')
						var subject = 'Не отправлена форма отчетности ' + el.code + ' на ' + moment(el.dateRep).format('DD.MM.YYYY');

					if (type == 'error')
						var subject = 'Получена квитанция с ошибкой по форме отчетности ' + el.code + ' на ' + moment(el.dateRep).format('DD.MM.YYYY');

					if (mail) {
						// формируем сообщение        
						var text = fs.readFileSync(path.join('tasks', 'templates', (type == 'error') ? 'Контроль отчетности (квитанция с ошибкой).html' : 'Контроль отчетности.html')).toString();
						text = text.replace('%CODE%', el.code);
						text = text.replace('%NAME%', el.name);
						text = text.replace('%PERIOD%', el.period);
						text = text.replace('%TYPE%', el.type);
						text = text.replace('%DEP%', el.dep);
						text = text.replace('%DATEPLAN%', el.datePlan ? el.datePlan.split("-").reverse().join(".") : '');
						text = text.replace('%DATEREP%', el.dateRep ? el.dateRep.split("-").reverse().join(".") : '');
						text = text.replace('%CONTROL%', el['control1'].name.join(", "));
						text = text.replace('%FILENAME%', el.file);
						text = text.replace('%REZTEXT%', el.rezText);
						text = text.replace('%ERRTEXT%', el.errText);

						var messageMail = {
							from: `Synapse <synapse@${os.hostname().toLowerCase()}>`,
							//           to:      el[control].name.map(user => user + ' <'+users.filter(item => item.name == user)[0].email+'>').join(';'), 
							cc: "Хмелев Дмитрий Сергеевич <dkhmelev@mfk-bank.ru>",
							subject: subject,
							attachment: [{
								data: text,
								alternative: true
							}]
						};

						var server = email.server.connect({
							host: "KR-EX-03.ifcbank.loc",
							port: 25,
							timeout: 300000
						});
						//      var server = email.server.connect(system.config.mail);

						// создаем запись в журнале оповещений
						db(`INSERT INTO logAlert VALUES ('${moment().add(offsetTime,'hours').format('YYYY-MM-DD HH:mm:ss')}', 'email', '${messageMail.to ? messageMail.to : ''}', '${messageMail.subject}', null)`)
							.then(function (row) {
								// отправка сообщения
								server.send(messageMail, function (err) {
									if (err) {
										console.error(err);
										db(`UPDATE logAlert SET result='{"status":"ERROR","status_text":${err}}' WHERE rowid=${row}`)
											.catch(function (err) {
												console.log(err)
											});
									} else
										db(`UPDATE logAlert SET result='{"status":"OK"}' WHERE rowid=${row}`)
										.catch(function (err) {
											console.log(err)
										});
								});
							})
							.catch(function (err) {
								console.log(err)
							});
					}

					if (sms) {
						// формируем сообщение  
						var messageSMS = {
							to: el[control].name.map(user => users.filter(item => item.name == user)[0].phone).join(','),
							msg: encodeURI(`Не отправлена ${el.code} на ${moment(el.dateRep).format('DD.MM.YYYY')} ${el.control1.name.map(item => item.split(" ")[0]).join(",")}`),
							test: 1,
							json: 1
						};

						var url = `https://sms.ru/sms/send?api_id=97D1B477-4ADB-E5D0-F4D4-C91FACFB3A5D`;

						for (var key in messageSMS)
							url = `${url}&${key}=${messageSMS[key]}`

						// создаем запись в журнале оповещений
						db(`INSERT INTO logAlert VALUES ('${moment().add(offsetTime,'hours').format('YYYY-MM-DD HH:mm:ss')}', 'sms', '${messageSMS.to ? messageSMS.to : ''}', '${messageSMS.msg ? decodeURI(messageSMS.msg) : ''}', null)`)
							.then(function (row) {
								// отправка сообщения
								request.post({
										url: url,
										proxy: `http://kr-prx-01.ifcbank.loc:3128`
									},
									function (err, res, body) {
										if (err) {
											console.error(err);
											db(`UPDATE logAlert SET result='{"status":"ERROR","status_text":${errSend}}' WHERE rowid=${row}`)
												.catch(function (err) {
													console.log(err)
												});
										} else {
											db(`UPDATE logAlert SET result='${JSON.stringify(JSON.parse(body))}' WHERE rowid=${row}`)
												.catch(function (err) {
													console.log(err)
												});
										}
									})
							})
							.catch(function (err) {
								console.log(err)
							});
					}
				})
			})
			.catch(function (err) {
				console.log(err)
			});
	}

	function deleteJob(cron_id) {
		// убираем задачу из списка
		if (cron_id in crons) {
			crons[cron_id].stop();
			delete crons[cron_id]
		}
	}

	async function addJob(form) {
		// добавляем задачу в расписание

		try {
			['control1', 'control2', 'control3'].map(control => {
				if (form[control].shedule) {
					var shedule = moment(form[control].shedule, 'HH:mm').format('mm HH-22 * * *');
					// если данные не изменились, ничего не делаем
					if (!(crons[form.id + control] && crons[form.id + control].cronTime.source == shedule)) {
						// удаляем старое задание
						if (crons[form.id + control])
							deleteJob(form.id + control);
						/*
											crons[form.id+control] = new cronJob({
												cronTime: shedule,
												onTick: function(){
													db(`SELECT date FROM holiday ORDER BY date DESC`)
													.then(res => res.map(item => item.date))
													.then(holiday => {   
														// не выполняем оповещение в выходные и праздничные дни
														if(holiday.indexOf(moment().add(offsetTime,'hours').format('YYYY-MM-DD')) == -1)         
															getForms(form.id, true)
															.then( forms => sendMessage('expired', control, forms.filter(el => el.datePlan <= moment().add(offsetTime,'hours').startOf('day').format('YYYY-MM-DD')), true, true) )  
													})
												},
												start: true,
												timeZone: 'Europe/Moscow'
											});
						*/
					}
				} else {
					deleteJob(form.id + control);
				}
			})
		} catch (err) {
			console.log(err.message);
		}
	}

	return router
}
=======
 	os = require('os'),
	fs = require('fs'),
  path = require('path'),
  iconv = require('iconv-lite'), //кодировка 
  xml = require('xmldom').DOMParser,
	express = require('express'),
	router = express.Router({strict:true}),
	bodyParser = require('body-parser'),
 	cronJob = require('cron').CronJob,
	request = require('request'),
  email = require("emailjs/email");

/////////////////////////////////////////////////////////////////////////

module.exports=function(system){ 

var offsetTime = -4; // смещение времени по Мск
var crons = {}; //ассоциативный массив (ключ-значение). id : handle
//где id соответствует forms.id , а handle - объект cron.schedule

var db = require('../sqlite')('tasks/db/Контроль отчетности.db'); 
if (typeof db === 'undefined') {
	res.json({error:'Отсутствует база данных!!!'});
	return;
}
/*
// по всем формам, срок сдачи которых приходится на сегодня, система направляет сообщение Исполнителям 1-го уровня контроля. 
crons['now'] = new cronJob({
  cronTime: '00 09 * * *',
  onTick: function(){
    db(`SELECT date FROM holiday ORDER BY date DESC`)
    .then(res => res.map(item => item.date))
    .then(holiday => {   
      // не выполняем оповещение в выходные и праздничные дни
      if(holiday.indexOf(moment().add(offsetTime,'hours').format('YYYY-MM-DD')) == -1)         
        getForms(null, true)
        .then( forms => sendMessage('now', 'control1', forms.filter(el => el.datePlan == moment().add(offsetTime,'hours').startOf('day').format('YYYY-MM-DD')), true, false) )
    })
  },
  start: true,
  timeZone: 'Europe/Moscow'
});
*/
router.route('/forms')
.get(function(req, res){
//получение списка форм или записей указанной таблицы

  if ('crons' in req.query) {
    var jobs = [];
    for(var job in crons)
      jobs.push({id:job.split('control')[0], control:'control'+job.split('control')[1], shedule:crons[job].cronTime.source})

    return res.json(jobs);
}
  if ('holiday' in req.query) 
    return db(`SELECT date FROM holiday ORDER BY date DESC`)
    .then(result => res.json(result))
    .catch(err => system.errorHandler(err, req, res));

  if ('send' in req.query) 
    return db(`SELECT logSend.* FROM logSend ${req.query.send ? ", forms WHERE logSend.code = forms.code and (logSend.period=forms.period or logSend.period is NULL) and (logSend.type=forms.type or forms.type is NULL or forms.type='') and (logSend.dep=forms.dep or forms.dep is NULL or forms.dep='') and logSend.ies=1 and (logSend.rezCode!=2 or logSend.rezCode is NULL) and forms.id = "+req.query.send : ""}`)
    .then(result => res.json(result))
    .catch(err => system.errorHandler(err, req, res));

  if ('edit' in req.query) 
    return db(`SELECT * FROM logEdit ${req.query.edit ? 'WHERE tableName=\'forms\' and record like \'{"id":'+req.query.edit+'%\'' : ''}`)
    .then(result => res.json(result))
    .catch(err => system.errorHandler(err, req, res));

  if ('alert' in req.query) 
    return db(`SELECT * FROM logAlert`)
    .then(result => res.json(result))
    .catch(err => system.errorHandler(err, req, res));

  if ('user' in req.query) 
    return db(`SELECT * FROM users ORDER BY name`)
    .then(result => res.json(result))
    .catch(err => system.errorHandler(err, req, res));

  return getForms(null, ('check' in req.query) ? true : false)
  .then(async forms => {
    // добавляем задачу в расписание
    await forms.filter((el, idx, self) => self.map(el => el.id).indexOf(el.id) == idx).map(el => addJob(el));  

    return res.json(forms);
  })
  .catch(function(err){console.log(err)});
})

.put(bodyParser.json(), function(req, res){
// операция редактирования указанной записи

  if ('holiday' in req.query) { 
    db(`DELETE FROM holiday`)
    .then(function() {
      return db(`INSERT INTO holiday VALUES ${"('" + req.body.holiday.join("'),('") + "')"}`)
      .then(result => res.json({result}))
      .catch(err => system.errorHandler(err, req, res))
    })
    .catch(err => system.errorHandler(err, req, res))
  }

  if ('user' in req.query) { 
    var userOld={id: null, name: null, email: null, phone: null};
    if(req.body.id)
      db(`SELECT * FROM users WHERE id=${req.body.id}`)
      .then(result => result.length ? userOld = result[0] : 1)
      .catch(err => system.errorHandler(err, req, res))

    return db(`REPLACE INTO users VALUES (${req.body.id}, '${req.body.name}', '${req.body.email}', '${req.body.phone}')`)
    .then(result => {
      addLog((req.ntlm.DomainName == 'IFCBANK' ? req.ntlm.UserName : req.ntlm.DomainName + "\\" + req.ntlm.UserName), 'users', {id: result, name: req.body.name}, req.body, userOld);
      return res.json({result});
    })
    .catch(err => system.errorHandler(err, req, res))
  }

  var formOld = {id: null, code: null, type: null, dep: null, name: null, period: null, periodParam: null , control1: null, control2: null, control3: null};
  db(`SELECT * FROM forms WHERE id=${req.body.id}`)
  .then(result => result.length ? formOld = result[0] : 1)
  .catch(err => system.errorHandler(err, req, res))

  return db(`REPLACE INTO forms VALUES (${req.body.id}, '${req.body.code}', '${req.body.type}', '${req.body.dep}', '${req.body.name}', '${req.body.period}', '${req.body.periodParam}', '${req.body.control1}', '${req.body.control2}', '${req.body.control3}')`)
  .then(result => {
    addLog((req.ntlm.DomainName == 'IFCBANK' ? req.ntlm.UserName : req.ntlm.DomainName + "\\" + req.ntlm.UserName), 'forms', {id: result, name: req.body.code}, req.body, formOld);
    return res.json({result});
  })
  .catch(err => system.errorHandler(err, req, res))
})

.delete(bodyParser.json(), function(req, res){
// операция удаления указанной записи
  if ('user' in req.query) { 
    var userOld={id: null, name: null, email: null, phone: null};
    db(`SELECT * FROM users WHERE id=${req.body.id}`)
    .then(result => result.length ? userOld = result[0] : 1)
    .catch(err => system.errorHandler(err, req, res))

    return db(`UPDATE 
                      forms 
                    SET 
                      control1 = replace(replace(replace(control1, ',"${req.body.name}"', ''), '"${req.body.name}",', ''), '"${req.body.name}"', ''),
                      control2 = replace(replace(replace(control2, ',"${req.body.name}"', ''), '"${req.body.name}",', ''), '"${req.body.name}"', ''),
                      control3 = replace(replace(replace(control3, ',"${req.body.name}"', ''), '"${req.body.name}",', ''), '"${req.body.name}"', '') 
                    WHERE 
                      control1 LIKE '%${req.body.name}%'
                      or control2 LIKE '%${req.body.name}%'
                      or control3 LIKE '%${req.body.name}%'`)
    .then(function() {
      return db(`DELETE FROM users WHERE id=${req.body.id}`)
      .then(function(result) {
        addLog((req.ntlm.DomainName == 'IFCBANK' ? req.ntlm.UserName : req.ntlm.DomainName + "\\" + req.ntlm.UserName), 'users', {id: result, name: userOld.name}, {name: null, email: null, phone: null}, userOld);
        return res.json({result});
      })
      .catch(err => system.errorHandler(err, req, res))
    })
    .catch(err => system.errorHandler(err, req, res))
  }

  var formOld={id: null, code: null, type: null, dep: null, name: null, period: null, periodParam: null , control1: null, control2: null, control3: null};
  db(`SELECT * FROM forms WHERE id=${req.body.id}`)
  .then(result => result.length ? formOld = result[0] : 1)
  .catch(err => system.errorHandler(err, req, res))

  return db(`DELETE FROM forms WHERE id=${req.body.id}`)
  .then(result => {
    addLog((req.ntlm.DomainName == 'IFCBANK' ? req.ntlm.UserName : req.ntlm.DomainName + "\\" + req.ntlm.UserName), 'forms', {id: result, name: formOld.code}, {id: null, code: null, type: null, dep: null, name: null, period: null, periodParam: null , control1: null, control2: null, control3: null}, formOld);

    // удаляем задачу из расписания
    deleteJob(req.body.id+'control1');    
    deleteJob(req.body.id+'control2');
    deleteJob(req.body.id+'control3');  

    return res.json({result});
  })
  .catch(err => system.errorHandler(err, req, res))
})

function addLog(user, table, record, newVal, oldVal){
  var nowDate = moment().add(offsetTime,'hours').format('YYYY-MM-DD HH:mm:ss')
  if (oldVal.id)
    if (newVal.id) {
      // изменена запись
    	for (var key in oldVal) 
    		if (key != 'id' && oldVal[key] != newVal[key]) 
          db(`INSERT INTO logEdit VALUES ('${nowDate}', '${user}', '${table}', '${JSON.stringify(record)}', '${key}', ${newVal[key] == null ? null : "'" + newVal[key] + "'"}, ${oldVal[key] == null ? null : "'" + oldVal[key] + "'"})`)
          .catch(function(err){console.log(err)});
    }
    else
      // удалена запись
      db(`INSERT INTO logEdit VALUES ('${nowDate}', '${user}', '${table}', '${JSON.stringify(record)}', '*удаление*', null, '${JSON.stringify(oldVal)}')`)
      .catch(function(err){console.log(err)});
  else
    // добавлена запись
    db(`INSERT INTO logEdit VALUES ('${nowDate}', '${user}', '${table}', '${JSON.stringify(record)}', '*добавление*', '${JSON.stringify(newVal)}', null)`)
    .catch(function(err){console.log(err)});
}

async function getForms(form_id, check){
  return db(`SELECT date FROM holiday ORDER BY date DESC`)
	.then(res => res.map(item => item.date))
	.then(async holiday => {
    if (check)
    	await checkKvit();	

    return db(`SELECT 
                  *,
                  ( SELECT MAX(dateRep) 
                    FROM logSend 
                    WHERE 
                      code=forms.code 
                      and (period=forms.period or period is NULL) 
                      and (type=forms.type or forms.type is NULL or forms.type='') 
                      and (dep=forms.dep or forms.dep is NULL or forms.dep='') 
                      and ies=1 
                      and (rezCode!=2 or rezCode is NULL) 
                  ) as dateRep
                FROM 
                  forms
                ${form_id ? 'WHERE id='+form_id : ''}`)
    .then(forms => {
      var periods = {
        'нерегулярная': 'day' ,
        'суточная':     'day',    
        'декадная':     'day',     
        'месячная':     'month',   
        'квартальная':  'quarter',
        'полугодовая':  'quarter', 
        'годовая':      'year'    
      };

    	forms = forms.map(function(item){
        item.control1 = item.control1 ? JSON.parse(item.control1) : {name:[], shedule:null};
        item.control2 = item.control2 ? JSON.parse(item.control2) : {name:[], shedule:null};
        item.control3 = item.control3 ? JSON.parse(item.control3) : {name:[], shedule:null};
        item.periodParam = item.periodParam ? JSON.parse(item.periodParam) : { days: 1, holiday: false, offset: {kol:0, period:'day'}, skip:[] };
        var period = periods[item.period];
        
        switch (item.period) {
          case 'декадная': {
            var dateRep = (item.dateRep == null) ? moment().add(offsetTime,'hours').startOf(period) : moment(item.dateRep).add(1, period);
    
            if (dateRep.date() >= 2 && dateRep.date() <= 10) dateRep.date(11); 
            if (dateRep.date() >= 12 && dateRep.date() <= 20) dateRep.date(21); 
            if (dateRep.date() >= 22 && dateRep.date() <= 31) dateRep.date(1).add(1, 'month'); 
            
            break;
          }
          case 'полугодовая': {
            var dateRep = (item.dateRep == null) ? moment().add(offsetTime,'hours').startOf(period) : moment(item.dateRep).add(2, period);
    
            if (dateRep.quarter() == 2) dateRep.quarter(1); 
            if (dateRep.quarter() == 4) dateRep.quarter(3); 
            
            break;
          }
          default: {
            var dateRep = (item.dateRep == null) ? moment().add(offsetTime,'hours').startOf(period) : moment(item.dateRep).add(1, period);
  
            // если пропускать период, смещаем дату 
            if (period == 'day') {
              // смещаем дату с учетом праздников и выходных  
              dateRep.add(diffHoliday(dateRep,dateRep),'day');
  
              if (item.periodParam.skip && item.periodParam.skip.length) {
                var first = dateRep.clone().startOf('month');
                // смещаем дату с учетом праздников и выходных  
                first.add(diffHoliday(first,first),'day');
                if (dateRep.format('YYYY-MM-DD') == first.format('YYYY-MM-DD')) {
                  dateRep.add(1,period);
                  // смещаем дату с учетом праздников и выходных  
                  dateRep.add(diffHoliday(dateRep,dateRep),'day');
                }
              }
            }
            else
              while (item.periodParam.skip && item.periodParam.skip.filter(el => dateRep.format('YYYY-MM-DD')==dateRep.format(el)).length) 
                dateRep.add(1,period);
          }
        } 

        var datePlan = dateRep.clone().add(item.periodParam.offset.kol, item.periodParam.offset.period).add(item.periodParam.days-1, 'day');

        // смещаем дату с учетом праздников и выходных
        if (item.periodParam.holiday) 
          datePlan.add(diffHoliday(dateRep.clone().add(item.periodParam.offset.kol, item.periodParam.offset.period),datePlan),'day');
 
        // создаем новое поле с плановой датой отправки
        item['datePlan'] = datePlan.format('YYYY-MM-DD');
        // создаем новое поле с отчетной датой
        item['dateRep'] = dateRep.format('YYYY-MM-DD');

        return item;
      });

      forms.forEach(function(item){
        var itemNew = Object.assign({}, item);
        var period = periods[itemNew.period];
  
        // если плановая дата уже прошла - создаем еще одну запись 
        while (itemNew.datePlan < moment().add(offsetTime,'hours').format('YYYY-MM-DD')){
          var itemNew = Object.assign({}, itemNew);

          switch (itemNew.period) {
            case 'декадная': {
              var dateRep = (itemNew.dateRep == null) ? moment().add(offsetTime,'hours').startOf(period) : moment(itemNew.dateRep).add(1, period);
      
              if (dateRep.date() >= 2 && dateRep.date() <= 10) dateRep.date(11); 
              if (dateRep.date() >= 12 && dateRep.date() <= 20) dateRep.date(21); 
              if (dateRep.date() >= 22 && dateRep.date() <= 31) dateRep.date(1).add(1, 'month'); 
              
              break;
            }
            case 'полугодовая': {
              var dateRep = (itemNew.dateRep == null) ? moment().add(offsetTime,'hours').startOf(period) : moment(itemNew.dateRep).add(2, period);
      
              if (dateRep.quarter() == 2) dateRep.quarter(1); 
              if (dateRep.quarter() == 4) dateRep.quarter(3); 
              
              break;
            }
            default: {
              var dateRep = (itemNew.dateRep == null) ? moment().add(offsetTime,'hours').startOf(period) : moment(itemNew.dateRep).add(1, period);
    
              // если пропускать период, смещаем дату 
              if (period == 'day') {
                // смещаем дату с учетом праздников и выходных  
                dateRep.add(diffHoliday(dateRep,dateRep),'day');
    
                if (itemNew.periodParam.skip && itemNew.periodParam.skip.length) {
                  var first = dateRep.clone().startOf('month');
                  // смещаем дату с учетом праздников и выходных  
                  first.add(diffHoliday(first,first),'day');
                  if (dateRep.format('YYYY-MM-DD') == first.format('YYYY-MM-DD')) {
                    dateRep.add(1,period);
                    // смещаем дату с учетом праздников и выходных  
                    dateRep.add(diffHoliday(dateRep,dateRep),'day');
                  }
                }
              }
              else
                while (itemNew.periodParam.skip && itemNew.periodParam.skip.filter(el => dateRep.format('YYYY-MM-DD')==dateRep.format(el)).length) 
                  dateRep.add(1,period);
            }
          } 
  
          var datePlan = dateRep.clone().add(itemNew.periodParam.offset.kol, itemNew.periodParam.offset.period).add(itemNew.periodParam.days-1, 'day');
  
          // смещаем дату с учетом праздников и выходных
          if (itemNew.periodParam.holiday) 
            datePlan.add(diffHoliday(dateRep.clone().add(itemNew.periodParam.offset.kol, itemNew.periodParam.offset.period),datePlan),'day');
  
          itemNew.datePlan = datePlan.format('YYYY-MM-DD');
          itemNew.dateRep = dateRep.format('YYYY-MM-DD');
  
          forms.push(itemNew); 
        }
      });
    
      return forms;
  
      // сдвигаем дни с учетом праздников и выходных
    	function diffHoliday (dBegin, dEnd) {
        var diff = holiday.reduce((holiday, el) => ((moment(el) <= dEnd) && (moment(el) >= dBegin)) ? holiday+1 : holiday, 0);
        if (diff > 0) 
          diff = diff + diffHoliday(dEnd.clone().add(1,'day'),dEnd.clone().add(diff,'day'))
    
        return diff;
      }
    })
    .catch(function(err){console.log(err)});
  })
	.catch(function(err){console.log(err)});
}

async function checkKvit() {
// проверка входящих квитанций из БР РФ

  await system.db(`
  	SELECT
  		meta 
  	FROM
      objects_meta 
  	WHERE
      object = 120` // objects.id - Контроль отчетности
  )
  .then(async meta => {
    var dir = JSON.parse(meta[0].meta).dir;	
    var items = fs.readdirSync(dir);
    for(var i=0; i<items.length;i++){
      if(!fs.statSync(path.join(dir, items[i])).isDirectory()) {
        if(items[i].substr(-8) == 'ies1.xml') {
          var file_text = fs.readFileSync(path.join(dir,items[i]));
          file_text = iconv.encode(iconv.decode(file_text,'windows-1251'), 'utf8').toString();    
          var doc = new xml().parseFromString(file_text, 'text/xml');
  
          var rec = {
            file: items[i],
            ies: 1,
            code: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('КодФормы'),
            period: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('Периодичность'),
            type: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('ВидОтчета'), 
            dep: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('КодОрг'), 
            dateRep: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('ОтчДата'),
            rezDate: moment(doc.getElementsByTagName('ИЭС1')[0].getAttribute('ДатаВремяКонтроля')).format('YYYY-MM-DD HH:mm:ss'),
            rezCode: doc.getElementsByTagName('ИЭС1')[0].getAttribute('КодРезКонтроля'),
            rezText: doc.getElementsByTagName('ИЭС1')[0].getAttribute('РезКонтроля'),
            errText: ''
          }
        }
  
        if(items[i].substr(-8) == 'ies2.xml') {
          var file_text = fs.readFileSync(path.join(dir,items[i]));
          file_text = iconv.encode(iconv.decode(file_text,'windows-1251'), 'utf8').toString();    
          var doc = new xml().parseFromString(file_text, 'text/xml');
  
          var rec = {
            file: items[i],
            ies: 2,
            code: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('КодФормы'),
            period: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('Периодичность'),
            type: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('ВидОтчета'), 
            dep: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('КодОрг'), 
            dateRep: doc.getElementsByTagName('РеквОЭС')[0].getAttribute('ОтчДата'),
            rezDate: moment(doc.getElementsByTagName('ДанныеОЭС')[0].getAttribute('ДатаВремяКонтроля')).format('YYYY-MM-DD HH:mm:ss'),
            rezCode: doc.getElementsByTagName('ДанныеОЭС')[0].getAttribute('КодРезКонтроля'),
            rezText: doc.getElementsByTagName('ДанныеОЭС')[0].getAttribute('РезКонтроля'),
            errText: ''
          }
        }
  
        // считываем текст ошибки при их наличии
        if(rec && rec.rezCode == 2)
          for(var j=0; j<doc.getElementsByTagName('ПротоколКонтроля')[0].childNodes.length;j++)
            rec.errText = rec.errText + doc.getElementsByTagName('ПротоколКонтроля')[0].childNodes[j].childNodes[0].nodeValue;
  
        if(items[i].substr(-5) == '.kvt1') {
          var file_text = fs.readFileSync(path.join(dir,items[i]));
          file_text = iconv.encode(iconv.decode(file_text,'ibm866'), 'utf8').toString();    
  
          if((/^Тип ИЭС: ИЭС(\d)[\s\S]*Дата регистрации: ([\s\S]*?)\r\n[\s\S]*Код формы по ОКУД: ([\s\S]*?)\r\n[\s\S]*Тип отчета: ([\s\S]*?)\r\n[\s\S]*Рег. номер КО: ([\s\S]*?)\r\n[\s\S]*Отчетная дата: ([\s\S]*?)\r\n[\s\S]*(?:Результат|Результат контроля): ([\s\S]*?)\r\n/).test(file_text)) {
            var rec = {
              file: items[i],
              ies: RegExp.$1,
              rezDate: RegExp.$2,
              code: RegExp.$3,
              period: null,
              type: RegExp.$4, 
              dep: RegExp.$5, 
              dateRep: RegExp.$6,
              rezCode: null,
              rezText: RegExp.$7
            }
            rec.rezDate = moment(rec.date,'YYYYMMDDHHmmss').format('YYYY-MM-DD HH:mm:ss');
            rec.dateRep = moment(rec.dateRep,'YYYYMMDD').format('YYYY-MM-DD');
            if(!isNaN(rec.rezText.substr(0,1))) {
              rec.rezCode = rec.rezText.substr(0,1);
              rec.rezText = rec.rezText.substr(4)
            }
          }
        }
  
        // создаем запись в журнале отправки
        if(rec)
          await addKvit(dir,rec);
  
        if(items[i].substr(0,5) == 'TKvit') fs.unlinkSync(path.join(dir,items[i]));
      }
    }
  
    function addKvit(dir,rec){
      var nowDate = moment().add(offsetTime,'hours').format('YYYY-MM-DD HH:mm:ss')
      // создаем запись в журнале отправки
      db(`REPLACE INTO logSend VALUES ('${nowDate}','${rec.file}',${rec.ies},'${rec.code}',${rec.period ? "'"+rec.period+"'" : null},'${rec.type}','${rec.dep}','${rec.dateRep}','${rec.rezDate}',${rec.rezCode},'${rec.rezText}')`)
      // оповещение об ошибке
      .then(() => {
        if (rec.rezCode == 2) {
          db(`SELECT * 
              FROM forms 
              WHERE 
                code='${rec.code}' 
                ${rec.period ? "and period='"+rec.period+"'" : ""}
                and (type='${rec.type}' or type='' or type is NULL)
                and (dep='${rec.dep}' or dep='' or dep is NULL)`)
      	  .then(function(form){
            if (form && form.length) {
              form[0]['file'] = rec.file;
              form[0]['dateRep'] = rec.dateRep;
              form[0]['rezText'] = rec.rezText;
              form[0]['errText'] = rec.errText;
              sendMessage('error', 'control1', form, true, true);
            }
          })
        }
      })
      // перемещаем файл в архив
      .then(() => { 
        //если файл еще не перемещен в архив (параллельно запущенным процессом), перемещаем
        if(fs.existsSync(path.join(dir,rec.file))) 
          fs.renameSync(path.join(dir,rec.file), path.join(dir,'ARC',rec.file)) 
      })
      .catch((err)=> console.log(err)) 
    }
  });
}

function sendMessage(type, control, forms, mail, sms){
  db(`SELECT * FROM users ORDER BY name`)
  .then(users => {
    forms.map(el => {
      if (type == 'now') 
        var subject = 'Сегодня срок сдачи формы отчетности ' + el.code + ' на ' + moment(el.dateRep).format('DD.MM.YYYY');

      if (type == 'expired') 
        var subject = 'Не отправлена форма отчетности ' + el.code + ' на ' + moment(el.dateRep).format('DD.MM.YYYY');

      if (type == 'error') 
        var subject = 'Получена квитанция с ошибкой по форме отчетности ' + el.code + ' на ' + moment(el.dateRep).format('DD.MM.YYYY');
  
      if(mail) {
        // формируем сообщение        
        var text = fs.readFileSync(path.join('tasks','templates',(type == 'error') ? 'Контроль отчетности (квитанция с ошибкой).html' : 'Контроль отчетности.html')).toString();
        text = text.replace('%CODE%',el.code);
        text = text.replace('%NAME%',el.name);
        text = text.replace('%PERIOD%',el.period);
        text = text.replace('%TYPE%',el.type);
        text = text.replace('%DEP%',el.dep);
        text = text.replace('%DATEPLAN%',el.datePlan ? el.datePlan.split("-").reverse().join(".") : '');
        text = text.replace('%DATEREP%',el.dateRep ? el.dateRep.split("-").reverse().join(".") : '');
        text = text.replace('%CONTROL%',el['control1'].name.join(", "));
        text = text.replace('%FILENAME%',el.file);
        text = text.replace('%REZTEXT%',el.rezText);
        text = text.replace('%ERRTEXT%',el.errText);
  
        var messageMail = {
           from:    `Synapse <synapse@${os.hostname().toLowerCase()}>`,
//           to:      el[control].name.map(user => user + ' <'+users.filter(item => item.name == user)[0].email+'>').join(';'), 
           cc:      "Хмелев Дмитрий Сергеевич <dkhmelev@mfk-bank.ru>",
           subject: subject,
           attachment: [ {data: text, alternative: true} ]
        };

        var server = email.server.connect({host: "KR-EX-03.ifcbank.loc", port: 25, timeout:300000});
  //      var server = email.server.connect(system.config.mail);
  
        // создаем запись в журнале оповещений
        db(`INSERT INTO logAlert VALUES ('${moment().add(offsetTime,'hours').format('YYYY-MM-DD HH:mm:ss')}', 'email', '${messageMail.to ? messageMail.to : ''}', '${messageMail.subject}', null)`)
        .then(function(row) {
          // отправка сообщения
          server.send(messageMail, function(err) { 
            if(err) { 
              console.error(err); 
              db(`UPDATE logAlert SET result='{"status":"ERROR","status_text":${err}}' WHERE rowid=${row}`)
          		.catch(function(err){console.log(err)});
            } 
            else
              db(`UPDATE logAlert SET result='{"status":"OK"}' WHERE rowid=${row}`)
          		.catch(function(err){console.log(err)});
          });
        })
     	 .catch(function(err){console.log(err)});
      }
  
      if(sms) {
        // формируем сообщение  
        var messageSMS = {
          to: el[control].name.map(user => users.filter(item => item.name == user)[0].phone).join(','),
          msg: encodeURI(`Не отправлена ${el.code} на ${moment(el.dateRep).format('DD.MM.YYYY')} ${el.control1.name.map(item => item.split(" ")[0]).join(",")}`),
          test: 1,
          json: 1
        };

        var url = `https://sms.ru/sms/send?api_id=97D1B477-4ADB-E5D0-F4D4-C91FACFB3A5D`; 

        for(var key in messageSMS) 
          url = `${url}&${key}=${messageSMS[key]}`

        // создаем запись в журнале оповещений
        db(`INSERT INTO logAlert VALUES ('${moment().add(offsetTime,'hours').format('YYYY-MM-DD HH:mm:ss')}', 'sms', '${messageSMS.to ? messageSMS.to : ''}', '${messageSMS.msg ? decodeURI(messageSMS.msg) : ''}', null)`)
        .then(function(row) {
          // отправка сообщения
          request.post({url: url, proxy: `http://kr-prx-01.ifcbank.loc:3128`}, 
            function (err, res, body) {
              if(err) { 
                console.error(err); 
                db(`UPDATE logAlert SET result='{"status":"ERROR","status_text":${errSend}}' WHERE rowid=${row}`)
            		.catch(function(err){console.log(err)});
              } 
              else {
                db(`UPDATE logAlert SET result='${JSON.stringify(JSON.parse(body))}' WHERE rowid=${row}`)
            		.catch(function(err){console.log(err)});
              }
          })
        })
     	 .catch(function(err){console.log(err)});
      }
    })
  })
  .catch(function(err){console.log(err)});
}

function deleteJob(cron_id){
// убираем задачу из списка
  if (cron_id in crons){
		crons[cron_id].stop();
		delete crons[cron_id]
	}
}

async function addJob(form){
// добавляем задачу в расписание

	try {
    ['control1','control2','control3'].map(control => {
      if (form[control].shedule) {
        var shedule = moment(form[control].shedule,'HH:mm').format('mm HH-22 * * *');
        // если данные не изменились, ничего не делаем
        if (!(crons[form.id+control] && crons[form.id+control].cronTime.source == shedule)) {
          // удаляем старое задание
          if (crons[form.id+control])
            deleteJob(form.id+control);
/*
    		  crons[form.id+control] = new cronJob({
            cronTime: shedule,
            onTick: function(){
              db(`SELECT date FROM holiday ORDER BY date DESC`)
            	.then(res => res.map(item => item.date))
            	.then(holiday => {   
                // не выполняем оповещение в выходные и праздничные дни
                if(holiday.indexOf(moment().add(offsetTime,'hours').format('YYYY-MM-DD')) == -1)         
                  getForms(form.id, true)
                  .then( forms => sendMessage('expired', control, forms.filter(el => el.datePlan <= moment().add(offsetTime,'hours').startOf('day').format('YYYY-MM-DD')), true, true) )  
              })
            },
            start: true,
            timeZone: 'Europe/Moscow'
          });
*/
        }
      }
      else {
        deleteJob(form.id+control);
      }
    })
	} 
  catch (err){
		console.log(err.message);
	}
}

  return router
}


>>>>>>> update fix
