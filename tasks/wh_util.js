const path = require('path')
const oracledb = require('oracledb')
const treeStore = require('sqlite-tree-store')

const _tree = treeStore('../db/synapse.db', 'system', true)
function byPath (path, id = 0) {
	let node = _tree(id, 1)
	let name = path.slice(0, 1)
	if (name && name in node) {
		return byPath(path.slice(1), node._[name].id)
	} else {
		return _tree(id, 0)
	}
}
const config = byPath('config.oracle'.split('.'))

const NUM_ROWS = 10000
// ----------------------------------------------------------------------------------

function getInsertStatement (metaData, tableName) {
	let len = metaData.length
	let heads = metaData.reduce((result, el, index) => result + el.name + (index < len - 1 ? ', ' : ')'), '(')
	let values = metaData.reduce((result, el, index) => result + ':' + String(index + 1) + (index < len - 1 ? ', ' : ')'), '(')
	return 'insert into\n' + tableName + ' ' + heads + '\nvalues ' + values
}

function getMergeStatement (metaData, tableName) {
	let len = metaData.length
	let heads = metaData.reduce((result, el, index) => result + el.name + (index < len - 1 ? ', ' : ')'), '(')
	let values = metaData.reduce((result, el, index) => result + ':' + String(index + 1) + (index < len - 1 ? ',' : ')'), '(')
	let pairs = metaData.reduce((result, el, index) => result + '    :' + String(index + 1) + ' ' + el.name + (index < len - 1 ? ',\n' : ''), '')
	let pairsRev = metaData.slice(1).reduce((result, el, index) => result +	'    ' + el.name + ' = :' + String(index + 2) + (index < len - 2 ? ',\n' : ''), '')

	return 'merge into\n    ' + tableName + '\n' +
		'using (\nselect ' + pairs + ' from dual\n)' + ' val on (\n    ' + tableName +
		'.ID = val.ID\n)\nwhen matched then\n' +
		'update set\n' + pairsRev + '\n' +
		'when not matched then insert\n    ' + heads + '\nvalues ' + values
}

function getModuleName () {
	let moduleName = path.basename(require.main.children[0].filename)
	return moduleName.substr(0, moduleName.length - path.extname(moduleName).length)
}

function checkStructure (testing) {
	const wh = treeStore('wh_data.db', 'src_structs', true)()
	const { equals, diff } = require('synapse/lib')

	let moduleName = getModuleName()

	if (!(moduleName in wh)) {
		wh[moduleName] = testing
		return { pass: true }
	}

	let original = wh[moduleName]
	for (let i in testing) {
		let el = original.find(_el => _el && _el.name === testing[i].name)
		if (!el) {
			return {
				pass: false,
				at: testing[i],
				reason: 'field not exists in original'
			}
		}

		el._.nullable = Boolean(el.nullable)
		if (!equals(el, testing[i])) {
			return {
				pass: false,
				at: testing[i],
				reason: diff(el, testing[i])
			}
		}
	}

	return { pass: true }
}

function getConnection (dest) {
	if (dest in config) {
		return oracledb.getConnection(config[dest])
	}
	return Promise.reject(new Error('wrong connection alias'))
}

async function processData (SQL, bindVars = {}, whDestinationTable, options = { merge: false }) {
	let warehouse = await getConnection('warehouse')
	let ibso = await getConnection('ibso')
	let result = await ibso.execute(SQL, bindVars, { resultSet: true, extendedMetaData: true })
	let check = checkStructure(result.metaData)
	if (!check.pass) {
		console.log('Structure check failed at ', check.at, ' reason: ',  check.reason)
		return 0
	}
	let rs = result.resultSet
	let rows, info
	let statementFunc = options.merge ? getMergeStatement : getInsertStatement
	let statement = statementFunc(result.metaData, whDestinationTable)
	let count = 0
	do {
		rows = await rs.getRows(NUM_ROWS)
		if (rows.length > 0) {
			info = await warehouse.executeMany(statement, rows,	{ autoCommit: true })
			count = count + info.rowsAffected
		}
	} while (rows.length === NUM_ROWS)
	await rs.close()
	console.log((options.merge ? 'merge' : 'insertion') + ' complete! ', count, ' rows affected ')
	return count
}

module.exports = {
	getConnection,
	processData
}
