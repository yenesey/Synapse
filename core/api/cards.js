"use strict";

/*
	Выписка по карте на сайте банка (back-end API)
	(Переработано по SZ-2491)
*/

var express = require('express'),
		router = express.Router({strict:true});

module.exports = function(system){

var ibso = require('../ds-oracle')(system.config.ibs);
var t2000 = require('../ds-oracle')(system.config.t);

var soap = require('soap');
var url = 'http://172.16.8.3:8962/solar-loyalty/loyaltyApi.wsdl';


ibso("alter session set NLS_DATE_FORMAT='dd.mm.yyyy hh24:mi:ss'")

//получение инфы по карте и проверка пароля
function card(number, password){ 
	if ((typeof number !== 'string') || (typeof password !== 'string'))
		throw Error("Wrong parameter type!")
	
	return ibso(`
		select 
			vc.ID as "id",
			vc.C_1 as "card",
--			vc.REF4 as "vz_account_id", 
--			vc.C_8 as "state",
			vc.REF5 as "acc_id",
			vc.C_5 as "acc",
			cl.C_13 as "password",
			cl.C_1 as "fio",
			vct.C_3 as "is_main",
			dp.C_9 as "val",
			dp.C_10 as "depo",
			ovr.REF5 as "over_acc_id",
			ovr.C_8 as "over_max",
			(select listagg(C_1, ',') within group(order by null) from vw_crit_vz_cards where REF4 = vc.REF4 and ID != vc.ID)	as "card_add",
			(select listagg(ID, ',') within group(order by null) from vw_crit_vz_cards where REF4 = vc.REF4 and ID != vc.ID)	as "card_add_ids"
		from
			VW_CRIT_VZ_CLIENT cl,
			VW_CRIT_IP_CARD_TYPE vct,
			VW_CRIT_VZ_CARDS vc,
			VW_CRIT_DEPN dp 
		left join 
			VW_CRIT_OVER_OPEN ovr on ovr.REF3 = dp.ID
		where 
			vc.C_8 != 'Закрыта' and
			vc.REF2 = vct.ID and
			cl.REF1 = vc.REF3 and 
			dp.REF3 = vc.REF5 and ` + 
			(number.length===20
				?`vc.C_5='${number}' and vct.C_3 = 1`  // если дан 20зн счет, проверяем кодовое слово главной (==1) карты
				:`vc.C_1='${number}'`
			)
	).then(info=>{
			
		if (info.length === 0) 
			return  {error:'Карта/счет не найден'}

		var card = info[0]

		if (card.password === 'НЕ_ПЕРЕДАЛИ') 
			return  {error:'Кодовое слово не задано'}
//			return {error:'Кодовое слово не задано'}

		if (card.password !== password &&	(new RegExp(`CODEWORD1~${password}~`)).test(card.password) !== true )	
			return  {error:'Кодовое слово не верно'}

		delete card.password
		return card; //все проверки пройдены - возвращаем данные
	})
} 

/*
router.get('/cards/card',	function(req, res){ 
	card(req.query.ednumber, req.query.edpassword).then(card=>{
		res.json(card)	
	})
	.catch(err=>{
		console.log(err)
		res.json(err.message)
	}) 
})
*/
function round(num, dec){ 
	return Math.round(num * Math.pow(10,dec))/Math.pow(10,dec) 
}

function uuidv4(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,	v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/*
	расчет среднего остатка за заданный период. 
	для получения сальдо на начало каждого дня используется готовая выписка
*/
function avg(receipt, saldoIn, saldoOut, dateIn, dateOut){
	var dateToStr = dt => [String(dt.getDate()).padStart(2, "0"), String(dt.getMonth()+1).padStart(2, "0"),	String(dt.getFullYear())].join('.');
	var strToDate = s => new Date(s.split('.').reverse());
	var opDate = el => strToDate(el.date_wrk.substr(0,10)); //извлечь дату из операции
	var opSign = (el) => el.d_c === 'D'?-el.sum : el.sum;  //извлечь сумму со знаком (+|-) из операции выписки

	var _avg = arr => round(arr.reduce((res, el)=> res + el.saldo, 0) / (( (strToDate(dateOut) - strToDate(dateIn)) / 86400000) + 1), 2); 

	/* достраиваем массив arr для тех дат, были операции, и где не было операций по выписке */
	function forward(arr, dateFrom, dateTo, state){ // все параметры изменяются, т.к. передаются по ссылке! 
		//eslint-disable-next-line  
		while (dateFrom <= dateTo){  
			arr.push({
				date: dateToStr(dateFrom),
				saldo: state.saldo,
				change : state.change
			});
			dateFrom.setDate(dateFrom.getDate() + 1); 
			state.change = 0;
		}
	}

	var sa = [];
	var	datePrev = strToDate(dateIn);
	var state = {
		saldo : saldoIn,
		change : 0
	};

	receipt.forEach(el=>{ 
		forward(sa, datePrev, opDate(el), state);
		state.saldo += opSign(el);
		state.change += opSign(el);
	});
	forward(sa, new Date(datePrev-1), new Date(datePrev-1), state); //фиксируем сальдо по последнему элементу выписки
	
	var avg0 = _avg(sa); //средний для версии что до конца периода сальдо - 0

	forward(sa,  datePrev, strToDate(dateOut), state);
	var avg = _avg(sa);  //средний для версии, что до конца периода сальдо = сальдо исходящее

	return {
		avg : avg,
		avg0 : avg0 //,sa : sa
	}
}

//комплексная выписка по карте
router.get('/cards/receipt',	function(req, res){ 

	card(req.query.ednumber, req.query.edpassword)
	.then(card=>{
		if ('error' in card){
			res.json(card)
			return
		}

		return Promise.all([
			//сальдо:
			ibso(` 
				select 
					F.a_saldo_short(TO_DATE('${req.query.edfrom}', 'dd.mm.yyyy'), ${card.acc_id},  'с', 0) as "acc_from",
					F.a_saldo_short(TO_DATE('${req.query.edto}', 'dd.mm.yyyy')+1, ${card.acc_id},  'с', 0) as "acc_till"` +
					(card.over_acc_id
						?`,F.a_saldo_short(TO_DATE('${req.query.edfrom}', 'dd.mm.yyyy'), ${card.over_acc_id},  'с', 0) as "over_from"
							,F.a_saldo_short(TO_DATE('${req.query.edto}', 'dd.mm.yyyy')+1, ${card.over_acc_id},  'с', 0) as "over_till"
							,${card.over_max} as "over_limit"`
						: ``) +
				`from dual`).then(select=>select[0]),
			//выписка:
			ibso(`
				select 
					DECODE( REC.C_5, 'Дебет', 'D', 'Кредит', 'С') as "d_c",
					TO_CHAR(DOC.C_10, 'dd.mm.yyyy') as "date_wrk",
					TO_CHAR(NVL(OPS.C_28, DOC.C_10))  as "date_op",
					OPS.C_11   as "type_name",
					OPS.C_27   as "type",
					OPS.C_3    as "card", 
					OPS.C_33   as "info",
					DOC.C_11   as "doc_np",
	--				OPS.C_5    as "comis",
					OPS.C_32   as "auth_code",
	--				OPS.C_6    as "val_comis",
					ROUND(NVL(OPS.C_13, DOC.C_4), 2) as "sum",
					NVL(OPS.C_14, DOC.C_6) as "val",
  				ROUND(NVL(OPS.C_17, DOC.C_5), 2) as "sum_op",
  				NVL(OPS.C_18, 'RUB') as "val_op"
				from 
					VW_CRIT_AC_FIN ACC,
					VW_CRIT_FULL_RECORDS REC, 
					VW_CRIT_MAIN_DOCUM DOC 
				left join VW_CRIT_IP_TRANSACTION_ALL OPS on 
						OPS.REF4 = DOC.REF30 and 
						OPS.REF3 in (${card.id + (card.card_add_ids?',' + card.card_add_ids:'')})
			where
 					ACC.ID=${card.acc_id} and 
					DOC.ID = REC.REF2 and
					(DOC.C_31 is null or DOC.C_31 not in ('RATEDIFF', 'RECONT', 'RECONT+')) and  --Код. н.п. (убрать лишнее)
				  REC.COLLECTION_ID=ACC.REF8 and
					REC.C_1 >= TO_DATE('${req.query.edfrom}', 'dd.mm.yyyy') and REC.C_1 < TO_DATE('${req.query.edto}', 'dd.mm.yyyy')+1
				order by REC.C_1`
			)
			.catch(err=>{console.log('at receipt!'); throw err}),

/*			
				(card.is_main === '1'
					?` left  join VW_CRIT_IP_TRANSACTION_ALL OPS on OPS.REF4 = DOC.REF30 `
					:` inner join VW_CRIT_IP_TRANSACTION_ALL OPS on OPS.REF4 = DOC.REF30 and OPS.REF3 = ${card.id} `) +  //выборка транзацкий дочерней карты только по дочерней карте
*/

			//холды:
			ibso(`
				select 
					to_char(h.C_1) as "date_op",
					h.C_2 as "card",
					h.C_7 as "sum",
					h.C_17 as "sum_op",
					h.C_18 as "val_op",
					h.C_9 as "auth_code"
				from 
					VW_CRIT_IP_HOLD h
				where 	
				--	nvl(h.C_12,0) = 0				-- признак снятия холда временно не работает: Косяк ЦФТ
					h.REF2 in (${card.id + (card.card_add_ids?',' + card.card_add_ids:'')})
					and h.C_1 >= SYSDATE - 20
					and not exists  -- пока проверяем снятие холда вот так извращенски:
		 			 (select ID from VW_CRIT_IP_TRANSACTION_ALL OPS where OPS.REF3 = h.REF2 and (OPS.C_28 >= h.C_1 - 1 and OPS.C_28 <= h.C_1 + 7 ) and OPS.C_32 = h.C_9)
			`)
			.catch(err=>{console.log('at holds!'); throw err}),

			//бонусы Solanteq
			soap.createClientAsync(url)
			.then(client=>client.getBonusBalanceListAsync({
					"header": {
						"protocol": {
							"name": "solar-ws",
							"version": "2.0"
						},
						"messageId": uuidv4(),
						"messageDate": new Date(),
						"originator": {
							"system": "EXTERNAL"
						}
					},
					"body": {
						"agreementRef": {
						//	"id": "xs:long",
							"parameters": {
								"accessorRef": {
//									"id": "xs:long",
									"parameters": {
										"number": card.card,
										"accessorTypeRef": {
											"parameters": {
												"code": "CARD"
											}
										}
									}
								}
							}
						}
					}
				}
			))	
			.then(response=>response[0].body)
			.then(data=>
				data.response.code === 'SLR-0001'
					?	data.client.bonusBalances.bonusBalance[0].data.value//console.log(JSON.stringify(data, '', ' '));
					: null
			)
			.catch(err=>{
					err.service = 'SOLANTEQ';
					err.client = req.connection.remoteAddress;
					console.log(err);
			}) 

		])
		.then(([saldo, receipt, holds, bonus])=>{

				for (var key in saldo) saldo[key] = round(saldo[key], 2);
				if (bonus)
					saldo.bonus = Number(bonus);

				res.json({
					client  : card.fio,
					account : card.acc,
					val     : card.val,
					card    : card.card,
					card_add: card.card_add?card.card_add.split(','):[],
					product : card.depo,
					saldo   : Object.assign(
						saldo,	avg(receipt, saldo.acc_from, saldo.acc_till, req.query.edfrom, req.query.edto )
					),
					receipt : receipt,
					holds   : holds,
					trn_pays: receipt.reduce((result, item)=> {
						switch (item.type) {
							case '05': 
							case '05_': 
							case 'A5':
								result.count += 1; 
								result.sum += item.sum_op;
								break;
							case '06R':
							case 'B5':
								result.count -= 1; 
								result.sum -= item.sum_op;
								break;
						}
							return result
						}, 
						{
							count:0, 
							sum: 0
						}
					)
				})
			})
	})
	.catch(err=>{
		console.log(err);
		console.log('remote:' + req.connection.remoteAddress); 
		res.json(err.message)
	}) 

})
 
//баланс по карте из UCS

router.get('/cards/balance',	function(req, res){
	res.json({error:'unavailable'})
	return
	/*
	card(req.query.ednumber, req.query.edpassword)
	.then(card=>{
		if ('error' in card){
			res.json(card)
			return
		}
		return t2000(`select sysadm.TWCMS.F_OnlineBalance('${req.query.ednumber}') as BALANCE from dual`)
			.then(balance=>
				res.json({
					clientname: card.fio, 
					balance: (balance.length?balance[0].BALANCE:'UCS данные недоступны')
				})
			)
	}) 
	.catch(err=>{
		console.log(err); 
		console.log('remote:' + req.connection.remoteAddress); 
		res.json(err.message)
	}) 
	*/
});

return router;

}


