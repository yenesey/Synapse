'use strict'

const request = require('request')
const fs = require('fs')

// const url = 'https://scan2'
const url = 'http://localhost'

request.get({
	url: url + `/access/map`,
	
	agentOptions: {
		pfx: fs.readFileSync('../sslcert/scan2256.pfx'),
		passphrase: '1'
	},

	auth: {
		'user': 'synapse_ad',
		'pass': '1qaz2wsx3edc.',
		// 'sendImmediately': false
	}
}, function (err, res, body) {
	if (err) console.log(err)
	//console.log(Object.keys(res))
	console.log(res.headers)
	console.log(body)
})
