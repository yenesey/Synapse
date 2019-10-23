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
									pre(style='margin:0 0; padding: 0 .5em').
										┌─────────── second (optional)
										│ ┌───────── minute
										│ │ ┌─────── hour
										│ │ │ ┌───── day of month
										│ │ │ │ ┌─── month
										│ │ │ │ │ ┌─ day of week
									v-text-field(v-model='job.schedule', height='16px' style='font-family: monospace; color: teal;', autocomplete='off')
						tr
							td(colspan='2') Результат
						tr
							td(colspan='2', style='vertical-align: text-top')
								v-icon mail_outline
									|  e-mail 
								br
								// array(v-model='job.email', b-size='22')
									dlookup(slot-scope='{el, index}', style='width:250px', db='db/synapse.db', table='users', result='email', look-in='%name%, %email%', fields='name', where='(disabled = 0 or disabled is null) and (not email is null)', order='name', :min-length='0', :getlabel='formatEmail', v-model='job.email[index]')
										i(slot-scope='{item, index}')
											| {{item.name}} 
											i(style='color:teal')  {{'(' + item.email + ')'}} 
						tr
							td(colspan='2')
								v-text-field(prepend-icon='local_printshop' v-model='job.print', label='Прописать принтер', autocomplete='off')
			// --------------------------------------------------------
		v-flex.xs9
			v-simple-table.ma-1(fixed-header=true)
				template(v-slot:default)
					thead
						tr
							th.body-1.text-center(colspan='9' :style='{"background-color": $vuetify.theme.currentTheme.primary}') Список задач на сервере
						tr
							th.text-center.subtitle-1 #key
							th.text-center.subtitle-1 Задача
							th.text-center.subtitle-1 Описание
							th.text-center.subtitle-1 Выполн.
							th.text-center.subtitle-1 Следующ
							th.text-center.subtitle-1 Вкл
							th.text-center.subtitle-1 Вручную
							th.text-center
								v-icon mail_outline
							th.text-center
								v-icon delete
					tbody
						tr(v-for='(obj, key) in jobs', :key='key', @click='selectJob(key)', :class='{}')
							td.text-center {{key}}
							td(style='color:teal') {{ obj.name }}
							td
								v-text-field(v-model='obj.description', dense, hide-details)
							td {{obj.last}}
								// input(v-if='obj.code==0 || obj.code==2', type='text', v-model='obj.last', size='10', style='text-align:center; font-size: 12px', readonly='')
								// input(v-else='', type='text', v-model='obj.last', size='10', style='text-align:center; font-size: 12px; color: red', readonly='')
							td {{obj.next}}
								
							td(style='padding-left:25px; padding-right:0px')
								v-switch(v-model='obj.enabled', dense, hide-details)
							td.text-center
								v-btn(text icon)
									v-icon.hover-elevate(@click='runJob(key)') play_arrow
							td(style='text-align:center')
								v-icon(size='22', v-if='obj.email') mail_outline
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
	email: {},
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

			jobs: {}, // {key1: _schema, key2: _schema, .... keyN: _schema}
			key: '',
			job: clone(_schema) // указатель на выбранный в таблице job
		}
	},

	created () {
		this.$ws = null,
		this.$lazy = {}
	},

	mounted () {
		let self = this
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
				if (data) Object.keys(data).forEach(key => {
					self.$set(self.jobs, key, data[key])
					self.$lazy[key] = self.lazyUpdateFactory(key, clone(data[key]), ws)
				})
				
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
		
	},
	
	methods: {
		
		lazyUpdateFactory (key, base, $ws) {
			return debounce( function (changed) {
				$ws.send(
					JSON.stringify({
						action: 'update',
						key: key,
						payload: diff(base, changed)
					})
				)
				base = clone(changed)
			}, 3000 ) // ms
		},

		observeJob (_new, _old) {
			let key = this.key
			if (key in this.$lazy) this.$lazy[key](_new)

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

		selectJob (key) { //select row in table
			if (this.key === key || !(key in this.jobs)) return
			let job = this.jobs[key]
			this.taskSearch = job.name
			job.argv = Object.assign(this.fetchParams(job.task), job.argv)
			this.key = key
			this.job = job // note: 'observeJob' on nextTick  -!!!если бы работало не так, пришлось бы инкапсулировать key в job!!!
		},

		runJob (key) {
			this.$ws.send(JSON.stringify({ action: 'run', key: key}))
		},
		
		deleteJob (key) {
			this.$ws.send(JSON.stringify({ action: 'delete', key: key}))
			this.$delete(this.jobs, key)
			delete this.$lazy[key]
		},

		formatEmail (item) {	
			return (typeof item === 'object')
				? item.name + '<' + item.email + '>'
				: item
		}
	} //methods:

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


