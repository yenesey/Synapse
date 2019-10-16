<template lang="pug">
v-flex.xs12
	v-layout(align-start, justify-start, row, fill-height)
		v-flex.xs3
			v-simple-table.ma-1
				template(v-slot:default)
					tbody
						tr.blue.lighten-4
							// Выбор и параметры джоба
							td.body-1.text-center(colspan='2' v-if='job.id') Редактировать задачу{{' [id:' + job.id + ']'}}
							td.body-1.text-center(colspan='2' v-else) Создать задачу
						tr
							td(colspan='2')
								v-autocomplete(
									dense
									hide-details	
									prepend-icon='timeline'							
									:menu-props='{ "maxHeight":600 }'
									full-width
									autocomplete='off'
									hide-no-data,
									item-disabled='__'
									return-object,
									v-model='task',
									:items='tasksCached',
									:loading='tasksLoading',
									:search-input.sync='searchTask',
									@input='selectTask',
									item-text='name',
									item-value='name',
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
							th.body-1.text-center.blue.lighten-4(colspan='9') Список задач на сервере
						tr
							th.text-center.subtitle-1 №
							th.text-center.subtitle-1 Задача
							th.text-center.subtitle-1 Описание
							th.text-center.subtitle-1 Выполн.
							th.text-center.subtitle-1 Следующ
							th.text-center.subtitle-1 Вкл
							th.text-center.subtitle-1 Вручную
							th.text-center
								v-icon(size='22') mail_outline
							th.text-center
								v-icon(size='22') play_circle_outline
					tbody
						tr(v-for='(obj, key) in jobs', :key='key', @click='jobSelect($event, obj)', :class='{error: states[index]==2, selected: job.id===obj.id }')
							td.text-center {{obj.id}}
							td {{ obj.name }}
							td
								v-text-field(v-model='obj.description', dense,hide-details)
							td {{obj.last}}
								// input(v-if='obj.code==0 || obj.code==2', type='text', v-model='obj.last', size='10', style='text-align:center; font-size: 12px', readonly='')
								// input(v-else='', type='text', v-model='obj.last', size='10', style='text-align:center; font-size: 12px; color: red', readonly='')
							td {{obj.next}}
								
							td(style='text-align:center')
								input(type='checkbox', v-model='obj.enabled', :disabled='obj.error')
							td(style='text-align:center')
								v-icon(size='22', v-if='states[index]!==1', @click='jobRun($event, obj)') play_arrow
							td(style='text-align:center')
								v-icon(size='22', v-if='obj.email') mail_outline
								v-icon(size='22', v-if='obj.print') local_printshop
							td(style='text-align:center')
								v-icon.trash-bin(size='22', v-if='states[index]==0', @click='jobDelete(obj)') delete
								img(v-if='states[index]==1', src='../assets/ui-anim_basic_16x16.gif', style='vertical-align: text-bottom;')
</template>

<script>
import {debounceKeyed, difference, clone, pxhr} from 'lib'
import moment from 'moment'

var _default = {
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
// - единицей данных является объект запланированной задачи, описанный в _default
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

			jobs: [], //массив job-ов (редактируемых данных) [ job(1) | job(2) |.... | job(n) ]
			states:[], //состояния job-ов вынесены отдельно, чтобы на них не срабатывал $watch('job'
			job: clone(_default), //"скользящий" фрейм, указывающий на конкретный редактируемый job в массиве jobs
			jobName: '' //--для обратной связи с компонентом выбора задачи
		}
	},

	mounted () { // при появлении в DOM
		this.$watch('job', this.changes, { deep: true })

		pxhr({ method:'get', url:'jobs' })
			.then(jobs => { 
				this.jobs = jobs
			})

 	  	pxhr({method:'GET', url: 'jobs/tasks'})
 	  	   .then(res => {
 	  	   		this.tasksCached = res
 	  	  	})
 	  	 	.catch(err => {
 	  	  	 	console.log(err)
 	  	  	})
	},

	methods: {
		jobState: function(job, state){
			let index = this.jobs.indexOf(job)
			if (index !== -1) this.states[index] = state
			this.$forceUpdate()
		},

		debounced: debounceKeyed(function(first, last){
			// "Keyed"  - указывает на то, что функция "ключуется" по первому параметру.
			// первый параметр - ключ открывает отдельную последовательность debounce	
			var self = this;
			var changes = {};
			if (last.task != -1)	changes = difference(first, last);
			
			if (!changes) {
				self.jobState(last, 0);
				return; 
			}

			if ('error' in changes) delete changes.error;
		
			if (Object.keys(changes).length===0) return;
			if (last.id) changes.id = last.id;

			pxhr({ method:'put', url:'jobs', data : changes })
			.then(function(res){
					if (!last.id){
						res.params = res.params || clone(_default.params);
						self.states.push(res.error ? 2 : 0);
						self.jobs.push(res);	
						self.jobSelect(null, res);
					} else {
						self.jobState(last, res.error ? 2 : 0)
						_before = clone(last);
					}
				})
			},3000),

		changes : function(obj){
			this.jobState(obj, 1);
			this.debounced(obj.id || -1, [0,1], _before, obj);
		},

		fetchParams : function(taskId){
			//извлекаем argv = {key: value} непосредственно из текста рендер-функции Vue-компонента
			var rg = new RegExp('"?name"?: ?"([^\n]*?)",?\n?(?:\\s*"?value"?: ?"?(?:_vm\.|[a-z]\.)?([^\n]*?)"?,?(?:,?\\w*:|}|\n))?', 'g');

			var res;

			//находим нужную задачу по id
			var task = this.$router.options.routes[2].children
				.find(function(item){
					return item.path == taskId
				})
			
			var argv = {};		
			if (task && task.component) 
				task.component.render(function(src){
					if (src){
						if (src.__file !== 'client_source/task.vue'){ 
							while (res = rg.exec(src.render)) //--выскребаем параметры с помощью регулярки
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

		selectTask(evnt) { // dlookup event
			this.job  = clone(_default)
			this.job.task = evnt.id
			this.argv = this.fetchParams(evnt.id)
			// this.job.params.pp = {print:'', email:{}}
			_before = clone(_default)
			_before.schedule = ''
		},

		jobSelect : function(evnt, job){ //select in table
			if (this.job === job) return;
			this.jobName = job.name; //dlookup text
			job.params = {
			//подмешиваем к имеющиемя в задаче параметрам, параметры по умолчанию (приоритет имеющимся)
				argv : Object.assign(this.fetchParams(job.task), job.params.argv),
				pp   : Object.assign({email:{}, print:''},     job.params.pp)
			};
//			console.log(JSON.stringify(job.params, null, " "))
			_before = clone(job);//?

			if (evnt && evnt.target && evnt.target.type=='checkbox') _before.enabled = !evnt.target.checked;
			this.job = job;

		},

		jobRun : function(evnt, job){
			var self = this;
			self.jobState(job, 1)
			pxhr({ method:'get', url:'jobs/run?id=' + job.id})
			.then(function(res){
		  job.last = res.last;
					self.jobState(job, 0)
			})
		},
		
		jobDelete : function(job){
			var self = this;
			pxhr({ method:'delete', url:'jobs', data : job })
			.then(function(result){
				self.jobs.splice(self.jobs.indexOf(job), 1);
				self.job = clone(_default);
				_before = clone(_default);
			})
		},

		formatEmail  : function(item) {	
			return (typeof item === 'object')
				? item.name + '<' + item.email + '>'
				: item
		}
	} //methods:

}

</script>

<style></style>


