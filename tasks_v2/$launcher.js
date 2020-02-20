/*
	Стартер для модулей <tasks2>
	todo: сделать передачу параметров на ином более совершенном уровне нежели через командную строку
*/
(function () {
	var taskName = process.argv[2]
	if (!taskName) return
	var fileName = `./${taskName}.js`

	var task = require(fileName)

	var json = '{"date":"2020-01-15","makeFiles":false,"outputPath":"./synapse", "department":555}'

	var params = JSON.parse(json, function (k, v) {
		if (k === '') return v
		let F = task.params[k]
		switch (F) {
		case Date: return new F(v)
		case Boolean: return Boolean(v)
		case String: return v
		case 'DLOOKUP': return 'dep_id=' + v // !custom type!
		default: return v
		}
	})

	for (let key in task.params) {
		if (!(key in params)) throw new Error('Insufficient parameters: ' + key)
	}
	task.run(params)
})()
