/*
	Компонент для элементов формы 
----------------------------------------
	<array>
		<template slot-scope="{el, index}"> -- template - опционально
			<любой компонент | DOM элемент>
		</template>
	</array>

*/

<script>
import deepClone from './vue-deep-clone.js';

export default {
	props : {	
		value : Array
	},

	data: function(){
		return {
			renderData : this.value? this.value : [this._empty()]
		}		
	},

	render: function (h) {
		var self = this;
	
		function btn(value, index, size){
			if (
				((value === '-') && (size === 1)) ||
				((value === '+') && (index < size - 1))
			) return null;

			return h('input',	{
				style:{
					'padding': '0',
          'margin-left': '0.2rem',
          'margin-top': '0.4rem',
					'width': '1.5em',
					'float': 'left',
					'border-style': 'outset',
					'border-width': '1px'
//					'border-color': 'buttonface'
				}, 
				attrs:{type:'button', value: value}, 
				on:{
					click:function(){ 
						if (value === '-')
							self.del(index).then(function(){
								return self.$emit('change', self)
							}) 
						if (value === '+')
							self.add().then( function(){
								return self.$emit('change', self)
							}) 
					}
				} 
			})
		}
			
		return h('div', {class:'array'},
			[	h('input', {attrs:{type:'hidden', name:'array-begin'}})	] //маркер начала массива для парсинга формы
			.concat(	
				this.renderData.map(function(el, index, obj){
					return h('div', {key : el._id ? el._id : JSON.stringify(el) + index, class:'array-item', style : {clear:'both'}}, 
						[ 
							h('div', { class:'array-item-wrapper', style : {display:'inline-block', float:'left'}},
								self.$scopedSlots.default
									? [self.$scopedSlots.default({el : el, index : index})] 
									: deepClone(self.$slots.default, h)
							),
							btn('-', index, obj.length),
							btn('+', index, obj.length)
						]
					)
				})
			)
			.concat([
				h('input', {attrs:{type:'hidden', name:'array-end'}}) //маркер окончания массива соответсвенно
			])
		)
	},
	
	methods : {
		_empty : function(){
			return {_id: Date.now() + Math.floor(Math.random() * (10000 - 0)) + 0}
		},	

		add : function(){
			var idx = this.renderData.push( 
				this.value 
					? this.renderData[this.renderData.length-1] 
					: this._empty() 
			) - 1;
			return this.$nextTick().then( function(){return idx});
		},
		del : function(index){
			this.renderData.splice(index, 1);
			return this.$nextTick();
		},
		clear : function(){
			this.renderData = [];
			return this.$nextTick();
		}
	},

	watch: {
		value : function(newValue) {
			this.renderData = newValue;
		}
	}



}
</script>