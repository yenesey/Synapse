<template lang="pug">
	div
		pre.subheading Дата на
		datepicker(name="date1" label="Дата актуализации")
		v-checkbox(v-model="putFiles" name="putFiles" label="Выложить файлы на отправку")
</template>


<script>
export default {
	data:()=>({ 
		putFiles: false
	})
}
</script>

