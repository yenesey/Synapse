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
const day = require('dayjs')
const fsp = require('../fsp')
const uuidv4 = require('../lib').uuidv4

module.exports = function (system) {
// -
	const config = system.config
	const jobs = system.db.jobs

	const crons = {} // хранилище CronJob-ов. ключи те же что и у jobs
	const sockets = {} // хранилище Websockets - соединений

	const launcher = require('../launcher.js')(config, system.log)
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
	/*
	function startStop (key, start) {
		console.log('startStop', key, start)
		if (start) crons[key].start(); else crons[key].stop()
	}
	*/

	function renewNext (key) {
		let job = jobs[key]
		if (job.enabled) job.next = day(crons[key].nextDate()).format('YYYY-MM-DD HH:mm')
	}

	function schedule (key) { // повесить job на расписание
		if (key in jobs) destroy(key)
		let job = jobs[key]
		job.state = 'ok'
		try {
			// crons[key] инициализируется в объект с методами .start() .stop()
			crons[key] = new CronJob(job.schedule, task(key), function () {}, Boolean(job.enabled))
		} catch (err) {
			console.log('job.schedule: ' + err.message)
			job.error = err.message // улетит клиенту с ответом
		}
	}

	function broadcast (key, data, exclude) {
		let job = {}
		job[key] = data
		let message = JSON.stringify(job)
		for (let id in sockets) {
			if (!exclude || !exclude.includes(id)) sockets[id].send(message)
		}
	}

	function task (key) {
		let job = jobs[key]

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
						.then(items => items.filter(item => !item.isDirectory).map(file => file.name))
						.then(files => {
							if (files) {
								return mail.sendp({
									from: `Synapse <synapse@${os.hostname().toLowerCase()}`,
									to: to,
									subject: job.description || job.name,
									// text:    stdout || '',
									attachment: files.map(name => ({
										path: path.join(taskPath, name),
										type: 'text/html',
										name: name
									})
									).concat([{ data: '<html><pre style="color:teal">' + stdout + '</pre></html>', alternative: true }])
								})
							}
						})
						.catch(err =>
							system.errorHandler(err)
						)
				}
			}
		}

		function error (stdout) {
			try {
				let to = system.getUsersHavingAccess(system.db.objects.groups._['Администраторы'].id)
					.map(el => el.email).join(',')
				if (to.length) {
					mail.sendp({
						from: `Synapse <synapse@${os.hostname().toLowerCase()}`,
						to: to,
						subject: job.description || job.name,
						attachment: [{ data: '<html><pre>' + stdout + '</pre></html>', alternative: true }]
					})
				}
			} catch (err) {
				system.errorHandler(err)
			}
		}

		return function () {
			var stdout = ''
			var argv = Object.assign({}, job.argv)
			var _eval = ''
			for (let arg in argv) {
				try	{
					_eval = eval(argv[arg]) // eslint-disable-line
					argv[arg] = _eval
				} catch (err) {
					// console.log(err)
				}
			}
			// todo: разослать состояние выполнения задачи всем wss
			job.state = 'running'

			broadcast(key, { state: 'running' })

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
							if (code !== 0) {
								// убрал остановку задачи в планирощике при ошибке
								// crons[key].stop()
								// job.enabled = false
								job.state = 'error'
							} else {
								job.state = 'done'
								renewNext(key)
							}

							broadcast(key, {
								state: job.state,
								code: code,
								last: job.last,
								next: job.next
							})

							if (code === 0)	success(taskPath, stdout)
							if (code === 1)	error(stdout)
						}
					) // execute
				)
		}// scheduled function
	} // task(job)

	// небольшой бэкенд ниже

	function traverseIncomingActions (data, connectionId) {
		try {
			let { action, id, payload } = JSON.parse(data)

			switch (action) {
			case 'create':
				// autoinc id
				// id = String(Object.ids(jobs).reduce((res, id) => Math.max(res, Number(id)), 0) + 1)
				id = jobs.push(payload) - 1
				schedule(id)
				broadcast(id, jobs[id])
				break

			case 'update':
				if (!(id in jobs)) return
				let job = jobs[id]
				for (let k in payload) job[k] = payload[k]
				destroy(id)
				schedule(id)
				renewNext(id)
				broadcast(id, { ...payload, next: job.next })
				break

			case 'delete':
				if (!(id in jobs)) return
				destroy(id)
				delete jobs[id]
				broadcast(id, { state: 'deleted' }, [connectionId])
				break

			case 'run':
				if (!(id in jobs)) return
				task(id)()
				break
			}
		} catch (err) {
			console.log(err)
		}
	}

	this.ws('/', (ws, req) => {
		// todo: сделать аутентификацию. например. первое сообщение должно содержать некий токен, иначе немедленное закрытие соединения

		let id = uuidv4()
		sockets[id] = ws
		ws.onerror = system.log
		ws.onmessage = (m) => traverseIncomingActions(m.data, id)
		ws.onclose = (m) => {
			delete sockets[id]
		}
		ws.send(JSON.stringify(jobs))
	})

	this.get('/tasks', function (req, res) {
		system.checkAccess(req.user, system.db.objects.admin._.scheduler.id)
		let tasks = system.db.objects.tasks
		let map = Object.keys(tasks).map(task => ({ id: tasks._[task].id, ...tasks.task, name: task }))
		res.json(map)
	})
}
