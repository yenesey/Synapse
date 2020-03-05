const { importData } = require('../core/wh-util')

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

	while (value = workbook.sheet(0).cell(r, c++).value()) {
		if (/[а-яА-я]/.test(value)) {
			console.log('Кириллические символы в заголовке не допустимы!')
			return -1
		}
		metaData.push({
			name: value.toUpperCase(),
			nullable: true,
			dbTypeName: 'NUMBER',
			dbType: oracledb.DB_TYPE_NUMBER,
			fetchType: oracledb.DB_TYPE_NUMBER
		})
	}

	let length
	let row
	do {
		r = r + 1
		row = metaData.reduce((result, meta, colIndex) => {
			let cell = workbook.sheet(0).cell(r, colIndex + 1)
			value = cell.value()

			if (!value) {
				result.push(null)
				return result
			}
			// console.log(cell._styleId, cell._value)
			if (cell._styleId === 2) {
				value = String(value)
				if (!meta.byteSize || meta.byteSize < value.length) meta.byteSize = value.length

				if (meta.dbType !== oracledb.DB_TYPE_VARCHAR) {
					meta.dbTypeName = 'VARCHAR2'
					meta.dbType = oracledb.DB_TYPE_VARCHAR
					meta.fetchType = oracledb.DB_TYPE_VARCHAR
					rows.forEach(r => { r[colIndex] = String(r[colIndex]) })
				}
			} else if (cell._styleId === 3) {
				value = XlsxPopulate.numberToDate(value)
				if (meta.dbType !== oracledb.DB_TYPE_DATE) {
					meta.dbTypeName = 'DATE'
					meta.dbType = oracledb.DB_TYPE_DATE
					meta.fetchType = oracledb.DB_TYPE_TIMESTAMP_LTZ
					rows.forEach(r => { r[colIndex] = new Date(r[colIndex]) })
				}
			} else if (cell._styleId === 4) {
				meta.precision = 0
				meta.scale = -127
			}

			result.push(value)
			return result
		}, []) // forEach
		length = row.reduce((result, el) => result + Number(el !== null), 0)
		if (length > 0) rows.push(row)
	} while (length > 0)

	await importData({ metaData, rows }, params.tableName,
		{
			keys: [metaData[0].name],
			comment: params.tableDescription,
			merge: params.merge,
			wipe: params.wipe
		})
}
