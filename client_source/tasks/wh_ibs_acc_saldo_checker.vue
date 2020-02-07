<template lang="pug">
div
	datepicker(label="Дата" name="date" value=""  style="margin-top:15px")
	// v-checkbox(v-model='debug' label='Вывести отладочную инфу')
</template>

<script>
export default {
	data:()=>({ 
		debug: false
	})
}
</script>
