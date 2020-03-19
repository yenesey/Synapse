/*
  стандартные функции fs, обернутые в промисы + некоторый доп. функционал
  велосипеды выпиливаю по мере появления в node (в частности { recursive: true } раньше не было)
*/
'use strict'
const path = require('path')
const fs = require('fs')
const promisify = require('util').promisify

module.exports = {

	ls (dir) {
		var self = this
		return promisify(fs.readdir)(dir)
			.then(content =>
				Promise.all(
					content.map(item =>
						self.stat(path.join(dir, item))
							.then(stat =>
								({
									name: item,
									created: stat.birthtime,
									modified: stat.mtime,
									size: stat.size,
									isDirectory: stat.isDirectory()
								})
							)
					)
				) // Promise.all
			)
	},

	stat (dir) {
		return promisify(fs.stat)(dir)
	},

	mkdir (dir) {
		return promisify(fs.mkdir)(dir, { recursive: true })
	},

	rmdir (dir) {
		return promisify(fs.rmdir)(dir, { recursive: true })
	},

	rename (oldName, newName) {
		return promisify(fs.rename)(oldName, newName)
	}

}
