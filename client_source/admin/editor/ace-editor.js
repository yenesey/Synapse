import ace from 'brace';
import 'brace/ext/searchbox.js';

/*
require(['emmet/emmet'],function (data) {
		window.emmet = data.emmet;
});
*/

export default {
// 
	template:'<div></div>',
		
	props:{
		value:{
			type:String,
			required:true
		},
		height:true,
		width:true
	},
	data: function () {
		return {
			editor:null,
			contentBackup:""
		}
	},
	
	watch : {
		value : function(val) {
			if(this.contentBackup !== val)
				this.editor.setValue(val,1);
		}
	},
	mounted: function () {
		var vm = this;
		var lang = 'sql';
		var theme = 'synapse';
		
		// require('brace/ext/emmet');
		var editor = vm.editor = ace.edit(this.$el);
		//	editor.setOption("enableEmmet", true);
	
	 	//this.$emit('init',editor);
		require('./'+lang);
		require('./'+theme);

		editor.$blockScrolling = Infinity;
		//editor.setAutoScrollEditorIntoView(true);
		//editor.setOption("autoScrollEditorIntoView", true);
		//editor.setOption("maxLines", Infinity);
		editor.setOption('fontSize', 14);
		editor.setOption('tabSize', 2);
		editor.setOption('useSoftTabs', false); //реальные табы вместо пробелов
	
		editor.getSession().setMode('ace/mode/'+lang);
		editor.setTheme('ace/theme/'+theme);
		editor.setValue(this.value,1);
	
		editor.on('change',function () {
			var content = editor.getValue();
			vm.$emit('input',content);
			vm.contentBackup = content;
		});
	
	
	} 
}
