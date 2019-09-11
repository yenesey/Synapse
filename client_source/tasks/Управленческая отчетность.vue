<template>
<div>
<pre>
</pre>

<table class="synapse" style="margin-top:2em; float:none;">
		<tr>
			<th colspan=3 style="font-weight: normal;">Условия отбора</th>
		</tr>
	  <tr>
	    <td align="center"> 
				с <datepicker placeholder="Начало" name="dateBegin" :value="moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD')"></datepicker> 
				по <datepicker placeholder="Окончание" name="dateEnd" :value="moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')"></datepicker> 
			</td>

	    <td>
	    	<v-switch style="display:inline-block"
      		label="Кредиты"
      		v-model="credit"
    		/>
	    	<v-switch style="display:inline-block"
      		label="Депозиты"
      		v-model="deposit"
    		/>
	    	<v-switch style="display:inline-block"
      		label="Тек. счета"
      		v-model="account"
    		/>
			</td>
	  </tr>

		<th colspan=3 style="font-weight: normal;"></th>

	  <tr>
	    <td align="center"> 
				с <datepicker  v-model="d1" placeholder="Начало" name="dateBegin"></datepicker>
				по <datepicker v-model="d2" placeholder="Окончание" name="dateEnd"></datepicker>
			</td>

	    <td>
	    	<v-switch
      		label="Актив.кл."
      		v-model="clients"
    		/>
			</td>	
	  </tr>


</table>

</div>
</template>

<script>
var moment = require('moment');

module.exports = {
	data : function(){
		return {
			credit : false,
			deposit : false,
			account : false,
			clients : false,
			d1 : moment().subtract(3, 'month').startOf('month').format('YYYY-MM-DD'),
			d2 : moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
		}
	},
  watch:{
		d2 : function(newVal){
			if (newVal)
				this.d1 = moment(newVal).subtract(2, 'month').startOf('month').format('YYYY-MM-DD');
		}
	}
	
}


</script>

<style>
.switch {
	-ms-user-select: none;
  font-size: 14px !important;
}
</style>

