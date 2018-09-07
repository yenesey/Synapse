/*
	(c)	Денис Богачев <d.enisei@yandex.ru>
*/
var fs = require("fs"),
	path = require("path"),
	XlsxTemplate = require('xlsx-template');

	var binData = fs.readFileSync(path.join(__dirname, 'templates', 'Выписка из ЕГРП.xlsx'));
  var template = new XlsxTemplate(binData);
	template.copySheet(1);
	template.copySheet(1);
//	template.copySheet(1); 
//	console.log('-------------------------');

	template.deleteSheet(1);	
  template = new XlsxTemplate( template.generate());
//	console.log(template.sheets);

	template.substitute(1, { ExtractTitle : 'ЭТО ТАЙТЛ'  });
	template.substitute(2, { ExtractTitle : 'ЭТО ТАЙТЛ 2'  });
//	template.substitute(4, { ExtractTitle : 'ЭТО ТАЙТЛ 4'  });


	fs.writeFileSync('output.xlsx', template.generate(), 'binary');
