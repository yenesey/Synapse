"use strict";

/* 
  Сервер Synapse

  запуск из командной строки:
    node app [options]
     где options:
        --production - запуск в режиме production, аналог NODE_ENV=production,
                     иначе сервер работает в режиме разработки - сборка 
                     клиента на лету с Hot Module Reload (HMR)
        --port=N   - задать прослушиваемый порт
                     также можно задать переменной окружения PORT
        --service  - запустить как службу (влияет на обработку сигналов прерывания
                     и закрытия процесса)
    npm run build  - сборка клиентского приложения (bundle)
    npm run test   - сборка bundle и запуск тестового сервера в режиме production

  ------------------------------------------------------------------------------------------------
  Сервер, клиент, ./core модули (за исключением отмеченных отдельно) © Денис Богачев <d.enisei@yandex.ru>
  ------------------------------------------------------------------------------------------------
*/

var 
	path    = require('path'),
	util    = require('util'),
	moment  = require('moment'),
	CronJob = require('cron').CronJob,
	chalk   = require('chalk'),
	express = require('express'),
	https   = require('https'),
	compression = require('compression');
require('moment-precise-range-plugin');
var server = null;

//вывод в консоль в своем формате
console._log = console.log; 
console.log = function(){ 
	var args = Array.prototype.slice.apply(arguments);
	console._log(chalk.reset.cyan.bold(moment().format('HH:mm:ss ')) +
		args.reduce((all, arg)=>all+((typeof arg === 'object')?util.inspect(arg):arg), '')
	) 
}

function stringToBoolean(string){
	switch(string.toLowerCase().trim()){
		case "true": case "yes": case "1": return true;
		case "false": case "no": case "0": case null: return false;
		default: return Boolean(string);
	}
}

/*
function accessHandler(req, res, next) {
	res.set('Access-Control-Allow-Origin', '*');
	next();
}
*/

function errorHandler(err, req, res, next) {
	if (res.headersSent) return next(err);
	console.log(err.stack); 
	res.status(500).send(err.message);
}

function obj2Str(obj, tag){
	var str = chalk.cyan.bold('[' + tag + '] ');
	for (var key in obj)
		if (obj[key])
			str = str + key + ':' + chalk.reset.yellow(
				String(obj[key]).replace(/(\d)(?=(\d{3})+([^\d]|$))/g, '$1,')
			) + ' ';
	return str;
}

function memUsage(){
	return obj2Str(process.memoryUsage(),'memory')
}

function upTime(){
	return obj2Str(
		moment().subtract(process.uptime(),'seconds').preciseDiff(moment(), true),'uptime'
	)
}

function easterEgg(){
	return '\n (.)(.)\n  ).(  \n ( v )\n  \\|/'
}

////////////////Обрабатываем командную строку////////////////
process.argv.forEach(arg=>{
	let pv=arg.split('=');
	switch(pv[0]){
		case '--port': process.env.PORT = pv[1]; break;
		case '--production': process.env.NODE_ENV = 'production'; break;
		case '--service': process.env.SERVICE = true; break;
	} 
})

function close(){
	console.log('server goes down now...')
	if (server) {
		server.close(function () {
			console.log('all requests finished')
			process.exit()
		})
		setTimeout(function(){
			server.emit('close')
		}, 5500)
	}	else {
		process.exit()
	}
} 
	
// ----------------в случае получения сигнала корректно закрываем--------------------
process.on('SIGHUP', close).on('SIGTERM', close).on('SIGINT', close); 

if (!process.env.SERVICE){ // если не служба, 
// то будет полезно обработать некоторые нажатия клавиш в консоли
	let stdin = process.stdin;
	if (typeof stdin.setRawMode === 'function'){
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding('utf8');
		stdin.on('data', function(input){
			switch (input) { 
				case 'm': console.log(memUsage()); break;
				case 'u': console.log(upTime()); break;
	//      case 'i': console.log(module); break;
				case '\u0003': close(); break;  //Ctrl+C
			
				default:  console.log(easterEgg())
			}
		})
	} 
} 

(function (){
		var format = (obj, color) => Object.keys(obj).reduce((all, key)=> 
			all + key + ':' + ((typeof color==='function')?color(obj[key]):obj[key]) + ' | ', '| '
		)
		
		var args = { 
			args : process.argv.length > 2 ? process.argv.slice(2) : [] 
		};
	
		var info = [
			[process.versions, ['node', 'v8']],
			[process,          ['arch']],
//			[this.address(),   ['port']],
			[process.env,      ['port']],  
			[process.env,      ['node_env']],
			[args,             ['args']],
			[process,          ['execArgv']]
		].reduce((obj,el)=>{
				el[1].forEach(key=>{
					if (el[0][key] && String(el[0][key]))
						obj[key] = String(el[0][key])
				})
				return obj
		},{})

		var l = format(info).length-1;
		//выводим системную инфу в отформатированном виде
		process.stdout.write('-'.repeat(l) + '\n' + format(info, chalk.green.bold) + '\n' + '-'.repeat(l)+ '\n');

		new CronJob('00 00 * * *',  function(){
				process.stdout.write('['+chalk.green.bold('#'+moment().format('YYYY-MM-DD'))+
				']------------------------------------------------------------------------------\n');
				console.log(upTime());
				console.log(memUsage());
			}, null, true, null, null, true
		)
}())

/*
-------------------------------------------------------------------------------------
*/
require('synapse/system').then(system=>{
	var app  = express()
  
	app.use([
		errorHandler,
	//  accessHandler,
		compression( {threshold : 0} ),

		(process.env.NODE_ENV === 'production'    //клиентское приложение:  
			? express.static( path.join(__dirname, 'client')) //статика 
			: require('synapse/dev-middleware') // или динамика, в зависимости от режима
		),  

		(system.config.cards && stringToBoolean(system.config.cards.on)
			? require('synapse/api/cards')(system)  //запрос инфы по картам для сайта
			: (req, res, next)=>next()
		),

		require('synapse/api/access')(system), //с этого момента и далее вниз начинается контроль доступа

		express.static(system.config.path.users, { //каталог с пользовательскими папками
			setHeaders: function(res, path){
				res.attachment(path) //добавляем в каджый заголовок инфу о том, что у нас вложение
			} 
		}),
		require('synapse/api/dlookup')(system), 
		require('synapse/api/dbquery')(system),
		require('synapse/api/tasks')(system),
		require('synapse/api/jobs')(system)
	])
	
	server = https.Server({
			passphrase: String(system.config.ssl.password),
			pfx: system.config.ssl.certData
		},
		app
	)

	server.on('error', err=>{
		console.log(chalk.red.bold("[error]:") + JSON.stringify(err, null, ""));  
		process.exit();
	})

	server.listen(process.env.PORT || 443)
})
.catch(err=>console.log(err.stack))
