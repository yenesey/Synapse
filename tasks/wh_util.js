const path = require('path')
const oracledb = require('oracledb')
const treeStore = require('sqlite-tree-store')
const oracle = treeStore('../db/synapse.db', 'system')(['config', 'oracle'])

const NUM_ROWS = 10000
// ----------------------------------------------------------------------------------

function getInsertStatement (metaData, tableName) {
	let len = metaData.length
	let heads = metaData.reduce((result, el, index) => result + el.name + (index < len - 1 ? ', ' : ')'), '(')
	let values = metaData.reduce((result, el, index) => result + ':' + String(index + 1) + (index < len - 1 ? ', ' : ')'), '(')
	return 'insert into\n' + tableName + ' ' + heads + '\nvalues ' + values
}

function getMergeStatement (metaData, tableName, keys = ['ID']) {
	let pairs = metaData.map((el, index) => ({ name: el.name, placeholder: ':' + (index + 1) }))
	return 'merge into ' + tableName + '\n' +
		'using (\n  select\n' +
			pairs.filter(el => keys.includes(el.name)).map(el => '    '  + el.placeholder + ' ' + el.name).join(',\n') + ' from dual\n' +
		'   ) vals on (' +
			keys.map(el => tableName + '.' + el + ' = vals.' + el).join(' and ') + ')\n' +
		'when matched then\n  update set\n' +
			pairs.filter(el => !keys.includes(el.name)).map(el => '    ' + el.name + ' = ' + el.placeholder).join(',\n') + '\n' +
		'when not matched then\n  insert (' + pairs.map(el => el.name).join(',') + ')\n  values (' + pairs.map(el => el.placeholder).join(',') + ')'
}

/*
function getModuleName () {
	let moduleName = path.basename(require.main.children[0].filename)
	return moduleName.substr(0, moduleName.length - path.extname(moduleName).length)
}
*/

function checkStructure (tableName, metaData) {
	const wh = treeStore('wh_data.db', 'structs', true)()
	const { equals, diff } = require('synapse/lib')

	if (!(tableName in wh)) {
		wh[tableName] = metaData
		return { pass: true }
	}

	let original = wh[tableName]
	for (let i in metaData) {
		let el = original.find(_el => _el && _el.name === metaData[i].name)
		if (!el) {
			return {
				pass: false,
				at: metaData[i],
				reason: 'field not exists in original'
			}
		}

		if (!equals(el, metaData[i])) {
			return {
				pass: false,
				at: metaData[i],
				reason: diff(el, metaData[i])
			}
		}
	}

	return { pass: true }
}

function getConnection (dest) {
	if (dest in oracle) {
		return oracledb.getConnection(oracle[dest])
	}
	return Promise.reject(new Error('wrong connection alias'))
}

async function importData (SQL, bindVars = {}, whDestinationTable, options = { merge: false }) {
	let warehouse = await getConnection('warehouse')
	let ibso = await getConnection('ibso')
	// let ibso = await getConnection('tavr_d')
	let result = await ibso.execute(SQL, bindVars, { resultSet: true, extendedMetaData: true })
	let check = checkStructure(whDestinationTable, result.metaData)
	if (!check.pass) {
		console.log('Structure check failed at ', check.at, ' reason: ',  check.reason)
		return 0
	}
	let rs = result.resultSet
	let rows, info
	let statementFunc = options.merge ? getMergeStatement : getInsertStatement
	let statement = statementFunc(result.metaData, whDestinationTable, options.keys)

	// console.log(statement)

	let count = 0
	do {
		rows = await rs.getRows(NUM_ROWS)
		if (rows.length > 0) {
			info = await warehouse.executeMany(statement, rows,	{ autoCommit: true })
			count = count + info.rowsAffected
		}
	} while (rows.length === NUM_ROWS)
	await rs.close()
	console.log((options.merge ? 'merge' : 'insert') + ' completed, ', count, ' rows affected')
	return count
}

module.exports = {
	getConnection,
	importData
}
