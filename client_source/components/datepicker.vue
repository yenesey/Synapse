<template>
	<div style="display:inline-block;width:128px">
		<v-menu
				ref="menu"
				:close-on-content-click="false"
				v-model="menu"
				:nudge-right="40"
				lazy
				transition="scale-transition"
				offset-y
				full-width
				min-width="290px"
			>
				<v-text-field
					slot="activator"
					v-model="date"
					:label="label || 'Дата:'"
					:name="name"
					prepend-icon="event"
					readonly
				></v-text-field>

				<v-date-picker v-model="date" scrollable @input="menu=false" :type="type" first-day-of-week=1 locale="ru-ru" >
					<v-spacer></v-spacer>
					<v-btn flat color="blue" @click="clear()">Очистить</v-btn>
					<v-btn flat color="blue darken-2" @click="today()" v-if="!type">Сегодня</v-btn>
					<v-btn flat color="primary" @click="menu = false">Отмена</v-btn>
				</v-date-picker>
		 </v-menu>
	</div>
</template>

<script>
import moment from 'moment';

export default {
	props: ['name', 'type', 'value', 'label'],

	data : function() {
		return {
			menu: false,
			date: this.value || ''
		}
	},

	watch : {
		date : function(newVal){	
			this.$emit('input', newVal)
		},
		value : function(newVal) {
			if (newVal)
				this.date = newVal
		}
	},	

	mounted : function() {
			// установка атрибутов для input для сохранения / загрузки и передачи параметра в форму (FormData)
	/*		var self = this;
			var visible = self.$el.querySelectorAll('input')[0];
			var hidden = visible.parentElement.appendChild( document.createElement('input')	);
//			visible.setAttribute('name', self.name+'_visible');
			hidden.setAttribute('hidden', true);	
			hidden.setAttribute('name', self.name);	

			if (typeof self.save !== 'undefined'){
				visible.setAttribute('save', self.name + '_visible');
				hidden.setAttribute('save', self.name);	
			}

			if (typeof self.value !== 'undefined'){
				visible.setAttribute('value', self.value); //!!!
				hidden.setAttribute('value', self.value); //!!!
			}

			self.$refs.hidden = hidden;	
			self.$refs.visible = visible;*/
	},
	methods:{
		today(){
			this.menu = false; 
			this.date= moment().format('YYYY-MM-DD');
		},

		clear(){
			this.menu = false; 
			this.date= '';
		}
	}

}
</script>
