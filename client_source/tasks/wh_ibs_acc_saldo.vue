<template lang="pug">
	div
		datepicker(label="Дата" name="date" :value="day().format('YYYY-MM-DD')")
		v-checkbox(hide-details v-model='merge' label='Обновить существующие данные (merge)')
</template>

<script>
export default {
	data:()=>({ 
		merge: true
	})
}
</script>
