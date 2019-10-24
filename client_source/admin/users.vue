<template lang="pug">
div
	v-layout(style='margin-top:1.5em')
		v-switch(v-model='showDisabled' messages='Показ. блок' style='margin-top: -0.425em;')
		// select from system:
		v-autocomplete(
			autocomplete='off'
			hide-no-data,
			item-disabled='__'
			return-object,
			v-model='user',
			:items='usersCached',
			:loading='ldapLoading',
			:search-input.sync='search',
			@input='selectUser',
			item-text='login',
			item-value='login',
			label='Выбрать существующего пользователя',
			placeholder='Начните вводить логин',
		)
			template(v-slot:item='el')
				v-list-item-content
					v-list-item-title(v-html='el.item.login')
					v-list-item-subtitle(v-html='el.item.name')
					v-list-item-subtitle(v-html='el.item.email')

		div(style='width:30px;height:auto;')

		// select from ActiveDirectory:
		v-autocomplete(
			autocomplete='off'
			hide-no-data,
			return-object,
			v-model='userLdap',
			:items='usersCachedLdap',
			:loading='ldapLoading',
			:search-input.sync='searchLDAP',
			@input='selectUserAD',
			item-text='search',
			item-value='login',
			label='Добавить нового пользователя из Active Directory',
			placeholder='Начните вводить логин',
			prepend-icon='search'
		)
			template(v-slot:item='el')
				v-list-item-content
					v-list-item-title(v-html='el.item.login')
					v-list-item-subtitle(v-html='el.item.name')
					v-list-item-subtitle(v-html='el.item.email')


		v-btn(fab, small, style='margin-left:20px; background-color: #acdbff;', :disabled='!enableAddUser' @click='addUser')
			v-icon add
	
	div(style='width:100%;height:2px;background:linear-gradient(to left, #CBE1F5, #74afd2); margin-top:1em; margin-bottom:1em;')
	
	v-slide-y-transition(mode='out-in')
		div(v-if='user.login')
			v-layout
				v-text-field(label='ФИО:', v-model='user.name', @change='changeUser', style='padding:10px', hide-details autocomplete='off')
				v-text-field(label='Login:', v-model='user.login', @change='changeUser' style='padding:10px', hide-details autocomplete='off')
				v-text-field(label='Email:', v-model='user.email', @change='changeUser' style='padding:10px', hide-details autocomplete='off')
				v-switch(label='Заблокировать', v-model='user.disabled', @change='changeUser' hide-details)
				
			v-treeview(
				dense,
				selectable,
				activatable,
				selection-type='leaf'
				:items='objects',
				v-model='objectsSelection'
				@input='treeCheck'
			)
				template(v-slot:label='{ item }')
					v-list-item-content
						v-list-item-title(v-html='item.name')
						v-list-item-subtitle(v-html='item.description' style='color:teal')
			v-alert(type='info' v-if='objectsSelection.length===0' dismissible border='left' elevation='2' colored-border) Атрибуты доступа пока не установлены

</template>

<script>
import { pxhr, keys } from 'lib'

export default {
	data: function () {
		return {
			user: {},
			usersCached: [],
	  		search: '',

			userLdap: {},
			ldapCached: [],
			searchLDAP: '',
			ldapLoading: false,	

			enableAddUser: false,
			
			message: '',
			showDisabled: false,
			userLogin: '',

			objects: [],
			objectsSelection: [],
			objectsSelectionChanging: false // флаг используетя в treeCheck чтобы отделить пользовательские изенения от подгружаемых с сервера
		}
	},
	mounted () {
		pxhr({
			method: 'get',
			url: 'users/objects',
		}).then(res => {
			this.objects = res
		}).catch(function (err) {
			console.log(err)
		})
	},

	computed: {
		usersCachedLdap () {
			return  this.ldapCached.map(el => ({
				login: el.sAMAccountName,
				email: el.mail,
				name: el.displayName,
				search: el.sAMAccountName + ' ' + el.mail + ' ' + el.displayName
			}))
		}
	},

	watch: {
		showDisabled (val) {
			this.usersCached = []
		},
	 	search (val) {
			if (!val || val.length === 0) {
				this.usersCached = []
				return
			}
	 	  	if (this.usersCached.length > 0) return
	 	  	pxhr({method:'GET', url: 'users?show-disabled=' + this.showDisabled})
	 	  	   .then(res => {
	 	  	   		this.usersCached = res
	 	  	  	})
	 	  	 	.catch(err => {
	 	  	  	 	console.log(err)
	 	  	  	})
		},
	
 	 	searchLDAP (val) {
			if (!val || val.length === 0) {
				this.ldapCached = []
				this.ldapLoading = false
				return
			}
			if (this.ldapCached.length > 0) return
	 	  	if (this.ldapLoading) return

	 	  	this.ldapLoading = true

	 	  	pxhr({method:'GET', url: 'users/ldap-users?filter=' + val})
	 	  	   .then(res => {
					this.ldapCached = res
	 	  	  	})
	 	  	 	.catch(err => {
	 	  	  	 	console.log(err)
	 	  	  	})
	 	  		.then(() => (this.ldapLoading = false))
		 }

	},

	methods: {
		handleResponse (res) {
			if ('error' in res) {
				this.message = res.error
			} else {
				this.message = ''
			}
		},
		treeCheck (e) {
			if (this.objectsSelectionChanging) return
			this.user._acl = e.join(',')
			pxhr({
				method: 'put',
				url: 'users/user',
				data: { login :  this.user.login, _acl: this.user._acl }
			})
			.then(this.handleResponse)
			.catch(function (err) {
				console.log(err)
			})
		},
	
		addUser: function () { //добавить пользователя
			let user = {...this.userLdap}
			if ('search' in user) delete user.search
			this.userLdap = {}
			this.usersCached = []
			this.user = user
			pxhr({
				method: 'put',
				url: 'users/user',
				data: this.user
			})
				.then(res => {
					this.handleResponse(res)
					this.selectUser(this.user)
				})
				.catch(console.log)
		},

		changeUser () {
			pxhr({
				method: 'put',
				url: 'users/user',
				data: this.user
			})
			.then(this.handleResponse)
		},

		selectUserAD: function (e) {
			this.enableAddUser = (e.login != '' && e.name  != '' && event.email  != '')
		},

		selectUser: function (e) {
			this.enableAddUser = false
			return pxhr({
				method: 'get',
				url: 'users/user?login=' + e.login
			}).then(res => {
				this.handleResponse(res)
				if (!res.error) {
					this.user = {login: e.login, ...res}
					this.objectsSelectionChanging = true
					if (res._acl) {
						this.objectsSelection = String(res._acl).split(',').map(Number)
					} else {
						this.objectsSelection = []
					}
					this.$nextTick(() => { // даем тикнуть событию input в treeview, и лишь потом снимаем флаг
						this.objectsSelectionChanging = false 
					})
				}
			}).catch(function (err) {
				console.log(err)
			})
		}

	}
}

</script>


