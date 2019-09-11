<template>
<div>

<pre>Формирование сообщения/заявки на выполнение указанных действий по договорам ДБО.
ДБО - дистанционное банковское обслуживание</pre>

	<dlookup
    label="Организация"
		placeholder="Введите часть наименования для поиска"
		:min-length=2
	  name="dog" 
	  table="IBS.VW_CRIT_BANK_CLIENT" 
		fields="C_3, C_1, C_2"
	  result="ID"
	  look-in="%C_1%,%C_3%" 
	  :where="whereDog"
		@select="clientSelected"
		:get-label="getLabel"
	  style="width:400px"
	>
	 <!--переопределяем внешний вид выпадающего списка: -->
		<span slot-scope="{item, index}">
	 	  <b>{{item.C_3}}</b>
      <br>
 			<i>{{'(№ ' + item.C_1 + ' от ' + item.C_2.split("-").reverse().join(".") + ')'}}</i>	
		</span>
	</dlookup>
  <br>
  <i v-if="dognum">Договор {{dognum}}</i>

  <v-checkbox label="закрыть Договор" v-model="closeDog" :click="option = []"></v-checkbox>

  <div v-if="!closeDog">
    <label for="file"><i>Файлы:</i></label> <br>
    <input type="file" name="filename" multiple/> 
    <br><br>

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
    				{ text:'Регистрация ключа ЭП', value : 1 },
    				{ text:'Блокировка ключа ЭП', value : 2 },
            { text:'Подключить MAC-токен', value : 3 },
            { text:'Блокировать MAC-токен', value : 4 },
            { text:'Подключить OTP-токен', value : 5 },
            { text:'Блокировать OTP-токен', value : 6 },
            { text:'Добавить счет', value : 7 },
            { text:'Установить разрешенные IP-адреса',value : 8 },
            { text:'Подключить "SMS-банкинг"',value : 9 },
            { text:'Изменить Наименование',value : 10 },
            { text:'Изменить Полное наименование',value : 11 },
            { text:'Изменить Наименование (англ)',value : 12 },
            { text:'Изменить КПП',value : 13 },
            { text:'Изменить Юридический адрес',value : 14 },
            { text:'Изменить Фактический адрес',value : 15 },
            { text:'Изменить Адрес (англ)',value : 16 },
            { text:'Другое', value : 17 }
           ] 
		}
	},
  
  computed: {
    whereDog () { return "CLASS_ID='IFC_IBANK'" + (this.closeDog ? "" : " and C_10='Работает'")}
  },

	methods : {
		clientSelected : function(event) {
				this.dognum = '№ ' + event.C_1 + ' от ' + event.C_2.split("-").reverse().join(".") + ' г.';
		},

		getLabel : function(item){
			return item.C_3 
		}
	}
}	
</script>

