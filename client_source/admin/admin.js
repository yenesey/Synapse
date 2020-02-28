import users from './users.vue'
import tasks from './tasks.vue'
import sched from './scheduler.vue'
import system from './system.vue'
//import dbquery from './dbquery.vue'

export default {
	'users' : {
		icon : 'group',
		component: users
	},
	'scheduler' : {
		icon : 'schedule',
		component: sched
	},
	'sql' : {
		icon:'view_list', 
		component: () => import(/*webpackChunkName:"dbquery(async)"*/'./dbquery.vue')  // can add webpackPrefetch: true
//		component: dbquery
	},
	'tasks' : { 
		icon : 'timeline',
		component: tasks
	},
	'system' : { 
		icon : 'build',
		component: system
	}
}
