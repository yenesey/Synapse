<template>
<div>
	<div>
    <v-switch 
      v-model="showDisabled"
      messages="показ. заблок."
      style="display:inline-block"
    /> 
		<label for="select">Выбрать пользователя:</label>	
		<dlookup
			name="select" 
			db="db/synapse.db" 
			table="users"
			fields="name,login,email,disabled" 
			result="id"
			look-in="name%,login%" 
			:where="showDisabled?'':'(disabled = 0 or disabled is null)'"
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

    <v-btn
      fab
      small
      style="margin-left: 20px; background-color: #acdbff;"
      @click.native.stop="dialog = !dialog"
    >
      <v-icon>add</v-icon>
    </v-btn>
      
      <v-dialog v-model="dialog" max-width="550px" lazy>
        <v-card>
          <v-card-title>
            <v-icon style="font-size: 36px; padding-right: 10px; ">group_add</v-icon>
            <span class="headline">Добавить пользователя</span>
        		<dlookup
        			name="add"
        			db="ldap:"
        			fields="sAMAccountName,displayName,mail" 
        			look-in="sAMAccountName%,displayName%,mail%"
        	    style="width:350px"
        			@select="selectUserAD"
              :get-label="labelAdd"
        		>
              <i slot-scope="{item, index}">
                {{item.displayName}} <i style="color:teal"> {{(item.sAMAccountName) ? '(' + item.sAMAccountName + ')':''}} </i>
              </i>
        		</dlookup>
          </v-card-title>
          <v-card-text>
            <table width=100% class="synapse" >
              <tr>
                <v-text-field
                  label="ФИО:"
                  v-model="displayName"
                  style="padding:15px"
                  hide-details />
              </tr>
              <tr>
                <v-text-field
                  label="Login:"
                  v-model="sAMAccountName"
                  style="padding:15px"
                  hide-details />
              </tr>
              <tr>
                <v-text-field
                  label="Email:"
                  v-model="mail"
                  style="padding:15px"
                  hide-details />
              </tr>
            </table>
            <br><br><br><br><br><br><br><br><br><br><br><br>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn v-show="canCreate" style="background-color:#acdbff;" @click.native="addUser">Добавить</v-btn>
            <v-btn style="background-color:#acdbff;" @click.native="dialog = !dialog">Закрыть</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
	</div>

	<div style="width:100%;height:2px;background:linear-gradient(to left, #CBE1F5, #74afd2); margin-top:1em; margin-bottom:1em;"></div>

	<table width=100% class="synapse" v-if="userId && access">
    <td>
      <v-text-field v-if="userId && access"
        label="ФИО:"
        v-model="userName"
        style="padding:10px"
        @change="setUser"
        hide-details />
    </td>
    <td>
      <v-text-field v-if="userId && access"
        label="Login:"
        v-model="userLogin"
        style="padding:10px"
        @change="setUser"
        hide-details />
    </td>
    <td>
      <v-text-field v-if="userId && access"
        label="Email:"
        v-model="userEmail"
        style="padding:10px"
        @change="setUser"
        hide-details />
    </td>
		<td>
      <v-switch 
        label="Заблокировать"
        v-model="userDisabled" 
        @change="setUser" 
        hide-details /> 
		</td>
	</table>

	<table class="synapse" v-if="userId && access" v-for="section in [['tasks', 'todos', 'admin'],['ibs', 'deps', 'groups']]">
		<thead>
			<tr>
				<th v-for="_class in section" style="text-align:left; padding-left:0.15em; padding-right:30px" :key="_class">
          <v-checkbox 
            :label="_class" 
            v-model="columnChecks[_class]" 
            @change="setColumn(_class, $event)" 
            style="margin:0;" 
            hide-details> 
          </v-checkbox> 
				</th>
			</tr>
		</thead>

		<tbody>
			<tr> 
				<td style="padding-right:30px;vertical-align: baseline" v-for="_class in section"  :key="_class">
					<template v-for="el in access[_class]">
            <v-checkbox v-if="el.description"
              :label="el.name" 
              v-model="el.granted" 
              @change="setItem(el.id, $event)" 
              style="margin:0;" 
              :messages="el.description"> 
            </v-checkbox> 
            <v-checkbox v-else
              :label="el.name" 
              v-model="el.granted" 
              @change="setItem(el.id, $event)" 
              style="margin:0;" 
              hide-details> 
            </v-checkbox> 
					</template>
				</td>
			</tr>
		</tbody> 
	</table>

	<pre v-if="message" style="font-weight:bold">{{message}}</pre>

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
      userDisabled: 0,
			access: null,	// =={ tasks:[], admin:[], ibs:[], deps:[] }
			message: '',
      showDisabled: false,
      dialog: false,
      sAMAccountName: '',
      displayName: '',
      mail: ''
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
		setUser : function(){
			var self = this;
			return pxhr({ method:'put', url: '/access/user', 
				data:{
					id:self.userId, 
					login:self.userLogin,
					name:self.userName,
					email:self.userEmail,
					disabled: self.userDisabled
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
      this.dialog = !this.dialog;
			this.userId = null;
			this.userLogin = this.sAMAccountName;
			this.userName = this.displayName;
			this.userEmail = this.mail;
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
			this.sAMAccountName = event.sAMAccountName;
			this.displayName = event.displayName;
			this.mail = event.mail;
			//наличие всех реквизитов для создания пользователя обязательно:
 			(event.sAMAccountName && event.displayName && event.mail) ?	this.canCreate = true : this.canCreate = false;
		},

		selectUser : function(event) {
			var self = this;
			self.userId = event.id;
			self.userLogin = event.login;
			self.userName = event.name;
			self.userEmail = event.email;
			self.userDisabled = event.disabled;
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


