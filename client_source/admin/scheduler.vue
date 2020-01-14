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
							th.body-1.text-center(colspan='2' v-if='job.id') Редактировать задачу{{` [id:${job.id}]`}}
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

						tr(v-for='(value, id) in job.argv', :key='id')
							td
								label {{id}}
							td
								v-text-field(dense single-line hide-details v-model='job.argv[id]', autocomplete='off')
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
								v-row.ma-0(v-for='(obj, id) in job.emails' :key='id')
									v-autocomplete(
										dense
										hide-details	
										prepend-icon='mail_outline'
										autocomplete='off'
										hide-no-data,
										item-disabled='__'
										v-model='job.emails[id]',
										:items='usersCached',
										item-text='email',
										item-value='email'
									)
										template(v-slot:item='el')
											v-list-item-content
												v-list-item-subtitle(v-html='el.item.name')
												v-list-item-subtitle(v-html='el.item.email')
									v-btn(text icon @click='$delete(job.emails, id)')
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
							th.text-center.subtitle-1(
								v-for='(h, idx) in heads'
								:key='idx'
								@click='clickHead(h, idx)'
								:class='{ active: sortHead === idx }'
								:style='{ cursor: ("key" in h) ? "pointer" : "default" }'
							) {{h.name}}
								span.arrow(v-show='sortHead === idx' :class="sortOrder > 0 ? 'asc' : 'dsc'")
					tbody
						tr(v-for='(job, index) in jobs', :key='job.id', @click='selectJob(job)', :class='{}' v-if='job && job.state !== "deleted"')
							td.text-center {{ job.id }}
							td(style='color:teal') {{job.name}}
							td
								v-text-field.body-2(v-model='job.description', dense, full-width, hide-details, autocomplete='off')
							td {{job.last}}
							td {{job.next}}
								
							td(style='padding-left:25px; padding-right:0px')
								v-switch(v-model='job.enabled',  @mousedown='selectJob(job)' dense, hide-details)
							td.text-center
								v-btn(text icon  @click='runJob(job.id)')
									v-icon.hover-elevate(v-if='job.state !== "running"') play_arrow
									v-icon.rotate360(v-if='job.state === "running"') cached
							td.text-center
								v-icon(size='22', v-if='Object.keys(job.emails).length') mail_outline
								v-icon(size='22', v-if='job.print') local_printshop
							td.text-center
								v-btn(text icon @click='deleteJob(job.id)')
									v-icon.hover-elevate delete

</template>

<script>

import { pxhr, debounce, diff, clone, mutate } from 'lib'

const schema = {
	task: null,
	name: '',
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

const heads = [ 
	{ key: 'id', name: '#id' },
	{ key: 'name', name: 'Задача' },
	{ key: 'description', name: 'Описание' },
	{ key: 'last', name: 'Выполнено' },
	{ key: 'next', name: 'Следующ' },
	{ key: 'enabled', name: 'Вкл' },
	{ name: 'Вручную'},
	{ name: 'Вывод'},
	{ name: 'Убрать'}
]

/*
	На сервере задачи хранятся в структуре вида:
	jobs = [
		{...schema}, 
		{...schema}, 
		......
		{...schema}
	]

	Направление Сервер --> Клиент
	При соединении с сервером, клиенту прилетает весь список (массив) jobs. 
	Индекс каждого job'a в массиве клиент самостоятельно инкапсулирует (добавляет к схеме): {id: index, ...schema},
	чтобы не потерять эту связь при сортировках таблицы

	Далее, в процессе взаимодействия, от
	сервера прилетают только одиночные пары {id: {...schema}}, причем ...schema содержит только измененные поля

	Направление Клиент --> Сервер
	Клиент отправляет контракты вида { action: string, id: number,  payload: {...schema} }. 
	action  ∈ {'create', 'update', 'delete', 'run' ...},
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

			heads: heads,
			sortHead: 0,
			sortOrder: 1,

			jobs: [], // {key1: schema, key2: schema, .... keyN: schema}
			job: clone(schema), // указатель на выбранный в таблице job

			wssReadyState: 0
		}
	},

	created () {
		this.socket = null,
		this.lazyUpdate = null
	},

	mounted () {
		// window.tst = this
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

	watch: {
		job: {
			handler : 'jobChanged',
			deep: true
		}
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

		createLazyUpdate (job) {
			let shadow = clone(job)
			return debounce( function () {
				let _diff = diff(shadow, job)
				if (_diff) {
					this.send({ action: 'update', id: job.id, payload: _diff })
					shadow = clone(job)
				}	
			}, 3000)  // ms
		},
		
		jobChanged (_new, _old) {
			if (this.lazyUpdate) {
				this.lazyUpdate()
			}
			if (_new === _old) { // меняется значение внутри самого job'a
			} else { // меняется job целиком
			}
		},

		traverseIncomingJobs (data) {
			// принимаем входящие данные
			// важный момент: существующие ключи обновляются но не перезаписываются
			let { 
				jobs //, $set 
			} = this
			for (let id in data) {
				//let item = merge(schema, data[id]) // подстраховка от кривой схемы
				let item = data[id]
				if (item) {
					item.id = id // инкапсулируем "серверный индекс" в id, чтобы не потерять при манипуляциях (сортировках)
					let existing = jobs.find(el => el.id === id)
					if ( existing ) {
						mutate(existing, item)
					} else {
						// $set(jobs, id, item)
						jobs.push(item)
					}
				}
			}
		},

		fetchParams (id) {
			// извлекаем argv = {id: value} непосредственно из текста рендер-функции Vue-компонента
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
			this.send({ action: 'create', id: null, payload: job })
			this.job = job
		},

		selectJob (job) { // select row in table
			if (!job || job === this.job) return
			this.taskSearch = job.name
			job.argv = Object.assign(this.fetchParams(job.task), job.argv)
			this.job = job // note: 'jobChanged' on nextTick

			this.emails = Object.keys(job.emails)
			if (this.emails.length === 0) this.emails = ['']
			this.lazyUpdate = this.createLazyUpdate(job)
		},

		runJob (id) {
			this.send({ action: 'run', id: id })
		},
		
		deleteJob (id) {
			this.send({ action: 'delete', id: id })
			let index = this.jobs.findIndex((job) => job.id === id)
			this.$delete(this.jobs, index)
			// this.$delete(this.jobsShadow, index)
			this.task = null
			this.job = clone(schema)
		},

		clickHead (h, i) {
			if ('key' in this.heads[i]) {
				this.sortOrder = this.sortOrder * -1
				this.sortHead = i
				let key = this.heads[this.sortHead].key
				let sortOrder = this.sortOrder
				this.jobs.sort((a, b) => {
					if (a[key] > b[key]) {
						return 1 * sortOrder
					} else if (a[key] < b[key]) {
						return -1 * sortOrder
					}
					return 0
				})
			}	
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
	content:"\25B2";
	transition: transform .2s ease;
}

.arrow.dsc:before {
	position: absolute;
	padding: 0 0.1em 0 0.1em;
	content:"\25B2";
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


