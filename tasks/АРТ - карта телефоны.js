
const oracledb = require('oracledb')

module.exports = async function (params, system) {
	const { oracle } = system.config
	const ibso = await oracledb.getConnection(oracle.ibso)
	const t2000 = await oracledb.getConnection(oracle.t)
	var errors = false

	let result = await ibso.execute(`
		select 
			C.ID "card_id",
			REGEXP_SUBSTR(CT.C_4,'[78]?9[0-9]{9}$') "phone"
   	from 
			VW_CRIT_VZ_CARDS C
		 		inner join
		 			VW_CRIT_CL_PRIV CL on C.REF3 = CL.ID
		   				left join VW_CRIT_CONTACTS CT on CT.COLLECTION_ID = CL.REF8
		where 
			C.C_10 >= :onDate and C.C_10 < :onDate + 1 
			and C.C_14 = 'MasterCard Platinum (АРТ-карта)'
			and REGEXP_LIKE(CT.C_4,'[78]?9[0-9]{9}$')
		`,
	{ onDate: new Date(params.date + ' ') } // ! space is used to set time to 00:00
	)
	if (result.rows.length === 0) {
		return
	}

	let phones = result.rows.map(el => el[1])

	// подстановка '7' где ее нет, и замена '8' на '7'
	for (let i = 0; i < phones.length; i++) {
		if (phones[i].length === 10 && phones[i].charAt(0) !== '7') {
			phones[i] = '7' + phones[i]
		} else if (phones[i].length === 11 && phones[i].charAt(0) === '8') {
			phones[i] = '7' + phones[i].substr(1)
		}
		if (phones[i].charAt(0) !== '7') {
			console.log('Ошибка в номере:' + phones[i] + ' карта: ' + result.rows[i][0])
			errors = true
		}
	}

	let text = phones.reduce((all, el) => all + el + '\r\n', 'phone\r\n')

	if (params.onScreen) {
		console.log(text)
		return
	}

	await t2000.execute(`begin :result := SYSADM.EXCHANGE.F_CreateTask_ARTcard(:text); end;`, {
		text: text,
		result: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
	})
		.then(result => {
			if (result === 0) console.log('АШИПКА!!!')
		})

	if (errors) throw new Error('Ошибки при обработке номеров Арт-Карт')
}
