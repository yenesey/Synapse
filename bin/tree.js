'use strict'

const repl = require('repl')
const path = require('path')
const { writeFileSync, readFileSync } = require('fs')
const { inspect } = require('util')
const sqlite = require('synapse/sqlite')
const treeMapper = require('synapse/sqlite-tree-mapper')
const tree = treeMapper(sqlite(path.join(require.main.path, '../db/synapse.db')), 'system')
const mark = (text) => `\x1b[32m${text}\x1b[37m`

console.log('*** interactive \'system.tree\' edit ***\n' +
'type:\n > ' + mark('t') +
' - view tree\n > ' + mark('keys(t)') +
' - view keys\n > ' + mark('dump(t.<node>, <fileName>)') +
' - dump to file\n > ' + mark('load(<fileName>)') + ' - load from file\npress Ctrl+D to stop')

tree().then(t => {
	const context = repl.start({
		writer: (result) => inspect(result, { colors: true, depth: 2 })
	}).context
	context.keys = Object.keys
	context.t = t
	context.dump = function (node, fileName) {
		writeFileSync(fileName, JSON.stringify(node, '', '    '))
		return true
	}
	context.load = function (fileName) {
		return JSON.parse(readFileSync(fileName))
	}
})
