<template>
<div>

<pre>Формирование сообщения для отправки клиенту, 
содержащее ссылку для получения сертификата.
Аналог операции в ЦФТ: Клиенты → Физические лица
ДБО: Отправить клиенту ссылку для получения сертификата</pre>

	<dlookup
    label="Организация"
		:min-length=2
	  name="dog" 
	  table="IBS.VW_CRIT_FAKTURA" 
		fields="C_1, C_2, C_10"
	  result="ID"
	  look-in="%C_1%,%C_2%" 
	  where="C_8!='Закрыт'" 
		@select="clientSelected"
		:get-label="getLabelDog"
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
	<dlookup
    label="Сотрудник организации"
		:min-length=0
    v-model="person"
	  table="IBS.VW_CRIT_FAKTURA f, IBS.VW_CRIT_CL_ORG o, IBS.VW_CRIT_PERSONS_POS p" 
		fields="p.REF1, p.C_2"
    result="p.C_1"
	  look-in="%p.C_1%" 
	  :where="personWhere"
		:get-label="getLabelPerson"
	  style="width:400px"
	>
	 <!--переопределяем внешний вид выпадающего списка: -->
		<span slot-scope="{item, index}">
	 	  <b>{{item.C_1}}</b>
      <br>
 			<i>{{item.C_2}}</i>	
		</span>
	</dlookup>
  <br> 
  <v-text-field type="text" label="E-Mail" name="mail" style="width:260px;display:inline-block;" hide-details> </v-text-field> 
</div>
</template>

<script>
module.exports = {
	data : function(){
		return {
      person: '',
      personID: 0,
			dognum : '',
      personWhere: 'f.ID=0'
		}
	},
	methods : {
		clientSelected : function(event) {
				this.dognum = '№ ' + event.C_1 + ' от ' + event.C_10.split("-").reverse().join(".") + ' г.';
        this.person = '';
        this.personID = 0;
        this.personWhere = "f.ID=" + event.ID + " and o.ID=f.REF2 and p.COLLECTION_ID=o.REF11	and p.C_3 <= SYSDATE and (p.C_4 > SYSDATE or p.C_4 is NULL)"
		},

		getLabelDog : function(item){
			return item.C_2 
		},

		getLabelPerson : function(item){
      this.personID = item.REF1
			return item.C_1 
		}
	}
}	
</script>

