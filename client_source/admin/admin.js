import users from './users.vue'
import tasks from './tasks.vue'
import sched from './scheduler.vue'
//import dbquery from './dbquery.vue'

export default {
	1 : { 
		icon : 'group',
		component: users
	},
	2 : { 
		icon : 'schedule',
		component: sched
	},
	3 : {
		icon:'view_list', 
		component: () => import(/*webpackChunkName:"dbquery(async)"*/'./dbquery.vue')  // can add webpackPrefetch: true
//		component: dbquery
	},
	4 : { 
		icon : 'timeline',
		component: tasks
	}
}
