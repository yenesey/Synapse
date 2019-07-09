'use strict'
// тырнуто отсюда (c) https://stackoverflow.com/questions/43177855/how-to-create-a-deep-proxy
// бо в npm-модулях какой то sh..

function deepProxy (target, handler) {
	const proxyCache = new WeakMap()

	function makeHandler (path) {
		return {
			set (target, key, value, receiver) {
				if (typeof value === 'object') {
					value = proxify(value, [...path, key])
				}
				if (handler.set) {
					handler.set(target, [...path, key], value, receiver)
				}
				target[key] = value
				return true
			},

			deleteProperty (target, key) {
				if (Reflect.has(target, key)) {
					unproxyfy(target[key]) // target[key] instanceof Proxy (not a <target> node)
					let deleted = Reflect.deleteProperty(target, key)
					if (deleted && handler.deleteProperty) {
						handler.deleteProperty(target, [...path, key])
					}
					return deleted
				}
				return false
			}
			// ... todo: place other methods of <handler>
		}
	}

	function unproxyfy (proxy) {
		if (proxyCache.has(proxy)) {
			proxyCache.delete(proxy)
		}

		for (let key in proxy) {
			if (typeof proxy[key] === 'object') {
				unproxyfy(proxy[key])
			}
		}
	}

	function proxify (node, path) {
		for (let key in node) {
			if (typeof node[key] === 'object') {
				node[key] = proxify(node[key], [...path, key])
			}
		}
		let proxy = new Proxy(node, makeHandler(path))
		proxyCache.set(proxy, node) // proxy is a key!
		return proxy
	}

	return proxify(target, [])
}

module.exports = deepProxy
