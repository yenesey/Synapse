"use strict";

/*
	Функции, использующиеся как на клиенте так и на сервере
*/

/*
function toUnicode(theString) {
	var unicodeString = '';
	for (var i=0; i < theString.length; i++) {
		var theUnicode = theString.charCodeAt(i).toString(16).toUpperCase();
		while (theUnicode.length < 4) {
			theUnicode = '0' + theUnicode;
		}
		theUnicode = '\\u' + theUnicode;
		unicodeString += theUnicode;
	}
	return unicodeString;
}
*/

var _ = {};

if (typeof module !== 'undefined') module.exports = _; 


//"underscore" debounce mod (invoked at leading and trailing edges both)

_.debounce = function(func, wait, immediate) {

	var timeout = null, args, context, timestamp, result;

	function trail(){
		var last = Date.now() - timestamp;
		if (last < wait && last >= 0) { 
		//выполнение условия, означает, что были еще вызовы "debounced" в результате чего
		//last стал меньше wait, потому что timestamp стал ближе к Date.now() из-за повторных вызовов
			timeout = setTimeout(trail, wait - last);//соответственно мы отодвигаем выполнение trail еще на эту дельту wait - last
		} else {
			result = func.apply(context, args);
			timeout = context = args = null;
		}
	}

	return function(){
		context = this;
		args = arguments;
		timestamp = Date.now();
		if (!timeout) {
			timeout = setTimeout(trail, wait);
			if (immediate) result = func.apply(context, args);
		}	
		return result
	}
}


_.debounceKeyed = function(func, wait){
//func = function(arg1, arg2,.. argN){}
//debounceKeyed return function(key, flags:[0|1, 0|1,....N], arg1, arg2,.. argN){}
//flags: Array [1=update, 0=not update]

	var keys = {};
	return function(){
		var self = this;
		var args = Array.prototype.slice.call(arguments);
		var key = args[0];
		var flags = args[1];
		args.shift();
		args.shift();
		if (!(key in keys)){
			keys[key] = {
				debounced : _.debounce(function(args){
					var result = func.apply(self, args);
					delete keys[key];
					return result;
				}, wait),
				firstCall : args
			}
		}
		args = flags.map(function(el, index){
			return el	? args[index] : keys[key].firstCall[index]
		})
		return keys[key].debounced( args )
	} //function()
}

_.clone = function(obj) {
	if ((obj === null) || (typeof obj !== 'object')) return obj;
	var _clone = new obj.constructor();
	for(var key in obj) 
		_clone[key] = _.clone(obj[key]);
	return _clone
}

_.equals = function (obj1, obj2){
	if ((typeof obj1 !== 'object') || (typeof obj2 !== 'object')) return obj1===obj2;

	for(var key in obj2){
		if (!(key in obj1))
			return false; 
	}

	var result = true;
	for(var key in obj1) 
		if (key in obj2)
			result = result && _.equals(obj1[key], obj2[key])
		else 
			return false
	
	return result
}

_.difference = function(obj1, obj2){
	var keys = Object.keys(obj1).concat(Object.keys(obj2))	
	keys = _.uniq(keys);

	var result = {}
	keys.forEach(function(key){
		if (!_.equals(obj1[key], obj2[key]))
			result[key] = _.clone(obj2[key])
	})

	return Object.keys(result).length?result:null;
}

_.uniq = function(array){
	return array.filter(function(item, index){
		return array.indexOf(item) == index; //Array.includes not needed
	})
}

///////////////////////////////////////////////////////////

_.rightPad =	function(str, padStr, toSize) {
//набивка строки (str) символами другой строки (padStr) слева
	str = String(str);
	while (str.length < toSize) 
		str = str + padStr;
	return str;
}

_.leftPad =	function(str, padStr, toSize) {
//набивка строки (str) символами другой строки (padStr) слева
	str = String(str);
	while (str.length < toSize) 
		str = padStr + str;
	return str;
}


///////////////////////////////////////////////////////////////////////////
_.extName = function(name){
	var index = name.lastIndexOf('.');
	return (index != -1)?name.substr(index+1):"";
}

_.insProp = function(key, value){
//устновка пары key = value для объекта
//использовать с call / apply / bind, ибо this
	if (value && key)
		this[key] = value;
	return _.insProp.bind(this) //для вызова по цепочке
}

///////////////////////////////////////////////////////////////////////////////

_.simplify = function(_arrayOfObj){
//упрощение массива объектов c идентичным набором ключей: 
//	[{key1:value1,...,keyN: valueN}, {key1:value1,...,keyN: valueN}, ...]
//в объект вида:
//	{headers:[key1, key2,...,keyN], rows:[[value1, value2,...,valueN],[value1, value2,...,valueN],....]}
	return _arrayOfObj.reduce(function(obj, el){
		var row = [];
		for (var key in el){
			if (typeof el[key] !== 'function' ){
				if (obj.headers.indexOf(key) === -1)
					obj.headers.push(key);
	//	if (el[key])
				row.push(el[key]);
			}
		}			
		obj.rows.push(row);
		return obj;
	},
		{headers:[], rows:[]}
	)
}

_.restore = function(obj){
//операция обратная simplify
	if (! ('rows' in obj && 'headers' in obj) ) return null;
	return obj.rows.map(function(row){
		return obj.headers.reduce(function(result, key, index){
			if (key in result)
				key = key + '_' + index;
			result[key] = row[index];
			return result
		}, Object.create(null))
	})
}

_.keys = function(_arrayOfObj, key, _cbfn){
// выделить заданный ключ (key) массива объектов с идентичным набором ключей
	if (_arrayOfObj instanceof Array)
		return _arrayOfObj.reduce(function(result, el){ //цикл по массиву объектов
			if (key in el){ //имеется требуемый ключ?
				var newKey = el[key]; // значение ключа, становится ключем в создаваемом объекте
				if (!(newKey in result)) result[newKey] = []; //добавили ключ (значение - типа массив) если его еще нет
				if (typeof _cbfn === 'undefined' || _cbfn(el)) 
					result[newKey].push(el);  //добавляем элемент в массив (элемент - по факту ссыль на существующий объект)
				delete el[key] // модифицировали елемент (существующий объект)
			}
			return result;
		}, Object.create(null))
	return {}
}

_.mapValues = function(obj, map) {//map for <obj> array like way
  return Object.keys(obj).reduce(function(all, key){
     all[key] = map(obj[key], key, obj);
     return all;
  }, Object.create(null))
}

///////////////////////////////////////////////////////////////////////////////
_.declByNum = function(word, num){
//склонение слова по целому (integer) числу
//word = ["корень", "окончание для одного", "двух-четрыех", "пять и более"]
//пример ["мат", "ь", "ери",	"ерей"]
	num = Math.abs(num - num%1); //дробь отбрасываем! (не возмущайся, что 1.99 превращается в 1)
	var idx = (num%100>4 && num%100<20) ? 2 : [2, 0, 1, 1, 1, 2][(num%10<5) ? num%10 : 5];
	return word[0] + word[1 + idx];	//слово	+	окончание
}

///////////////////////////////////////////////////////////////////////////
/**
 * Combine multiple middleware together.
 *
 * @param {Function[]} mids functions of form:
 *   function(req, res, next) { ... }
 * @return {Function} single combined middleware
 */
_.combineMiddleware = function(mids) {
  return mids.reduce(function(a, b) {
    return function(req, res, next) {
      a(req, res, function(err) {
        if (err) {
          return next(err);
        }
        b(req, res, next);
      })
    }
  })
}

Number.prototype.toPhrase = function(units, round, frAsNum){
//преобразование числа в текст
// units - единицы измерения: 0..2 - вызвать встроенные, либо даем массив, как показано ниже
// round - число знаков после запятой, если не задан, то округляем до максимально возможной длины
//				 если задан в -1, то отбрасываем дробь без округления!
// frAsNum - отображать дробную числом
// пример:	
//		toPhrase([["евро",	 "",	 "", "", 0], null, ["евроцент",	 "",	 "а", "ов", 0]]), 2, true)
	var	headers=
		[[], //<<--единицы изменения (defaultUnits/units) будут здесь
	//["числит",	"1","2..4","5..","пол:0..2"]
		["тысяч",   "а", "и", "",	  1], 
		["миллион",  "", "а",	"ов", 0], 
		["миллиард", "", "а",	"ов", 0], 
		["триллион", "", "а",	"ов", 0]];

	var defaultUnits =
	[
		[
			["цел",         "ая", "ых", "ых", 1],
			["десят",       "ая", "ых", "ых", 1], 
			["сот",         "ая", "ых", "ых", 1],
			["тысячн",      "ая", "ых", "ых", 1],
			["десятитысячн","ая", "ых", "ых", 1],
			["стотысячн",   "ая", "ых", "ых", 1],
			["милионн",     "ая", "ых", "ых", 1]
		],
		[
			["рубл",   "ь",  "я", "ей", 0],
				null,	//десятых нет
			["копе",   "йка", "йки", "ек", 1]
		], 
		[
			["доллар", "", "а", "ов", 0],
				null,	//пропуск десятых
			["цент",   "", "а", "ов", 0]
		]
	];

	function cvtTriplet(triplet, gender){
		var
		hs = ["сто","двести","триста","четыреста","пятьсот","шестьсот","семьсот","восемьсот","девятьсот"],
		ds = ["десять","двадцать","тридцать","сорок","пятьдесят","шестьдесят","семьдесят","восемьдесят","девяносто"],
		ts = ["одиннадцать","двенадцать","тринадцать","четырнадцать","пятнадцать","шестнадцать","семнадцать","восемнадцать","девятнадцать"],
		us = ["ноль", ["один", "одна", "одно"], ["два", "две", "два"], "три","четыре","пять","шесть","семь","восемь","девять"],
		str = "",
		h = Math.floor(triplet / 100), 
		d = Math.floor((triplet % 100) / 10),
		u = triplet % 10;
		if (h) str += hs[h-1]+" ";
		if ((d == 1) && u) 
			str += ts[u-1]+" ";
		else{
			if (d) str += ds[d-1]+" ";
			if (u || !(h||d)) str += ((typeof(us[u])=='object')?(us[u][gender]):(us[u])) + " ";
		}
		return str;
	}

	function cvt(value){
		var result = "", category = 0, header = "", num, gender;
		do {
			num = Math.floor(value % 1000);
			gender = 0; header = "";
			if (round || category || units){ 
			// если нет дробной (round) части и не заданы units (например "Рубли"), 
			// нам незачем озаглавливать первый триплет (например "пять целых" - не говорят)
				gender = headers[category][4];
				header = _.declByNum(headers[category], num);
			}
			result = cvtTriplet(num, gender) + header + " " + result;
			value = Math.floor(value / 1000);
			category++;
		} while (value > 0);
		return result;
	}

	var	result = "", 
		thisValue = Math.abs(this.valueOf()), 
		useUnits = defaultUnits[0];
	
	if (typeof units === 'object') useUnits = units; 
	if (typeof units === 'number')
		if ((units >=0 ) && (units < defaultUnits.length))
			useUnits = defaultUnits[units];
	
	var integer = 0, fractal = 0;	

	switch (round) {
		case -1:	//задано отбросить дробную часть
			integer = thisValue - (thisValue % 1); //Math.floor(thisValue);
			fractal = 0;
			round = 0;
			break;
		case 0:	 //округл до целых
			integer = Math.round(thisValue);
			break;

		case undefined:	// округление не задано - округляем до максимально возможной длины
			var str = thisValue.toString();
			round = str.length - str.indexOf(".") - 1;
			break;
		default:
			integer = Math.floor(thisValue);
			fractal = Math.round(Math.pow(10, round) * (thisValue - integer));
	} //switch (round)

	if (useUnits[round] === null) 
		round = useUnits.length-1;
	
	if (this.valueOf() < 0)
		if ((round && (fractal > 0)) || (integer > 0))
			result = "минус ";

	headers[0] = useUnits[0];
	result += cvt(integer);

	if (round){
		headers[0] = useUnits[round];
		if (frAsNum)
			result += fractal.toString() + " " +	_.declByNum(headers[0], fractal);
		else 
			result += cvt(fractal);
	}

	return result;
}//toPhrase


//Promise for XMLHttpRequest (в целях обучения)
_.pxhr = function(request){
	return new Promise(function(resolve, reject) {	
		var xhr = new XMLHttpRequest();
		if (request.method.toLowerCase() === 'get') //фиксим баг кеширования запросов в IE
			request.url += (request.url.indexOf('?') === -1?"?":"&") + 'ts=' + Date.now(); 

		xhr.open(request.method, request.url, true); //async==true
		xhr.timeout = request.timeout || 1000 * 60;	//минута по умолчанию
		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest'); //request.xhr == true

		var data = request.data;
		if (!(request.data instanceof FormData)) { //"multipart/form-data"
			xhr.setRequestHeader('Content-Type', 'application/json');//"application/x-www-form-urlencoded"
			if (typeof data === 'object')
				data = JSON.stringify(data);
		} 
	
		function error(message){
			var err = new Error();
			err.name = 'XMLHttpRequest';
			err.message = message;
			reject(err);
		}

	// xhr.responseType = 'blob';
		xhr.onload = function(event){
			var header = xhr.getResponseHeader('Content-Type');
			if (header && header.indexOf('application/json') !== -1){
				try {
					var json = JSON.parse(xhr.response);
					resolve(json); 	
				}	catch (err) {
					reject(err)
				}
			}else
				resolve(xhr.response) 	
		}

		xhr.onerror = function(event) {
			var url = '/' + decodeURIComponent(request.url);
			if (event.target.status === 0)
				error('ERR_CONNECTION_REFUSED accessing: ' + url); 
			else 
				error('ERR_' + event.target.statusText + ' accessing: ' + url); 
		}

		xhr.ontimeout = function(event){
			error('ERR_CONNECTION_TIMED_OUT');
		}

		xhr.onprogress = function(event){
			if (request.progress)	
				request.progress(event.target)
		}
		
		xhr.send(data);
	});
}


