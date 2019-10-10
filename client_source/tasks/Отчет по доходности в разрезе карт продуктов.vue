<template lang="pug">
div
	datepicker(label="Дата отчета" name="period" type="month" :value="moment().add(-1, 'month').format('YYYY-MM')")

</template>

<script>
export default {
	methods: {
		getLabel : function(item){
			return item.C_1 
		}
	}
}
</script>
