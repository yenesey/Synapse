'use strict'

const soap = require('soap')
const uuidv4 = require('../lib').uuidv4

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

module.exports = function (system) {
	// -
	const url = system.config['cft-soap'].document
	var	client = null
	soap.createClientAsync(url, {
		envelopeKey: 'soapenv',
		useEmptyTag: true,
		overrideRootElement: {
			namespace: 'tns',
			xmlnsAttributes: []
		}
	}).then(_client => { client = _client })
		.catch(console.log)

	this.get('/doc', function (req, res) {
		// -
		if (client === null) {
			res.json({ success: false, error: 'cft-web-proxy' })
			return
		}
		client.DOCUMENTAsync({
			'tns:UID': uuidv4(),
			'tns:DOCLIST': {
				'BEGIN_': {
					'DOCUNO': { attributes: { Value: 'SPRING_3' } },
					'VIDDOC': { attributes: { Value: 'БЕЗН_ПЛ_ПОРУЧ' } },
					'DOCNUM': { attributes: { Value: '0001001' } },
					'DATEDOC': { attributes: { Value: '2019-07-22' } },
					'PRIORITET': { attributes: { Value: '3' } },
					'ACC_DT': { attributes: { Value: '40817810000000000025' } },
					'ACCPL': { attributes: { Value: '' } },
					'VALUTA': { attributes: { Value: 'RUB' } },
					'SUM': { attributes: { Value: '100.10' } },
					'ACCKT': { attributes: { Value: '40817810000000000041' } },
					'ACCPO': { attributes: { Value: '' } },
					'VALUTAPO': { attributes: { Value: '' } },
					'SUMPO': { attributes: { Value: '100.10' } },
					'SUMNT': { attributes: { Value: '100.10' } },
					'FILIAL': { attributes: { Value: '001' } },
					'DT': { attributes: { Value: 'T' } },
					'BIC': { attributes: { Value: '044030877' } },
					'INN': { attributes: { Value: '3216549873' } },
					'KPP': { attributes: { Value: '123456789' } },
					'NAME': { attributes: { Value: 'NAME' } },
					'NAZN': { attributes: { Value: 'ТЕСТ' } }
				}
			}
		}).then(result => res.json(result[0]))
			.catch(err => system.errorHandler(err, req, res))
	})
}
