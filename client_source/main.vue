<template lang="pug"> 
v-app
	v-navigation-drawer.blue.lighten-4(:width='navWidth' :value='navVisible' :clipped='navClipped' fixed app style='z-index:10' ref='nav')
		v-list.blue.lighten-4
			v-list-tile(@click="navigate('/')")
				v-list-tile-action
					v-icon account_circle
				v-list-tile-title.user {{user}}
			template(v-for='(group, index) in menuGroups')
				// перебор групп меню
				// default оформляем без группы
				v-list-tile(v-if="group.name==='default'", v-for='task in tasks[group.name]', :key='task.path', @click="navigate('/tasks/'+task.path)", ripple='')
					v-list-tile-action
						v-icon(v-text="task.icon || group.icon || 'chevron_right'")
					v-list-tile-content
						v-list-tile-title {{task.name || 'noname'}}
				// все прочие кроме default пихаем в группу (при наличии доступных элементов)
				v-list-group(v-if="group.name!=='default' && tasks[group.name]")
					v-list-tile(slot='activator', @click="navigate('/tasks')", ripple='')
						v-list-tile-action
							v-icon(v-text='group.icon')
						v-list-tile-content
							v-list-tile-title(v-text='group.description || group.name')
					v-list-tile(v-for='task in tasks[group.name]', :key='task.path', @click="navigate('/tasks/'+task.path)", ripple='')
						v-list-tile-action.ml-3
							v-icon(v-text="task.icon || group.icon || 'chevron_right'")
						v-list-tile-content
							v-list-tile-title {{task.name || 'noname'}}
	v-toolbar.blue.lighten-4(app='', :clipped-left='navClipped', height='48px', style='z-index:9')
		v-toolbar-side-icon(@click.stop="toggleNav('Visible')")
		v-btn(icon @click.stop="toggleNav('Clipped')" v-show='navVisible')
			v-icon web
		v-spacer
		v-toolbar-title {{dev?'!!! dev-mode !!!':''}}
		v-spacer
		v-toolbar-title Synapse
		v-menu(offset-y='', v-if='admin')
			v-btn(icon='', slot='activator')
				v-icon(v-html='admin.icon')
			v-list
				v-list-tile(router='', :to="'/admin/'+item.path", v-for='(item, index) in admin.children', :key='index')
					v-list-tile-action
						v-icon {{ item.icon }}
					v-list-tile-title {{ item.name }}
	v-content
		v-container(fluid='')
			v-slide-y-transition(mode='out-in')
				keep-alive
					router-view(:key='$route.fullPath')
	v-footer(app='')
		v-icon account_balance
		span Denis Bogachev © 2016-2018 
</template>

<script>
import { keys } from 'lib'
import { mapState } from 'vuex'

export default {
	name : 'app_view',
	props : {
		user : String,
		status : String,
		routes : Array,
		menuGroups : Array
	},
	data() {
		return {
			drag: {
				el: null,
				startX: 0, 
				startWidth: 0
			}
		}
	},
	computed : {
		dev: () => window.location.port !== '',
		admin() {
			return this.routes.find(r=>r.path==='/admin')
		},
		tasks () {
			var _tasks = this.routes.find(r=>r.path==='/tasks');
			if (_tasks && _tasks.children)
				return keys(_tasks.children, 'menu' /*menu is objects.class in synapse.db*/ )
			return {}
		},
		...mapState(['navWidth', 'navVisible', 'navClipped'])
	},
	mounted () {
		this.drag.el = document.querySelector('.v-navigation-drawer__border')
		this.drag.el.style.cursor='col-resize'
		this.drag.el.addEventListener('mousedown', this.initDrag)
	},
	methods : {
		navigate(to){
			this.$root.$router.push(to)
		},

		toggleNav (flag) {
			let key = 'nav' + flag
			this.$store.commit(key, !this[key])
		},

		initDrag: function(e){
			var de = document.documentElement
			de.style.cursor = this.drag.el.style.cursor
			de.addEventListener('mousemove', this.doDrag, false)
			de.addEventListener('mouseup', this.stopDrag, false)
			this.drag.startX = e.clientX
			this.drag.startWidth = this.navWidth
			this.drag.el.style['background-color']='rgba(0,0,0,0.32)'
			this.$refs.nav.$el.style['transition-property'] = 'none'
			e.stopPropagation()
			e.preventDefault()
		},
			
		doDrag: function(e) {
			var width = this.drag.startWidth + e.clientX - this.drag.startWidth
			if (width < 100) width = 100
			this.$refs.nav.$el.style.width = this.width + 'px'
			this.width = width
			this.$store.commit('navWidth', width)
		},

		stopDrag : function (e) {
			var de = document.documentElement
			de.style.cursor = 'default'
			de.removeEventListener('mousemove', this.doDrag, false)
			de.removeEventListener('mouseup', this.stopDrag, false)
			this.drag.el.style['background-color']='rgba(0,0,0,0.12)'
			this.$refs.nav.$el.style['transition-property'] = 'transform, width'
		}
	}

}
</script>

<style>
@font-face {
	font-family: 'Sony_Sketch_EF';
	src: url('./assets/Sony_Sketch_EF.woff') format('woff'); 
}

.v-toolbar__title {
	top: 50%;
	margin-top: -0.425em; 
	font-family: 'Sony_Sketch_EF';
	font-size: 2.0em;
	padding-right: 25px;
	font-style: italic;
	user-select: none;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	text-shadow:	
		0 0 5px rgba(0,0,0,.1), 
		0 1px 3px rgba(0,0,0,.3), 
		0 3px 5px rgba(0,0,0,.2),
		0 5px 10px rgba(0,0,0,.25); 
}

.user{
	height:28px;
	font-family: 'Sony_Sketch_EF'; 
	font-size: 1.45em;
	white-space: nowrap;
	overflow: hidden;
	text-overflow : ellipsis;
	color: #353d42;

	user-select: none;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	text-shadow:	
		0 0 5px rgba(0,0,0,.1), 
		0 1px 3px rgba(0,0,0,.3), 
		0 3px 5px rgba(0,0,0,.2),
		0 5px 10px rgba(0,0,0,.25);
} 

.container h3 {
	margin-top:0;
	color:#57768A;
	font-size: 1.1em; 
}

.container pre{
	font-family: monospace;
	color: teal; 
	font-size: 1.15em; 
/*	font-style: italic;*/
	margin: 0.6em 0.5em 1.6em 0.5em;
}

/*-----------------------*/
/*.v-navigation-drawer {
	transition: none !important;
}*/
.v-navigation-drawer__border {
	width: 6px;
}
/*-----------------------*/
.v-list__tile {
	height : 42px;
	transition: all .18s !important;
}

.v-list__tile:hover{
	padding-left:+20px !important;	
}


.v-list__tile__action {
	min-width : 32px;
}

.v-list__group__header--active {
	background: #A2D1F5;
}

.v-list__group__header .v-list__tile__title { 
	font-weight : bold;
}



.fade-enter-active, .fade-leave-active {
	transition: all 0.08s cubic-bezier(1.0, 0.5, 0.8, 1.0)
}
.fade-enter, .fade-leave-to {
	opacity: 0
}

::-webkit-scrollbar {
	width: 0.7em;
	height: 0.7em;
}
::-webkit-scrollbar-thumb {
	background: #a9bbc7; 
	border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover{
	-webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3); 
}
::-webkit-scrollbar-track {
	-webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3); 
	background: white;
}

/*---------------------table.synapse-----------------------*/

table.synapse {
	border: 1px solid #a8cfe6 !important;
	border-radius: 3px;
	margin-bottom: 1em;
	float: left;
}

table.synapse th {
/*	background: linear-gradient(to bottom, #b6dff6, #a8cfe6);*/
	background: #ACDBFF;
	color: black;
	cursor: default;
	text-align: center;
}

table.synapse td {
	 background-color:transparent;
}

table.synapse th, table.synapse td {
	padding: 3px 5px;
	user-select: none;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
}

table.synapse tbody tr td {
	padding:0.2em 0.1em 0.1em 0.1em;
}

table.synapse tbody tr:hover, table.synapse tbody  tr:hover input, table.synapse tbody  tr:hover select{
	background-image: linear-gradient(to bottom, #d0edf5, #e1eff0 100%);
/*  border-style: groove;*/
}

table.synapse tr.error, table.synapse tr.error input{
	color: red;
}

table.synapse tr.selected, table.synapse tr.selected input, table.synapse tr.selected select{
	background-image: linear-gradient(to bottom, #d0edf5, #e1e5f0 100%);
}
/*
table.synapse input, table.synapse select{
	line-height:1.1em;
	font-family: inherit;
	font-size: 0.96em;
	border:none;
	width:100%;
}
*/
table.synapse input[type="checkbox"]{
	width:auto !important;
}

</style>