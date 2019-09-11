<template>
<div>

<pre>Копирование файлов по маске с FIO.</pre>

  <v-select 
    				style="width:350px; display:inline-block;"	
    				:menu-props="{maxHeight: 600}"
        	  :items="items"
    	  	  v-model="item"
    	  	  hide-details
            no-data-text=""
    	  	  dense
        	/>
  <br> <br>
  <v-text-field label="Источник" :value="locate.src" type="text" name="src" style="width:260px;display:inline-block;" hide-details> </v-text-field> 
  <br> <br>
  <v-text-field label="Маска файлов" :value="locate.mask" type="text" name="mask" style="width:260px;display:inline-block;" hide-details> </v-text-field> 
</div>
</template>

<script>

module.exports = {
	data : function(){
		return {
			item : 0,
    	items: [
    				{ text:'Ошибки загрузки ЭД', value : 0 },
    				{ text:'Журналы РЦ', value : 1 },
    				{ text:'Протоколы закрытия ОД', value : 2 },
            { text:'Архив', value : 3 },
            { text:'Входящие 440-П', value : 4 }
           ] 
		}
	},
	computed : {
		locate : function(){
			if (!this.item) this.item = 0;
			return [ 
					{src: 'trc2/errors', mask: '*.*'},
          {src: 'trc2', mask: 'YY-MM-DD*.*'},
          {src: 'LOGS/LOG_END_OD/002', mask: '*MMDD*.*'},
          {src: 'trc2/archive', mask: 'YY-MM-DD.*'},
          {src: '365P/002/IN', mask: '*.VRB'} 
				]
				[this.item]
		}
	}
}	
</script>