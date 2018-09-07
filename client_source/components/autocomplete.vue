<template lang="html">
	<div class="autocomplete">
		<div class="autocomplete-input-group" :class="{'autocomplete-selected': value}">
			<icon-circle @click="clear" title="clear" />
			<input 
				autocomplete="off"
				v-model="searchText" 
				:placeholder="placeholder"
				:class="inputClass"
				:disabled="disabled"
				@blur="blur"
				@focus="focus"
				@input="input"
				@keydown.enter.prevent="keyEnter"
				@keydown.up="keyUp"
				@keydown.down="keyDown"
			>
		</div>
		<div class="autocomplete-list" v-if="showList && internalItems.length">
			<div 
				class="autocomplete-list-item" 
				v-for="(item, i) in internalItems"
				@click="onClickItem(item)"
				:class="{'autocomplete-item-active': i === cursor}"
				>
					<slot :item="item" :index="i"> 
						<!--//default draw item :-->
						<span>{{ Object.values(item).join(',') }}</span> 
					</slot>
			</div>
		</div>
	</div>
</template>

<script>
import {debounce} from 'lib';

export default {
	name: 'autocomplete',
	props: {
		placeholder: String,
//		wait: { type: Number, default: 500 },
		minLength : {type: Number, default: 2 },
		value: '',
		getLabel: {	type: Function,	default: function(item){return Object.values(item).join(",")}},
		querySearch: { type: Function, default : null },
		items: Array,
//		autoSelectOneItem: { type: Boolean, default: true },
		inputClass: {type: String, default: 'autocomplete-input'},
		disabled: {type: Boolean,	default: false}
	},
	data : function(){
		return {
			searchText: '',
			showList: false,
			cursor: -1,
			internalItems: this.items || []
		}
	},
	methods: {
		clear : function(event){
			this.searchText = '';
			this.internalItems = [];
			this.$emit('input', '')
		},

		input : function() {
			this.showList = true
			this.cursor = -1
			this.onSelectItem(null, 'inputChange')
			this.$emit('input', this.searchText)
			this.updateItems();
		},

		updateItems : debounce(function(){
			if (this.searchText.length >= this.minLength)
				if (this.querySearch) 
					this.querySearch(this.searchText,  this.setItems)
		}, 500, false), 

		focus : function(){
			if (this.minLength ===0 )
				this.clear(null)
			this.updateItems();
			this.showList = true
		},
		blur : function() {
			var self = this;
			setTimeout( function(){ self.showList = false}, 200)
		},
		onClickItem : function(item) {
			this.onSelectItem(item)
			this.$emit('item-clicked', item)
		},
		onSelectItem : function(item) {
			if (item) {
				this.internalItems = [item]
				this.searchText = this.getLabel(item)
				this.$emit('item-selected', item)
//			console.log(JSON.stringify(item));
				this.$emit('input', this.searchText)
			} else {
				this.setItems(this.items)
			}
		},
		setItems : function(items) {
			this.internalItems = items || []
		},
		isSelecteValue : function(value) {
			return 1 == this.internalItems.length && value == this.internalItems[0]
		},
		keyUp : function(e) {
			if (this.cursor > -1) {
				this.cursor--
				this.itemView(this.$el.getElementsByClassName('autocomplete-list-item')[this.cursor])
			}
		},
		keyDown : function (e) {
			if (this.cursor < this.internalItems.length) {
				this.cursor++
				this.itemView(this.$el.getElementsByClassName('autocomplete-list-item')[this.cursor])
			}
		},
		itemView : function(item) {
			if (item && item.scrollIntoView) {
				item.scrollIntoView(false)
			}
		},
		keyEnter : function(e) {
			if (this.showList && this.internalItems[this.cursor]) {
				this.onSelectItem(this.internalItems[this.cursor])
				this.showList = false
			}
		}
	},
	created : function() {
		var self = this;
		self.$nextTick().then(function(){
			self.onSelectItem(self.value)
		})
	},
	watch: {
		items : function(newValue) {
			this.setItems(newValue);
		/*	if (!this.searchText) return;
	   	if (this.autoSelectOneItem && this.items.length == 1) {
				this.onSelectItem(this.items[0]);
				this.showList = false
   	 	}*/
		},
		value : function(newValue) {
//			this.searchText = this.getLabel(newValue)
				this.searchText = newValue;
			/*if (!this.isSelecteValue(newValue) ) {
				this.onSelectItem(newValue)
			}*/
		}
	}
}
</script>

<style>

.autocomplete {
   position: relative;
}

.autocomplete-input {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
/*
  border-radius: .2em;
  border: 1px solid rgb(191, 203, 217);
  box-sizing: border-box;
  color: rgb(31, 45, 61);
  font-size: inherit;

  height: 1.8em;
	font-size:0.9em;
	padding: 2px 8px;

  outline: 0;
*/
  transition: border-color .2s cubic-bezier(.645,.045,.355,1);
 	width: 100%;
	padding-right: 2em;
}

.autocomplete-input::-ms-clear {display: none; width : 0; height: 0;}
.autocomplete-input::-ms-reveal {display: none; width : 0; height: 0;}

.autocomplete > .autocomplete-input-group >.autocomplete-input {

}

.autocomplete .autocomplete-list {
	transform-origin: center top 0px;
	position: absolute;
  z-index: 2012;
	padding: 0.2em 0.2em;
  width: 150%;
  text-align: left;
  max-height: 400px;
  overflow-y: auto;
	background-color: white;

	margin: 5px 0;
	border-radius: 2px;
	box-shadow: 0 0 6px 0 rgba(0,0,0,.04), 0 2px 4px 0 rgba(0,0,0,.12);
  transform-origin: center top 0px;
  border: 1px solid #d1dbe5;
	box-sizing: border-box;
}

.autocomplete-list-item {
	font-size : 1em;
  padding: 0.2em 0.2em;
  line-height: 1.4em;
  cursor: pointer;
}

.autocomplete-list-item:hover {
  color : #57768A;
  background-color: #e4e8f1;
}

.autocomplete-item-active {
  color : #ffffff;
  background-color: #acdbff;
}

/*
.autocomplete-list {
  -webkit-animation: acFadeInDown 200ms cubic-bezier(0.23, 1, 0.32, 1); 
         animation: acFadeInDown 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes acFadeInDown {
  from {
    opacity: 0;
		height: 0px;
  }
  to {
    opacity: 1;
		height: 100%;
  }
}

@-webkit-keyframes acFadeInDown {
  from {
    opacity: 0;
		height: 0px;
  }
  to {
    opacity: 1;
		height: 100%;
  }
}
*/


</style>