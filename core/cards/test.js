/*eslint-disable*/
"use strict";

//var fs = require('fs');
//var util = require('util');
var soap = require('soap');
var url = 'http://172.16.8.9:8962/solar-loyalty/loyaltyApi.wsdl';

function uuidv4(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

var args = {
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
										"number": "5186420400840778",
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

soap.createClientAsync(url)
.then(client=>client.getBonusBalanceListAsync(args))	//fs.writeFileSync('wsdl-schema.js', JSON.stringify(client.describe(), '' , '\t'));
.then(response=>response[0].body)
.then(data=>{
	console.log(JSON.stringify(data, '', ' '));
	console.log(data.response.code === 'SLR-0001');	
	console.log(data.client.bonusBalances.bonusBalance[0].data.value)
})

