<template lang="pug">
div
	pre Здесь можно загрузить лист Excel в Data Warehouse. Для успешной загрузки, придерживайтесь простых правил:
	pre   1. Данные должны быть на первом листе
	pre   2. Заголовки колонок должны начинаться с ячейки "A1"
	pre   3. Заголовки должны быть на латинском алфавите
	img(src='./wh_import_excel.png')
	v-combobox(
		placeholder='Выбрать имя таблицы. Если нужна новая таблица - придумайте и введите не занятое имя'
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

	v-checkbox(hide-details v-model='allowStructureChange' label='***Только для опытных пользователей*** Разрешить модифицировать структуру')
</template>

<script>
import {pxhr} from 'lib'

export default {
	data: () => ({
		tableName: '',
		tableDescription: '',
		allowStructureChange: false,
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
