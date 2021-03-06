<template>
	<div>
		<h3 style="margin-top:.5em; margin-bottom:.5em">{{ description || name }}</h3>
		<form action="" method="post" enctype="multipart/form-data" ref="form">
			<slot/> <!--// ...подставляется контент из ./tasks -->
			<!-- <input type="hidden" name="_dontcare"> <! --// багфикс для IE, который в некоторых случаях отправляет поврежденную форму -->

			<div style="width:100%;height:2px;background:linear-gradient(to left, #CBE1F5, #74afd2); margin-top:1em; margin-bottom:1em;" />

			<div style="width:100%;height:50px;">

				<transition name="bounce">
					<button 
						class="button-submit"
						v-if="status!='running' && ready"
						@click="postForm"
						type="submit"
					>
						<span>Выполнить</span>
					</button>
				</transition> 
				<transition name="wait">
					<wait v-if="status=='running'"/>
				</transition>

			</div>
		</form>

		<transition name="bounce">
			<div v-if="(status=='done') && files.length" style="display: inline-block; width: auto; margin-top:10px">
				<div v-for="file in files" :key="file">
					<div class="files">
						<img style='float:left;' width=20 height=20 v-bind:src='iconFor(file)'>
						<a :href="path + '/' + file" :download="file">{{ file }}</a>
					</div>	
				</div>
			</div>
		</transition>
	
		<pre v-if="text" style="line-height: 1.2em;">{{ text }}</pre>
	</div>
</template>

<script>
import {extName, pxhr} from 'lib'
import Vue from 'vue'
import day from 'dayjs'
Vue.prototype.day = day

import excel from './assets/file-types/xlsx.png'
import word from './assets/file-types/docx.png'
import text from './assets/file-types/txt.png'
import dbase from './assets/file-types/dbf.png'
import blank from './assets/file-types/blank.svg'
                             
export default {
	props: ['id', 'name', 'description'],

	data () {
		return { //начальное состояние
			dialog : true,
			ready : true,
			status : '',
			text : '',
			path:'',
			files:[],
			progress: 0
		}
	},

	mounted () {
		this.loadElements()
		this.task = this.$slots.default ? this.$slots.default[0].componentInstance : {}
	},

	methods : {
		dispatchError (err) {
			this.status = 'error'
			this.text = err.message
		},

		url () {
			return 'tasks?id=' + encodeURIComponent(this.id)
		},
	
		onProgress (xhr) {
			var progress = xhr.responseText.length
			var progressText = xhr.responseText.substring(this.progress, progress)
			this.progress	= progress

			var lastLine = progressText.lastIndexOf('\n')+1
			try {
				var json = JSON.parse(progressText.substr(lastLine))
				if (typeof json.status !== 'undefined')
					progressText = progressText.substring(0, lastLine)
				
			} catch (err) {}

			this.text += progressText
		},		

		postForm (event) {
			var self = this
			var formData = new FormData(self.$refs.form)
			event.preventDefault()

			var model = self.task._data
			for (var key in model)
				if (key.charAt(key.length-1) !== '_') // keys, ended with '_' don't passed in formData
					formData.append(key, typeof model[key] === 'object' ? JSON.stringify(model[key]) : model[key])
			
			self.text = ''
			self.status = 'running'
			self.progress = 0
			self.saveElements()

			pxhr({
				method:'POST', 
				url: self.url(), 
				data: formData,
				progress: self.onProgress,
				timeout : 3600000 * 4 // 4 часа
			})
			.then(function (res) {
				var json = (typeof res === 'object') ? res : JSON.parse(res.substr(res.lastIndexOf('\n')+1))
				self.status = json.status
				self.path = json.path
				self.files = json.files
				self.text += json.message
				if (self.task && self.task.done) self.task.done()
			})
			.catch(function(err){self.dispatchError(err)})
		},
		
		saveElements () {
			var elems = this.$el.querySelectorAll('[save]')
			var $set = {}

			Array.prototype.forEach.call(elems, function(elem){
				var key = elem.getAttribute('save') || elem.name
				if (key) {
					if (elem.type === 'checkbox' || elem.type === 'radio')
						$set[key] = elem.checked
					else
						$set[key] = elem.value
				}
			})

//			var model = this.getTaskModel()
//			for (var key in model) $set[key] = model[key]

			window.localStorage.setItem(this.url(), JSON.stringify($set) )			
		},

		loadElements () {
			var elems = this.$el.querySelectorAll('[save]')

			var $set = window.localStorage.getItem( this.url() ) || '{}'
			$set = JSON.parse($set)

			Array.prototype.forEach.call(elems, function(elem){
				var key = elem.getAttribute('save') || elem.name
				if (key && (key in $set)){
					if (elem.type === 'checkbox' || elem.type === 'radio')
						elem.checked = $set[key]
					else
						elem.value = $set[key]
				}
			})

	//		var model = this.getTaskModel()
	//		for (var key in model) model[key] = $set[key]
		},

		iconFor (name) {
			var ext = extName(name).toLowerCase()
			switch (ext) { 
				case 'xlsx':
				case 'xlsm':
				case 'xls':	
							return excel
				case 'docx':
				case 'docm':
				case 'doc':	
							return word
				case 'txt':	
							return text
				case 'dbf':	
							return dbase
				default:
							return blank
			}
		}

	} //methods
}
</script>

<style>

.button-submit {
	border-radius: 5px;
	background-color: #acdbff;
	border: none;
	color: #57768A;
	text-align: center;
	line-height: 1.4em;
	font-size: .9em;
	font-weight:bold;
	padding: 5px 0px 5px 12px;
	width: 120px;
	transition: all .2s ease;
	cursor: pointer;
}

.button-submit:focus {outline:0;}

.button-submit:hover {
	background-color:#ccebff;
}

.button-submit span {
	cursor: pointer;
	display: inline-block;
	position: relative;
	transition: 0.5s;
}

.button-submit span:after {
	content: '\27A4';
	opacity: 0;
	transition: .2s ease;
}

.button-submit:hover span {
	padding-right: 10px;
}

.button-submit:hover span:after {
	opacity: 1;
	right: 0;
}

/*-----------------------*/
.files {
/*	width: 100%; */
	height: 2.4em;
}

.files > a{
	line-height:1em;
	padding: .2em .8em;
	display: inline-block;
	color: #426D98 !important;	
	text-decoration: none;
}

.files > a:hover{
	text-decoration: none;
}

.files > a:after {
	content: '';
	display: block;
	margin: auto;
	height: 1px;
	width: 0;
	background: transparent;
	transition: width .3s ease,background-color .5s ease;
}

.files > a:hover:after {
	width: 100%;
	background-color: #426D98;
}
/*-----------------------*/
.wait-enter-active {
	animation: wait-in 1.0s;
}
.wait-leave .wait-leave-active {
	height : 0;
}

@keyframes wait-in {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.bounce-enter-active {
  animation: bounce-in .5s;
}
.bounce-leave-active {
  animation: bounce-out .5s;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
	  animation-timing-function: ease-in;
    transform: scale(1.1);
  }
  100% {
	  animation-timing-function: ease-in;
    transform: scale(1);
  }
}

@keyframes bounce-out {
  40% {
    transform: translateX(-20px) scale(1);  
  }
  100% {
    transform: translateX(1000px) scale(0);  
  }
}

</style>
