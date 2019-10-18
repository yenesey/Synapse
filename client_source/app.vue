<template lang="pug"> 
v-app
	v-navigation-drawer.blue.lighten-4(app :width='navWidth' :value='navVisible' :clipped='navClipped' style='z-index:10' ref='nav')
		v-list.blue.lighten-4
			v-list-item.elevation-1(@click='navigate("/")' )
				v-list-item-icon
					v-icon account_circle
				v-list-item-title.user {{user}}

			v-divider

			v-list-group(v-for='(group, index) in menuGroups' :key='index' :prepend-icon='group.icon || "chevron_right"')
				v-list-item-title(
					slot='activator',
					@click="navigate('/tasks')",
					ripple
				) {{group.name === 'default' ? 'Общее' : group.description || group.name}}
				v-list-item.ml-4(
					v-for='task in tasks[group.name]',
					:key='task.path',
					@click="navigate('/tasks/'+task.path)",
					ripple
				)
					v-list-item-icon
						v-icon(v-text="'chevron_right'") //task.icon || group.icon || 
					v-list-item-title {{task.name || 'noname'}}

	v-app-bar.blue.lighten-4.elevation-1(app, :clipped-left='navClipped', height='48px', style='z-index:9'  ref='toolbar')
		v-app-bar-nav-icon(@click.stop="toggleNav('Visible')")
		v-btn(icon @click.stop="toggleNav('Clipped')" v-show='navVisible')
			v-icon web
		template(v-if='devServer')
			v-spacer
			v-toolbar-title <-- dev-server -->
		v-spacer
		v-toolbar-title Synapse
		v-menu(offset-y='', v-if='admin')

			template(v-slot:activator="{ on }")
				v-btn(icon v-on="on")
					v-icon(v-html='admin.icon')
			v-list
				v-list-item(router='', :to="'/admin/'+item.path", v-for='(item, index) in admin.children', :key='index')
					v-list-item-icon
						v-icon {{ item.icon }}
					v-list-item-title {{ item.name }}
	v-content(ref='content')
		div.dragbar(@mousedown='initDrag')
		v-container(style='padding:1.3rem')
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
				startX: 0, 
				startWidth: 0
			}
		}
	},
	computed : {
		devServer: () => window.location.port !== '',
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
	methods: {
		navigate(to){
			if (to !== this.$root.$router.currentRoute.fullPath) this.$root.$router.push(to)
		},

		toggleNav (flag) {
			let key = 'nav' + flag
			this.$store.commit(key, !this[key])
		},

		initDrag: function(e){
			var doc = document.documentElement
			doc.style.cursor = 'col-resize'
			doc.addEventListener('mousemove', this.doDrag, false)
			doc.addEventListener('mouseup', this.stopDrag, false)

			this.drag.startX = e.clientX
			this.drag.startWidth = this.navWidth
			for (var ref in this.$refs) this.$refs[ref].$el.style['transition-property'] = 'none'
			e.target.style['background-color']='rgba(0,0,0,0.32)'
			e.stopPropagation()
			e.preventDefault()
		},
			
		doDrag: function(e) {
			var width = this.drag.startWidth - (this.drag.startX - e.clientX)
			if (width < 100) width = 100
			this.$store.commit('navWidth', width)
		},

		stopDrag : function (e) {
			var doc = document.documentElement
			doc.style.cursor = 'default'
			doc.removeEventListener('mousemove', this.doDrag, false)
			doc.removeEventListener('mouseup', this.stopDrag, false)
			e.target.style['background-color']='rgba(0,0,0,0.12)'
			for (var ref in this.$refs) this.$refs[ref].$el.style['transition-property'] = 'all'
		}
	}

}
</script>

<style>
@font-face {
	font-family: 'Sony_Sketch_EF';
	font-style: normal;
	font-weight: 400;
	src: url('./assets/Sony_Sketch_EF.woff') format('woff'); 
}

@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url("./assets/MaterialIcons-Regular.woff") format("woff");
}

.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'liga'; 
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
		0 0   1px rgba(0,0,0,.1),
		0 2px 4px rgba(0,0,0,.3),
		0 5px 6px rgba(0,0,0,.2);

}
nav .v-list {
	padding: 0;
}

nav .v-list-item__icon {
	align-self: center;
}

nav .v-list .v-list-item {
	height: 22px;
	color: #444;
}

nav .v-list .v-list-group--active {
	background-color: #d1ecff;
}

.v-list .v-list-item__icon:first-child {
    margin-right: 16px;
}


.user {
	height:28px;
	margin-top: -0.125em; 
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
	/*
	text-shadow:	
		0 0 5px rgba(0,0,0,.1), 
		0 1px 3px rgba(0,0,0,.3), 
		0 3px 5px rgba(0,0,0,.2),
		0 5px 10px rgba(0,0,0,.25);
	*/
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
	margin: 0.6em  0em 0.6em 0em;
}

.dragbar {
	position: absolute; 
	top: 0px;
	width: 6px;
	bottom: 0px;
	background-color: rgba(0,0,0,0.12);
	cursor: col-resize;
}

/*-----------------------*/

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
/*
table.synapse {
	border: 1px solid #a8cfe6 !important;
	border-radius: 3px;
	margin-bottom: 1em;
	float: left;
}

table.synapse th {
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

table.synapse input[type="checkbox"]{
	width:auto !important;
}
*/

</style>