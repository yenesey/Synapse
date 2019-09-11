<template>
<div>
	<dlookup 
    label="Подразделение"
	  name="deps" 
	  table="IBS.VW_CRIT_BRANCH" 
	  order="C_1"
	  look-in="%C_1%,%C_2%" 
	  fields="C_2" 
	  result="C_1" 
		:min-length=0
		:get-label="getLabel"
	  style="width:200px;display:inline-block"
	> 
		<!--выпадающий список можно формировать самому:-->
		<span slot-scope="{item, index}"> {{item.C_2}} <i style="color:teal">{{' (' + item.C_1 + ')'}}</i></span>
	</dlookup>
</div>
</template>

<script>
export default {
	methods: {
		getLabel:(item)=>item.C_2
	}
}
</script>