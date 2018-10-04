<template>
  <v-flex xs12>
	<v-layout align-start justify-start row fill-height>

	<table class="synapse"> <!-- Выбор и параметры джоба - вджобывай! -->
		<tr>
			<th colspan="2">
        <div v-if="job.id">Редактировать задачу{{' [id:' + job.id + ']'}}</div>
        <div v-else>Создать задачу</div>
      </th>
		</tr>

		<tr>
			<td colspan="2"> 
				<dlookup 
					db="db/synapse.db" 
					table="objects"
					look-in="name%"
					fields="name, class"  
					where="class in ('tasks', 'xtech')"
					result="id"
					@select="taskSelect"
					v-model="jobName"
					:min-length=0
				>
				</dlookup>
			</td>
		</tr> 

		<tr v-for="(value, key) in job.params.argv" :key=key> 
			<td>
  			<label>{{key}}</label>	
			</td>
			<td>
    		<input type="text" v-model="job.params.argv[key]" style="width:100%; border:1px solid #aaaaaa;;font-size:0.95em" autocomplete="off">
			</td>
		</tr> 

    <tr>
      <th colspan="2">Расписание</th>
    </tr>
    <tr>
      <td colspan="2">
<pre style="margin:0 0; padding: 0 .5em">┌─────────── second (optional)
│ ┌───────── minute
│ │ ┌─────── hour
│ │ │ ┌───── day of month
│ │ │ │ ┌─── month
│ │ │ │ │ ┌─ day of week
</pre>
        <input type="text" v-model="job.schedule" style='width:300px;font-family: monospace; color: teal; font-size: 1.2em; padding: 0 .5em;border:1px solid #aaaaaa;' autocomplete="off"> 
      </td>
    </tr>

    <tr>
      <th colspan="2">Результат</th>
    </tr>

    <tr>
    	<td colspan="2" style="vertical-align: text-top">
			  <v-icon>mail_outline</v-icon> e-mail <br>

				<array v-model="job.params.pp.email" b-size=22>
					<dlookup slot-scope="{el, index}"
					 	style="width:250px"
						db="db/synapse.db" 
						table="users" 
						result="email" 
						look-in="%name%, %email%" 
						fields="name"	
						where="(disabled = 0 or disabled is null) and (not email is null)"
						order="name"
						:min-length=0
						:getLabel="formatEmail"
						v-model="job.params.pp.email[index]"
					>
							<i slot-scope="{item, index}">
						 	 {{item.name}} <i style="color:teal"> {{'(' + item.email + ')'}} </i>
							</i>
					</dlookup> 
				</array>

			</td>
    </tr>

    <tr>
      <td colspan="2" >
        <v-icon>local_printshop</v-icon> принтер <br>
      	<input type="text" v-model="job.params.pp.print" style="width:100%;border:1px solid #aaaaaa;font-size:0.95em" autocomplete="off">
			</td>
    </tr>
  </table>

<!------------------------------------------------------------>

	<table class="synapse" width="80%"> <!-- Очередь джобов -->
		<thead>
			<tr>
				<th colspan=9>Список задач на сервере</th>
			</tr>
			<tr>
				<th>№</th> 
				<th>Задача</th>
				<th>Описание</th>
				<th>Выполн.</th>
				<th>Следующ</th>
				<th>Вкл</th>
				<th><v-icon size=22 style="width:22px">play_circle_outline</v-icon></th>
				<th><v-icon size=22 style="width:22px">check_circle_outline</v-icon></th>
				<th><v-icon size=22 style="width:22px">play_circle_outline</v-icon></th> 
			</tr>
		</thead>
		
		<tbody>
			<tr v-for="(obj, index) in jobs" :key="obj.id" @click="jobSelect($event, obj)" :class="{error: states[index]==2, selected: job.id===obj.id }" > 
				<td style="text-align:center"  >{{obj.id}}</td>
				<td >{{ obj.name }}</td>
				<td width="45%">
					<input type="text" v-model="obj.description" autocomplete="off">
				</td>
				<td >
					<input v-if="obj.code==0 || obj.code==2" type="text" v-model="obj.last" size="10" style="text-align:center; font-size: 12px" readonly>
					<input v-else type="text" v-model="obj.last" size="10" style="text-align:center; font-size: 12px; color: red" readonly>
				</td>
				<td  >
					<input type="text" v-model="obj.next" size="10" style="text-align:center; font-size: 12px" readonly>
				</td>
				<td style="text-align:center" > 
					<input type="checkbox" v-model="obj.enabled" :disabled="obj.error">
				</td>
				<td style="text-align:center"  > 
          <v-icon size=22 v-if="states[index]!==1" @click="jobRun($event, obj)">play_arrow</v-icon>
				</td>
				<td style="text-align:center" > 
          <v-icon size=22 v-if="obj.params.pp.email && obj.params.pp.email.filter(eml=>eml!='').length">mail_outline</v-icon>
          <v-icon size=22 v-if="obj.params.pp.print">local_printshop</v-icon>
				</td>
				<td style="text-align:center"  > 
          <v-icon size=22 v-if="states[index]==0" class="trash-bin" @click="jobDelete(obj)">delete</v-icon>
					<img v-if="states[index]==1" src="../assets/ui-anim_basic_16x16.gif" style="vertical-align: text-bottom;">
				</td> 
			</tr>
		</tbody> 
	</table>
	</v-layout>
	</v-flex>

</template>

<script>
import {debounceKeyed, difference, clone, pxhr} from 'lib';
import moment from 'moment';

var _default = {task: -1, description:'',	next:'', last:'', code:0, params: {	argv:{}, pp: {email:[''], print:''} }, schedule:'* * * * * *', enabled :false };
var _before = null;

export default {
// В "Планировщике" реализован подход к вводу/редактированию данных, который использует реактивные 
// возможности Vue, и AJAX (стандартные HTTP запросы, выполняемые асинхронно) 
// - единицей данных является строка таблицы (объект в массиве jobs)
// - ввод данных осуществляется как в таблице, так и в окне, детализирующем конкретный выбранный элемент
// - ввод считается законченным, после того как пользователь перестал изменять данные в течение заданного интервала времени
// - введенные данные анализируются перед отправкой запроса на сервер, с целью минимизации количества запросов/траффика,
// 	 в результате чего на сервер отправляется не строка таблицы целиком (не объект целиком), а только измененные поля.
//
//  для обеспечения всего вышеперечисленного задействованы функции: 
// - vm.$watch        - наблюдение за изменениями записей заданного объекта 
// - _.debounceKeyed  - выполнение функции, после заданного интервала времени, после того, как 
//                      пользователь перестал повторять (boucing) вызывать эту функцию. 
// - _.difference     - определение различий между двумя данными объектами
// - _.clone          - глубокое клонирование заданного объекта

	data : function(){
		return {
			jobs : [], //массив job-ов (редактируемых данных) [ job(1) | job(2) |.... | job(n) ]
			states :[], //состояния job-ов вынесены отдельно, чтобы на них не срабатывал $watch('job'
			job : clone(_default), //"скользящий" фрейм, указывающий на конкретный редактируемый job в массиве jobs
			jobName : '' //--для обратной связи с компонентом выбора задачи
		}
	},

	mounted : function(){ //при появлении в DOM
		this.$watch('job', this.changes, {deep:true});

		var self = this;
		pxhr({method:'get', url:'/jobs'})
		.then(function(jobs){ 
				self.jobs = jobs.map(function(job){
					job.params = job.params || clone(_default.params);
					self.states.push(job.error ? 2 : 0);
					return job
				})
		})
	},

	methods : {
		jobState : function(job, state){
			var index = this.jobs.indexOf(job);
			if (index !== -1) this.states[index] = state; 
			this.$forceUpdate();
		},

		debounced : debounceKeyed(function(first, last){
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

			pxhr({ method:'put', url:'/jobs', data : changes })
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
			var routes = this.$router.options.routes;
			//склеиваем tasks и xtech и находим нужную задачу по имени (!!)
			var task = routes[1].children.concat(routes[2].children)
				.find(function(item){
					return item.path == taskId
				})
			
			var argv = {};		
			if (task && task.component) 
				task.component.render(function(src){
					if (src){
//						console.log(src);
						if (!src.data){ //шаблоны задач не имеют состояния (stateless=no data)
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

		taskSelect : function(evnt){ //dlookup event
			this.job  = clone(_default);
			this.job.task = evnt.id; 
			this.job.params.argv = this.fetchParams(evnt.id);
			this.job.params.pp = {print:'', email:['']};
			_before = clone(_default);
			_before.schedule = '';
		},

		jobSelect : function(evnt, job){ //select in table
			if (this.job === job) return;
			this.jobName = job.name; //dlookup text
			job.params = {
			//подмешиваем к имеющиемя в задаче параметрам, параметры по умолчанию (приоритет имеющимся)
				argv : Object.assign(this.fetchParams(job.task), job.params.argv),
				pp   : Object.assign({email:[''], print:''},     job.params.pp)
			};
//			console.log(JSON.stringify(job.params, null, " "))
			_before = clone(job);//?

			if (evnt && evnt.target && evnt.target.type=='checkbox') _before.enabled = !evnt.target.checked;
			this.job = job;

		},

		jobRun : function(evnt, job){
			var self = this;
			self.jobState(job, 1)
			pxhr({ method:'get', url:'/jobs/run?id=' + job.id})
			.then(function(res){
          job.last = res.last;
					self.jobState(job, 0)
			})
		},
		
		jobDelete : function(job){
			var self = this;
			pxhr({ method:'delete', url:'/jobs', data : job })
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

<style>

table.synapse th {
	font-weight: normal;
	font-size: 1.05em;
}

table.synapse th .v-icon.v-icon.v-icon {
  color: inherit;
}

table.synapse td .v-icon.v-icon.v-icon {
	cursor: default;
  vertical-align:middle;
  color: #57768A;
}
.v-icon.v-icon.trash-bin.v-icon--link:hover {
  color: red;
}

</style>


