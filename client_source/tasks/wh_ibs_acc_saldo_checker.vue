<template lang="pug">
div
	datepicker(label="Дата" name="date" value="")
	// v-checkbox(v-model='debug' label='Вывести отладочную инфу')
</template>

<script>
export default {
	data:()=>({ 
		debug: false
	})
}
</script>
