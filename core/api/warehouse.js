/**/
'use strict'
const oracledb = require('oracledb')
// const bodyParser = require('body-parser')
module.exports = async function (system) {
	// -
	const warehouse = await oracledb.getConnection(system.config.oracle.warehouse)
	this.get('/tables', async function (req, res) {
		let result = await warehouse.execute(
			'select T.table_name, C.COMMENTS from ALL_TABLES T, USER_TAB_COMMENTS C ' +
			'where T.OWNER = \'WH\' and T.TABLE_NAME = C.TABLE_NAME order by T.table_name'
		)
		res.json(result.rows)
	})
}
