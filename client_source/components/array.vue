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
		value : Array,
		'b-size' : String
	},

	data: function(){
		return {
			renderData : this.value? this.value : [this._empty()],
			btnSize : 18,
			rowHeight : 18
		}		
	},
	mounted: function(){
		this.rowHeight = this.$el.children[1].clientHeight;
		if (this.bSize)
			this.btnSize = this.bSize
		else
			this.btnSize = this.rowHeight;
	},
	render: function (h) {
		var self = this;
	
		function controls(index, total){

			function button(v){
				return h('input',	{
						style:{
							'cursor':'default',
							'font-style':'normal',
							'position': 'absolute',
							'margin-top' : (self.rowHeight - self.btnSize) / 2 + 'px',
							'width': self.btnSize + 'px',
							'height': self.btnSize + 'px',
							'right': (v === '-'? self.btnSize + 'px': '0'),
							'top': 0,
							'text-align': 'center',
							'padding': '0',
							'border-style': 'outset',
							'border-width': '1px',
							'border-color': 'buttonface'
						}, 
						attrs:{type:'button', value: v}, 
						on:{
							click:function(){ 
								if (v === '-')
									self.del(index).then(function(){
										return self.$emit('change', self)
									}) 
								if (v === '+')
									self.add().then( function(){
										return self.$emit('change', self)
									}) 
							}
						} 
					})
			}
			
			return h('div',	{class:'array-controls'}, 
				(index === 0 && (total - 1) === 0)
					? [button('+')]
					: (total - 1 > index)
						? [button('-')]
						: [button('-'), button('+')]
				)
		}
			
		return h('div', {class:'array'},
			[	h('input', {attrs:{type:'hidden', name:'array-begin'}})	] //маркер начала массива для парсинга формы
			.concat(	
				this.renderData.map(function(el, index, obj){
					return h('div', {key : el._id ? el._id : JSON.stringify(el) + index, class:'array-elem'}, 
						[ 
							h('div', { class:'array-slot-wrap'},
								self.$scopedSlots.default
									? [self.$scopedSlots.default({el : el, index : index})] 
									: deepClone(self.$slots.default, h)
							),
							controls(index, obj.length)
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

<style>

.array-elem {
	clear : both;
	position : relative
}

.array-slot-wrap {
	display: inline-block;
}

.array-controls {


}


</style>