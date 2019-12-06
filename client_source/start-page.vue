<template>
<div>
	<!--
	<h3>{{uname}}</h3>
	<img src="./images/start.gif" width="100%"> 
	-->
<!--
	<iframe src="http://192.168.30.134:8080/#/notebook/2ET5CTM6D/paragraph/20191129-082839_178708697?asIframe" style="width:100%; height:800px; border: 1px solid #d1dbe5; " >
	</iframe>
-->	
</div>

	
</template>

<script>

module.exports = {
	computed : {
		uname : function(){
			return this.$root.$children[0].status
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


