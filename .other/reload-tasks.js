'use strict'

/*
	обновление tasks в базе, путем чтения каталога (чтобы не вносить ручками)
*/

const path = require('path')
const sqlite = require('synapse/sqlite')
const treeMapper = require('synapse/sqlite-tree-mapper')
const tree = treeMapper(sqlite(path.join(require.main.path, '../db/synapse.db')), 'system')
const fsp = require('synapse/fsp')

;(async () => {
	let system = await tree()

	let content = await fsp.ls(path.join(require.main.path, '../tasks'))
	let tasks = content
		.filter(el => !el.folder && el.name !== '$launcher.js')
		.map(el => el.name.substr(0, el.name.indexOf('.')))
		.reduce((all, el) => { all[el] = {}; return all }, {})

	if (!system.objects.tasks) {
		system.objects.tasks = {}
		await system.objects.$('tasks').pending
	}

	for (let key in tasks) {
		system.objects.tasks[key] = tasks[key]
	}
	console.log('DONE!')
})()
