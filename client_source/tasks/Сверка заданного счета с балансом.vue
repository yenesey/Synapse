<template lang="pug">
div
	pre Выполняется сверка синтетического и аналитического учета в АБС (без участия WAREHOUSE)
	datepicker(label="Дата" name="date" value="")
	v-text-field(v-model="bs" v-mask="mask" label="Бал. счет" autocomplete="off" dense style="max-width:140px")
</template>

<script>
import { mask } from 'vue-the-mask'
export default {
	directives: {
		mask,
    },	
	data:()=>({ 
		debug: false,
		bs: '',
		mask: '#####'
	})
}
</script>
