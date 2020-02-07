<template lang="pug">
div
	datepicker(label="Начало" name="date1" value=""  style="margin-top:15px")
	datepicker(label="Конец" name="date2" value=""  style="margin-top:15px")
	v-checkbox(hide-details v-model='merge' label='Обновить существующие данные (merge)')
	v-checkbox(hide-details v-model='ignore' label='Игнорировать ошибки')
</template>

<script>
export default {
	data:()=>({ 
		merge: true,
		ignore: false
	})
}
</script>
