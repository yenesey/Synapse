<template>
<div>
	<h3>Добро пожаловать {{uname}}! </h3>
<!--	<img src="./images/start.gif" width="100%"> -->

</div>

	
</template>

<script>

export default {
	data(){
		return {
//			dialog : true	
		}
	},
	computed : {
		uname : function(){
			return {
				'bogachev' : 'Дениc'
			}[this.$parent.user]
		}
	}
}

</script>

<style scoped>
div > a{
	padding:0;	
	font-weight: bold;
	color: #426D98;
 	line-height: 1em;
}	
</style>


