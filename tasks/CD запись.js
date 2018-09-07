///////////////////////////
//  Запись файлов на CD  //
//                       //
// ©	Дмитрий Хмелев     //
///////////////////////////

module.exports = async function(param){

/*****************************/
/*** Подключение библиотек ***/
/*****************************/
var path = require('path'),
    fs = require('fs'),
    request = require('request');
/*****************************/

  if (param.label.length > 16) {
    console.log('Метка диска должна быть не более 16 символов');
		process.exit(1);
  }

  var url = 'http://172.22.1.16/burn';

  var files = [];
  for (key in param.files)
    files.push(param.files[key]);

  var formData = {//simulate: '', 
                  //verbose: '', 
                  label: param.label, 
                  upload: files.map(item => fs.createReadStream(path.join(param.task.path,'upload',item)))};

  request.post({url:url, formData: formData}, (err) =>{ if (err) return console.error(err);})
  .pipe(process.stdout)
}