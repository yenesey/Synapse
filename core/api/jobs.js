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

module.exports = function (system) {
// -
	const config = system.config
	const jobs = system.tree.jobs
	const crons = {} // хранилище CronJob-ов. ключи те же что и у jobs

	const launcher = require('../launcher.js')(config)
	const folder = require('../user-folders.js')(config.path.users, config.tasks.history)
	const mail = email.server.connect(config.mail)

	mail.sendp = util.promisify(mail.send)

	for (let keyId in jobs) schedule(keyId)  // вешаем на расписание прямо на старте

	function destroy (key) {
		if (key in crons) {
			crons[key].stop()
			delete crons[key]
		}
	}

	function start (key) {
		if (key in crons) crons[key].start()
	}

	function stop (key) {
		if (key in crons) crons[key].stop()
	}

	function task (key) {
		let job = jobs[key]

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
			try {
				let emails = system.getUsersHavingAccess(system.tree.groups._id('Администраторы')).map(el => el.email)
				mail.sendp({
					from: `Synapse <synapse@${os.hostname().toLowerCase()}`,
					to: emails.join(','),
					subject: job.description || job.name,
					attachment: [{ data: '<html><pre>' + stdout + '</pre></html>', alternative: true }]
				})
			} catch (err) {
				console.log(err.stack)
			}
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

	function schedule (key) { // повесить job на расписание
		let job = jobs[key]
		try {
			// crons[key] инициализируется в объект с методами .start() .stop()
			crons[key] = new CronJob(job.schedule, task(job), function () {}, Boolean(job.enabled))
		} catch (err) {
			console.log('job.schedule: ' + err.message)
			job.error = err.message // улетит клиенту с ответом
		}
	}

 /*
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
*/

	// небольшой бэкенд ниже

	this.ws('/', (s, req) => {
		console.error('websocket connection');
		for (var t = 0; t < 3; t++)
		  setTimeout(function() { s.send('message from server ' + t) }, 1000*t);
	})

	this.get('/tasks', function (req, res) {
		let tasks = system.tree.objects.tasks
		let map = Object.keys(tasks).map(task => ({ id: tasks._id(task), name: task, ...tasks[task] }))
		res.json(map)
	})

	this.route('/')
		.get(function (req, res) {
			res.json(jobs)
		})

		.put(bodyParser.json(), function (req, res) {
			let { key, job } = req.body

			if (!key) {
				jobs._add(job).then(key => {
					schedule(key)
					res.json({ 'key': key, ...job })
				}).catch(err => system.errorHandler(err, req, res))
				return
			}

			destroy(key)
			schedule(key)
			if (job.enabled) {
				if (!job.error) start(job)
			} else {
				stop(job)
			}
			res.json({ key: key, ...job })
			// .catch(err => system.errorHandler(err, req, res))
		})

		.delete(bodyParser.json(), function (req, res) {
			let { key } = req.body
			destroy(key)
			delete jobs[key]
			res.json({ key: key })
		})

	this.get('/run', function (req, res) {
		let { key } = req.query
		task(key)().then(code => {
			let job = jobs[key]
			job.last = system.dateStamp()
			res.json(job)
		})
			.catch(err => system.errorHandler(err, req, res))
	})
}
