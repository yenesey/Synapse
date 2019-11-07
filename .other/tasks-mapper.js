'use strict'

/*
	Полное обновление objects/tasks в базе путем вычитывания каталога и 'вливания' его в эту ветку.
	Осторожно! Потребуется переназначить доступы к отчетам, т.к. ветка пересоздается заново.
*/

const sqlite = require('synapse/sqlite')
const treeMapper = require('synapse/sqlite-tree-mapper')
const tree = treeMapper(sqlite('../db/synapse.db'), 'system')
const fsp = require('synapse/fsp')

;(async () => {
	let system = await tree()

	let content = await fsp.ls('../tasks')
	let tasks = content
		.filter(el => !el.folder && el.name !=='$launcher.js')
		.map(el => el.name.substr(0, el.name.indexOf('.') ))
		.reduce((all, el) => { all[el] = {}; return all }, {} )

	delete system.objects.tasks
	system.objects.tasks = tasks
	await system.objects.$('tasks').pending // wait (not necessary) until node is saved in a database

	console.log(system.objects.tasks)

})()

