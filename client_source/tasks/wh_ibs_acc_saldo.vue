<template lang="pug">
	div
		datepicker(label="Дата" name="date" :value="day().format('YYYY-MM-DD')" style="margin-top:15px")
		v-text-field(v-model="bs" v-mask="mask" label="Бал. счет" autocomplete="off" dense style="max-width:140px")
		v-checkbox(hide-details v-model='merge' label='Обновить существующие данные и долить отсутствующие (merge)')
</template>

<script>

import { mask } from 'vue-the-mask'

export default {
	directives: {
		mask
    },	
	data:()=>({ 
		merge: true,
		bs: '',
		mask: '#####'
	})

}
</script>
