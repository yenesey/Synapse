<template>
<div>

	<pre>Тестирование интерфейсных элементов и передачи параметров в рамках функционала "tasks"</pre>
    <h2>dlookup (ibso)</h2>
	<dlookup
		label="Клиент"
		placeholder="Введите часть наименования для поиска"
		:min-length=2
		name="client" 
		table="IBS.VW_CRIT_CL_ORG" 
		fields="C_1, C_2, C_3"
		result="ID"
		look-in="%C_2%"
		where="not C_3 is null" 
		@select="clientSelected"
		style="width:500px"
		:get-label="getLabel"
		save
	>
		<span slot-scope="{item, index}">
			{{item.C_2}}
			<i style="color:teal">{{' (рег №' + item.C_1 + ' ИНН ' + item.C_3 + ')'}}</b></i>
		</span>
	</dlookup>

    <br>
    <h2>dlookup (sqlite)</h2>
	<dlookup
		label=""
		placeholder="Введите"
		:min-length=2
		db="./db/synapse.db"
		table="system" 
		fields="id,name, value"
		result="id"
		look-in="%name%"
		style="width:500px"
		:get-label="getLabel"
	>
		<span slot-scope="{item, index}">
			{{item.name}}
			<i style="color:teal">{{' ' + item.value + ' ' }}</b></i>
		</span>
	</dlookup>

</tabs>

</div>
</template>

<script>
import dayjs from 'dayjs';

export default {
	data:()=>({
    dates01: ['2019-01-05'],
    dates02: [],
    dates03: [],
    dates04: [],
		picker : null,
    dialog: false,
    label : [],
    option : [],		 
    		items: [
    				{ text:'Первый пункт', value : 1 },
    				{ text:'Второй пункт', value : 2 },
            { text:'Третий пункт', value : 3 }
           ] 	
	}),


	methods : {
		clientSelected(event) {
			this.C_1 = event.C_1;
			this.C_2 = event.C_2;
		},
    getList(item) {
      return `${item.C_2} (${item.C_1})` 
    },
    getValue(item) {
      return item.C_1
    },
		getDep : function(item){
			console.log(item) 
		},
		getLabel : function(item){
			return item.C_3 
		}
	}
}
</script>

<style>
.v-text-field {
	padding-top : 0;
}
</style>