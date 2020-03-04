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
			name: value.toUpperCase(),
			dbTypeName: 'NUMBER',
			dbType: oracledb.DB_TYPE_NUMBER,
			fetchType: oracledb.DB_TYPE_NUMBER,
			precision: 0,
			scale: -127
		})
	}

	let isTypeChanged = false
	do {
		r = r + 1
		c = 1
		row = []
		while (value = workbook.sheet(0).cell(r, c++).value()) {
			let meta = metaData[c - 2]

			if (typeof value === 'string') {
				if (!meta.byteSize || meta.byteSize < value.length) meta.byteSize = value.length
				if (meta.scale) {
					delete meta.precision
					delete meta.scale
				}

				if (meta.dbType !== oracledb.DB_TYPE_VARCHAR) {
					meta.dbType = oracledb.DB_TYPE_VARCHAR
					meta.fetchType = oracledb.DB_TYPE_VARCHAR
					meta.dbTypeName = 'VARCHAR2'
					meta.nullable = true
					isTypeChanged = true
					rows.forEach(r => { r[c - 2] = String(r[c - 2]) })
				}
			}
			if (isTypeChanged) {
				row.push(String(value))
			} else {
				row.push(value)
			}
		}
		rows.push(row)
	} while (row.length > 0)

	await importFromMemory({ metaData, rows }, params.tableName, { comment: params.tableDescription, merge: params.merge, wipe: params.wipe })

}
