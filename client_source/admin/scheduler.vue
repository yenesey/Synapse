<template lang="pug">
v-flex.xs12
	v-layout(align-start, justify-start, row, fill-height)
		v-flex.xs3
			v-simple-table.ma-1
				template(v-slot:default)
					tbody
						tr(:style='{"background-color": $vuetify.theme.currentTheme.primary}')
							// Выбор и параметры джоба
							td.body-1.text-center(colspan='2' v-if='key') Редактировать задачу{{` [key:${key}]`}}
							td.body-1.text-center(colspan='2' v-else) Создать задачу
						tr
							td(colspan='2')
								v-autocomplete(
									dense
									hide-details	
									return-object
									prepend-icon='timeline'							
									:menu-props='{ "maxHeight":600 }'
									full-width
									autocomplete='off'
									hide-no-data,
									item-disabled='__'
									v-model='task',
									:items='tasks',
									:loading='tasksLoading',
									:search-input.sync='taskSearch',
									@input='selectTask',
									item-text='name',
									item-value='id',
									label='Выбрать задачу',
								)

						tr(v-for='(value, key) in job.argv', :key='key')
							td
								label {{key}}
							td
								v-text-field(dense single-line hide-details v-model='job.argv[key]', autocomplete='off')
						tr
							th(colspan='2') Расписание
						tr
							td(colspan='2')
								pre.ma-0().
									┌─────────── second (optional)
									│ ┌───────── minute
									│ │ ┌─────── hour
									│ │ │ ┌───── day of month
									│ │ │ │ ┌─── month
									│ │ │ │ │ ┌─ day of week
								v-text-field.ma-0(v-model='job.schedule', hide-details, style='font-family: monospace; color: teal;', autocomplete='off')
						tr
							th(colspan='2') Вывод результатов
						tr
							td(colspan='2', style='vertical-align: text-top')
								array(v-model='emails', b-size='22')
									// v-model='user',
									v-autocomplete( 
										slot-scope='{el, index}'
										dense
										hide-details	
										prepend-icon='mail_outline'
										autocomplete='off'
										hide-no-data,
										item-disabled='__'
										v-model='job.emails[index]',
										:items='usersCached',
										item-text='email',
										item-value='email'
									)
										template(v-slot:item='el')
											v-list-item-content
												v-list-item-subtitle(v-html='el.item.name')
												v-list-item-subtitle(v-html='el.item.email')
						tr
							td(colspan='2')
								v-text-field.mt-2(v-model='job.print', prepend-icon='local_printshop', hide-details, label='Принтер', autocomplete='off')
			// --------------------------------------------------------
		v-flex.xs9
			v-simple-table.ma-1(fixed-header=true)
				template(v-slot:default)
					thead
						tr
							th.body-1.text-center(colspan='9' :style='{"background-color": $vuetify.theme.currentTheme.primary} ') Список задач на сервере
						tr
							th.text-center.subtitle-1 #key
							th.text-center.subtitle-1 Задача
							th.text-center.subtitle-1 Описание
							th.text-center.subtitle-1 Выполнено
							th.text-center.subtitle-1 Следующ
							th.text-center.subtitle-1 Вкл
							th.text-center.subtitle-1 Вручную
							th.text-center.subtitle-1 Вывод
							th.text-center
								v-icon delete
					tbody
						tr(v-for='(obj, key) in jobs', :key='key', @click='selectJob(key)', :class='{}')
							td.text-center {{key}}
							td(style='color:teal') {{ obj.name }}
							td
								v-text-field(v-model='obj.description', dense, hide-details, autocomplete='off')
							td {{obj.last}}
								// input(v-if='obj.code==0 || obj.code==2', type='text', v-model='obj.last', size='10', style='text-align:center; font-size: 12px', readonly='')
								// input(v-else='', type='text', v-model='obj.last', size='10', style='text-align:center; font-size: 12px; color: red', readonly='')
							td {{obj.next}}
								
							td(style='padding-left:25px; padding-right:0px')
								v-switch(v-model='obj.enabled', dense, hide-details)
							td.text-center
								v-btn(text icon v-if='obj.state !== "running"')
									v-icon.hover-elevate(@click='runJob(key)') play_arrow
							td.text-center
								v-icon(size='22', v-if='Object.keys(obj.emails).length') mail_outline
								v-icon(size='22', v-if='obj.print') local_printshop
							td.text-center
								v-btn(text icon)
									v-icon.hover-elevate(@click='deleteJob(key)') delete

</template>

<script>
import {debounce, diff, clone, pxhr} from 'lib'
import moment from 'moment'

var _schema = {
	task: null,
	description: '',
	next: '',
	last: '',
	code: 0,
	argv: {},
	emails: {},
	print: '',
	schedule: '* * * * * *',
	state: 'OK',
	enabled: false
}

export default {

	data () {
		return {
			task: '',
			taskSearch: '',
			tasks: [],
			tasksLoading: false,

			usersCached: [],
			emails: [''],

			jobs: {}, // {key1: _schema, key2: _schema, .... keyN: _schema}
			key: '',
			job: clone(_schema) // указатель на выбранный в таблице job
		}
	},

	created () {
		this.$ws = null,
		this.$jobs = {},
		this.$lazyUpdate = null
	},

	mounted () {
		let self = this
		window.tst = this
		let ws = new WebSocket(this.$root.getWebsocketUrl() + '/jobs')
		self.$ws = ws
		ws.onerror = console.log 
		ws.onclose = function (m) { console.log(`websocket readyState=${ws.readyState}`) }
		// addEventListener('open', fn())
		ws.onopen = function (m) { console.log(`websocket readyState=${ws.readyState}`) }

		ws.onmessage = function (m) {
			let data
			try {
				data = JSON.parse(m.data)
				if (data) {
					Object.keys(data).forEach(key => {
						self.$jobs[key] = clone(data[key])
						self.$set(self.jobs, key, data[key])
						if (self.key === key) self.job = data[key]
					})
				}	
			} catch (err) {
				console.log(err)
			}
		}
		self.$watch('job', this.observeJob, { deep: true })

 	  	pxhr({method:'GET', url: 'jobs/tasks'})
 	  	   .then(res => {
 	  	   		this.tasks = res
 	  	  	})
 	  	 	.catch(err => {
 	  	  	 	console.log(err)
			})
		
 	  	pxhr({method:'GET', url: 'access/users?show-disabled=false'})
 	  	   .then(res => {
 	  	   		this.usersCached = res
 	  	  	})
 	  	 	.catch(err => {
 	  	  	 	console.log(err)
 	  	  	})

	},

	methods: {
		
		lazyUpdateFactory (key) {
			return  debounce( function () {
				let _diff = diff(this.$jobs[key], this.jobs[key])
				this.$jobs[key] = clone(this.jobs[key])
				if (_diff) {
					let msg = JSON.stringify({
						action: 'update',
						key: key,
						payload: _diff
					})
					this.$ws.send(msg)
				}	
			}, 3000)  // ms
		},
		
		observeJob (_new, _old) {
			if (this.$lazyUpdate) this.$lazyUpdate()
			if (_new === _old) { // меняется значение внутри самого job'a
			} else { // меняется job целиком
			}
		},

		fetchParams (id) {
			// извлекаем argv = {key: value} непосредственно из текста рендер-функции Vue-компонента
			var rg = new RegExp('"?name"?: ?"([^\n]*?)",?\n?(?:\\s*"?value"?: ?"?(?:_vm\.|[a-z]\.)?([^\n]*?)"?,?(?:,?\\w*:|}|\n))?', 'g')
			var res
			//находим нужную задачу по id
			var task = this.$router.options.routes[2].children.find(item => item.path == id)
			var argv = {}	
			if (task && task.component) 
				task.component.render(function (src) {
					if (src) {
						if (src.__file !== 'client_source/task.vue'){ 
							while (res = rg.exec(src.render)) // -- выскребаем параметры с помощью регулярки
								argv[res[1]] = res[2] || '';
						
							if (src.staticRenderFns)
								src.staticRenderFns.forEach(function(func){
									while (res = rg.exec(func))
										argv[res[1]] = res[2]  || '';
								})
						}
					}
				})
			return argv
		},

		selectTask (task) {
			let job = clone(_schema)
			job.task = task.id
			job.name = task.name
			job.argv = this.fetchParams(task.id)
			this.$ws.send(JSON.stringify({ action: 'create', key: null,  payload: job }))
			this.key = null
			this.job  = job
		},

		selectJob (key) { // select row in table
			if (this.key === key || !(key in this.jobs)) return
			let job = this.jobs[key]
			this.taskSearch = job.name
			job.argv = Object.assign(this.fetchParams(job.task), job.argv)
			this.key = key
			this.job = job // note: 'observeJob' on nextTick  -!!!если бы работало не так, пришлось бы инкапсулировать key в job!!!

			this.emails = Object.keys(job.emails)
			if (this.emails.length === 0) this.emails = ['']

			this.$lazyUpdate = this.lazyUpdateFactory(key)
		},

		runJob (key) {
			this.$ws.send(JSON.stringify({ action: 'run', key: key}))
		},
		
		deleteJob (key) {
			this.$ws.send(JSON.stringify({ action: 'delete', key: key }))
			this.$delete(this.jobs, key)
			this.$delete(this.$jobs, key)
			this.task = null
			this.key = ''
			this.job = clone(_schema)
		},

		formatEmail (item) {	
			return (typeof item === 'object')
				? item.name + '<' + item.email + '>'
				: item
		}
	} // methods:

}

</script>

<style>

.hover-elevate:hover {
	transform: scale(1.2);
	color: rgba(195, 75, 75, 0.952) !important;
}

.v-input--selection-controls {
	margin-top: 0px;
	padding-top: 0px;
}

</style>


