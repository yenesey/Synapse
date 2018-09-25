<template>
	<div>

		<div class="resizeable" :style="{height: editorHeight, width: '100%'}">
			<!--@keydown.native="editorKey"-->
		  <editor v-model="sql" class="editor-control" ref="editor-control" />

			<div @mousedown="initDrag" class="resize-bar">
				<div style="width:auto;height:1.5em;line-height:1.0em;font-size:1.0em;padding:4px 10px;color:#57768A;">
					<button v-on:click="query" type="submit" title="Запуск (F5 - в активном редакторе)">&#10148;</button>
  
					<template v-if="tableData.length">
						<label data-v-f3f3eg9> Итого: {{statusString()}} </label>
							<input v-on:click="saveResult" type="button" value="Сохранить в .csv" >
						<label data-v-f3f3eg9> Фильтр: </label>
							<input v-model="search" style="width:150px" /> 
					</template>
					<label data-v-f3f3eg9 style="float:right">Максимум: <input v-model="maxRows" style="width:50px"/> </label>

				</div>
			</div>
		</div> <!--resizeable-->

		<br>

		<wait v-if="running"></wait>
		<pre v-if="error" style="font-weight:bold">{{error}}</pre>

<!--		<div class="v-table__overflow">
			<grid	v-if="tableData.length" :tableData="tableData" :filterKey="filterKey" > </grid> 

      :pagination.sync="pagination"


		</div>	-->



	<v-data-table
			v-if="tableData.length"
      v-model="selected"
      :headers="headers"
      :items="tableData"
      :search="search"
      class="elevation-1"
    >
<!--
      select-all
      item-key="name"

      <template slot="headers" slot-scope="props">
        <tr>

          <th>
			     <v-checkbox
              :input-value="props.all"
              :indeterminate="props.indeterminate"
              primary
              hide-details
              @click.native="toggleAll"
            ></v-checkbox>
          </th> 
          <th
            v-for="header in props.headers"
            :key="header.text"
            :class="['column sortable', pagination.descending ? 'desc' : 'asc', header.value === pagination.sortBy ? 'active' : '']"
            @click="changeSort(header.value)"
          >
            


            <v-icon small>arrow_upward</v-icon>
            {{ header.text }}
          </th>
        </tr>
      </template>
-->
      <template slot="items" slot-scope="props">
        <tr :active="props.selected" @click="props.selected = !props.selected">
    <!--
		      <td>
            <v-checkbox
              :input-value="props.selected"
              primary
              hide-details
            ></v-checkbox>
          </td> 
		-->
          <td  class="text-xs-right" v-for="(v, k) in props.item">{{ v }}</td>

        </tr>
      </template>
      <v-alert slot="no-results" :value="true" color="error" icon="warning">
        Your search for "{{ search }}" found no results.
      </v-alert>

    </v-data-table>

	</div>
</template>

<script>
import {declByNum, pxhr} from 'lib';
import moment from 'moment';
import editor from './editor/ace-editor.js';
import grid from './grid.vue';

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
			maxRows: 100,
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
			if (this.tableData.length === 0) return [];

			return Object.keys(this.tableData[0]).map((el)=>{
				return {
          text: el,
          align: 'left',
          sortable: true,
          value: el
				}	
			})

		}

	},

  components: {
    editor: editor,
		grid: grid
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
			this.editorHeight = height + 'px';
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

			pxhr({ method:'post', url:'/dbquery', timeout : 60000*30, 
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
	width:  100%;
	position: absolute;
	background-color:rgb(230, 245, 250);
	color: #000;
	transition: all .3s;
}

.resize-bar:hover {
	cursor:default;
	background-color:rgb(215, 230, 240);
}

.editor-control {
	top: 0px;
	bottom: 32px;
	width: 100%;
	position: absolute;
}

label[data-v-f3f3eg9]{
	margin-left:40px;
}

</style>

