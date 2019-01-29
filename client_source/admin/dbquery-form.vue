<template lang="pug">
	div
		div.resizeable(:style="{height: editorHeight, width: '100%'}")
			editor.editor-control(v-model='sql', ref='editor-control')
			div.resize-bar(@mousedown='initDrag')

				v-btn.action(v-on:click='query', title='Запуск (F9 - в активном редакторе)' style='left: 5px;' ) &#x27A4;

				label.action(style='right:70px') Row limit: 
				input.action(v-model='maxRows', style='right:5px; width:50px; border: thin solid #acdbff; padding:2px;line-height: 1.0em;')

				template(v-if='tableData.length')
					label.action(style='left:120px') Итого: {{statusString()}} 
					v-btn.action(v-on:click='saveResult' style='left:350px') Save .csv
					label.action(style='left:480px')  Фильтр: 
					input.action(v-model='search', style='left:540px; border: thin solid #acdbff; padding:2px; line-height: 1.0em;')
		br
		wait(v-if='running')
		pre(v-if='error', style='font-weight:bold') {{error}}    
		v-data-table.fixed-header.elevation-1.fixed(v-if='tableData.length', v-model='selected', :headers='headers', :items='tableData', :search='search', hide-actions='')
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
			editor : null,
			maxRows: 10,
			tableData : [],
			search : "",
			error : "",
			running : false,
			time : "",
			editorHeight : '250px',
			drag : {	
				startHeight : 0, 
				startY : 0
			},
			selected: [],
		}
	},

	computed : {
		headers : function(){
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

	mounted : function(){
		var self = this; 
		self.$watch('sql', function(){
			self.save()
		})
		self.editor = self.$refs['editor-control'].editor;
	},

	methods: {

		initDrag:function(e){
			// e.target.style.cursor='s-resize';
			this.drag.startY = e.clientY;
			this.drag.startHeight = parseInt(this.editorHeight, 10);
			document.documentElement.addEventListener('mousemove', this.doDrag, false);
			document.documentElement.addEventListener('mouseup', this.stopDrag, false);
			e.stopPropagation();
		},
			
		doDrag : function(e) {
			var height = this.drag.startHeight + e.clientY - this.drag.startY;
			if (height < 32) height = 32;
			this.editorHeight = height + 'px';
		},
			
		stopDrag : function (e) {
			this.editor.resize();
			// e.target.style.cursor='default';
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
					item = JSON.parse(item);
					this.sql = item.sql;
					this.$parent.tab.name = item.tab;
					this.editorHeight = item.editorHeight || '250px';
				}	catch(err){
					console.log(err)
				}	
			}
		},

		save : function(){
			localStorage.setItem(this.url(), JSON.stringify( {tab : this.$parent.name, sql : this.sql, editorHeight: this.editorHeight} ));			
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
	position: absolute;
	top: 5px;
	line-height: 1.6rem;
	/*top: 50%;
		display: block;
	transform: translateY(-50%);
	*/
	height: 22px; 
	padding: 0px;
	margin: 0px;
	text-transform: none;
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
	cursor:s-resize;
	background-color:rgb(215, 230, 240);
}

.editor-control {
	top: 0px;
	bottom: 32px;
	width: 100%;
	position: absolute;
}

/*----------------------------------------------------*/

.fixed-header table {
		table-layout: fixed;
}

.fixed-header th {
		background-color: #fff; /* just for LIGHT THEME, change it to #474747 for DARK */
		position: sticky;
		top: 0;
		z-index: 10;
}

.fixed-header tr.datatable__progress th {
		top: 56px;
}

.fixed-header .v-table__overflow {
		overflow: auto;
		height: 500px;
}

</style>

