'use strict'

/*
	Серверная часть компонента dbquery
*/

const bodyParser = require('body-parser')

module.exports = function (system) {
	// -
	const config = system.config.system
	const ora = require('../ds-oracle')(config.ibs)

	this.post('/', bodyParser.json({ limit: '5mb' }), function (req, res) {
		res.socket.setTimeout(Number(config.socket.timeout)) // ответ, возможно будет "долгим"

		system.accessCheck(req.ntlm.UserName, system.ADMIN_SQLQUERY).then(() =>
			ora(String(req.body.sql), {}, { maxRows: Number(req.body.maxRows) || 100 })
				.then(data => res.json(data))
		).catch(err => system.errorHandler(err, req, res))
	})
}
