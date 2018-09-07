import Vue from 'vue'

import {
	Vuetify,
	VApp,
	VNavigationDrawer,
	VAlert,
	VFooter,
	VList,
	VBtn,
	VCheckbox,
	VTextField,
	VIcon,
	VGrid,
	VToolbar,
	VDialog,
	VCard,
	VDatePicker,
	VMenu,
	VSwitch,
	VTooltip,
	VSelect,
	transitions
} from 'vuetify'

import 'vuetify/src/stylus/app.styl';
//import 'vuetify/dist/vuetify.min.css';
import 'material-design-icons-iconfont/dist/material-design-icons.css'; 
//import '@fortawesome/fontawesome-free/css/all.css'; 


Vue.use(Vuetify, {
	components: {
		VApp,
		VNavigationDrawer,
		VAlert,
		VFooter,
		VList,
		VBtn,
		VCheckbox,
		VTextField,
		VIcon,
		VGrid,
		VToolbar,
		VDialog,
		VCard,
		VDatePicker,
		VMenu,
		VSwitch,
		VTooltip,
		VSelect,
		transitions
	},

	lang: {
		current: 'ru-ru'
	},

	theme: {
		primary: '#ACDBFF',
		secondary: '#424242',
		accent: '#82B1FF',
		error: '#FF5252',
		info: '#2196F3',
		success: '#4CAF50',
		warning: '#FFC107'
	},
})
