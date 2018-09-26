<template>
<div>
	<h3>{{uname}}</h3>
<!--	<img src="./images/start.gif" width="100%"> -->

</div>

	
</template>

<script>

module.exports = {
	computed : {
		uname : function(){
			return this.$root.$children[0].status;
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


