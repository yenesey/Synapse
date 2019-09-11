<template>
<div>
	<dlookup
    name="deps" 
    label="Подразделение"
		db="./db/synapse.db" 
		table="objects LEFT JOIN objects_meta ON objects.id = objects_meta.object"
		fields="objects_meta.meta" 
		result="name"
		look-in="objects.name%" 
		where="objects.class = 'deps'"
    :min-length=0
		style="width:250px;display:inline-block"
    :get-label="getLabel"
	>
  	<span slot-scope="{item, index}"> {{JSON.parse(item.meta).description}} <i style="color:teal">{{' (' + (item.name=='002%' ? '002-00%' : item.name) + ')'}}</i></span>
	</dlookup>
</div>
</template>

<script>
export default {
	methods: {
		getLabel : (item)=> JSON.parse(item.meta).description
	}
}
</script>