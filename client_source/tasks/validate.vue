<template>
<div>

<pre>Тестирование интерфейсных элементов и передачи параметров в рамках функционала "tasks"</pre>
		                      
<tabs>
	<tab name="Первый">
    <H2>dlookup</H2>
      <br>
    	<dlookup
        label="Клиент (Договор ДБО)"
    		placeholder="Введите часть наименования для поиска"
    		:min-length=2
    		name="dog" 
    		table="IBS.VW_CRIT_BANK_CLIENT" 
    		fields="C_3, C_1, C_2"
    		result="ID"
    		look-in="%C_1%,%C_3%" 
    		where="C_10='Работает'" 
    		@select="clientSelected"
    		style="width:500px"
    	  :get-label="getLabel"
    		save
    	>
    		<span slot-scope="{item, index}">
    		  {{item.C_3}}
    		  <i><b>{{' (№' + item.C_1 + ' от ' + item.C_2 + ')'}}</b></i>
    		</span>
    	</dlookup>

    <br>
    <H2>array</H2>
      <array style="width:670px" b-size=24>
    		<template slot-scope="{el, index}">
    			<v-select 
    				style="width:350px; display:inline-block;"	
    				:menu-props="{maxHeight: 600}"
        	  :items="items"
    	  	  v-model="option[index]"
    	  	  hide-details
            no-data-text=""
    	  	  dense
        	/>
        	<v-text-field type="text" name="optionText" style="width:260px;display:inline-block;" hide-details> </v-text-field> 
      	</template>
    	</array>	

      <array style="width:300px" >
    		<template slot-scope="{el, index}">
          <dlookup
            label="Исполнитель"
        		db="ldap:"
        		fields="displayName,mail" 
        		look-in="displayName%,mail%"
            
        	>
            <i slot-scope="{item, index}">
              {{item.displayName}} <i style="color:teal"> {{(item.mail) ? '(' + item.mail + ')':''}} </i>
            </i>
        	</dlookup>  
      	</template>
    	</array>	
	
    <br>
    <H2>datepicker</H2>
      <br>
      <datepicker name="date1" label="День"></datepicker> 	

      <datepicker name="date2" label="Месяц" type="month"></datepicker> 

	</tab>

	<tab name="Второй">
			<v-date-picker v-model="dates01" multiple picker-date first-day-of-week=1 locale="ru-ru" no-title min="2019-01-01" max="2019-01-31"/>
			<v-date-picker v-model="dates02" multiple picker-date first-day-of-week=1 locale="ru-ru" no-title min="2019-02-01" max="2019-02-31"/>
			<v-date-picker v-model="dates03" multiple picker-date first-day-of-week=1 locale="ru-ru" no-title min="2019-03-01" max="2019-03-31"/>
			<v-date-picker v-model="dates04" multiple picker-date first-day-of-week=1 locale="ru-ru" no-title min="2019-04-01" max="2019-04-31"/>
	</tab>

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