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
									:items='tasksCached',
									:loading='tasksLoading',
									:search-input.sync='searchTask',
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
							th.text-center.subtitle-1 #id
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
							td.font-weight-bold {{ obj.name }}
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
								v-btn(text icon color='rgba(195, 75, 75, 0.952)')
									v-icon.hover-elevate(@click='deleteJob(key)') delete

</template>

<script>
import {debounceKeyed, difference, clone, pxhr} from 'lib'
import moment from 'moment'

var _schema = {
	task: -1,
	description: '',
	next: '',
	last: '',
	code: 0,
	argv: {},
	email: {},
	print: '',
	schedule: '* * * * * *',
	enabled: false
}
var _before = null

export default {
// В "Планировщике" реализован подход к вводу/редактированию данных, который использует реактивные 
// возможности Vue, и AJAX (стандартные HTTP запросы, выполняемые асинхронно) 
// - единицей данных является объект запланированной задачи, описанный в _schema
// - ввод данных осуществляется как в таблице, так и в окне, детализирующем конкретный выбранный элемент
// - ввод считается законченным, после того как пользователь перестал изменять данные в течение заданного интервала времени
// - введенные данные анализируются перед отправкой запроса на сервер, с целью минимизации количества запросов/траффика,
// 	 в результате чего на сервер отправляется только измененные поля запланированной задачи
//
//  для обеспечения всего вышеперечисленного задействованы функции: 
// - vm.$watch        - наблюдение за изменениями записей заданного объекта 
// - _.debounceKeyed  - выполнение функции, после заданного интервала времени, после того, как 
//                      пользователь перестал повторять (boucing) вызывать эту функцию. 
// - _.difference     - определение различий между двумя данными объектами
// - _.clone          - глубокое клонирование заданного объекта

	data () {
		return {
			task: '',
			tasksCached: [],
			tasksLoading: false,
			searchTask: '',

			$ws: null,
			jobs: {}, // массив job-ов (редактируемых данных) [ job(1) | job(2) |.... | job(n) ]
			key: '',
			job: clone(_schema), // "скользящий" фрейм, указывающий на конкретный редактируемый job в массиве jobs
			jobName: '' // --для обратной связи с компонентом выбора задачи
		}
	},

	mounted () {
		let self = this
		let wss = window.location.protocol.replace(/http/i, 'ws') + '//' + window.location.host.replace(/:\d+/, '')
		let ws = new WebSocket(wss + '/jobs')
		ws.onerror = function (m) { console.log('error') }
		ws.addEventListener('close', function (m) { console.log(m); })
		// s.onopen = function (m) { console.log('websocket connection open', s.readyState) }

		ws.onmessage = function (m) {
			let data
			try {
				data = JSON.parse(m.data)
				Object.keys(data).forEach(key => {
					self.$set(self.jobs, key, data[key])
				})
			} catch (err) {
				console.log(err)
			}
		}
		self.$ws = ws
		// self.$watch('job', this.changes, { deep: true })

 	  	pxhr({method:'GET', url: 'jobs/tasks'})
 	  	   .then(res => {
 	  	   		this.tasksCached = res
 	  	  	})
 	  	 	.catch(err => {
 	  	  	 	console.log(err)
			})
		
	},

	watch: {
		job (before, after) {
			console.log(difference(before, after))
		}

	},
	
	methods: {

		debounced: debounceKeyed(function(first, last){
			// "Keyed"  - указывает на то, что функция "ключуется" по первому параметру.
			// первый параметр - ключ открывает отдельную последовательность debounce	
			var self = this;
			var changes = {};
			if (last.task != -1) changes = difference(first, last);
			
			if (!changes) {
				// self.jobState(last, 0);
				return; 
			}

			if ('error' in changes) delete changes.error;
		
			if (Object.keys(changes).length === 0) return;
			// if (last.id) changes.id = last.id;

			self.$ws.send(JSON.stringify({action: 'update', key: self.key,  payload: changes}))
			_before = clone(last)
			},3000),

		changes: function(obj){
			// this.jobState(obj, 1);
			this.debounced(obj.id || -1, [0,1], _before, obj);
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
			this.job  = clone(_schema)
			this.job.task = task.id
			this.job.name = task.name
			this.job.argv = this.fetchParams(task.id)
			_before = clone(_schema)
			_before.schedule = ''
			this.$ws.send(JSON.stringify({ action: 'create', key: null,  payload: this.job }))
		},

		selectJob (key) { //select in table
			let job = this.jobs[key]
			this.searchTask = job.name
			job.argv = Object.assign(this.fetchParams(job.task), job.argv)
			job.pp = Object.assign({ email:{}, print:'' }, job.pp)
			_before = clone(job)
			this.key = key
			this.job = job
		},

		runJob (key) {
			this.$ws.send(JSON.stringify({ action: 'run', key: key}))
		},
		
		deleteJob (key) {
			this.$ws.send(JSON.stringify({ action: 'delete', key: key}))
			this.$delete(this.jobs, key)
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
}
.v-input--selection-controls {
	margin-top: 0px;
	padding-top: 0px;
}

</style>


