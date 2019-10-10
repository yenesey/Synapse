
const oracledb = require('oracledb')
// oracledb.outFormat = oracledb.OBJECT

module.exports = async function (params, system) {
	// -
	const ibso = await oracledb.getConnection(system.config.ibs)
	const t2000 = await oracledb.getConnection({ connectString: 'T2000', schema: 'T2000', user: 'WH', password: 'warehouse' })

	/*
	let select = await ibso.execute(`
		select 
			ID, 
			C_1 CREATED, 
			C_2 PROCEEDED, 
			C_47 TRANS_DTIME, 
			C_34 SLIP_NUMBER, 
			C_41 TRG_AMOUNT,
			C_42 TRG_CUR,
			nvl(REF4, -1) SRV_CARD_REF, 
			REF12 SRV_IP_TRANS_TYP,
			C_68 DIRECTION
		from 
			VW_CRIT_OWS_TRANSACTION 
		where 
			C_25 = 'ISSUING' and
			C_1 >= TO_DATE('01.08.2019', 'dd.mm.yyyy') and C_1 < TO_DATE('02.08.2019', 'dd.mm.yyyy')`,
	{},
	{ maxRows: 0 }
	)

	for (let row of select.rows) {
		let ins = `
			insert into WH.IBS_OWS_TRANSACTION 
			    (ID, CREATED, PROCEEDED, TRANS_DTIME, SLIP_NUMBER, TRG_AMOUNT, TRG_CUR, SRV_CARD_REF, SRV_IP_TRANS_TYP, DIRECTION)
			values 
			   (:ID,:CREATED,:PROCEEDED,:TRANS_DTIME,:SLIP_NUMBER,:TRG_AMOUNT,:TRG_CUR,:SRV_CARD_REF,:SRV_IP_TRANS_TYP,:DIRECTION)`
		try {
			await t2000.execute(ins, row)
		} catch (err) {
			console.log(err)
			console.log(ins)
		}
	}
	await t2000.commit()
	*/

	let select = await ibso.execute(`
	select 
		ID, 
		C_1 NAME,
		C_2 CAPTION,
		C_3 IP_PROCESSINGS,
		С_4 TYPE_PROC_TRANS
	from 
		VW_CRIT_ALL_TRANS
	where 
		C_25 = 'ISSUING' and
		C_1 >= TO_DATE('01.08.2019', 'dd.mm.yyyy') and C_1 < TO_DATE('02.08.2019', 'dd.mm.yyyy')`,
	{},
	{ maxRows: 0 }
	)

	for (let row of select.rows) {
		let ins = `
			insert into WH.IBS_OWS_TRANSACTION 
			   ()
			values 
			   ()`
		try {
			await t2000.execute(ins, row)
		} catch (err) {
			console.log(err)
			console.log(ins)
		}
	}
	await t2000.commit()

}
