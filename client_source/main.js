//////////////////////////////////////////////////////////
//	Ключевые моменты, для понимания кода:
//	1. vue-loader для webpack (-->require.context)
//	2. Vue, VueRouter
//	3. render: function(h)
//

import {keys, pxhr} from 'lib' //note: lib is aliased in webpack.config.js

import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import 'babel-polyfill'
import './vuetify'


//////////////////////////////////////////////////////////
//регистрация компонент - глобально 
(function reg(context){
	context.keys().forEach(function(item){
		Vue.component(
			item.substring(2, item.lastIndexOf(".")), //-глобальное имя - по имени файла без расширения
			context(item).default
		) 
	})
	return reg
})(require.context('./components', false, /\.vue$/))(require.context('./tasks/components', false, /\.vue$/))


import Task from './task.vue'
Vue.component('task-icon', { render : (h)=>h(null) } )	//dummy for store icon names
Vue.component('task-section', { render : (h)=>h(null) } )	//dummy for store task section id's

import admin from './admin/admin.js'
import main from './main.vue'


pxhr({method:'get', url:'/access/map'})
.catch(err=>({login: 'Нет доступа!', access:[], err : err})) 
.then(user=>{
	var access = keys(user.access, 'class', el=>el.granted && !user.disabled) /*берем только те, к которым доступ предоставлен */

	var routes = [ //маршруты для Vue-router
		{
			path: '/', //root
			component: require('./start-page.vue').default
		}
	]

	//совмещаем список предоставленного доступа, с маршрутом, и элементами главного меню. 3-х зайцев одним выстрелом
	if (access.admin && access.admin.length)
		routes.push({
			path:'/admin',
//			name: 'Админ',
			icon: 'settings',
			component: {render : (h) => h('router-view')}, 
			children :	access.admin.map(el=>({
					name : el.name,
					path : String(el.id),
					icon : admin[el.id].icon,
					component : admin[el.id].component
				})
			)
		})


	if (access.admin && access.tasks.length){
		let allTasks = require.context("./tasks", false, /\.html$/)
		routes.push({
			path:'/tasks',
			//name: 'Tasks',
			icon: 'timeline',
			component: {render : (h) => h('router-view')},
			children :	access.tasks.map(el=>{
				let fileName = './'+el.name + '.html';
				let obj = (allTasks.keys().indexOf(fileName) !== -1)
					?allTasks(fileName).default	
					:{ render : (h) => h('pre', {}, [el.description] ) }

				return {	
						name : el.name,
						path : String(el.id),
						icon : /\("task-icon"[\s\S\w\W]+?\(\s*?"([\w]+?)"\s*?\)[\s\S\w\W]*?\)/.test(obj.render.toString())?RegExp.$1 : '',
						section:/\("task-section"[\s\S\w\W]+?\(\s*?"([\w]+?)"\s*?\)[\s\S\w\W]*?\)/.test(obj.render.toString())?RegExp.$1 : 'default',
						component : {
							render : (h) => h(Task, {	props : {	id : el.id,	name : el.name } },	[	h(obj, {slot:'default'}) ] 	) 
						}
				}
			})
		})
	}	

	//запускаем приложение:
	new Vue({ 
		el : '#app', 
		render:(h) => h(main, {props:{user : user.login,	routes : routes, status: (user.err?user.err.message:'Добро пожаловать!') } }),
		router : new VueRouter({routes : routes})
	})

})
.catch(console.error); //eslint-disable-line

