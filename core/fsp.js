'use strict'
/*
  стандартные функции файловой системы (fs)
  обернуто в промисы + некоторый доп. функционал
*/
const path = require('path')
const fs = require('fs')
const promisify = require('util').promisify

module.exports = {
	ls: function (dir) {
		// список элементов каталога (массив объектов)
		return promisify(fs.readdir)(dir)
			.then(content =>
				Promise.all(
					content.map(item =>
						promisify(fs.stat)(path.join(dir, item))
							.then(stat =>
								({
									name: item,
									created: stat.birthtime,
									modified: stat.mtime,
									size: stat.size,
									folder: stat.isDirectory()
								})
							)
					)
				) // Promise.all
			)
	},

	mkdir: function (base, rel) {
		// создание ветки каталогов.
		// base - существующая часть, которую не нужно перепроверять
		// rel - создаваемая часть, которая может и не существовать
		// результаты: успех==true, уже существовал==false, ошибка == reject

		var els = rel ? rel.split(path.sep):[]

		return els.reduce((p, el) =>
			p.then(() => {
				base = path.join(base, el)
				return promisify(fs.stat)(base)
					.then(stat => {
						if (stat.isFile()) {
							var err = new Error('ERROR: there is a file with SAME name')
							err.code = 'ECOLLIDES'
							throw err
						}
						return false
					})
					.catch(err => {
						if (err.code === 'ENOENT') {
							return promisify(fs.mkdir)(base).then(() => true)
						}
						throw err
					})
			}),
		Promise.resolve()
		)
	},

	rmdir: function (dir) {
		// рекурсивное удаление непустого каталога
		var self = this
		return self.ls(dir)
			.then(items =>
				Promise.all(
					items.map(item => {
						var itemPath = path.join(dir, item.name)
						if (item.folder) {
							return self.rmdir(itemPath)
						}
						return promisify(fs.unlink)(itemPath)
					})
				)
			)
			.then(() => promisify(fs.rmdir)(dir))
	},

	rename: function (oldName, newName) {
		return promisify(fs.rename)(oldName, newName)
	}

}
