import Vue from 'vue'
import 'vuetify/dist/vuetify.min.css'

import {
	Vuetify,
	VApp,
	VNavigationDrawer,
	VAlert,
	VFooter,
	VList,
	VBtn,
	VInput,
	VCheckbox,
	VTextField,
	VIcon,
	VGrid,
	VDataTable,
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

Vue.use(Vuetify, {
	components: {
		VApp,
		VNavigationDrawer,
		VAlert,
		VFooter,
		VList,
		VBtn,
		VInput,
		VCheckbox,
		VTextField,
		VIcon,
		VGrid,
		VDataTable,
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
