<template lang="pug">
div
	datepicker(name='date' label='Дата' :value='day().format("YYYY-MM-DD")')
	v-checkbox(hide-details v-model='onScreen' label='Вывести на экран')
</template>


<script>
export default {
	data:()=>({ 
		onScreen: true
	})
}
</script>

