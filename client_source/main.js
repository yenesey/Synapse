/**
 * Точка входа webpack и запуск Vue app
 */

/**
 * <<<Полифилы для поддержки IE11>>>
 * NOTE: Опция useBuiltIns: 'usage' для babel-loader не используется, потому что Vuetify не
 * собирается динамически; используется уже собранный бандл vuetify.min.js. От динамической сборки отказался по многим причинам.
 * А это значит, что у сборщика нет информации, какие фичи нужно 'подтянуть', и опция 'usage' бесполезна
 * С отказом от поддержки IE эту секцию можно будет выпилить
 */
import 'core-js/features/promise'
import 'core-js/features/symbol'
import 'core-js/features/set'
import 'core-js/features/map'
import 'core-js/features/math/cbrt'
import 'core-js/features/array/from'
import 'core-js/features/array/includes'
import 'core-js/features/array/find'
import 'core-js/features/array/index'
import 'core-js/features/object/keys'
import 'core-js/features/object/values'
import 'core-js/features/object/assign'
import 'core-js/features/string/starts-with'
import 'core-js/features/string/repeat'


import _ from 'lib' // note: lib is aliased in webpack.config.js
import store from './store' // Vuex store

import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import vuetify from './vuetify'

//////////////////////////////////////////////////////////
// регистрация компонент - глобально
;(function reg(context){
	context.keys().forEach(function(item){
		Vue.component(
			item.substring(2, item.lastIndexOf('.')), // -глобальное имя - по имени файла без расширения
			context(item).default
		) 
	})
	return reg
})(require.context('./components', false, /\.vue$/))(require.context('./tasks/components', false, /\.vue$/))

import taskWrapper from './task.vue'
import admin from './admin/admin.js'
import App from './app.vue'

function getWebsocketUrl () {
	let {protocol, host} = window.location
	return protocol.replace(/http/i, 'ws') + '//' + host.replace(/:\d+/, '')
}

if (typeof baseUrl !== 'undefined') _.baseUrl = baseUrl // eslint-disable-line

_.pxhr({method: 'get', url: 'users/access'})
.then(user => {
	if (user.success === false) {
		user.login = 'Нет доступа!'
		user.access = []
	}

	var menuGroups = user.access.filter(el => el.class === 'menu').sort((a, b) => a.id === b.id ? 0: a.id > b.id ? 1: -1)
	if (menuGroups.findIndex(el => el.name === 'default') === -1) 
		menuGroups.unshift({name: 'default', icon: 'chevron_right'})

	var access = _.keys(user.access, 'class', el => el.granted && !user.disabled) // берем только те, к которым доступ предоставлен

	/**
	 * router = {
	 *		path: '',
	 *		component: '' ,
	 *		children: [ {...router}, {...router} ]
	 * }
	 */

	var routes = [ // маршруты для Vue-router
		{
			path: '/', // root
			component: require('./start-page.vue').default
		}
	]

	// совмещаем список предоставленного доступа, с маршрутом, и элементами главного меню. 3-х зайцев одним выстрелом
	if (access.admin && access.admin.length)
		routes.push({
			path: '/admin',
			// name: 'Админ',
			icon: 'settings',
			component: {render: (h) => h('router-view')}, 
			children: access.admin.map(el => ({
					name: el.description,
					path: el.name,
					icon: admin[el.name].icon,
					component: admin[el.name].component
				})
			)
		})


	if (access.tasks && access.tasks.length){
		let allTasks = require.context('./tasks', false, /\.vue$/)
		routes.push({
			path: '/tasks',
			// name: 'Tasks',
			icon: 'timeline',
			component: {render: (h) => h('router-view')},
			children: access.tasks.sort((a, b) => (a.name === b.name ? 0: a.name > b.name ? 1: -1) ).map(el => {
				let task = allTasks.keys().find(key => key.substr(0, key.lastIndexOf('.')) === './' + el.name)
				let obj = (task)
					? allTasks(task).default
					: { render: (h) => h('pre', {}, /*[el.description]*/ ) }

				return {  
					name: el.name,
					path: String(el.id),
					icon: el.icon,
					menu: el.menu || 'default',
					component: {
						render: (h) => h(
							el.menu !== 'tools' ? taskWrapper : 'div', 
							{ props: {  id: el.id,  name: el.name, description: el.description } },  [ h(obj, {slot: 'default'}) ]   
						) 
					}
				}
			})
		})
	} 

	// запускаем приложение:
	new Vue({ 
		el: '#app',
		methods: { // todo: look at #https://vuejs.org/v2/guide/mixins.html#
			getWebsocketUrl: getWebsocketUrl
		},
		vuetify: vuetify,
		store: store,
		router: new VueRouter({ routes: routes }),
		render: (h) => h(App, { 
				props: {
					user: user.login, 
					routes: routes, 
					status: (user.err ? user.err.message: 'Добро пожаловать!'),
					menuGroups: menuGroups
				} 
			}
		)
	})

})
.catch(console.error) // eslint-disable-line