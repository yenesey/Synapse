'use strict'
/*
  источник данных Active Directory
*/
var ActiveDirectory = require('activedirectory')
var promisify = require('util').promisify

module.exports = function (config) {
	return function (query) {
		var ad = new ActiveDirectory({
			url: config.dc,
			baseDN: config.dn,
			username: config.user + '@' + config.domain,
			password: config.password,
			attributes: { user: query.fields || ['dn', 'sAMAccountName',	'mail', 'telephoneNumber', 'displayName', 'description'] }
		})

		var findUsers = promisify(ad.findUsers).bind(ad)
		return findUsers(query.query)
			.then(result =>
				(typeof result === 'undefined')
					? []
					: result
			)
	} // query
}
