
module.exports = function (params, system) {
	const config = system.config
	const ora = require('synapse/ds-oracle')(config.ibs)
	const t2000 = ora({ connectString: 'T2000', schema: 'T2000', user: 'WH', password: 'warehouse' })
	ora(`select ID, C_1 CREATED, C_2 PROCEEDED, C_34 SLIP_NUMBER, C_61 TRANS_AMOUNT, REF4 SRV_CARDS_REF from VW_CRIT_OWS_TRANSACTION where ID = 235916096 /*C_1 >= TO_DATE('01.08.2019', 'dd.mm.yyyy') and C_1 <= TO_DATE('31.08.2019', 'dd.mm.yyyy')*/`)
		.then(rows => {
			rows.forEach(row => {
				t2000(`insert into WH.IBS_OWS_TRANSACTION values (${row.ID}, ${row.CREATED}, ${row.PROCEEDED}, ${row.SLIP_NUMBER}, ${row.TRANS_AMOUNT}, ${row.SRV_CARDS_REF}  )`).then(console.log)
			})
		})
}
