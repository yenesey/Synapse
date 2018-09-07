'use strict';

require('synapse/system').then(system=>{

//var ora = require('./ds-oracle')({user:'obr', password:'1qaz2wsx3edc.', schema:'tavrdb.tavr_dop'});

 system.access('bogachev', {object:1}).then(console.log)

//var ora = require('./ds-oracle')({user:'psw_tst', password:'!744350bf4a3', schema:'T2000'});
//ora('SELECT SYSDATE FROM DUAL').then(console.log); 

/*

	var first = () => ora('begin 	:ret := VALMGR.first_referencing_on(:id, :class ); end;', 
		{	
			id : '115364503',	
			class : 'AC_FIN', 
			ret : ora.GET_STRING
		} 
	).catch(err=>console.log(err.message))

//err.errorNum
	first()
*/

/*
	var next = () => ora('begin :ret := VALMGR.next_referencing(:p_class_id, :p_class_name, :p_qual, :p_qual_name, :p_in_coll); end;', 
		{
			p_class_id   : ora.GET_STRING,
			p_class_name : ora.GET_STRING,
			p_qual       : ora.GET_STRING,
			p_qual_name  : ora.GET_STRING,
			p_in_coll    : ora.GET_STRING,
			ret          : ora.GET_STRING
		}
	) 

	var data = [];

	var loopNext = (res) => {
		if (res.ret==='1'){
			data.push(res)
			return ((promise) => (promise) ? promise.then(loopNext) : null)	( next() )
		}
	}


	first().then(loopNext)
		.then(() => console.log(data) )*/

})

