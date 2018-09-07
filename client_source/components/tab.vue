<script>
/*
	Tab for Tabs 2.0 (полностью переписано под Vue 2.x)
                        (c)	Денис Богачев <d.enisei@yandex.ru>
*/
export default {
	name : 'tab', 
	props:[
		'name', //нужен для статической разметки
		'id',
		'tab'
	], 
	template : '<div class="tab-pane" v-show="active" > <slot></slot>  </div>',

	mounted : function(){
		if (!this.$parent.extendable) 
			this.$parent.tabData.push({ name: this.name	});
	},

  computed : {
		active : function() {
			return this.$parent.tabs().indexOf(this) === this.$parent.activeIndex
		}
	}		
}

</script>