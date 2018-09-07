<script>
'use strict';
import {pxhr} from 'lib';
import Autocomplete from './autocomplete.vue';

export default {

	props: {
		'db' : String,		 //имя базы sqlite, или псевдоним 'ldap:', если не указано - oracle
		'table': String,	//имя таблицы или вьюхи
		'fields': String, //поля, которые нужно вернуть
		'result' : String, //поле - результат для form submission
		'look-in' : String,//поле (или поля через запятую) по которым выполняется поиск look-in="C_1%, %C_3%" 
		'where' : String,	//опциональная конструкция SQL 'where'
		'order' : String,	//опциональная конструкция SQL 'order by'
		'minLength' : {type: Number, default: 2 }, //минимум после которого начинается поиск
		'name' : String,	 //?
		'value' : String,
		'placeholder' : String,
		'save' : String,
		'get-label' : Function //function(item) return String (label)
	}, 

	components: {
		Autocomplete
	},		

	render : function(h) { 
		return h('autocomplete', {
			//использую рендер вместо шаблона для того чтобы передать транзитом scopedSlots от dlookup в autocomplete
				scopedSlots: this.$scopedSlots, 
				on : {
					'item-selected' : this.handleSelect,
					'input' : this.input
				}, 
				props : {
					'get-label' : this.getLabel,
					'query-search' : this.querySearch,
					'value' : this.value, 
					'min-length': this.minLength
				}  
		})
	},

	mounted : function() {
	// установка атрибутов для input для сохранения / загрузки и передачи параметра в форму (FormData)
		var self = this;
		var view = self.$el.querySelectorAll('input')[0];
		var result = self.$el.appendChild(document.createElement('input'));
		view.setAttribute('name', self.name+'_view');
		result.setAttribute('hidden', true);	
		result.setAttribute('name', self.name);
		result.setAttribute('autocomplete', 'address-level1');

		if (typeof self.save !== 'undefined'){
			view.setAttribute('save', self.name + '_view');
			result.setAttribute('save', self.name);	
		}
		self.$refs.result = result;	
		self.$refs.view = view;	
	},

	methods : {
		handleSelect : function(item){
			var self = this;
			if (typeof self.result !== 'undefined')	
				self.$refs.result.value = item[self.result];
			else
				self.$refs.result.value = item;
			self.$nextTick().then(function(){
				self.$emit('select', Object.assign({}, item));//-- событие родительскому компоненту
			})
		},

		input : function(label){
			this.$emit('input', label)
		},
		
		querySearch : function(queryString, cb) {
			var self = this;
			pxhr({method:'post', url:'/dlookup',
				data : {
					db     : self.db,
					table  : self.table,
					request: queryString || '%',
					where	 : self.where,
					order	 : self.order,
					lookIn : self.lookIn,
					fields : self.fields + (self.result?','+self.result:'')
				}
			})
			.then(function(res){
				if (typeof res.error !== 'undefined')	throw new Error(res.error);
				cb(res);
			})
			.catch(function(err){
				cb([{error : err.message}]);
				console.log(err)
			})
		}//querySearch

	} //methods
	
}
</script>

<style>
</style>
