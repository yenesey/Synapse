<template lang="pug">
div
	
	datepicker(label="Период" name="period" type="month" :value="day().add(-1, 'month').format('YYYY-MM')")
	// v-checkbox(v-model='debug' label='Вывести отладочную инфу')
</template>

<script>
export default {
	data:()=>({ 
		debug: false
	})
}
</script>
