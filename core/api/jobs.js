'use strict'

/*
  Запуск задач по расписанию
  TODO: проверка прав админа
*/

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
	const wss = {} // хранилище Websockets - соединений
	var $ws = null

	const launcher = require('../launcher.js')(config)
	const folder = require('../user-folders.js')(config.path.users, config.tasks.history)
	const mail = email.server.connect(config.mail)
	
	mail.sendp = util.promisify(mail.send)

	for (let key in jobs) schedule(key)  // вешаем на расписание прямо на старте

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

	function sendJob(key) {
		let job = {}
		job[key] = jobs[key]
		$ws.send(JSON.stringify(job))
	}

	function task (key) {
		let job = jobs[key]
		let K = key
		function success (taskPath, stdout) {
			if (!(job.print || job.emails)) return

			// печать на указанный принтер (пока Windows-only)
			if (job.print) {
				launcher.exec('cscript',
					['/nologo', './core/winprint.js', taskPath, job.print],
					{
						log: false, // не логируем процесс стандартным методом
						cp866: true
					},
					function (data) {}, // но можно, при желании, отловить вывод здесь
					function (code) {}
				)
			}

			// рассылка получателям
			if (Object.keys(job.emails).length) {
				let to = Object.values(job.emails).join(',')
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
				let emails = system.getUsersHavingAccess(system.tree.objects.groups._id('Администраторы')).map(el => el.email)
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
			var argv = Object.assign({}, job.argv)
			var _eval = ''
			for (var key in argv) {
				try	{
					_eval = eval(argv[key]) // eslint-disable-line
					argv[key] = _eval
				} catch (err) {
					// console.log(err)
				}
			}
			// todo: разослать состояние выполнения задачи всем wss

			job.state = 'running'
			sendJob(K)
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
							// todo: можно проплюнуть data по wss
							stdout += data
						},
						function (code) {
							job.last = system.dateStamp()
							job.code = code
							job.state = 'done'
							let interval = parser.parseExpression(job.schedule)
							if (job.enabled) job.next = moment(new Date(interval.next().toString())).format('YYYY-MM-DD HH:mm')
							sendJob(K)
							// todo: отослать состояние завершения
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
			crons[key] = new CronJob(job.schedule, task(key), function () {}, Boolean(job.enabled))
		} catch (err) {
			console.log('job.schedule: ' + err.message)
			job.error = err.message // улетит клиенту с ответом
		}
	}

	// небольшой бэкенд ниже

	function handleWs (m, ws) {
		try {
			let { action, key, payload } = JSON.parse(m)

			switch (action) {
			case 'create':
				jobs._add(payload).then(key => {
					schedule(key)
					sendJob(key)
				}).catch(err => system.errorHandler(err))
				break

			case 'update':
				if (!(key in jobs)) return
				let job = jobs[key]
				Object.keys(payload).forEach(_key => {
					job[_key] = payload[_key]
				})
				break

			case 'delete':
				if (!(key in jobs)) return
				destroy(key)
				delete jobs[key]
				break

			case 'run':
				if (!(key in jobs)) return
				task(key)()
				break
			}

		} catch (err) {
			console.log(err)
		}
	}

	this.ws('/', (ws, req) => {
		$ws = ws
		ws.send(JSON.stringify(jobs))
		ws.on('message', function (m) {
			handleWs(m, ws)
		})
	})

	this.get('/tasks', function (req, res) {
		system.checkAccess(req.user, system.tree.objects.admin._id('Планировщик'))
		let tasks = system.tree.objects.tasks
		let map = Object.keys(tasks).map(task => ({ id: tasks._id(task), name: task, ...tasks[task] }))
		res.json(map)
	})

}
