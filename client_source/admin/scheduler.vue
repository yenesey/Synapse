<template lang="pug">
v-flex.xs12
	v-alert(v-model='alert', dismissible, colored-border, border='right', type='error', elevation=2) Отсутствует соединение c 
		span.teal--text(style='text-decoration:underline') {{this.$root.getWebsocketUrl() + '/scheduler'}}

	v-layout(align-start, justify-start, row, fill-height)
		v-flex.xs3

			v-simple-table.ma-1()
				template(v-slot:default)
					thead
						tr(:style='{"background-color": $vuetify.theme.currentTheme.neutral }')
							th.body-1.text-center(colspan='2' v-if='key') Редактировать задачу{{` [key:${key}]`}}
							th.body-1.text-center(colspan='2' v-else) Создать задачу
					tbody
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
								pre.ma-0(style='line-height:1.2em').
									┌─────────── second (optional)
									│ ┌───────── minute
									│ │ ┌─────── hour
									│ │ │ ┌───── day of month
									│ │ │ │ ┌─── month
									│ │ │ │ │ ┌─ day of week
								v-text-field.ma-0(v-model='job.schedule', hide-details, style='font-family: monospace; color: teal;', autocomplete='off')
						tr
							th Вывод результатов
							th
								v-btn.pr-2.float-right(small rounded @click='$set(job.emails, Object.keys(job.emails).length)') email
									v-icon() add_circle
									
						tr
							td(colspan='2', style='vertical-align: text-top')
								v-row.ma-0(v-for='(obj, key) in job.emails' :key='key')
									v-autocomplete(
										dense
										hide-details	
										prepend-icon='mail_outline'
										autocomplete='off'
										hide-no-data,
										item-disabled='__'
										v-model='job.emails[key]',
										:items='usersCached',
										item-text='email',
										item-value='email'
									)
										template(v-slot:item='el')
											v-list-item-content
												v-list-item-subtitle(v-html='el.item.name')
												v-list-item-subtitle(v-html='el.item.email')
									v-btn(text icon @click='$delete(job.emails, key)')
										v-icon.hover-elevate remove_circle
			
						tr
							td(colspan='2')
								v-text-field.mt-2(v-model='job.print', prepend-icon='local_printshop', hide-details, label='Принтер', autocomplete='off')
		// --------------------------------------------------------
		v-flex.xs9
			v-simple-table.ma-1
				thead
					tr(:style='{"background-color": $vuetify.theme.currentTheme.neutral}')
						th.text-center.body-1 Запланированные задачи

			v-simple-table.ma-1(dense fixed-header height=720)
				template(v-slot:default)
					thead
						tr
							th.text-center.subtitle-1(v-for='(h, i) in heads', :key='i' @click='sortBy(h, i)' :class="{ active: sortHead === h }") {{h}}
								span.arrow(v-show='sortHead === h' :class="sortOrder > 0 ? 'asc' : 'dsc'")
					tbody
						tr(v-for='(obj, index) in jobs', :key='index', @click='selectJob(index)', :class='{}' v-if='obj && obj.state !== "deleted"')
							td.text-center {{index}}
							td(style='color:teal') {{obj.name}}
							td
								v-text-field.body-2(v-model='obj.description', dense, full-width, hide-details, autocomplete='off')
							td {{obj.last}}
							td {{obj.next}}
								
							td(style='padding-left:25px; padding-right:0px')
								v-switch(v-model='obj.enabled', dense, hide-details)
							td.text-center
								v-btn(text icon  @click='runJob(index)')
									v-icon.hover-elevate(v-if='obj.state !== "running"') play_arrow
									v-icon.rotate360(v-if='obj.state === "running"') cached
							td.text-center
								v-icon(size='22', v-if='Object.keys(obj.emails).length') mail_outline
								v-icon(size='22', v-if='obj.print') local_printshop
							td.text-center
								v-btn(text icon @click='deleteJob(index)')
									v-icon.hover-elevate delete

</template>

<script>

import {debounce, diff, clone, mutate, merge, pxhr} from 'lib'

const schema = {
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
	enabled: 0
}

/*
	На сервере и клиенте задачи хранятся в структуре вида:
	jobs = [
		{...schema}, 
		{...schema}, 
		......
		{...schema}
	]

	Направление Сервер --> Клиент
	При соединении с сервером, клиенту прилетает весь список jobs. Далее, в процессе взаимодействия, от
	сервера прилетают только одиночные пары {key: {...schema}}, причем ...schema содержит только измененные поля

	Направление Клиент --> Сервер
	Клиент отправляет контракты вида { action: '', key: '',  payload: {...schema} }. 
	action  ∈ {'create', 'update', 'delete', 'run' ...},
	key     ∈ { jobs.key1, ... jobs.keyN },
	payload ∈ {...schema}  - причем ...schema содержит только изменные поля
*/

export default {

	data () {
		return {
			task: '',
			taskSearch: '',
			tasks: [],
			tasksLoading: false,
			usersCached: [],
			emails: {},

			jobs: [], // {key1: schema, key2: schema, .... keyN: schema}
			heads: [ '#key', 'Задача', 'Описание', 'Выполнено', 'Следующ', 'Вкл', 'Вручную', 'Вывод', 'Убрать' ],
			sortHead: '',
			sortOrder: 1,

			key: '',
			job: clone(schema), // указатель на выбранный в таблице job
			wssReadyState: 0
		}
	},

	watch: {
		job: {
			handler : 'jobChanged',
			deep: true
		}
	},

	created () {
		this.socket = null,
		this.jobsShadow = {},
		this.lazyUpdate = null
	},

	mounted () {
		window.tst = this.jobs
		let ws = new WebSocket(this.$root.getWebsocketUrl() + '/scheduler')
		ws.onerror = console.log
		ws.onclose = (m) => { this.wssReadyState = ws.readyState }
		ws.onopen = (m) => { this.wssReadyState = ws.readyState }
		ws.onmessage = (m) => {
			let data
			try { data = JSON.parse(m.data) } catch (err) {	console.log(err) }
			if (data) this.traverseIncomingJobs(data)
		}
		this.socket = ws

 	  	pxhr({method:'GET', url: 'scheduler/tasks'})
 	  	   .then(res => {
 	  	   		this.tasks = res
 	  	  	})
 	  	 	.catch(err => {
 	  	  	 	console.log(err)
			})
		
 	  	pxhr({method:'GET', url: 'users?show-disabled=false'})
 	  	   .then(res => {
 	  	   		this.usersCached = res
 	  	  	})
 	  	 	.catch(err => {
 	  	  	 	console.log(err)
 	  	  	})

	},

	computed: {
		alert () {
			return this.wssReadyState !== 1
		}
	},

	methods: {
		send (msg)	{	
			this.socket.send(JSON.stringify( msg ))
		},

		createLazyUpdate (key) {
			return  debounce( function () {
				let _diff = diff(this.jobsShadow[key], this.jobs[key])
				if (_diff) {
					mutate(this.jobsShadow[key], this.jobs[key])
					this.send({ action: 'update', key: key, payload: _diff })
				}	
			}, 3000)  // ms
		},
		
		jobChanged (_new, _old) {
			if (this.lazyUpdate) this.lazyUpdate()
			if (_new === _old) { // меняется значение внутри самого job'a
			} else { // меняется job целиком
			}
		},

		traverseIncomingJobs (data) {
			// принимаем входящие данные
			// важный момент: существующие ключи обновляются но не перезаписываются
			let {job, jobs, jobsShadow, $set} = this
			for (let key in data) {
				// let item = merge(schema, data[key]) // подстраховка от кривой схемы
				let item = data[key]
				if (item) {
					if (key in jobs) {
						mutate(jobs[key], item)
						mutate(jobsShadow[key], item)
					} else {
						$set(jobs, key, item)
						$set(jobsShadow, key, clone(item))
					}
					if (this.key === key) job = this.jobs[key]
				}
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
			let job = clone(schema)
			job.task = task.id
			job.name = task.name
			job.argv = this.fetchParams(task.id)
			this.send({ action: 'create', key: null, payload: job })
			this.key = null
			this.job  = job
		},

		selectJob (key) { // select row in table
			if (this.key === key || !(key in this.jobs)) return
			let job = this.jobs[key]
			this.taskSearch = job.name
			job.argv = Object.assign(this.fetchParams(job.task), job.argv)
			this.key = key
			this.job = job // note: 'jobChanged' on nextTick  -!!!если бы работало не так, пришлось бы инкапсулировать key в job!!!

			this.emails = Object.keys(job.emails)
			if (this.emails.length === 0) this.emails = ['']

			this.lazyUpdate = this.createLazyUpdate(key)
		},

		runJob (key) {
			this.send({ action: 'run', key: key })
		},
		
		deleteJob (key) {
			this.send({ action: 'delete', key: key })
			this.$delete(this.jobs, key)
			this.$delete(this.jobsShadow, key)
			this.task = null
			this.key = ''
			this.job = clone(schema)
		},

		sortBy (h, i) {
			this.sortOrder = this.sortOrder * -1
			this.sortHead = h
			console.log(this.sortOrder)
		},

		formatEmail (item) {	
			return (typeof item === 'object')
				? item.name + '<' + item.email + '>'
				: item
		}
	}
}

</script>

<style scoped>

.arrow.asc:before {
	position: absolute;
	padding: 0 0.1em 0 0.1em;
	content:"\1f829";
	transition: transform .2s ease;
}

.arrow.dsc:before {
	position: absolute;
	padding: 0 0.1em 0 0.1em;
	content:"\1f829";
	transition: transform .2s ease;
	transform: rotate(180deg);
}

.hover-elevate:hover {
	/* transform: scale(1.2);*/
	color: rgba(195, 75, 75, 0.952) !important;
}

.v-input--selection-controls {
	margin-top: 0px;
	padding-top: 0px;
}

.v-data-table th {
	height: 38px !important;
	/* font-weight: bold; */
}

.rotate360 {
	color: teal !important;
	animation-name: rotate;
	animation-duration: 4.5s;
	animation-iteration-count: infinite;
	animation-direction: normal;
	animation-timing-function: linear;
	width:30px;
	height:30px;
	position:relative;
	display:inline-block;
}

@keyframes rotate {
	from  { transform:rotate(0deg); }
	to    { transform:rotate(360deg);}
}

</style>


