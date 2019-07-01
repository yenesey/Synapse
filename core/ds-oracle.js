'use strict'
/*
	источник данных Oracle
*/

const CronJob = require('cron').CronJob
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
		return function () {
			return Promise.reject(new Error(`[ds-oracle]: config not provided`))
		}
	}

	var connection = null
	config.connectString = config.connectString || config.schema

	if ('ping' in config)	{
		console.log(`[ds-oracle]: connection ping every ${config.ping} minutes scheduled` + (config.by ? ` by ${config.by}` : ``))
		new CronJob(`0 */${config.ping} * * * *`, function () { // eslint-disable-line
			if (connection !== null) { // -- only if connection has been established previously
				connection.ping().then(err => {
					if (err) throw new Error(`[ds-oracle]: connection ping ` + err)
				}).catch(err => console.error(err))
			}
		}, null, true)
	}

	function getConnection () {
		if (connection !== null) {
			return Promise.resolve(connection)
		}

		return oracledb.getConnection(config)
			.then(_conn => {
				connection = _conn
				connection.module = 'BANK\\OBR'
				connection.action = 'Http.View 4139'
				connection.callTimeout = config.callTimeout || connection.callTimeout
				var exec = connection.execute.bind(connection)
				return Promise.all([
					exec("alter session set NLS_DATE_FORMAT='yyyy-mm-dd'"), // hh24:mi:ss
					exec("alter session set NLS_TIME_FORMAT='hh24:mi:ss'"),
					exec("alter session set NLS_TIMESTAMP_FORMAT='yyyy-mm-dd hh24:mi:ss'")
					//	,exec("BEGIN IBS.EXECUTOR.SET_SYSTEM_CONTEXT(true); END;")
				]).then(() => connection)
			})
	}

	function exec (sql, binds = {}, options = { maxRows: 50 }) {
		return getConnection()
			.then(conn => conn.execute(sql, binds, options))
			.catch(err => {
				connection = null // give a chance to reconnect:
				console.log('[ds-oracle]: ' + err.message)
				if (ERR_RECONNECT_LIST.includes(err.errorNum)) {
					return getConnection().then(conn => conn.execute(sql, binds, options))
				}
				if (ERR_PASSWORD_EXPIRED === err.errorNum) {
					config.newPassword = genPassword()
					return getConnection().then(conn => {
						console.log(`[ds-oracle]: the new password for "${config.user}" is "${config.newPassword}"`)
						config.password = config.newPassword
						delete config.newPassword
						// todo: save new password in system.db?
						return conn.execute(sql, binds, options)
					})
				}
				throw err // ошибка окончательно должна быть обработана в вызывающем модуле.
			})
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
		}
	})

	return exec
}
