'use strict'

/*
  Запуск задач по расписанию
  TODO: проверка прав админа
*/

const bodyParser = require('body-parser')
const CronJob = require('cron').CronJob
const email = require('emailjs/email')
const util = require('util')
const path = require('path')
const os  = require('os')
const moment = require('moment')
const parser = require('cron-parser')
const fsp = require('../fsp')

var crons = {} // ассоциативный массив (ключ-значение). id : handle //где id соответствует job.id , а handle - объект cron.schedule

module.exports = function (system) {
// -
	let config = system.config
	const launcher = require('../launcher.js')(config)
	const folder = require('../user-folders.js')(config.path.users, config.tasks.history)
	const mail = email.server.connect(system.config.mail)

	mail.sendp = util.promisify(mail.send)

	function destroy (job) {
		if (job.id in crons) {
		// 	crons[job.id].destroy();
			stop(job)
			delete crons[job.id]
		}
	}

	function start (job) {
		if (job.id in crons) crons[job.id].start()
	}

	function stop (job) {
		if (job.id in crons) crons[job.id].stop()
	}

	function task (job) {
		function success (taskPath, stdout) {
			if (!job.params.pp) return

			// печать на указанный принтер (пока Windows-only)
			if (job.params.pp.print) {
				launcher.exec('cscript',
					['/nologo', './core/winprint.js', taskPath, job.params.pp.print],
					{
						log: false, // не логируем процесс стандартным методом
						cp866: true
					},
					function (data) {}, // но можно, при желании, отловить вывод здесь
					function (code) {}
				)
			}

			// рассылка получателям
			if (job.params.pp.email.length) {
				var to = job.params.pp.email.join(',')
				if (to.length) {
					fsp.ls(taskPath)
						.then(items => items.filter(item => !item.folder).map(file => file.name))
						.then(files => {
							if (files) {
								return mail.sendp({
									from: `Synapse <synapse@${os.hostname().toLowerCase()}`,
									to: to,
									subject: job.description || job.name,
									//  text:    stdout || ' ',
									attachment: files.map(name => ({
										path: path.join(taskPath, name),
										type: 'text/html',
										name: name
									})
									).concat([{ data: '<html><pre>' + stdout + '</pre></html>', alternative: true }])
								})
							}
						})
						.catch(err =>
							console.log('[jobs] error trying email job results: ' + err.message + ' ' + util.inspect({ id: job.id, task: job.task, name: job.name }))
						)
				}
			}	// job.params.pp.email.length
		} // function success

		function error (stdout) {
			system.users('Администраторы')
				.then(data => data.map((el) => el.email))
				.then(emails =>
					mail.sendp({
						from: `Synapse <synapse@${os.hostname().toLowerCase()}`,
						to: emails.join(','),
						subject: job.description || job.name,
						attachment: [{ data: '<html><pre>' + stdout + '</pre></html>', alternative: true }]
					})
				)
				.catch(err => console.log(err.stack))
		}

		return function () {
			var stdout = ''
			var argv = Object.assign({}, job.params.argv)
			var _eval = ''
			for (var key in argv) {
				try	{
					_eval = eval(argv[key]) // eslint-disable-line
					argv[key] = _eval
				} catch (err) {
					// console.log(err)
				}
			}
			return folder('cron')
				.then(taskPath =>
					launcher.task(
						Object.assign({
							task: {
								name: job.name,
								class: job.class,
								id: job.task,
								path: taskPath
							}
						}, argv),
						function (data) {
							stdout += data
						},
						function (code) {
							system.db('UPDATE jobs SET last = ?, code = ? WHERE id = ?',
								[moment().format('YYYY-MM-DD HH:mm'), code, job.id]
							)
							if (code === 0)	success(taskPath, stdout)
							if (code === 1)	error(stdout)
						}
					) // execute
				)
		}// scheduled function
	} // task(job)

	function schedule (job) {
		// повесить job на расписание
		try {
			// handle инициализируется в объект с методами .start() .stop()
			var handle = new CronJob(job.schedule, task(job), function () {}, Boolean(job.enabled))
			crons[job.id] = handle // ассоциируем handle с id
		} catch (err) {
			console.log('job.schedule: ' + err.message)
			job.error = err.message // улетит клиенту с ответом
		}
	}

	function updateStatement (tableName, obj, _key = 'id') {
		// построить конструкцию SQL UPDATE на основании пар ключ-значений объекта <obj>
		if (!(_key in obj)) return null
		var keys = Object.keys(obj)
		keys.splice(keys.indexOf(_key), 1)
		if (keys.length === 0) return null

		return {
			sql: 'update ' + tableName + ' set ' + keys.join('=?,') + '=? where ' + _key + '=?',
			params: keys.concat([_key]).map((el) => obj[el])
		}
	}

	function dbop (job, type) {
		// весь набор необходимых операций с базой в одной функции
		// передаем job и что с ним делать (type)
		// на выходе - промис
		var stt = ''
		var _job = Object.assign({}, job)
		if ('params' in _job)  _job.params = JSON.stringify(_job.params)
		if (!_job.id) _job.params = '{"argv":{},"pp":{"email":[""],"print":""}}'

		switch (type) {
		case 'sel': // загрузить все jobs=[{job},{job}..] или.. загрузить указанный job по id
			stt = (job.id ? 'and j.id=?' : '')
			return system.db(
				'SELECT j.id, j.task, o.name, o.class, j.params, j.code, j.last, j.schedule, j.description, j.enabled ' +
				'FROM jobs j, objects o ' +
				'WHERE j.task = o.id ' + stt,
				[job.id]
			)
				.then(select => {
					select.forEach(job => {
						try {
							var interval = parser.parseExpression(job.schedule)
							if (job.enabled) job.next = moment(new Date(interval.next().toString())).format('YYYY-MM-DD HH:mm')
							job.params = JSON.parse(job.params)
						} catch (err) {
							console.log('error parsing job.params at job.id=' + job.id + ' ' + err.message)
						}
					})
					if (job.id) return select[0]
					return select
				})
		case 'ins':
			return system.db(
				'INSERT INTO jobs VALUES (null, ?, ?, ?, 0, null, null, null)',
				[_job.task, _job.params, _job.schedule]
			)
		case 'upd':
			stt = updateStatement('jobs', _job)
			if (stt) return system.db(stt.sql, stt.params).then(() => dbop(job, 'sel'))
			return dbop(job, 'sel')
		case 'del':
			return system.db('DELETE FROM jobs WHERE id=?',	[job.id])
		}
	} // dbop

	//
	dbop({}, 'sel').then(jobs => // грузим все задачи...
		jobs.forEach(job =>
			schedule(job)  // вешаем на расписание
		)
	)
		.catch(err => console.log(err.message))

	//
	// небольшой бэкенд ниже
	this.route('/')

		.get(function (req, res) {
			dbop({}, 'sel')
				.then(jobs => {
					jobs.forEach(job => {
						if (!(job.id in crons)) job.error = true
					})
					res.json(jobs)
				})
		})

		.put(bodyParser.json(), function (req, res) {
			var job = req.body

			if (!('id' in job)) { // job без id кандидат на добавление
				dbop(job, 'ins')
					.then(id =>
						dbop({ id: id }, 'sel')
							.then(job => {
								schedule(job)
								res.json(job)
							})
					)
					.catch(err => system.errorHandler(err, req, res))
				return
			}

			dbop(job, 'upd')
				.then(job => {
					// console.log('upd:' + JSON.stringify(job))
					destroy(job)
					schedule(job)

					if (job.enabled) {
						if (!job.error) start(job)
					} else stop(job)

					res.json({ id: job.id, error: Boolean(job.error) })
				})
				.catch(err => system.errorHandler(err, req, res))
		})

		.delete(bodyParser.json(), function (req, res) {
			var job = req.body
			dbop(job, 'del')
				.then(() => {
					res.json({ id: job.id })
					destroy(job)
				})
				.catch(err => system.errorHandler(err, req, res))
		})

	this.route('/run')
		.get(function (req, res) {
			dbop({ id: req.query.id }, 'sel')
				.then(job =>
					task(job)().then(code => {
						job.last = moment().format('YYYY-MM-DD HH:mm')
						system.db(
							'UPDATE jobs SET last = ?, code = ? WHERE id = ?',
							[job.last, code, job.id]
						)
						res.json(job)
					})
				)
				.catch(err => system.errorHandler(err, req, res))
		})
}
