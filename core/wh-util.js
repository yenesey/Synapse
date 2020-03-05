/*
  Импорт данных в WAREHOUSE из IBSO (или любого другого источника)
*/

'use strict'
const oracledb = require('oracledb')
const { equals, diff } = require('./lib')
const treeStore = require('sqlite-tree-store')
const oracle = treeStore('../db/synapse.db', 'system')(['config', 'oracle']) // забрали настройки соединения из локальной базы
const ROWS_PER_ACTION = 10000

// --------------------------------------------------------------------------------
/*
function getModuleName () {
	let moduleName = path.basename(require.main.children[0].filename)
	return moduleName.substr(0, moduleName.length - path.extname(moduleName).length)
}
*/

/**
 * Создать описание полей на языке SQL(DDL) из метаданных (extendedMetadata)
 * т.е. сделать из структуры строку
 * @param {oracledb.Metadata[]} metaData
 */
function getFieldsDDL (metaData) {
	return metaData.reduce((result, el, i, src) => {
		let typeDef = el.dbTypeName

		switch (el.dbType) {
		case oracledb.DB_TYPE_NUMBER:
			typeDef = el.dbTypeName
			if (el.precision > 0) typeDef = typeDef + '(' + el.precision + ',' + el.scale + ')'
			break
		case oracledb.DB_TYPE_TIMESTAMP:
		case oracledb.DB_TYPE_TIMESTAMP_TZ:
		case oracledb.DB_TYPE_TIMESTAMP_LTZ:
			let words = el.dbTypeName.split(' ')
			typeDef = words[0]
			if (el.precision > 0) typeDef = typeDef + '(' + el.precision + ') ' + words.slice(1).join(' ')
			break
		default:
			if (el.byteSize) typeDef = typeDef + '(' + el.byteSize + ' BYTE)'
		}
		if (!el.nullable) typeDef = typeDef + ' NOT NULL '

		return result + el.name + '\t' + typeDef +	(i < src.length - 1 ? ',\n\t' : '')
	}, '\t')
}

/**
 * Сделать CREATE TABLE из метаданых
 * @param {oracledb.Metadata[]} metaData
 * @param {string} whTableName
 */
function getCreateStatement (metaData, whTableName) {
	return  'create table WH.' + whTableName + '\n' +
		'(' + '\n' +
			getFieldsDDL(metaData) + '\n' +
		')'
}

/**
 * Сделать ALTER TABLE из метаданых
 * @param {oracledb.Metadata[]} metaData
 * @param {string} whTableName
 */
function getAlterStatement (metaData, whTableName) {
	return 'alter table ' + whTableName + '\n' +
		'add (' + '\n' +
			getFieldsDDL(metaData) + '\n' +
		')'
}

/**
 * Сделать INSERT INTO из метаданых
 * @param {oracledb.Metadata[]} metaData
 * @param {string} whTableName
 */
function getInsertStatement (metaData, whTableName) {
	let len = metaData.length
	let heads = metaData.reduce((result, el, index) => result + el.name + (index < len - 1 ? ', ' : ')'), '(')
	let values = metaData.reduce((result, el, index) => result + ':' + String(index + 1) + (index < len - 1 ? ', ' : ')'), '(')
	return 'insert into\n' + whTableName + ' ' + heads + '\nvalues ' + values
}

/**
 * Сделать MERGE INTO из метаданых
 * @param {oracledb.Metadata[]} metaData
 * @param {string} whTableName
 */
function getMergeStatement (metaData, whTableName, keys = ['ID']) { // "merge into ... " from metaData
	let pairs = metaData.map((el, index) => ({ name: el.name, placeholder: ':' + (index + 1) }))
	return 'merge into ' + whTableName + '\n' +
		'using (\n  select\n' +
			pairs.filter(el => keys.includes(el.name)).map(el => '    '  + el.placeholder + ' ' + el.name).join(',\n') + ' from dual\n' +
		'   ) vals on (' +
			keys.map(el => whTableName + '.' + el + ' = vals.' + el).join(' and ') + ')\n' +
		'when matched then\n  update set\n' +
			pairs.filter(el => !keys.includes(el.name)).map(el => '    ' + el.name + ' = ' + el.placeholder).join(',\n') + '\n' +
		'when not matched then\n  insert (' + pairs.map(el => el.name).join(',') + ')\n  values (' + pairs.map(el => el.placeholder).join(',') + ')'
}

/**
 * Сверить структуры хранилища (existing) и загружаемых (incoming) данных
 * @param {oracledb.Metadata[]} existing
 * @param {oracledb.Metadata[]} incoming
  */
function checkStructure (existing, incoming) {
	let alter = []
	for (let i in incoming) {
		let test = incoming[i]
		let exists = existing.find(el => el.name === test.name)

		if (!exists) {
			alter.push(test)
		} else {
			if (test.precision === 0 && test.scale === 0) {
				test.scale = -127 // fix incoming .scale for F.A_SALDO
			}
			if (!equals(exists, test)) {
				return {
					pass: false,
					at: test,
					reason: diff(test, exists)
				}
			}
		}
	}
	return {
		pass: true,
		alter: alter
	}
}

function getConnection (dest) {
	if (dest in oracle) {
		return oracledb.getConnection(oracle[dest])
	}
	return Promise.reject(new Error('wrong connection alias'))
}

/**
 * Импорт данных из источника <source> в указанную таблицу Warehouse <whTableName>
 * @param {Object[]} source
 * @param {Array} source[].metaData
 * @param {Array} source[].rows
 * @param {Array} source[].resultSet
 * @param {string} whTableName
 * @param {Object[]} options
 * @param {String[]} options[].keys
 * @param {String} options[].comment
 * @param {Boolean} options[].merge
 * @param {Boolean} options[].wipe
 */
async function importData (source, whTableName, options) {
	let warehouse = await getConnection('warehouse')
	if ( // если таблица - приемник не существует
		(await warehouse.execute(
			`select * from ALL_TABLES where owner ='WH' and upper(TABLE_NAME) = upper('${whTableName}')`)
		).rows.length !== 1
	) {
		console.log(`creating table [${whTableName}] ...`)
		await warehouse.execute(getCreateStatement(source.metaData, whTableName))
		console.log(`done.`)
	}
	if (options.comment) {
		await warehouse.execute(`comment on table ${whTableName} is '${options.comment}'`)
	}

	let destination = await warehouse.execute(`select * from ${whTableName} where 1 = 0`, {}, { resultSet: true, extendedMetaData: true })
	await destination.resultSet.close()

	let check = checkStructure(destination.metaData, source.metaData)
	if (!check.pass) {
		console.log('structure check failed at ', check.at, ' reason: ', check.reason)
		return 0
	}
	if (check.alter.length) {
		console.log(`altering table [${whTableName}] ...`)
		await warehouse.execute(getAlterStatement(check.alter, whTableName))
		console.log(`done.`)
	}
	if (options.wipe) {
		console.log(`wiping table [${whTableName}] ...`)
		await warehouse.execute(`delete from ${whTableName}`)
		console.log(`done.`)
	}

	let statement = (options.merge ? getMergeStatement : getInsertStatement)(source.metaData, whTableName, options.keys)
	let rows, info
	let count = 0
	try {
		if ('resultSet' in source) {
			do {
				rows = await source.resultSet.getRows(ROWS_PER_ACTION)
				if (rows.length > 0) {
					info = await warehouse.executeMany(statement, rows,	{ autoCommit: true })
					count = count + info.rowsAffected
				}
			} while (rows.length === ROWS_PER_ACTION)
			await source.resultSet.close()
		} else {
			rows = source.rows
			if (rows.length > 0) {
				info = await warehouse.executeMany(statement, rows, { autoCommit: true })
				count = count + info.rowsAffected
			}
		}
	} catch (err) {
		console.log(err.message)
	}
	console.log((options.merge ? 'merge' : 'insert') + ' completed, ', count, ' rows affected')
	return count
}

// -------------------------------------------------------------------------------

async function importIbso (SQL, bindVars = {}, whTableName, options = { merge: false }) {
	let ibso = await getConnection('ibso') // let ibso = await getConnection('tavr_d')
	let source = await ibso.execute(SQL, bindVars, { resultSet: true, extendedMetaData: true })
	return importData(source, whTableName, options)
}

module.exports = { getConnection, importData, importIbso }
