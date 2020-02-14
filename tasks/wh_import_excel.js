const { importFromMemory } = require('./wh_util')
const oracledb = require('oracledb')
const XlsxPopulate = require('xlsx-populate')
const path = require('path')

module.exports = async function (params) {
	// -
	if (/[а-яА-я]/.test(params.tableName)) {
		console.log('Кириллические символы в имени таблицы не допустимы')
		return -1
	}

	let workbook
	try {
		workbook = await XlsxPopulate.fromFileAsync(path.join(params.task.path, 'upload', params.files.fileName))
	} catch (err) {
		console.log('Ошибка открытия файла. Проверьте правильность формата (xlsx)')
		return -1
	}

	let r = 1
	let c = 1
	let value
	let metaData = []
	let rows = []
	let row = {}
	while (value = workbook.sheet(0).cell(r, c++).value()) {
		if (/[а-яА-я]/.test(value)) {
			console.log('Кириллические символы в заголовке не допустимы!')
			return -1
		}
		metaData.push({
			name: value,
			dbType: oracledb.DB_TYPE_VARCHAR,
			fetchType: oracledb.DB_TYPE_VARCHAR,
			dbTypeName: 'VARCHAR2',
			byteSize: 0,
			nullable: true
		})
	}

	do {
		r = r + 1
		c = 1
		row = []
		while (value = workbook.sheet(0).cell(r, c++).value()) {
			row.push(value)
			let meta = metaData[c - 2]
			if (typeof value === 'number') {
				meta.dbType = oracledb.DB_TYPE_NUMBER
				meta.fetchType = oracledb.DB_TYPE_NUMBER
				meta.precision = 0
				meta.scale = -127
				meta.dbTypeName = 'NUMBER'
				delete meta.byteSize
			}
			if (typeof value === 'string') {
				if (meta.byteSize < value.length) meta.byteSize = value.length
			}
		}
		rows.push(row)
	} while (row.length > 0)

	await importFromMemory({ metaData, rows }, params.tableName, params.tableDescription, params.allowStructureChange)

}
