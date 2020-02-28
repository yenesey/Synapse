
import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'

Vue.use(Vuetify)
/*
Vue.use(vuetify, {
	lang: {
		locales: {ru},
		current: 'ru'
	}
});
*/
const opts = {
    icons: {
        iconfont: 'mdiSvg', // 'mdi' || 'mdiSvg' || 'md' || 'fa' || 'fa4'
	},
	theme: {
		themes: {
			light: {
				primary: '#ACDBFF',
				secondary: '#424242',
				neutral: '#d9e8f6',
				accent: '#82B1FF',
				error: '#FF5252',
				info: '#ACDBFF',
				success: '#4CAF50',
				warning: '#FFC107'
			}
		}
	}

}

export default new Vuetify(opts)