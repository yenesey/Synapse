/*
**************************************
* Библиотека вспомогательных функций *
* по работе с приложениями MS Office *
*                                    *
* ©	Дмитрий Хмелев                   *
**************************************
*/  
var fs = require('fs'),
    docxTemplate = require('docxtemplater'),
    xlsxTemplate = require('xlsx-template'),
		JSZip = require('jszip');  //--add for docxtemplater 3.0

function Word(inFile){
  if (inFile){
    var zip = new JSZip(fs.readFileSync(inFile, 'binary')); //--add for docxtemplater 3.0
		this.docx = new docxTemplate().loadZip(zip);
	}

	this.save = function(outFile){
		this.docx.render();
		fs.writeFileSync(outFile, this.docx.getZip().generate({type:'nodebuffer'}));
	}

  this.replace = function(data){
    this.docx.setData(data);
//    this.docx.render();
  }
}

function Excel(inFile){
	if (inFile) 
	  this.xlsx = new xlsxTemplate(fs.readFileSync(inFile));

	this.save = function(outFile){
    fs.writeFileSync(outFile, this.xlsx.generate(), 'binary');
	}

  this.replace = function(sheet, data){
    this.xlsx.substitute(sheet, data);
  }

  this.copySheet = function(sheet, copyName){
    this.xlsx.copySheet(sheet, copyName);
//!!!    this.xlsx = new xlsxTemplate(this.xlsx.generate());
  }

  this.deleteSheet = function(sheet){
    this.xlsx.deleteSheet(sheet);
//!!!    this.xlsx = new xlsxTemplate(this.xlsx.generate());
  }
}

module.exports.Word = Word; 
module.exports.Excel = Excel; 


