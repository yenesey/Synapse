<template>
<v-flex class="xs12">
	<div @keydown="keyPreview">
		<tabs @add="add" @rename="rename" @close="close" ref="tabs">
			<dbquery-form/>
		</tabs>

    	<v-dialog v-model="dialog" width="450">
    	  <v-card>
    	    <v-card-title class="headline">Внимание!</v-card-title>
    	    <v-card-text>Текст запроса будет потерян! Уверены, что хотите закрыть вкладку?</v-card-text>
    	    <v-card-actions>
    	      <v-spacer></v-spacer>
    	      <v-btn color="red lighten-2"  @click.native="actualClose">Да</v-btn>
    	      <v-btn color="blue lighten-4" @click.native="dialog = false">Нет</v-btn>
    	    </v-card-actions>
    	  </v-card>
    	</v-dialog>

	</div>
</v-flex>	
</template>

<script>

import dbq from './dbquery-form.vue';

export default {
	data : function(){
		return {
			dialog: false,
			toClose : null
		}
	},

  components : {
    'dbquery-form': dbq
  },

	mounted : function(){ //при появлении в DOM
		var tabs = this.$refs.tabs;
		Object.keys(localStorage)
		.filter(function(key){ return (key.substr(0,7) === 'sql?id=')})
		.reduce(function(p, key){
			return p.then(function(){
				return tabs.add('',key.substr(7))
					.then(function(tab){
						tab.components[0].load() 
					})
			})	
		}, Promise.resolve())
	},
	activated : function(){
		window.tst = this
		document.addEventListener('keydown', this.keyPreview)
	},

	deactivated : function(){
		document.removeEventListener('keydown', this.keyPreview);
	},
	methods: {
		keyPreview : function(event){
			if (event.keyCode===120){  // 120 = F9
				var tab = this.$refs.tabs.activeTab;
				if (tab) tab.components[0].query();
				event.preventDefault();
			}
			return false
		},

		actualClose(){
			this.toClose.components[0].remove(); 
			this.toClose.close(); 
			this.dialog = false;
			this.toClose = null;
		},

		close : function(tab) {
			this.dialog = true;
			this.toClose = tab;
		},
		rename : function(tab) {
			tab.components[0].save();
		},
		add : function(tab) {

		} 
	} 
}
</script>

<style>

</style>

