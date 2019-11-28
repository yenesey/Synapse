<template lang="pug">
div
	pre.subheading Отчет по доходности по карт.- продуктам
	datepicker(label="Дата отчета" name="period" type="month" :value="day().add(-1, 'month').format('YYYY-MM')")
	v-checkbox(v-model='debug' label='Вывести отладочную инфу')
</template>

<script>
export default {
	data:()=>({ 
		debug: false
	})
}
</script>
