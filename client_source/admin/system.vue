<template lang="pug">
	v-treeview(
		v-model="tree"
		:open="open"
		:items="items"
		activatable
		item-key="name"
		open-on-click
	)
		template(v-slot:prepend="{ item, open }")
			v-icon(v-if="item.children") {{ open ? 'folder_open' : 'folder' }}
			v-icon(v-else) {{ 'change_history' }}

</template>

<script>
export default {
    data: () => ({
      open: ['public'],
      tree: [],
      items: []
	}),
	mounted () {
		let ws = new WebSocket(this.$root.getWebsocketUrl() + '/system')
		ws.onerror = console.log
		ws.onclose = (m) => { this.wssReadyState = ws.readyState }
		ws.onopen = (m) => { this.wssReadyState = ws.readyState }
		ws.onmessage = (m) => {
			let data
			try { data = JSON.parse(m.data) } catch (err) {	console.log(err) }
			if (data) this.items = data
		}
		this.socket = ws
	}
}
</script>

<style>
</style>