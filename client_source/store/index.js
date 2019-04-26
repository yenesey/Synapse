import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)

const PREFIX = 'store_'

// state
const state = {
	navWidth: 200,
	navVisible: true,
	navClipped: false
}

// getters
const getters = {
}

// actions
const actions = {
}

// mutations
const mutations = {
	navWidth (state, value) {
		state.navWidth = value
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
	let value = localStorage.getItem(PREFIX + key)
	if (value) {
		try {
			value = JSON.parse(value) // - who knows, is there complex or simple value?
		} catch (err) { 
			console.error(err) 
		}
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
		// mutations with the same name as state key are autosaved - thats the rule 
		localStorage.setItem(PREFIX + key, state[key])
	}
})

export default store
