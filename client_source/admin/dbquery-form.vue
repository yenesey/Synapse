<template lang="pug">
	div
		div.resizeable(:style="{height: editorHeight + 'px', width: '100%'}")
			editor.editor-control(v-model='sql', ref='editor-control')
			div.resize-bar(@mousedown='initDrag')

				v-btn.action(v-on:click='query', title='Запуск (F9 - в активном редакторе)' style='float:left') &#x27A4;


				input.action.border(v-model='maxRows')
				label.action Кол-во строк: 
				label.action &nbsp;

				v-menu(offset-y='')
					template(v-slot:activator="{ on }") 
						input.action.border(v-model='connection' v-on="on")
					v-list(width=200)
						v-list-item(v-for='(el) in conns' :key='el'  @click='connection = el')
							v-list-item-title {{ el }}

				label.action(style='float:right;') Источник: 

				template(v-if='tableData.length')
					label.action(style='float:left') Итого: {{statusString()}}
					v-btn.action(v-on:click='saveResult' style='float:left') Save .csv

					label.action(style='float:left;') Фильтр:
					input.action.border(v-model='search' style='float:left; width: 120px;')


		wait(v-if='running' style='margin: 10px')
		pre(v-if='error', style='font-weight:bold') {{error}}    

		v-data-table(
			style='margin-top:10px'
			v-if='tableData.length'
			:height='tableHeight'
			dense 
			fixed-header
			disable-pagination
			hide-default-footer
			v-model='selected'
			:headers='headers'
			:items='tableData'
			:search='search'
		)
			// template(v-slot:default)
				thead
					tr(v-for='(h) in headers' )
						th.text-center.subtitle-1 h

			template(slot='items', slot-scope='props')
				tr(:active='props.selected', @click='props.selected = !props.selected')
					td.text-xs-left(v-for='(v, k) in props.item') {{ v }}

			v-alert(slot='no-results', :value='true', color='error', icon='warning')
				| Your search for &quot;{{ search }}&quot; found no results.
</template>

<script>
// @keydown.native="editorKey" //	div(style='width:auto; padding: 2px 6px;color:#57768A;')
import {declByNum, pxhr} from 'lib';
import moment from 'moment';
import editor from './editor/ace-editor.js';

//сохранение любого контента в файл
var saveFile = function(content, type, filename){ 
	//example: type:'text/csv;charset=utf-8'
	var blob = new Blob(['\uFEFF'+content], { type: type }); 

	if (/Edge|.NET/.test(navigator.appVersion.toString()))
		window.navigator.msSaveBlob(blob, filename);
	else {
		var link = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
		link.href = URL.createObjectURL(blob);
		link.download = filename;
		link.click();
	}
}

export default {

	data : function(){
		return {
			sql : 'select * from V$NLS_PARAMETERS --показать параметры сессии',
			conns: null,
			connection: 'warehouse',
			editor : null,
			maxRows: 40,
			tableData : [],
			search : "",
			error : "",
			running : false,
			time : "",
			editorHeight : 250,
			drag : {	
				startHeight : 0, 
				startY : 0
			},
			selected: [],
		}
	},

	created () {
		pxhr({method:'GET', url: 'dbquery/connections'})
 	  	   .then(res => {
 	  	   		this.conns = res
 	  	  	})
 	  	 	.catch(err => {
 	  	  	 	console.log(err)
			})
	},

	computed : {
		tableHeight () {
			return document.documentElement.clientHeight - this.editorHeight - 150
		},
		headers () {
			var rows = this.tableData;
		
			if (rows.length === 0) return [];
			var heads = Object.keys(rows[0]).map(el=>({
				text: el,
			 //   align: (typeof this.tableData[0][el] === 'string')?'right':'left',
				sortable: true,
				width : 50,
				class : 'flex',
				value: el
			}))

			//вычисляем ширины колонок по размеру текста
			rows.forEach(row=>{
				heads.forEach(head=>{
					let s = String(row[head.value])
					if (s)	
						head.width = Math.max(head.width, s.length * 7 + 50)
				})	
			})	

			heads.forEach(head=>{
				head.width = head.width + 'px'
			})	

			return heads
		}

	},
	
	components: {
		editor: editor
	},

	watch : {
		sql () {
			this.save()
		},
		connection () {
			this.save()
		}
	},

	mounted : function(){
		this.editor = this.$refs['editor-control'].editor;
	},

	methods: {

		initDrag:function(e){
			e.target.style.cursor='s-resize';
			this.drag.startY = e.clientY;
			this.drag.startHeight = parseInt(this.editorHeight, 10);
			document.documentElement.addEventListener('mousemove', this.doDrag, false);
			document.documentElement.addEventListener('mouseup', this.stopDrag, false);
			e.stopPropagation();
		},
			
		doDrag : function(e) {
			var height = this.drag.startHeight + e.clientY - this.drag.startY;
			if (height < 32) height = 32;
			this.editorHeight = height;
		},
			
		stopDrag : function (e) {
			this.editor.resize();
			e.target.style.cursor='default';
			document.documentElement.removeEventListener('mousemove', this.doDrag, false);
			document.documentElement.removeEventListener('mouseup', this.stopDrag, false);
			this.save();
		},

		url : function(){
			return 'sql?id=' + this.$parent.id
		},

		load : function(){
			var item = localStorage.getItem( this.url() );
			if (item)	{
				try {
					item = JSON.parse(item)
					this.sql = item.sql
					this.$parent.tab.name = item.tab
					this.editorHeight = item.editorHeight || '250px'
					this.connection = item.connection
				}	catch(err){
					console.log(err)
				}	
			}
		},

		save : function(){
			localStorage.setItem(this.url(), JSON.stringify( {tab : this.$parent.name, sql : this.sql, editorHeight: this.editorHeight, connection: this.connection} ));			
		},

		remove : function(){
			localStorage.removeItem( this.url() );			
		},

		saveResult : function(event) {
			var content = Object.keys(this.tableData[0]).reduce(function(s, next){
					return  s + next + ';';
				}, "") + '\n' +
				this.tableData.reduce(function(s, next){
					return s + Object.keys(next).reduce(function(s, key){
						var value = next[key];
						if (typeof value === 'string'){
							value = value.replace(/\n|\r/g, '');
						}
						if (/^(0|[1-9][0-9]*)$/.test(value)){
							return s + '="' + value + '"' + ";"
						}	else {
							return s + value + ";"
						}
					}, "") + '\n';
				}, "");
			
			saveFile(content, 'text/csv;charset=utf-8', this.$parent.name + '.csv');
		},
		
		statusString : function(){
			return this.tableData.length + " " +  declByNum(["строк",	"а",	 "и", "", 0], this.tableData.length) + ' (время: ' + this.time + ')';
		},

		query : function() {
			var self = this;

			self.running = true;
			self.tableData = [];
			self.error = "";
			var start = moment();			

			pxhr({ method:'post', url:'dbquery', timeout : 60000*30, 
				data: {
					connection: this.connection,
					sql : this.sql,
					maxRows: this.maxRows
				}
			})
			.then(function(res){
				self.running = false;
				if (res.error){
					self.error = res.error 
				} else {				
					self.tableData = res; 
					self.time = moment(moment() - start).format("mm:ss.SSS");
				}
			})
			.catch(function(err){
				self.running = false;
				self.error = err;
				console.error(err);
			});
			return false; 
		} //query 
	} //methods
}

</script>

<style>

/*
table.v-datatable{
	table-layout: fixed;
}
*/

.action {
	padding: 2px;
	line-height: 1.0em;
	float: right;
	margin: 5px;
	/* top: 50%;
	transform: translateY(-50%);
	*/
	max-height: 22px;
	height: 22px; 
	text-transform: none;
}

.border {
	border: thin solid #acdbff;
	width: 80px;
}

.resizeable {
	position: relative;
	border: 2px solid #a8cfe6;
	width: 100%;
	overflow: auto;
	color: #999;
}

.resize-bar {
 -webkit-user-select: none;
 -moz-user-select:  none;
 -ms-user-select: none;
	user-select: none;
	bottom: 0px;
	height: 32px;
	left: 0px;
	right: 0px;
	position: absolute;
	background-color:rgb(230, 245, 250);
	color: #000;
	transition: all .3s;
}

.resize-bar:hover {
	cursor: pointer;
	background-color:rgb(215, 230, 240);
}

.editor-control {
	top: 0px;
	bottom: 32px;
	width: 100%;
	position: absolute;
}

</style>

