<script>
/*
  Tabs 2.0 (полностью переписано под Vue 2.x)

                   (c)	Денис Богачев <d.enisei@yandex.ru>
--------------------------------

  Использование
  1. базовая разметка:
  <tabs>
    <tab name="Tab-1">
      ......
    </tab>
     <tab name="Tab-2">
      ......
    </tab>
  </tabs>

  2. авторежим (в этом случае табы имеют возможность добавления/удаления/редактирования):
  <tabs>
    ......
  </tabs>
*/

import deepClone from './vue-deep-clone.js';
import tab from './tab.vue'

export default {
//шаблон полностью переписан в виде 'render' функции с одной единственной целью:
//в Vue 2.x убрали возможность писать <slot v-for...> (выдается ошибка)
//теперь для клонирования контента используется deepClone

	components: {
		tab : tab
	},		

	render : function(h){ //TODO: переписать на JSX ???
		var self = this;
		return h('div', {}, [ 
			h('ul', {class:'nav nav-tabs'}, 
				self.tabData.map(function(el, index){
					el.index = index;
					return h('li', {
						class: {
							'active': index === self.activeIndex,	
							'editing': index === self.editingIndex
						},
						on : {
							click : function (event) { self.activeIndex = index },
							dblclick : function (event) { self.editingIndex = index }
						}}, [
							h('div', {class:'view'}, [ 
								h('a', el.name),
								h('div', { 
									class:'edit',
									attrs: {type:'text', contenteditable:'true' }, 
									domProps : {innerText : el.name},  
									directives: [ {name: 'tab-focus'} ],
									on :{
										keyup : function(event){ if (event.keyCode === 13) self.rename(el, event.target.innerText); if (event.keyCode === 27) self.editingIndex =- 1 },
										blur  : function(event){ self.rename(el, event.target.innerText) },
										keydown : function(event){ if (event.keyCode === 13) event.preventDefault() }
									}}
								),
								(self.extendable) 
									?h('icon-circle', { style:{position: 'relative' }, on: {click : function (event) { self.close(el) }} })
									:null
							])		
						])
				}).concat( 
					(self.extendable) 
						? h('li', { on : {	click : self.extend }},[ h('div', {class:'view'}, [ h('a', String.fromCharCode('10133'))] ) ]) : null
				)
			),//<ul>
			(self.extendable) 
			?h('div', {class:'tab-content'}, 
				self.tabData.map(function(el, index){
					return h('tab', {
							key : el._id,
							props : {name : el.name, id : el._id, tab : el},
							attrs : {index : index}
						}, 
						deepClone(self.$slots.default, h)
					)
				})
			)
			:h('div', {class:'tab-content'}, self.$slots.default )
		])
	},

  data : function(){
    return {
			tabData : [],
      activeIndex : 0,
			editingIndex : -1
    }
  },

	computed : {
		extendable : function(){ 
			return this.$slots.default[0].componentOptions.tag !== 'tab'
		},
		activeTab : function(){ 
			if (this.tabData.length === 0) return null
			return this.tabData[this.activeIndex]
		}
	},

	methods : {
		tabs : function(){ 
			return this.$children.filter(function(child){
				return child.$options.name === 'tab';
			}) || []
		},

		extend : function(){
			var n = 1;
			while (	
				this.tabData.find(function(tab){return tab.name === 'Tab-' + n	}) 
			) n++;
			this.add('Tab-' + n);
		},

		add : function(name, id){
			var self = this;
			var tab = {
				_id : id || Date.now(), //если id не указан (а обычно он и не указывается)
				name : name,
				index : -1, 
				close : function(){ 
					self.tabData.splice(this.index, 1);
					self.activeIndex--;
					if (self.activeIndex < 0) self.activeIndex = 0;
				}
			};

			self.tabData.push(tab); //после добавления начнется создание и прорисовка нового таба

			return self.$nextTick() //нам нужен $nextTick чтобы успели отрендериться компоненты на добавленной вкладке
			.then(function(){
				tab.components = self.tabs()[tab.index].$children; //только теперь мы можем получить .$children
				self.$emit('add', tab);
				return tab 
			})
		},

		rename : function(tab, newHeader){
			this.editingIndex = -1;
			if (tab.name == tab.newHeader) return;
			this.$emit('rename', tab);
			tab.name = newHeader;
		},

		close : function(tab){
			this.$emit('close', tab);
		} 
	},

	directives : {
		'tab-focus' : function(el){ el.focus() }
	}

}
</script>

/*---------------------------------------------------------*/

<style scoped>
.nav {
  padding-left: 0;
  margin-bottom: 0;
  margin-top: 0;
  list-style: none;
  display: table;
}

.nav > li {
  position: relative;
  display: block;
}
.nav > li > div {
  position: relative;
  display: inline-block;
  padding: 5px;
}


.nav > li > div > a{
  cursor: default;
  position: relative;
  line-height: 1.2;
  display: inline-block;
  padding: 2px;
  color: #2D3E4D;
}

.nav > li > div > a:hover{
  text-decoration: none;
}

.nav > li > div:hover,
.nav > li > div:focus {
  text-decoration: none;
  background-color: #eee;
}

/*edit tab name*/
.nav li.editing .edit {
	cursor: text;
	color: #6C8CA9;
  display: inline-block;
	padding: 2px;
	margin-right: 4px;
	float: left;
	border:none;	
	outline:none;
}

.nav li .edit {
	display: none;
}

.nav li.editing a {
	display: none;
}

/**/

/*-----------------*/
.nav-tabs {
  border-bottom: 1px solid #ddd;
	margin-bottom: 10px;
}

.nav-tabs > li {
  float: left;
  margin-bottom: -1px;
}

.nav-tabs > li > div {
  margin-right: 2px;
  border: 1px solid transparent;
  border-radius: 4px 4px 0 0;
}
.nav-tabs > li > div:hover {
  border-color: #eee #eee #ddd;
}

.nav-tabs > li.active > div,
.nav-tabs > li.active > div:hover,
.nav-tabs > li.active > div:focus {
  color: #555;
  cursor: default;
  background-color: #fff;
  border: 1px solid #ddd;
  border-bottom-color: transparent;
}

.tab-pane {
	position: initial;
	left: 20px;
	right:20px;
}

</style>