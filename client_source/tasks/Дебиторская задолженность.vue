<template>
<div>

<pre>Формирование распоряжения об отражении дебиторской задолженности (приложение 7)</pre>

  <datepicker label="Дата отчета" name="date" :value="moment().format('YYYY-MM-DD')"></datepicker> 
  <br>

  <label for="user"><i>Исполнитель:</i></label>
  <dlookup 
    name="user" 
    table="IBS.VW_CRIT_USER" 
    look-in="C_1%" 
    fields="C_1,C_3" 
    result="ID" 
    style="width:300px" 
		:get-label="getLabel"
    save
  >
	 <!--переопределяем внешний вид выпадающего списка: -->
    <span slot-scope="{item, index}">
     {{item.C_1}}<br>
    	<i>[</i> 	
    	<i style="font-weight:bold;color:teal">{{item.C_3}}</i>
     	<i>]</i>  
    </span>
  </dlookup>
  <br>

  <label for="user"><i>Руководитель:</i></label>	
  <dlookup 
    name="user_chief" 
    table="IBS.VW_CRIT_USER" 
    look-in="C_1%" 
    fields="C_1,C_3" 
    result="ID" 
    style="width:300px"
		:get-label="getLabel" 
    save
  >
	 <!--переопределяем внешний вид выпадающего списка: -->
  	<span slot-scope="{item, index}">
  	 {{item.C_1}}<br>
  		<i>[</i> 	
  		<i style="font-weight:bold;color:teal">{{item.C_3}}</i>
  	 	<i>]</i>  
  	</span>
  </dlookup> 

</div>
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