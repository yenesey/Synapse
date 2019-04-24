import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)

const STORE_PREFIX = 'store_'
const PERSISTENT = ['navWidth']

// state
const state = {
	navWidth: 200
}

// getters
const getters = {
	navWidth: (state) => state.navWidth
}

// actions
const actions = {
	
}

// mutations
const mutations = {
	setNavWidth (state, width) {
		state.navWidth = width
	}
}


// restore state from LS just before Vuex storage creation
PERSISTENT.forEach(key => {
	let value = localStorage.getItem(STORE_PREFIX + key)
	if (value) {
		try {
			value = JSON.parse(value) // - who knows, is there complex or simple value?
		} catch (err) {}
			state[key] = value
		}
})

const store = new Vuex.Store({
	state,
	getters,
	mutations,
	actions
})

store.subscribe((mutation, state) => {
	PERSISTENT.forEach(key => {
		localStorage.setItem(STORE_PREFIX + key, state[key])
	})
})

export default store
