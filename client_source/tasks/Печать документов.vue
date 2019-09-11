<template>
<div>

<pre>Формирование указанных документов по договорам ДБО.
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
  <br> <br>
	<table class="synapse" style="float:none">
		<thead>
			<tr>
				<th>
          <b>Документы</b>
				</th>
			</tr>
		</thead>

		<tbody>
			<tr> 
				<td style="padding-right:30px;vertical-align: baseline">
					<template v-for="el in docs">
            <v-checkbox 
              :label="el.label" 
              :name="el.name"
              style="margin:0;" 
              hide-details> 
            </v-checkbox> 
					</template>
				</td>
			</tr>
		</tbody> 
	</table>
</div>
</template>

<script>
module.exports = {
	data : function(){
		return {
			dognum : '',
      docs : [  {name:"dsAcc",    label:"ДС к Договору Счета"},
                {name:"pPravila", label:"Подтверждение о присоединении"},
                {name:"dsDeposit",label:"ДС к Соглашению о проведении депозитных сделок"},
                {name:"zDeposit", label:"Заявление о присоединении к Правилам размещения депозитов"},
                {name:"dsDBO",    label:"ДС к Договору ДБО"},
                {name:"aToken",   label:"Акт приема-передачи ключевого носителя"},
                {name:"zInclude", label:"Заявление на подключение к системе"},
                {name:"zEdit",    label:"Заявление на изменение прав"},
                {name:"zStop",    label:"Заявление на приостоновление/возобновление обслуживания"},
                {name:"zClose",   label:"Заявление на отключение"},
                {name:"zIP",      label:"Заявление на установление IP-адресов"} ]
		}
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

