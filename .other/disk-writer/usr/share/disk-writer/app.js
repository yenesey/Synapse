/*
  Микросервис disk-writer(dwr) for Linux OS. Самостоятельная часть проекта "Synapse"
                                          © Денис Богачев <d.enisei@yandex.ru>

  необходимые утилиты:
   - genisoimage, либо mkisofs
   - wodim,       либо cdrecord
   - eject

*/
const devName='sr0'; //в разных конфигурациях девайс может называться по-разному
const uploadDir='/var/upload'; //настраиваемый параметр (путь должен существовать)


//--------------------------------------------------------------------------------------
process.chdir(__dirname);

var formidable = require('formidable'),
	promiseify = require('promiseify'),
	path = require('path'),
	fs = require('fs'),
	http = require('http'),
	util = require('util');

var busy = false;

//--------------------------------------------------------------------------------------

function shellExec(proc, args, ops, cb){
//нам понадобятся внешние утилиты (mkisofs, cdrecord...), стандартизируем работу с ними в этой функции
	return new Promise(function(resolve, reject){ 
		var ps = require('child_process').spawn(proc, args, ops);

		ps.on('error', (err)  => reject('child process failed:' + proc));
		ps.on('close', (code) => resolve(code)); 	//промис разрешается с завершением процесса

		if ('inputStream' in ops) {
			ops.inputStream.on('error', (err) => reject('input failed for:' + proc));
			ops.inputStream.pipe(ps.stdin);
		}

		var response = function(data){
			if (cb instanceof http.ServerResponse) 
				cb.write(data, (err)=>{ if (err) console.error(err)} )
			if (typeof cb === 'function') 
				if (cb(data) !== 0) ps.kill('SIGHUP')
		}
		ps.stdout.on('data', response );
		ps.stderr.on('data', response );
	})
}

function checkMounted(device){
	return promiseify(fs.readFile)('/proc/mounts')
	.then(data=>data.toString().indexOf(device) !== -1)
}

function burn(image, volume, simulate, verbose, res){
	const device = '/dev/' + devName;
	var params = ['-dao', 'speed=8', 'dev='+device, image];
	if (simulate) params.unshift('-dummy'); //симулируем прожиг
	if (verbose) params.unshift('-v'); 

	var _in = (str, phrase) => str.indexOf(phrase) !== -1;

	var _cdrecord = function(data){ //колбэк для "просеивания" ответов от утилиты записи...
		//... и отдачи клиенту локализованной информации.
		var str = data.toString();

		if (_in(str,'Cannot load media')) {res.write('Нет записываемого диска. Вставьте диск\n'); return 0}
		if (_in(str,'Device or resource busy')) {res.write('Устройство занято. Попробуйте позже...\n'); return 0}
		if (_in(str,'Cannot open or use SCSI driver')) {res.write('Не удается найти записывающее устройство...\n'); return 0}
		if (_in(str,'Operation starts')) {res.write('Начало записи диска\n'); return 0}

		if (_in(str,'Try to load media by hand')) return 0;
		if (_in(str,'Speed set to')) return 0;
		if (_in(str,'Device type')) return 0;
		if (_in(str,'seconds.')) return 0;
		if (_in(str,'Total bytes read/written')) return 0;

		if (_in(str,'Drive needs to reload the media')){
			res.write('Диск не подходит для записи. Вставьте другой диск\n')
			return -1; //--terminate wodim
		}
		if (_in(str,'Error trying to open') !== -1) return 0;

		res.write(str + '\n-------------------\n');
		return 0;
	}

	var md5 = [];
	var _md5sum = function(data){ //колбэк для "просеивания" ответов md5sum...
		//... коих должно быть ровно 2 и они должны совпадать
		md5.push(data.toString().substr(0,32));
		if (md5.length == 2)
			res.write(md5[0] === md5[1] ? 'успешно!\n' : 'ошибка!\n')
		return 0;
	}

	return checkMounted(device)
		.then(mounted=>mounted?shellExec('umount', [device],{}, res):null) //--смонтирован? -> размонтируем
		.then(()=>shellExec('cdrecord', params, {}, verbose ? res : _cdrecord)) //--прожиг
		.then(code=>{
			if (code==0)// далее ниже - программная имитация eject, полдня потратил...
			//...но без нее md5 выдает другую хеш; возможно система читает из буферов, вместо самого диска...
			return promiseify(fs.readlink)('/sys/block/' + devName) //читаем линк на устройство, пока оно еще подключено
			.then(linkString=>/(host\d+)/.test(linkString) ? RegExp.$1 : '') //получаем идентификтор хоста <hostNN> 
			.then(host=>promiseify(fs.writeFile)('/sys/block/' + devName + '/device/delete', '1').then(()=>host))//--удаляем девайс
			.then(host=>promiseify(fs.writeFile)('/sys/class/scsi_host/' + host + '/scan', '- - -')) //поиск и подключение, используя <hostNN> 
			//теперь, когда передернули устройство, можно проверить md5sum:
			.then(()=>res.write('Проверка записанных данных... '))
			.then(()=>promiseify(fs.stat)(image)) //понадобится размер образа...
			//...потому, что с диска нужно считать именно столько байт, иначе будет опять другая хеш. (в "хвост" трека попадает служебная инфа)
			.then(info=>shellExec('md5sum',[],{inputStream: fs.createReadStream(device, {start:0, end: info.size -1}) }, _md5sum) )
			.then(()=>shellExec('md5sum',[image],{}, _md5sum))
			.then(()=>shellExec('eject',[device],{}))
		})
}

//--------------------------------------------------------------------------------------

var server = http.createServer(function(req, res) {
	res.writeHead(200, {
	  'Connection': 'keep-alive',  // ответ может быть долгим
	  'Content-Type': 'text/html; charset=utf-8',
		'Cache-Control': 'no-store, no-cache, must-revalidate',
	  'Transfer-Encoding': 'chunked' //отдаваться будет порционно
	});

// GET:
	if (req.method.toLowerCase() == 'get'){
		switch (req.url){
			case '/test':		
			break;

			case '/device':
				promiseify(fs.readlink)('/sys/block/' + devName)
				.then(linkString=>res.end(linkString))
				.catch(err=>{	console.error(err);	res.end(err.message)})
			break;

			case '/content':
				const device = '/dev/' + devName;
				fs.createReadStream(device, {start:32808, end:32808 + 32}) //считывание метки диска
				.on('data', (label)=>{
					label  = label.toString().substr(0,31).trim();
					res.write('[' + label + ']\n');
					res.write('-'.repeat(label.length) + '\n');
				})
				.on('end', ()=>{
					checkMounted(device)
					.then(mounted=>!mounted?shellExec('mount', [device, '/media/cdrom0'],{}, res):null) //монтирование
					.then(()=>shellExec('ls', ['-F', '/media/cdrom0'],{}, res)) //чтение содержимого
					.then(()=>res.end())
					.catch(err=>{	console.error(err);	res.end(err.message)})
				})
			break;

			default: 		
			  res.end(
					'<body>' + 
			    '<form action="/burn" enctype="multipart/form-data" method="post">' +
			    '<label for="label">Метка&nbsp;<label>' +
			    '<input id="label" type="text" name="label">&nbsp;&nbsp;' +
					'<br>' +
			    '<input type="file" name="upload" multiple="multiple">&nbsp;&nbsp;' +
					'<br>' +
			    '<label for="simulate">Симулировать запись&nbsp;<label>' +
			    '<input id="simulate" type="checkbox" name="simulate" checked>&nbsp;&nbsp;' +
					'<br>' +
			    '<label for="verbose">Подробный ответ&nbsp;<label>' +
			    '<input id="verbose" type="checkbox" name="verbose" checked>&nbsp;&nbsp;' +
					'<br>' +
					'<hr>' +
			    '<input type="submit" value="Отправить">' +
			    '</form>' +
					'</body>'
			  )
		} //switch ()
		return
	}

//--------------------------------------------------------------------------------
// POST:
	if (req.method.toLowerCase() == 'post' && req.url == '/burn') {
		var label = 'my_disk';

		if (busy) {
			res.end('Устройство уже используется. Попробуйте позже!');
			return
		}

		busy = true;

		var form = new formidable.IncomingForm({ 
			uploadDir : uploadDir,
			multiples : true,
			keepExtensions : true 
		});

		console.log('POST /burn from ' + req.connection.remoteAddress);

		form
		.on('fileBegin', function(name, file){
			if (file.name === '') return;
			console.log(file.name);
			file.path = path.join(uploadDir, file.name);
		})
		.on('end', function(){
			console.log('-> upload done');
		})
		.on('error', function(err){
			console.error(err);
		});

		promiseify(fs.readdir)(form.uploadDir)
		.then(items=>	Promise.all( // ждем обработки всех вложенных 
			items.map(item=>promiseify(fs.unlink)(path.join(form.uploadDir, item))) // удаляем каждый считанный readdir'om элемент
		))
		.then(()=>promiseify(form.parse, form)(req)) 
		.then(data=>{
			var fields = data[0];//,  files = data[1];
			if ('label' in fields) label = fields['label'];
	
			return shellExec('mkisofs', //сначала создаем образ
				['-joliet', '-V', label ,'-allow-multidot', '-R', '-input-charset', 'utf8', '-o', uploadDir + '/newdisk.iso', uploadDir],	
				{}, (('verbose' in fields)? res : null) 
			)
			.then(code=>{
				if (code !== 0)
					throw new Error('[genisoimage]: ошибка создания образа диска, процесс остановлен');
				else
					return burn(uploadDir + '/newdisk.iso', label, ('simulate' in fields), ('verbose' in fields), res).then(()=>res.end())
			})
		})
		.catch(err=>{ console.error(err); res.end(err.message) })
		.then(code=> {busy = false}) //finally
  } //burn
});

server.listen(80, function(){
	console.log('[disk-writer] listening: 80');
});


// ----------------в случае получения сигнала корректно закрываем--------------------
process.on('SIGHUP', close).on('SIGTERM', close).on('SIGINT', close); 

function close(){
	console.log('shutting down...');
  server.close(function () {
		console.log('all requests finished');
    process.exit();
  });
	setTimeout(function(){server.emit('close')}, 5000);
}

