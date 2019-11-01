/*
  автомат управления папками в basePath	(новые создаются, старые удаляются)
*/
'use strict'

const path = require('path')
const fsp = require('./fsp')
const day = require('dayjs')

// -------------------------------------------------------------
module.exports = function (basePath, maxFolders) {
	function mkdirUniq (basePath, relativePath, counter) {
		counter = counter || 0
		var relativePathCorr = relativePath + (counter ? '_' + counter : '')
		return fsp.mkdir(basePath, relativePathCorr)
			.catch(err => {
				if (err.code === 'EEXIST') return false
				else throw err
			})
			.then(res => {
				if (res === false) return mkdirUniq(basePath, relativePath, ++counter)
				return path.join(basePath, relativePathCorr)
			})
	}

	return function (user) {
		var userPath = path.join(basePath, user)
		var relativePath = path.join(user, day().format('YYYYMMDD_HHmmss.ms'))
		var newPath = path.join(basePath, relativePath)	// absolute path !!!

		return mkdirUniq(basePath, relativePath)
			.then(createdPath => { newPath = createdPath })
			.then(() => fsp.mkdir(newPath, 'upload'))
			.then(() =>
				fsp.ls(userPath) // --список элементов в пользовательской папке
					.then(items => items.filter(item => item.folder)) // --только папки
					.then(items => items.sort((a, b) => a.modified === b.modified ? 0 : a.modified < b.modified ? 1 : -1)) // --сортируем, новые вверху списка
					.then(items => items.filter((item, index) => index >= maxFolders)) // --выбираем папки, за пределами заданного количества
					.then(items => Promise.all(
						items.map(item => fsp.rmdir(path.join(userPath, item.name)))  // --удаляем все отобранные папки!
					)) // удалено?
			)
			.catch(err => console.log(err.stack)) // --ошибку отловили в лог и наружу она не пойдет (это важно)
			.then(() => newPath) // --finally
	}
}
