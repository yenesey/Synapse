<template>
<div>

<pre>Формирование сообщения/заявки на выполнение указанных действий по договорам ДБО.
ДБО - дистанционное банковское обслуживание</pre>

	<dlookup
    label="Организация"
		placeholder="Введите часть наименования для поиска"
		:min-length=2
	  name="dog" 
	  table="IBS.VW_CRIT_FAKTURA" 
		fields="C_1, C_2, C_10"
	  result="ID"
	  look-in="%C_1%,%C_2%" 
    :where="whereDog"
		@select="clientSelected"
		:get-label="getLabel"
	  style="width:400px"
	>
	 <!--переопределяем внешний вид выпадающего списка: -->
		<span slot-scope="{item, index}">
	 	  <b>{{item.C_2}}</b>
      <br>
 			<i>{{'(№ ' + item.C_1 + ' от ' + item.C_10.split("-").reverse().join(".") + ')'}}</i>	
		</span>
	</dlookup>
  <br>
  <i v-if="dognum">Договор {{dognum}}</i>
  <br> 

  <v-checkbox label="закрыть Договор" v-model="closeDog" :click="option = []"></v-checkbox>

  <div v-if="!closeDog">
    <label for="file"><i>Заявления:</i></label> <br>
    <input type="file" name="filename" multiple/> 
    <br> <br>
    <array style="width:670px" b-size=24>
      <template slot-scope="{el, index}">
        <v-select 
    			style="width:350px; display:inline-block;"	
          :items="items"
    	    v-model="option[index]"
    	    hide-details
          no-data-text=""
    	    dense
        />
      	<v-text-field type="text" name="optionText" style="width:260px;display:inline-block;" hide-details> </v-text-field> 
    	</template>
  	</array>
  </div>
</div>
</template>

<script>
module.exports = {
	data : function(){
		return {
			dognum : '',
      closeDog : false,
      option : [],		 
    	items: [
            { text:'Подключить / изменить Договор', value : 0 },
            { text:'Выдать сертификат', value : 1 },
            { text:'Объявить сбойным сертификат', value : 2 },
            { text:'Подключить счет', value : 3 },
            { text:'Подключить депозит', value : 4 },
            { text:'Другое', value : 5 }
           ] 
		}
	},

  computed: {
    whereDog () { return "C_8='Работает' or C_8='Заблокирован'" + (this.closeDog ? " or C_8='Закрыт'" : "")}
  },

	methods : {
		clientSelected : function(event) {
				this.dognum = '№ ' + event.C_1 + ' от ' + event.C_9.split("-").reverse().join(".") + ' г.';
		},

		getLabel : function(item){
			return item.C_2 
		}
	}
}	
</script>

