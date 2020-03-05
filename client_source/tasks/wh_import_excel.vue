<template lang="pug">
div
	pre Здесь можно загрузить лист Excel в Data Warehouse. Для успешной загрузки, придерживайтесь простых правил:
	table.help(style="margin-bottom:2em")
		tr
			td 1. Данные должны быть на первом листе
			td(rowspan=3)
				img(src='./wh_import_excel.png')
		tr 
			td 2. Заголовки колонок должны начинаться с ячейки "A1"
		tr 
			td 3. Заголовки должны быть на латинском алфавите
		tr
			td(colspan=2) 4. Чтобы типы данных колонок определились правильно, задайте типы целиком для колонки в Excel (Клик ПКМ по заголовку, "Формат ячеек")
	

	v-combobox(
		label='Выбрать имя таблицы. Если нужна новая таблица - придумайте и введите не занятое имя'
		:items='whTables_'
		:search-input.sync='tableName'
		@change="change"
		return-object=false
		item-text='TABLE_NAME'
		item-value='TABLE_NAME'
		style="margin-top:25px"
	)
		template(v-slot:item='el')
			v-list-item-content
				v-list-item-title(v-html='el.item.TABLE_NAME')
				v-list-item-subtitle(v-html='el.item.COMMENTS' style="color:teal")
	
	v-text-field(v-model="tableDescription" label="Описание таблицы. Крайне желательно заполнить это поле" autocomplete="off" dense)
	v-file-input(label="File input" name="fileName" style="max-width:340px")
	v-checkbox(hide-details v-model='merge' label='Добавить к существующим данным')
	v-checkbox(hide-details v-model='wipe' label='Очистить таблицу перед импортом (**Осторожно!***)')
</template>

<script>
import {pxhr} from 'lib'

export default {
	data: () => ({
		tableName: '',
		tableDescription: '',
		merge: true,
		wipe: false,
		whTables_: [] // '_' at end of name prevent seting in task.params (look tasks.vue)
	}),
	mounted () {
		this.done()
	},
	methods: {
		change(e) {
			if (e)	this.tableDescription = e.COMMENTS || ''
		},
		done () {
			pxhr({ method: 'get', url: 'warehouse/tables' })
			.then(res => {
				this.whTables_ = res
			}).catch(function (err) {
				console.log(err)
			})
		}
	}
}
</script>

<style scoped>
table.help > tr > td {
	padding-left: .5em;
}
</style>