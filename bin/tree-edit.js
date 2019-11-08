'use strict'

const repl = require('repl')
const path = require('path')
const sqlite = require('synapse/sqlite')
const treeMapper = require('synapse/sqlite-tree-mapper')
const tree = treeMapper(sqlite(path.join(require.main.path, '../db/synapse.db')), 'system')
const { inspect } = require('util')

console.log('*** interactive \'system.tree\' edit ***\ntype \'t\' or \'keys(t)\' to start editing"\npress Ctrl+D to stop')

tree().then(t => {
	const context = repl.start({
		writer: (result) => inspect(result, { colors: true, depth: 2 })
	}).context
	context.keys = Object.keys
	context.t = t
})
