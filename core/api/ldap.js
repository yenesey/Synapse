'use strict'

var ActiveDirectory = require('activedirectory')
var promisify = require('util').promisify

module.exports = function (system) {
	// -
	const config = system.config.ntlm
	const ADMIN_USERS = system.tree.objects.admin._id('Пользователи')

	function q(query) {
		var ad = new ActiveDirectory({
			url: config.dc,
			baseDN: config.dn,
			username: config.user + '@' + config.domain,
			password: config.password,
			attributes: { user: ['dn', 'sAMAccountName', 'mail', 'telephoneNumber', 'displayName', 'description'] }
		})
		console.log(query)
		var findUsers = promisify(ad.findUsers).bind(ad)
		return findUsers(query).then(result =>
			(typeof result === 'undefined')
				? []
				: result
		)
	} // query

	this.get('/', function (req, res) {
		system.checkAccess(req.user, ADMIN_USERS)
		q(req.query.query).then(result => res.json(result))
	})
}
