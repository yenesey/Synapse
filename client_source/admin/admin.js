import users from './users.vue'
import tasks from './tasks.vue'
import sched from './scheduler.vue'
//import dbquery from './dbquery.vue'

export default {
	'Пользователи' : { 
		icon : 'group',
		component: users
	},
	'Планировщик' : { 
		icon : 'schedule',
		component: sched
	},
	'SQL Запрос' : {
		icon:'view_list', 
		component: () => import(/*webpackChunkName:"dbquery(async)"*/'./dbquery.vue')  // can add webpackPrefetch: true
//		component: dbquery
	},
	'Задачи' : { 
		icon : 'timeline',
		component: tasks
	}
}
