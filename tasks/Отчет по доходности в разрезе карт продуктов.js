/*

*/
const fs = require("fs")
const path = require("path")
const XlsxTemplate = require('xlsx-template')

module.exports = async function (param, system) {
	const ora = require('synapse/ds-oracle')(system.config.ibs)

	/*const table = await ora(`
		`
			{},	
			{maxRows : 10000}
	)

	if (!table.length){
		console.log('Нет данных для вывода по указанным параметрам.');
		process.exit(0);
	}
	*/
	
	var sheetData = {
		period : param.period.split("-").reverse().join("."),
	}
	var binData = fs.readFileSync(path.join(__dirname, 'templates', 'Отчет по доходности в разрезе карт продуктов.xlsx'))
	var template = new XlsxTemplate(binData)
	template.substitute(1, sheetData)
	binData = template.generate()
	fs.writeFileSync(`${param.task.path}/Отчет по доходности в разрезе карт продуктов.xlsx`, binData, 'binary')

}