/*
	Стартер для модулей <task>
*/

process.on('unhandledRejection', r => { // по-умолчанию node НЕ считает unhandledRejection критичной ошибкой
	console.log('unhandled promise rejection:')
	console.log(r)
	process.exit(1) // делаем так, чтобы считал
});

(function () {
	var task = require('./' + process.argv[2])
	var param = JSON.parse(process.argv[3])
	if (task.length === 2) {
		let system = require('../core/system')
		task(param, system)
	} else if (task.length === 1) {
		task(param)
	} else {
		task()
	}
})()
