<template>
<div>
	<div>
		<label for="select">Выбрать задачу:</label>	
		<dlookup
			name="select" 
			db="db/synapse.db" 
			table="objects"
			fields="name" 
			result="id"
			look-in="name%" 
			where="class = 'tasks'"
      :min-length=0
			style="width:300px;display:inline-block"
			v-model="taskName"
			@select="selectTask"
      :get-label="labelSelect"
		>
      <i slot-scope="{item, index}">
        {{item.name}} 
      </i>
		</dlookup>

	</div>

	<div style="width:100%;height:2px;background:linear-gradient(to left, #CBE1F5, #74afd2); margin-top:1em; margin-bottom:1em;"></div>

	<table class="synapse" v-if="taskId && access" >
		<thead style="font-size: 16px;">
			<tr>
				<th colspan=2><v-icon style="vertical-align: bottom; padding-right:5px">people</v-icon><b>Пользователи</b></th>
			</tr>
			<tr>
				<th> Активные </th>
				<th> Заблокированные </th>
			</tr>
		</thead>

		<tbody>
			<tr> 
				<td style="vertical-align: baseline" >
					<template v-if="!el.disabled" v-for="el in access">
            <v-checkbox :label="el.name" v-model="el.granted" @change="setItem(el.id, $event.target.checked)" style="margin:0;padding-right:30px" hide-details></v-checkbox>
					</template>
				</td>
				<td style="vertical-align: baseline" >
					<template v-if="el.disabled" v-for="el in access">
            <v-checkbox :label="el.name" v-model="el.granted" @change="setItem(el.id, $event.target.checked)" style="margin:0;padding-right:30px" hide-details></v-checkbox>
					</template>
				</td>
			</tr>
		</tbody> 
	</table>

</div>
</template>

<script>
import {pxhr, keys} from 'lib';

export default {
	data: function(){
		return {
			canCreate: false, 
      taskId:null,
			taskName:'',
			access: null,	
			message: ''
		}
	},

	methods: {
		labelSelect : function(item){
			return item.name
		},

		selectTask : function(event) {
			var self = this;
			self.taskId = event.id;
			self.canCreate = false;
			pxhr({ method:'get', url: '/access/tasks?object=' + self.taskId})
			.then(function(res){
				self.access = res;
			})
			.catch(function(err){console.log(err)})
		},

		setItem : function(objectId, checked){ //установить/снять галочку с элемента
/*			var self = this;
			return pxhr({ method:'put', url: '/access/map', 
				data:{
					taskId:self.taskId, 
					objectId: objectId, 
					access: Number(checked)
				} 
			})
			.catch(function(err) {console.log(err)})
*/
		}
	}
}

</script>


