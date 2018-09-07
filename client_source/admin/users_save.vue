<template>
<div>
	<v-alert
      v-model="alert"
      type="error"
      transition="scale-transition"
      dismissible
    >
    	{{message}}
  </v-alert>


	<div>
		<label for="selectUser">Выбрать пользователя:</label>	
		<dlookup
			name="select" 
			db="db/synapse.db" 
			table="users"
			fields="name,login" 
			result="id"
			look-in="name%,login%" 
			where="disabled = 0 or disabled is null"
			order="name"
      :min-length=0
			style="width:300px;display:inline-block"
			v-model="userName"
			@select="selectUser"
      :get-label="labelSelect"
		>
      <i slot-scope="{item, index}">
        {{item.name}} <i style="color:teal"> {{(item.login) ? '(' + item.login + ')':''}} </i>
      </i>
		</dlookup>

		<label for="addUser">&nbsp;&nbsp;&nbsp; Добавить пользователя:</label>	
		<dlookup
			name="add"
			db="ldap:"
			fields="sAMAccountName,displayName,mail" 
			look-in="sAMAccountName%,displayName%,mail%"
			style="width:350px;display:inline-block"
			@select="selectUserAD"
      :get-label="labelAdd"
		>
      <i slot-scope="{item, index}">
        {{item.displayName}} <i style="color:teal"> {{(item.sAMAccountName) ? '(' + item.sAMAccountName + ')':''}} </i>
      </i>
		</dlookup>

		<input v-show="canCreate" type="button" value="Добавить" v-on:click="addUser"> 

	</div>

	<div style="width:100%;height:2px;background:linear-gradient(to left, #CBE1F5, #74afd2); margin-top:1em; margin-bottom:1em;"></div>

	<table class="synapse" v-if="userId && access" v-for="section in [['tasks', 'xtech', 'todos', 'admin'],['ibs', 'deps', 'groups']]">
		<thead>
			<tr>
				<th v-for="_class in section" style="text-align: left; padding-left:0.15em" :key="_class"> 
					<input type="checkbox" 
						name="_class" 
						@change="setColumn(_class, $event.target.checked)"
						v-model="columnChecks[_class]" 
					>
					{{_class}}
				</th>
			</tr>
		</thead>

		<tbody>
			<tr> 
				<td style="vertical-align: baseline" v-for="_class in section"  :key="_class">
					<template v-for="el in access[_class]">
						<label>
							<input type="checkbox" 
								name="el.name"
								@change="setItem(el.id, $event.target.checked)"
								v-model="el.granted"
							>
							{{el.name}}
						</label>
						<label v-if="el.description" style="color:teal; font-size:.95em">[{{el.description}}]</label>
						<br>
					</template>
				</td>
			</tr>
		</tbody> 
	</table>

	<table class="synapse" v-if="userId && access" style="clear:both">
		<th>
			 Заблокировать  {{userLogin}} 
				<input type="checkbox" 	name="disabled_flag" 	v-model="access.$user.disabled" v-on:change="setDisabled" >
		</th>
	</table>
</div>
</template>

<script>
import {pxhr, keys} from 'lib';

export default {
	data: function(){
		return {
			canCreate: false, 
			userId: null,
			userLogin: '',
			userName:'',
			userEmail:'',
			access: null,	// =={ tasks:[], admin:[], ibs:[], deps:[] }
			message : '',
			alert : false
		}
	},

	mounted : function(){ //при появлении в DOM
	},

	computed:{
		columnChecks : function(){ //getter only
			var self = this;
			return Object.keys(self.access).reduce(function(obj, key){
				if (self.access[key] instanceof Array)
					obj[key] = self.access[key].reduce(function(result, item){
						return result && item.granted
					}, 1)	
				return obj;
			},{})
		}
	},

	methods: {
		setDisabled : function(){
			var self = this;
			return pxhr({ method:'put', url: '/access/user', 
				data:{
					userId:self.userId, 
					disabled: self.access.$user.disabled
				} 
			})
			.catch(function(err) {console.log(err)})
		},
		setItem : function(objectId, checked){ //установить/снять галочку с элемента
			var self = this;
			return pxhr({ method:'put', url: '/access/map', 
				data:{
					userId : self.userId, 
					objectId : objectId, 
					granted : Number(checked)
				} 
			}).then(res=>{
				if ((typeof res == 'object') && ('error' in res)){
					self.message = res.error
					self.alert = true
				}
			})	
			.catch(function(err) {console.log(err)})
		},
		setColumn : function(_class, checked){ //установить/снять галочку с колонки элементов
			var self = this;
			if (!(_class in self.access)) return; 

			self.access[_class].forEach(function(item){
				if (item.granted != Number(checked))
					self.setItem(item.id, checked) 
					.then(function(){
							item.granted = Number(checked)
					}) 
			})
		},
		addUser : function(event){ //добавить пользователя
			var self = this;
			self.canCreate = false;

			pxhr({ method:'put', url: '/access/user', data:{login: self.userLogin, name : self.userName, email:self.userEmail } })
			.then(function(res){
				if (res.error) {
					self.message = res.error
					self.alert = true
				}
				if (res.id){
					self.userId = res.id;
					return pxhr({ method:'get', url: '/access/map?user=' + self.userId})
						.then(function(res){//delete res.$user; 
								self.access = keys(res.access, 'class');
								self.access.$user = {disabled:self.access.disabled}
						})
				} else {
					self.userId = null;
					//self.message = res.message;
				}
			})
			.catch(function(err){console.log(err)})
		},

		selectUserAD : function(event) {
			this.userId = null;
			this.userLogin = event.sAMAccountName;
			this.userName = event.displayName;
			this.userEmail = event.mail;
			//наличие всех реквизитов для создания пользователя обязательно:
			this.canCreate = Object.keys(event).reduce( function(result, el){return result && event[el] }, true)
		},

		selectUser : function(event) {
			var self = this;
			self.userId = event.id;
			self.canCreate = false;
			pxhr({ method:'get', url: '/access/map?user=' + self.userId})
			.then(function(res){
				self.access = keys(res.access, 'class');
				self.access.$user = {disabled:self.access.disabled}
				if (res.error) {
					self.message = res.error
					self.alert = true
				}
			})
			.catch(function(err){console.log(err)})
		},

		labelSelect : function(item){
			return item.name
		},

		labelAdd : function(item){
			return item.displayName
		}
	}
}

</script>


