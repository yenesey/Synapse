<template>
	<v-app>
		<v-navigation-drawer
			class="blue lighten-4"
			persistent
			:clipped="clipped"
			v-model="drawer"
			enable-resize-watcher
			fixed
			app
			style="z-index:10"
		>

		 <v-list class="blue lighten-4">

				<v-list-tile @click="navigate('/')">
					<v-list-tile-action>
						<v-icon>account_circle</v-icon>
					</v-list-tile-action>
					<v-list-tile-title class="user">{{user}}</v-list-tile-title>
				</v-list-tile>

				<template v-for="(group, index) in menuGroups"> <!-- перебор групп меню-->
					<!-- default оформляем без группы-->
					<v-list-tile 
						v-if="group.name==='default'"
						v-for="task in tasks[group.name]" 
						:key="task.path" 
						@click="navigate('/tasks/'+task.path)"
						ripple
					>
						<v-list-tile-action>
							<v-icon v-text="task.icon || group.icon || 'chevron_right'"></v-icon>
						</v-list-tile-action>
						<v-list-tile-content>
							<v-list-tile-title>{{task.name || 'noname'}}</v-list-tile-title>
						</v-list-tile-content>
					</v-list-tile>

					<!-- все прочие кроме default пихаем в группу (при наличии доступных элементов)-->
					<v-list-group v-if="group.name!=='default' && tasks[group.name]">
						<v-list-tile 
							slot="activator" 
							@click="navigate('/tasks')"
							ripple
						>
							<v-list-tile-action>
								<v-icon v-text="group.icon"></v-icon>
							</v-list-tile-action>
							<v-list-tile-content>
								<v-list-tile-title v-text="group.description || group.name" />
							</v-list-tile-content>
						</v-list-tile>
	
						<v-list-tile 
							v-for="task in tasks[group.name]" 
							:key="task.path" 
							@click="navigate('/tasks/'+task.path)"
							ripple
						>
							<v-list-tile-action class="ml-3">
								<v-icon v-text="task.icon || group.icon || 'chevron_right'"></v-icon>
							</v-list-tile-action>
							<v-list-tile-content>
								<v-list-tile-title>{{task.name || 'noname'}}</v-list-tile-title>
							</v-list-tile-content>
						</v-list-tile>
					</v-list-group>
				</template>	
			
			</v-list>
		</v-navigation-drawer>


		<v-toolbar
			app
			:clipped-left="clipped"
			height = "48px"
			class="blue lighten-4"
			style="z-index:9"
		>
			<v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>

<!--
			<v-btn icon @click.stop="miniVariant = !miniVariant">
				<v-icon v-html="miniVariant ? 'chevron_right' : 'chevron_left'"></v-icon>
			</v-btn>
-->			
			<v-btn icon @click.stop="clipped = !clipped">
				<v-icon>web</v-icon>
			</v-btn>

			<v-spacer></v-spacer>
				<v-toolbar-title>{{dev?'!!! dev-mode !!!':''}}</v-toolbar-title>

			<v-spacer></v-spacer>
			<v-toolbar-title>Synapse</v-toolbar-title>

			<v-menu offset-y v-if="admin">
				<v-btn icon 
					slot="activator">
					<v-icon v-html="admin.icon"></v-icon>
				</v-btn>

				<v-list>
					<v-list-tile
					 	router :to="'/admin/'+item.path"
						v-for="(item, index) in admin.children"
						:key="index"
					 >
						<v-list-tile-action>
							<v-icon>{{ item.icon }}</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ item.name }}</v-list-tile-title>
					</v-list-tile>
				</v-list>
			</v-menu>
		
		</v-toolbar>

		<v-content>
			<v-container fluid> 
				<v-slide-y-transition mode="out-in">
					<keep-alive>
						<router-view :key="$route.fullPath"></router-view>
					</keep-alive>
				</v-slide-y-transition>
			</v-container>
		</v-content>
		
	 <!-- 
		<v-navigation-drawer
			temporary
			:right="right"
			v-model="rightDrawer"
			fixed
			app
		>
			<v-list>
				<v-list-tile @click="right = !right">
					<v-list-tile-action>
						<v-icon>compare_arrows</v-icon>
					</v-list-tile-action>
					<v-list-tile-title>Switch drawer (click me)</v-list-tile-title>
				</v-list-tile>
			</v-list>
		</v-navigation-drawer>
-->

		<v-footer app>
			<span>&copy; 2016-2018 Denis Bogachev&nbsp;</span><v-icon>scatter_plot</v-icon>
<!--			<v-icon>account_balance</v-icon><span>Ταυρ - δεζαιη &copy; 2018</span> -->
		</v-footer>
	</v-app>
</template>

<script>
import {keys} from 'lib'

export default {
	name : 'app_view',
	props : {
		user : String,
		status : String,
		routes : Array,
		menuGroups : Array
	},
	computed : {
		dev:() => window.location.port !== '',
		admin(){
			return this.routes.find(r=>r.path==='/admin')
		},
		tasks(){
			var _tasks = this.routes.find(r=>r.path==='/tasks');
			if (_tasks && _tasks.children)
				return keys(_tasks.children, 'menu' /*menu is objects.class in synapse.db*/ )
			return {};
		}
	},

	data() {
		return {
			clipped: false,
			drawer: true,
			miniVariant: false,
			right: false,
			rightDrawer: true
		}
	},
	methods : {
		navigate(to){
			this.$root.$router.push(to)
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