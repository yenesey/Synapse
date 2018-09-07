/*
	"�������" ��� ������� <task>

                   (c) ����� ������� <d.enisei@yandex.ru>
*/

process.on('unhandledRejection', r => { //��-��������� node �� ������� unhandledRejection ��������� �������
	console.log('unhandled promise rejection:');	
	console.log(r);
	process.exit(1);    //������ ���, ����� ������
});

(function() {
	var task = require('./' + process.argv[2]);
	var param = JSON.parse( process.argv[3] );
 	if (task.length===1) 
		task(param);
	else
		require('synapse/system')
			.then(system => task(param, system) )
//		.catch(err=>{	console.log(err.stack);	process.exit(1) })
})()
