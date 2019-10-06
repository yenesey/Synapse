<template lang="pug">
div
	div
		v-switch(v-model='showDisabled', messages='показ. заблок.', style='display:inline-block')
		v-autocomplete(style='width:380px;display:inline-block', v-model='user', :items='users', :loading='isLoading', :search-input.sync='search', @input='selectUser', hide-no-data='', hide-selected='', item-text='login', item-value='name', label='Выбрать пользователя', placeholder='Начните вводить логин', prepend-icon='mdi-database-search', return-object='')
		v-btn(fab, small, style='margin-left: 20px; background-color: #acdbff;', @click.native.stop='dialog = !dialog')
			v-icon add
		v-dialog(v-model='dialog', max-width='550px')
			v-card
				v-card-title
					v-icon(style='font-size: 36px; padding-right: 10px; ') group_add
					span.headline Добавить пользователя
					dlookup(name='add', db='ldap:', fields='sAMAccountName,displayName,mail', look-in='sAMAccountName%,displayName%,mail%', style='width:350px', @select='selectUserAD', :get-label='labelAdd')
						i(slot-scope='{item, index}')
							| {{item.displayName}} 
							i(style='color:teal')  {{(item.sAMAccountName) ? '(' + item.sAMAccountName + ')':''}} 
				v-card-text
					v-text-field(label='ФИО:', v-model='displayName', style='padding:15px', hide-details='')
					v-text-field(label='Login:', v-model='sAMAccountName', style='padding:15px', hide-details='')
					v-text-field(label='Email:', v-model='mail', style='padding:15px', hide-details='')
				v-card-actions
					v-spacer
					v-btn(v-show='canCreate', style='background-color:#acdbff;', @click.native='addUser') Добавить
					v-btn(style='background-color:#acdbff;', @click.native='dialog = !dialog') Закрыть
	div(style='width:100%;height:2px;background:linear-gradient(to left, #CBE1F5, #74afd2); margin-top:1em; margin-bottom:1em;')
	
	template(v-if='userLogin')
		v-layout(v-if='userLogin')
			v-text-field(label='ФИО:', v-model='userName', style='padding:10px', @change='setUser', hide-details='')
			v-text-field(label='Login:', v-model='userLogin', style='padding:10px', @change='setUser', hide-details='')
			v-text-field(label='Email:', v-model='userEmail', style='padding:10px', @change='setUser', hide-details='')
			v-switch(label='Заблокировать', v-model='userDisabled', @change='setUser', hide-details='')
		v-treeview(dense, selectable, activatable, selection-type='leaf' :items='objects', v-model='objectsSelection' @input='treeCheck' v-if="objects.length")
	pre(v-if='message', style='font-weight:bold') {{message}}

</template>

<script>
import {
	pxhr,
	keys
} from 'lib';

export default {
	data: function () {
		return {
			users: [],
			user: {},
			isLoading: false,	
      		search: null,

			canCreate: false,
			userId: null,
			userLogin: '',
			userName: '',
			userEmail: '',
			userDisabled: 0,
			access: null, // =={ tasks:[], admin:[], ibs:[], deps:[] }
			
			message: '',
			showDisabled: false,
			dialog: false,
			sAMAccountName: '',
			displayName: '',
			mail: '',
			objects: [],
			objectsSelection: []
		}
	},
	mounted () {
		pxhr({
			method: 'get',
			url: 'access/object-map',
		}).then(res => {
			this.objects = res
		}).catch(function (err) {
			console.log(err)
		})
	},
    watch: {
		objectsSelection (val) {
			var self = this;
			return pxhr({
				method: 'put',
				url: 'access/acl',
				data: {
					user: self.userLogin,
					acl: val
				}
			}).then(res => {
				if ('error' in res) {
					self.message = res.error
					self.alert = true
				}
			}).catch(function (err) {
				console.log(err)
			})
		},
     	search (val) {
     	  	// Items have already been loaded
     	  	if (this.users.length > 0) return

     	  	// Items have already been requested
     	  	if (this.isLoading) return

     	  	this.isLoading = true

     	  	// Lazily load input items
     	  	pxhr({method:'GET', url: 'access/users'})
     	  	   .then(users => {
     	  	   		this.users = users
     	  	  	})
     	  	 	.catch(err => {
     	  	  	 	console.log(err)
     	  	  	})
     	  		.then(() => (this.isLoading = false))
	 	}
	},

	methods: {
		treeCheck (e) {
			// console.log(e)
		},
		setUser: function () {
			var self = this;
			return pxhr({
					method: 'put',
					url: 'access/user',
					data: {
						id: self.userId,
						login: self.userLogin,
						name: self.userName,
						email: self.userEmail,
						disabled: self.userDisabled
					}
				})
				.catch(function (err) {
					console.log(err)
				})
		},
		/*
		setItem: function (objectId, checked) { //установить/снять галочку с элемента
			var self = this;
			return pxhr({
					method: 'put',
					url: 'access/map',
					data: {
						user: self.userLogin,
						objectId: objectId,
						granted: checked
					}
				}).then(res => {
					if ((typeof res == 'object') && ('error' in res)) {
						self.message = res.error
						self.alert = true
					}
				})
				.catch(function (err) {
					console.log(err)
				})
		},
		*/
		addUser: function (event) { //добавить пользователя
			this.dialog = !this.dialog;
			this.userId = null;
			this.userLogin = this.sAMAccountName;
			this.userName = this.displayName;
			this.userEmail = this.mail;
			var self = this;
			self.canCreate = false;
			pxhr({
					method: 'put',
					url: 'access/user',
					data: {
						login: self.userLogin,
						name: self.userName,
						email: self.userEmail
					}
				})
				.then(function (res) {
					if (res.error) {
						self.message = res.error
						self.alert = true
					}
					if (res.id) {
						self.userId = res.id;
						return pxhr({
								method: 'get',
								url: 'access/map?user=' + self.userId
							})
							.then(function (res) { //delete res.$user; 
								self.access = keys(res.access, 'class');
								self.access.$user = {
									disabled: self.access.disabled
								}
							})
					} else {
						self.userId = null;
						//self.message = res.message;
					}
				})
				.catch(function (err) {
					console.log(err)
				})
		},

		selectUserAD: function (event) {
			this.sAMAccountName = event.sAMAccountName;
			this.displayName = event.displayName;
			this.mail = event.mail;
			//наличие всех реквизитов для создания пользователя обязательно:
			(event.sAMAccountName && event.displayName && event.mail) ? this.canCreate = true: this.canCreate = false;
		},

		selectUser: function (event) {
			console.log(event)
			var self = this;
			self.userId = event.id;
			self.userLogin = event.login;
			self.userName = event.name;
			self.userEmail = event.email;
			self.userDisabled = event.disabled;
			self.canCreate = false;
			pxhr({
				method: 'get',
				url: 'access/acl?user=' + self.userLogin
			}).then(function (res) {
				if (!res.error) {
					self.objectsSelection = res
				} else {
					self.message = res.error
					self.alert = true
				}
			}).catch(function (err) {
				console.log(err)
			})
		},

		labelSelect: function (item) {
			return item.name
		},

		labelAdd: function (item) {
			return item.displayName
		}
	}
}

</script>


