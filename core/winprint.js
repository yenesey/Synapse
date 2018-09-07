/*******************************
* Печать для Планировщика      *
*                              *
*	runtime: cscript/wscript     *
*                              *
* ©	Дмитрий Хмелев             *
********************************/  

var filePath = WScript.Arguments(0);
var printer = WScript.Arguments(1);

// перебираем все файлы в папке
f = new ActiveXObject("Scripting.FileSystemObject").GetFolder(filePath);
fc = new Enumerator(f.Files);
for (; !fc.atEnd(); fc.moveNext()) {
  file = fc.item().Path;
  // в зависимости от расширения файла запускаем печать
  switch (file.substr(file.lastIndexOf('.')+1)){
    case 'xls':
    case 'xlsx':
    case 'xlsm': 
        // открываем через Excel
        var app = new ActiveXObject("Excel.Application");    
  //      app.Visible = true;
      	app.DisplayAlerts = false;
        var book = app.Workbooks.Open(file);
        // перебираем все листы и печатаем их
  			var _enum = new Enumerator(book.Worksheets);
        for (; !_enum.atEnd(); _enum.moveNext()) 
  				_enum.item().PrintOut(null,null,null,null,printer);
  
        // закрываем Excel
        app.Quit();
  
        break;
  
    case 'doc':
    case 'docx': 
        // открываем через Word
        var app = new ActiveXObject("Word.Application");
  //      app.Visible = true;
        app.DisplayAlerts = false;
        var doc = app.Documents.Open(file);
        // нужный принтер делаем активным и печатаем
        app.ActivePrinter = printer;
        doc.PrintOut();
        // закрываем Word
        app.Quit();
  
        break;
  
    default: 
        // нужный принтер делаем активным и печатаем через Блокнот
        WScript.CreateObject("WScript.Network").SetDefaultPrinter(printer);
        var shell = new ActiveXObject("WScript.Shell");
        shell.Exec("notepad.exe /p " + file);
  }
}