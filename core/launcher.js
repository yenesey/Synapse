'use strict'
/*
  Обертка для запуска:
    1) внешнего процесса - function exec(...)
    2) задачи (task), специальным образом оформленного внешнего процесса - function task(...)
*/

const path = require('path')
const iconv = require('iconv-lite')
const cp = require('child_process') // перекодировка для wscript

module.exports = function (cfg, logger) {
	// 1
	function exec (process, args, options, onData, onExit) {
		return new Promise(function (resolve, reject) {
			if (typeof onData !== 'function' || typeof onExit !== 'function')	reject(new Error('wrong parameters <onData>, <onExit>'))
			var ps = cp.spawn(process, args, options)
			function _log (tail) {
				if (options.log) logger(ps.pid + ',' + tail)
			}

			if (options.log) args.splice(0, options.log)
			_log(args)

			ps.on('error', err => {
				_log(' code= ' + err.code)
				reject(new Error('child process failed:' + process))
			})

			ps.on('exit', code => {
				_log(' code= ' + code)
				onExit(code)
				resolve(code) 	// промис разрешается с завершением процесса
			})

			function data (msg) {
				let	_msg = options.cp866 ? iconv.decode(msg, 'cp866').toString() : msg
				_log(_msg)
				onData(_msg)
			}

			ps.stderr.on('data', data)
			ps.stdout.on('data', data)
		})
	}

	function task (params, onData, onExit) {
		var args = []
		var options = {}
		var	runtime = ''
		var	argv = JSON.stringify(params)
		params.task.class  = params.task.class || 'tasks'
		if (params.task.class === 'xtech') {
			runtime = 'cscript'
			options.cp866 = true
			args.push('/nologo') 	 // - отключить лого
			argv = argv.replace(/"/g, "'") // --меняем <"> на <'>*
			options.cwd = cfg.path.xtech
			if (Number(params.log) !== 0) options.log = 3
		} else if (params.task.class === 'tasks') {
			runtime = 'node'
			args.push('--harmony')
			args.push('--trace-warnings')
			args.push('$launcher.js')
			options.cwd = path.join(/* path.dirname(require.main.filename) */ process.cwd(), 'tasks')
			if (Number(params.log) !== 0) options.log = 4
		} else if (params.task.class === 'tasks2') {
			runtime = 'node'
			args.push('$launcher.js')
			options.cwd = path.join(/* path.dirname(require.main.filename) */ process.cwd(), 'tasks2')
			if (Number(params.log) !== 0) options.log = 4
		}

		args.push(params.task.name + '.js') // - имя задачи для запуска
		args.push(argv)
		return exec(runtime, args, options, onData, onExit)
	}

	return {
		exec,
		task
	}
}
