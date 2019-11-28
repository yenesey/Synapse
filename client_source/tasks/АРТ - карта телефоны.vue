<template lang="pug">
	div
		pre.subheading Для ежедневной выгрузки номеров телефонов клиентов
		datepicker(name='date' label='Дата' :value='day().format("YYYY-MM-DD")')
		v-checkbox(v-model='onScreen' label='Вывести на экран')
</template>


<script>
export default {
	data:()=>({ 
		onScreen: true
	})
}
</script>

