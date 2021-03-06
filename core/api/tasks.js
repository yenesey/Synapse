/*
	Запуск внешних по отношению к серверу задач
	Схема работы:
	- сервер принимает от клиента post формы, содержащей все необходимые параметры задачи
	- сервер обрабатывает параметры, подготавливает рабочие каталоги и создает (spawn)
		отдельный процесс для обработки запроса клиента
	- сервер сообщает клиенту, что ответ будет текстовым и, возможно "долгим"
	- сервер контролирует stdout и stderr, а также завершение созданного процесса
		и порционно направляет информацию клиенту по данным событиям. если в результате работы
		задачи были созданы файлы, клиенту направляется информация об этом
	- клиент обрабатывает получаемую информацию в рамках одного "долгого" ответа
*/
'use strict'
const promisify = require('util').promisify
const path = require('path')
const formidable = require('formidable')
const fsp = require('../fsp')

// -------------------------------------------------------------

function tryBoolean (string) {
	switch (string.toLowerCase().trim()) {
	case 'true': return true
	case 'false': return false
	default: return string
	}
}

module.exports = function (system) {
	const config = system.config
	const folder = require('../user-folders.js')(config.path.users, config.tasks.history)
	const launcher = require('../launcher.js')(config, system.log)

	function launch (params, req, res) {
		//	req.connection.on('close', function(){}); //закрытие соединения

		res.socket.setTimeout(Number(config.socket.timeout)) // ответ, возможно будет "долгим"
		res.writeHead(200, {
			'Connection': 'keep-alive',
			'Content-Type': 'application/octet-stream; charset=utf-8',
			'Cache-Control': 'no-store, no-cache, must-revalidate',
			'Transfer-Encoding': 'chunked'
		})

		return launcher.task(
			params,
			function (msg) { // onData
				if (res.connection.writable) {
					res.write(msg, 'utf8', err => {
						if (err) console.log(err)
					})
				}
			},

			function (code) { // onExit
				if (res.connection.writable) {
					if (code === 0) {
						fsp.ls(req.task.path)
							.then(items => items.filter(item => !item.isDirectory).map(file => file.name))
							.then(files =>
								res.end('\n' +
									JSON.stringify({
										status: 'done',
										message: 'Выполнено',
										path: path.relative(config.path.users, req.task.path),
										files: files
									})
								)
							)
							.catch(() =>
								res.end('\n' + JSON.stringify({ status: 'error', message: 'ошибка чтения каталога с файлами' }))
							)
					} else res.end('\n' + JSON.stringify({ status: 'error', message: 'задача завершилась с ошибками' }))
				}
			}
		)
	}

	// ---------------------------------------------------------------

	this.route('/').post(
		// 1 - подготовка каталога / парсинг формы / прием файлов
		function (req, res, next) {
			req.task = {
				id: req.query.id,
				user: req.user.login
			}
			folder(req.task.user)
				.then(newPath => {
					req.task.path = newPath
					return newPath
				})
				.then(newPath => {
					var files = {}
					var fields = {}
					var arrayCounter = 0
					var form = new formidable.IncomingForm({
						uploadDir: path.join(newPath, 'upload'),
						multiples: true
					})
					form
						.on('fileBegin', function (name, file) {
							if (file.name === '') return
							file.path = path.join(newPath, 'upload', file.name) // переименовываем сразу, до начала записи
							var count = 0
							var key = name // field name in form
							while (key in files) {
								count++
								key = name + count	// генерируем уникальное имя
							}
							files[key] = file.name
						})
						.on('field', function (name, value) {
							// принято соглашение, что array-begin .. array-end -- границы массива
							value = tryBoolean(value)
							// console.log(name, ' = ', value)
							if (name === 'array-begin') {
								arrayCounter++
								return
							}
							if (name === 'array-end') {
								arrayCounter--
								return
							}
							if (arrayCounter > 0) {
								// значение будет в массиве, даже если оно всего одно!
								if (!(name in fields)) {
									fields[name] = []
								}
								fields[name].push(value)
							}	else if (name in fields) {
								// здесь поля обрабатываем стандартно, массив все еще возможен, но только в случае повторения имен полей.
								if (!(fields[name] instanceof Array))	fields[name] = [fields[name]] // повторяющиеся имена приходится преобразовывать в массив
								fields[name].push(value)  // иначе значения потеряются.
							} else {
								fields[name] = value
							}
						})
						.on('error', function (err) {
							console.log(err)
							res.end('\n' + JSON.stringify({ status: 'error', message: 'Ошибка разбора формы. На сервер пришли поврежденные данные, сообщите администратору' }))
						})	// .on('end', function(){ });
					return (promisify(form.parse).bind(form))(req)
						.then(() => {
							req.body = fields
							req.files = files
							next()
						})
				})
				.catch(err => next(err))
		},
		// 2 - запуск задачи с принятыми данными
		function (req, res) {
			var params = { task: req.task }
			if (req.body)	{
				params = Object.assign(params, req.body)
			}
			if (req.files) {
				params.files = req.files
			}
			let access = system.checkAccess(req.user, null, Number(params.task.id)) // проверили доступ к задаче
			try {
				delete access.granted
				delete access.description
				params.task = Object.assign(access, params.task)
				if (!params.deps) {
					return launch(params, req, res)
				}	// подразделения не указаны? запускаем без контроля подразделений
				let deps = system.access(req.user, { class: 'deps' })
					.filter(el => el.granted).map(el => el.name)
				if (!deps) {
					delete params.deps // нет доступа? - убираем параметр
				} else {
					// конвертируем массив подразделений в массив альтернативных регЭкспов:
					deps = deps.map(dep => new RegExp(dep.replace('%', '[\\W|\\w]*')))
					if (typeof params.deps === 'string') {
						params.deps = params.deps.split(',')
					} // здесь params.deps становятся массивом, даже если и не были им!
					params.deps = params.deps.filter(testDep => // фильтр только допустимых подразделений
						deps.reduce((result, _dep) => result || _dep.test(testDep), false)
					)
				}
				return launch(params, req, res)
			} catch (err) {
				system.errorHandler(err)
			}
		}
	)
}
