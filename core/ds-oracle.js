'use strict'
/*
	источник данных Oracle
*/
const crypto = require('crypto')
const oracledb = require('oracledb')
oracledb.outFormat = oracledb.OBJECT
oracledb.fetchAsString = [oracledb.DATE]

const ERR_RECONNECT_LIST = [28, 1012, 3114, 3113, 942, 4063] // получив эти ошибки - пытаемся пересоединиться 1 раз
const ERR_PASSWORD_EXPIRED = 28001

function genPassword (length = 12) {
	return '!' + crypto.randomBytes(Math.ceil((length - 1) / 2)).toString('hex').slice(0, length - 1)
}

module.exports = function (config) {
	// config = {user:'<username>', password:'<password>', connectString:'<schema>'}

	if (typeof config === 'undefined') {
		throw new Error(`[ds-oracle]: config not provided`)
	}

	var connection = null
	if (!config.connectString) config._.connectString = config.schema

	function getConnection () {
		if (connection !== null) return Promise.resolve(connection)

		return oracledb.getConnection(config)
			.then(_conn => {
				connection = _conn
				connection.module = 'BANK\\OBR'
				connection.action = 'Http.View 4139'
				// connection.callTimeout = config.callTimeout || connection.callTimeout
				return connection
				/*
				var exec = connection.execute.bind(connection)
				return Promise.all([
					exec("alter session set NLS_DATE_FORMAT='yyyy-mm-dd'"), // hh24:mi:ss
					exec("alter session set NLS_TIME_FORMAT='hh24:mi:ss'"),
					exec("alter session set NLS_TIMESTAMP_FORMAT='yyyy-mm-dd hh24:mi:ss'")
					//	,exec("BEGIN IBS.EXECUTOR.SET_SYSTEM_CONTEXT(true); END;")
				]).then(() => connection)
				*/
			})
	}

	function closeConnection () {
		if (connection) {
			return connection.close().then(() => {
				connection = null
			})
		}
		return Promise.reject(new Error('there is no active connection'))
	}

	function commit () {
		if (connection) {
			return connection.commit()
		}
		return Promise.reject(new Error('there is no active connection - nothing to close'))
	}

	function knownErrors (err) {
		// return closeConnection().then(() => { ?? зачем CLOSE? если и так его нет!!!!
		console.log('[ds-oracle]: ' + err.message)
		if (ERR_RECONNECT_LIST.includes(err.errorNum)) {
			connection = null
			return getConnection()
		}
		if (ERR_PASSWORD_EXPIRED === err.errorNum) {
			config.newPassword = genPassword()
			return getConnection().then(conn => {
				console.log(`[ds-oracle]: the new password for "${config.user}" is "${config.newPassword}"`)
				config.oldPassword = config.password
				config.password = config.newPassword
				delete config.newPassword
			})
		}
		return Promise.reject(err) // если ошибка неизвестна - окончательно должна быть обработана в вызывающем модуле.
		// })
	}

	function exec (sql, binds = {}, options = { maxRows: 10000 }) {
		return getConnection()
			.then(() => connection.execute(sql, binds, options))
			.catch(err => knownErrors(err))
			.then(() => connection.execute(sql, binds, options))
			.then(data => {
				// data.metaData contains type info when options.extendedMetaData === true
				return data.rows || data.outBinds
			})
	} // function(query)

	Object.defineProperties(exec, {
		GET: {
			value: { type: oracledb.DEFAULT, dir: oracledb.BIND_OUT },
			enumerable: true
		},
		GET_NUMBER: {
			value: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
			enumerable: true
		},
		GET_STRING: {
			value: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 32000 },
			enumerable: true
		},
		GET_DATE: {
			value: { type: oracledb.DATE, dir: oracledb.BIND_OUT },
			enumerable: true
		},

		close: {
			value: closeConnection,
			enumerable: false
		},

		commit: {
			value: commit,
			enumerable: false
		}
	})

	return exec
}
