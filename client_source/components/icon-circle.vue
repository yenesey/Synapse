<template>
	<i :type="type" class="icon-circle" @click="$emit('click', $event)" />
</template>

<script>
export default {
	props : { type:{ type : String, default : 'close'}},
	name : 'icon-circle'
//	methods : {	}
}
</script>

<style>

.icon-circle{
	cursor:default;
	font-style: normal;
	position: absolute;
	width: 2em;
	height: 100%;
	right: 0;
	top: 0;
	text-align: center;
}

.icon-circle:hover:before {
	background: #6C8CA9;
	color: white;
}

i[type="close"].icon-circle:before{
	content: "\2715"; 
	padding : .0em .16em;
}

i[type="plus"].icon-circle:before{
	content: "\FF0B"; 
	padding : .0em .16em;
}

.icon-circle:before{
	vertical-align: middle;
	border-radius: 1em;
	transition: all .3s;
}

.icon-circle:after {
	vertical-align: middle;
	content: '';
	height: 100%;
	width: 0px;
	display: inline-block;
}

</style>
