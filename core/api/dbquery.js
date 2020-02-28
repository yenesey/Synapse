'use strict'

/*
	Серверная часть компонента dbquery
*/

const bodyParser = require('body-parser')
const dsOracle = require('../ds-oracle')

module.exports = function (system) {
	// -
	const oracle = system.config.oracle
	const conns = Object.keys(oracle).reduce((result, el) => {
		result[el] = dsOracle(oracle[el])
		return result
	}, {})

	this.post('/', bodyParser.json({ limit: '5mb' }), function (req, res) {
		res.socket.setTimeout(Number(system.config.socket.timeout)) // ответ, возможно будет "долгим"
		system.checkAccess(req.user, ['admin', 'sql'])

		conns[req.body.connection](String(req.body.sql), {}, { maxRows: Number(req.body.maxRows) || 100 })
			.then(data => res.json(data))
			.catch(err => system.errorHandler(err, req, res))
	})

	this.get('/connections', function (req, res) {
		system.checkAccess(req.user, ['admin', 'sql'])
		let map = Object.keys(oracle).map(el => el) // ({ name: el })
		res.json(map)
	})
}
