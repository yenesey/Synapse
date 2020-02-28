'use strict'

var obj = new Proxy({}, {
	get: function (target, key, receiver) {
		console.log(`getting ${key}!`)
		return Reflect.get(target, key, receiver)
	},
	set: function (target, key, value, receiver) {
		if (!Reflect.has(target, key, value)) {
			console.log(`setting new ${key}!`)
		} else {
			console.log(`setting ${key}!`)
		}
		return Reflect.set(target, key, value, receiver)
	}
})

obj.key1 = 'value1'
obj.key1 = 'value11'
