/*
	Стартер для модулей <tasks2>
	todo: сделать передачу параметров на ином более совершенном уровне нежели через командную строку
*/

process.on('unhandledRejection', r => { // по-умолчанию node НЕ считает unhandledRejection критичной ошибкой
	console.log('unhandled promise rejection:')
	console.log(r)
	process.exit(1) // делаем так, чтобы считал
});

(function () {
	var task = require('./' + process.argv[2])
	var param = JSON.parse(process.argv[3])
	require('synapse/system').then(system => {
		for (let key in param) {
			task.props[key] = param[key]
		}
		task.run.bind(system)
		task.run()
	})
	// .catch(err=>{	console.log(err.stack);	process.exit(1) })
})()
