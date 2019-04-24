import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)

const STORE_PREFIX = 'store_'

// state
const state = {
	navWidth: 200,
	navVisible: true,
	navClipped: false
}

// getters
const getters = {
	navWidth: (state) => state.navWidth,
	navVisible: (state) => state.navVisible,
	navClipped: (state) => state.navClipped
}

// actions
const actions = {
	
}

// mutations
const mutations = {
	navWidth (state, width) {
		state.navWidth = width
	},
	navVisible (state, value) {
		state.navVisible = value
	},
	navClipped (state, value) {
		state.navClipped = value
	}
}


// restore state from LS just before Vuex storage creation
for (let key in state) {
	let value = localStorage.getItem(STORE_PREFIX + key)
	if (value) {
		try {
			value = JSON.parse(value) // - who knows, is there complex or simple value?
		} catch (err) {}
		state[key] = value
	}
}

const store = new Vuex.Store({
	state,
	getters,
	mutations,
	actions
})

store.subscribe((mutation, state) => {
	let key = mutation.type
	if (key in state) { 
		// mutations with the same name as store key are autosaved - thats the rule 
		localStorage.setItem(STORE_PREFIX + key, state[key])
	}
})

export default store
