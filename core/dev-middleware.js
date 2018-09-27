"use strict";

/*
	Режим разработчика
	Если данный модуль запущен,	сервер выполняет сборку и
	отдачу клиента на лету с Hot Module Reload (HMR)
*/

const	chalk = require('chalk')
const config = require('../client_source/webpack.config')
const compiler = require('webpack')(config)
const spinner = require('ora')('compiling...')
const dev = require('webpack-dev-middleware')
const hot = require('webpack-hot-middleware')
const combineMiddleware = require('./lib').combineMiddleware

var initial = true;

function log(_, options){
	if (!options.state) return;
	
	var stats = options.stats.toJson({
		errorDetails: false, 
		source : false
	});
	if (stats.errors.length)
		console.log(chalk.red.bold(stats.errors.join('\n')));

	var numFmt = str => chalk.reset.yellow( String(str).replace(/(\d)(?=(\d{3})+([^\d]|$))/g, '$1,') );
	var nameFmt = str => {
		var a = str.lastIndexOf('/');
		var b = str.lastIndexOf('?');
		if (a - b) //-1 - (-1) ?
			return str.substring(a, b);
		return str;
	}

	var issuer = '*project*';
	if (!initial){
		var built = stats.modules.filter(el=>el.built && el.issuerName) // -- была сборка по отдельным модулям
			.map(el=>el.issuerName);
		issuer = built.join(',')
	}
	initial = false;

	var asset = stats.assets
	.filter(el=>el.emitted)
	.map(el=>el.name + ':' + numFmt(el.size) + 'b')
	.join(', ');

	console.log(chalk.cyan.bold('[webpack] ') + nameFmt(issuer) + ' => ' + asset + ' in ' + numFmt(stats.time / 1000) + 's')
} 

compiler.hooks.compile.tap('spinner', ()=>spinner.start())
compiler.hooks.done.tap('spinner', ()=>spinner.stop())

module.exports = combineMiddleware([
	dev(compiler, {
		logLevel:'error',
		publicPath: config.output.publicPath,
		reporter : log
	}),
	hot(compiler, {log: null})
])
