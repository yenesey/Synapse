/*var fs = require('fs');
promise = require('promiseify');


(async function (){

	let lst = await promise(fs.readdir)('C:\\');
	console.log(lst);

})()
*/
module.exports = function(params, system){
	console.log(params);
}

