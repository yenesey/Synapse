/*
	"Реестры привлечений / изъятий"

										(c)	Денис Богачев <d.enisei@yandex.ru>

*/
var fs = require('fs'),
	util = require('util'),
	path = require('path'),
	_ = require('synapse/lib'),
	XlsxTemplate = require('xlsx-template');

Array.prototype.multiply = function(array){
	return this.reduce( (all, el)=>all.concat(array.map(item=>el+item)),[] )
}

Array.prototype.itog = function(key){
	return this.reduce((sum, next) => sum + next[key], 0)
}

//	var ulDep = ['416', '420', '421', '422', '425', '412', '413', '414', '415', '417', '419']
//			.multiply(['01', '02', '03', '04', '05', '06', '07'])
//			.map(item=>'\''  + item + '\'').join(',')
//			.map(item=>'C_7 like \''  + item + '%\'').join(' OR ')


module.exports = async function(param, system){

	var ora = require('synapse/ds-oracle')(system.config.ibs); 
	
	async function data2Template(sheetData, fileName){
		var binData = await util.promisify(fs.readFile)(path.join(__dirname, 'templates', 'Реестры привлечений-изъятий',  fileName));
		var template = new XlsxTemplate(binData);
		template.substitute(1, sheetData);
		binData = template.generate();
		return util.promisify(fs.writeFile)(path.join( param.task.path, fileName ), binData, 'binary');
	}

	async function query(template, sql, itog){
		var sheetData = {};
		if (typeof sql === 'string') sql = [sql];
		for (var i = 0; i < sql.length; i++ ){
			var tab = 't' + (i+1);
			sheetData[tab] = await ora({ sql:sql[i], maxRows:10000 }) 
			itog.forEach(col=>{
				sheetData[tab + '_' + col] = sheetData[tab].itog(col)
			})
		}//for
//		console.log(sheetData)	
		return data2Template(sheetData, template);
	}


//--------------------------------------------------------------------
	if (param.in_ul_ras === 'on')
	query(
		`Реестр привлечений ЮЛ - расчетные счета.xlsx`
		,
		`SELECT 
			rownum, 
			TO_CHAR(DOC.C_10, 'DD.MM.YYYY') AS C_10, 
			DOC.C_8, 
			DOC.C_26, 
			DOC.C_6, 
			DOC.C_4,
			DOC.C_5,
			DOC.C_11
		FROM 
			IBS.VW_CRIT_MAIN_DOCUM DOC,
			IBS.VW_CRIT_RKO PROD
		WHERE
			DOC.C_10 between TO_DATE('${param.date1}', 'YYYY-MM-DD') and TO_TIMESTAMP('${param.date2} 23:59:59.999', 'YYYY-MM-DD HH24:MI:SS.FF3')
			AND DOC.C_9 = 'Проведен'
			AND PROD.CLASS_ID in ('RKO', 'RKO_CUR')
			AND DOC.C_36 like '002%'
			AND DOC.C_5 >= ${param.limit}

			AND DOC.REF43 = PROD.ID
			AND DOC.C_7 like '30102%'
			AND DOC.C_8 = PROD.C_5
		`
		,
		['C_4', 'C_5']
	)

//--------------------------------------------------------------------
	if (param.out_ul_ras === 'on')
	query(
		`Реестр изъятий ЮЛ - расчетные счета.xlsx`
		,
		`SELECT 
			rownum, 
			TO_CHAR(DOC.C_10, 'DD.MM.YYYY') AS C_10,
			DOC.C_7, 
			DOC.C_25, 
			DOC.C_6, 
			DOC.C_4, 
			DOC.C_5, 
			DOC.C_11
		FROM 
			IBS.VW_CRIT_MAIN_DOCUM DOC,
			IBS.VW_CRIT_RKO PROD
		WHERE
			DOC.C_10 between TO_DATE('${param.date1}', 'YYYY-MM-DD') and TO_TIMESTAMP('${param.date2} 23:59:59.999', 'YYYY-MM-DD HH24:MI:SS.FF3')
			AND DOC.C_9 = 'Проведен'
			AND PROD.CLASS_ID in ('RKO', 'RKO_CUR')
			AND DOC.C_36 like '002%'
			AND DOC.C_5 >= ${param.limit}

			AND DOC.REF40 = PROD.ID
			AND DOC.C_7 = PROD.C_5
			AND DOC.C_8 like '30102%'
		`,
		['C_4', 'C_5']
	)	

//--------------------------------------------------------------------
	if (param.in_ul_dep === 'on')
	query(
		`Реестр привлечений ЮЛ - депозиты.xlsx`
		,
		`SELECT 
			rownum, 
			TO_CHAR(DOC.C_10, 'DD.MM.YYYY') AS C_10, 
			DOC.C_8, 
			DOC.C_25, 
			DOC.C_6, 
			DOC.C_4, 
			DOC.C_5, 
			TO_CHAR(PROD.C_6, 'DD.MM.YYYY') AS DATE_BEGIN, 
			TO_CHAR(PROD.C_7, 'DD.MM.YYYY') AS DATE_END, 
			PRC.C_5 as PRC, 
			PROD.C_25
		FROM 
			IBS.VW_CRIT_MAIN_DOCUM DOC,
			IBS.VW_CRIT_DEPN PROD,
			IBS.VW_CRIT_ARC_SCH_PRC PRC
		WHERE
  		DOC.C_10 between TO_DATE('${param.date1}', 'YYYY-MM-DD') and TO_TIMESTAMP('${param.date2} 23:59:59.999', 'YYYY-MM-DD HH24:MI:SS.FF3')
			AND DOC.C_9 = 'Проведен'
			AND DOC.C_36 like '002%'
			AND DOC.C_5 >= ${param.limit}
			AND PROD.CLASS_ID = 'DEPOSIT_ORG'

			AND DOC.REF43 = PROD.ID
			AND DOC.C_8 = PROD.C_3
			AND PROD.REF17 = PRC.COLLECTION_ID
		`,
		['C_4', 'C_5']
	)	

//--------------------------------------------------------------------
	if (param.out_ul_dep === 'on')
	query(
		`Реестр изъятий ЮЛ - депозиты.xlsx`
		,
		`SELECT 
			rownum, 
			TO_CHAR(DOC.C_10, 'DD.MM.YYYY') AS C_10, 
			DOC.C_7, 
			DOC.C_26, 
			DOC.C_6, 
			DOC.C_4, 
			DOC.C_5, 
			TO_CHAR(PROD.C_6, 'DD.MM.YYYY') AS DATE_BEGIN, 
			TO_CHAR(PROD.C_7, 'DD.MM.YYYY') AS DATE_END, 
			PRC.C_5 as PRC, 
			PROD.C_25
		FROM 
			IBS.VW_CRIT_MAIN_DOCUM DOC,
			IBS.VW_CRIT_DEPN PROD,
			IBS.VW_CRIT_ARC_SCH_PRC PRC
		WHERE
  		DOC.C_10 between TO_DATE('${param.date1}', 'YYYY-MM-DD') and TO_TIMESTAMP('${param.date2} 23:59:59.999', 'YYYY-MM-DD HH24:MI:SS.FF3')
			AND DOC.C_9 = 'Проведен'
			AND DOC.C_36 like '002%'
			AND DOC.C_5 >= ${param.limit}
			AND PROD.CLASS_ID = 'DEPOSIT_ORG'

			AND DOC.REF40 = PROD.ID
			AND DOC.C_7 = PROD.C_3
			AND PROD.REF17 = PRC.COLLECTION_ID
		`,
		['C_4', 'C_5']
	)	


//--------------------------------------------------------------------
	if (param.in_fl === 'on')
	query(
		`Реестр привлечений ФЛ.xlsx`
		,
		[`
		SELECT 
			rownum, 
			TO_CHAR(DOC.C_10, 'DD.MM.YYYY') AS C_10, 
			DOC.C_7, 
			DOC.C_8, 
			DOC.C_26, 
			DOC.C_6, 
			DOC.C_4, 
			DOC.C_5, 
			TO_CHAR(PROD.C_6, 'DD.MM.YYYY') AS DATE_BEGIN, 
			TO_CHAR(PROD.C_7, 'DD.MM.YYYY') AS DATE_END, 
			PROD.C_17, 
			PROD.C_25
		FROM 
			IBS.VW_CRIT_MAIN_DOCUM DOC,
			IBS.VW_CRIT_DEPN PROD
		WHERE
			DOC.C_10 between TO_DATE('${param.date1}', 'YYYY-MM-DD') and TO_TIMESTAMP('${param.date2} 23:59:59.999', 'YYYY-MM-DD HH24:MI:SS.FF3')
			AND DOC.C_9 = 'Проведен'
			AND DOC.C_36 like '002%'
			AND DOC.C_5 >= ${param.limit}
			AND PROD.CLASS_ID = 'DEPOSIT_PRIV'
			AND PROD.C_10 like '%Текущий счет%'

			AND DOC.REF43 = PROD.ID
			AND DOC.C_8 = PROD.C_3
			AND (DOC.C_7 like '202%' or DOC.C_7 like '30102%')
		`,
		`
		SELECT 
			rownum, 
			TO_CHAR(DOC.C_10, 'DD.MM.YYYY') AS C_10, 
			DOC.C_7, 
			DOC.C_8, 
			DOC.C_26, 
			DOC.C_6,
			DOC.C_4, 
			DOC.C_5, 
			TO_CHAR(PROD.C_6, 'DD.MM.YYYY') AS DATE_BEGIN, 
			TO_CHAR(PROD.C_7, 'DD.MM.YYYY') AS DATE_END, 
			PROD.C_17, 
			PRC.C_5 as PRC, 
			PROD.C_25
		FROM 
			IBS.VW_CRIT_MAIN_DOCUM DOC,
			IBS.VW_CRIT_DEPN PROD,
			IBS.VW_CRIT_ARC_SCH_PRC PRC
		WHERE
			DOC.C_10 between TO_DATE('${param.date1}', 'YYYY-MM-DD') and TO_TIMESTAMP('${param.date2} 23:59:59.999', 'YYYY-MM-DD HH24:MI:SS.FF3')
			AND DOC.C_9 = 'Проведен'
			AND DOC.C_36 like '002%'
			AND DOC.C_5 >= ${param.limit}
			AND PROD.CLASS_ID = 'DEPOSIT_PRIV'
			AND PROD.C_10 not like '%Текущий счет%'

			AND DOC.REF43 = PROD.ID
			AND DOC.C_8 = PROD.C_3
	--		AND (DOC.C_7 like '202%' or DOC.C_7 like '30102%')
			AND PROD.REF17 = PRC.COLLECTION_ID

		`
		],
		['C_4', 'C_5']
	)	

//--------------------------------------------------------------------
	if (param.out_fl === 'on')
	query(
		`Реестр изъятий ФЛ.xlsx`
		,
		[`
		SELECT 
			rownum, 
			TO_CHAR(DOC.C_10, 'DD.MM.YYYY') AS C_10,  
			DOC.C_7, 
			DOC.C_8, 
			DOC.C_26, 
			DOC.C_6,
		 	DOC.C_4, 
			DOC.C_5, 
			TO_CHAR(PROD.C_6, 'DD.MM.YYYY') AS DATE_BEGIN, 
			TO_CHAR(PROD.C_7, 'DD.MM.YYYY') AS DATE_END, 
			PROD.C_25
		FROM 
			IBS.VW_CRIT_MAIN_DOCUM DOC,
			IBS.VW_CRIT_DEPN PROD
		WHERE
			DOC.C_10 between TO_DATE('${param.date1}', 'YYYY-MM-DD') and TO_TIMESTAMP('${param.date2} 23:59:59.999', 'YYYY-MM-DD HH24:MI:SS.FF3')
			AND DOC.C_9 = 'Проведен'
			AND DOC.C_36 like '002%'
			AND DOC.C_5 >= ${param.limit}
			AND PROD.CLASS_ID = 'DEPOSIT_PRIV'
			AND PROD.C_10 like '%Текущий счет%'

			AND DOC.REF40 = PROD.ID
			AND DOC.C_7 = PROD.C_3
			AND (DOC.C_8 like '202%' or DOC.C_8 like '30102%')
		`,
		`
		SELECT 
			rownum, 
			TO_CHAR(DOC.C_10, 'DD.MM.YYYY') AS C_10, 
			DOC.C_7, 
			DOC.C_8, 
			DOC.C_26, 
			DOC.C_6, 
			DOC.C_4, 
			DOC.C_5, 
			TO_CHAR(PROD.C_6, 'DD.MM.YYYY') AS DATE_BEGIN, 
			TO_CHAR(PROD.C_7, 'DD.MM.YYYY') AS DATE_END, 
			PRC.C_5 as PRC, 
			PROD.C_25
		FROM 
			IBS.VW_CRIT_MAIN_DOCUM DOC,
			IBS.VW_CRIT_DEPN PROD,
			IBS.VW_CRIT_ARC_SCH_PRC PRC
		WHERE
			DOC.C_10 between TO_DATE('${param.date1}', 'YYYY-MM-DD') and TO_TIMESTAMP('${param.date2} 23:59:59.999', 'YYYY-MM-DD HH24:MI:SS.FF3')
			AND DOC.C_9 = 'Проведен'
			AND DOC.C_36 like '002%'
			AND DOC.C_5 >= ${param.limit}
			AND PROD.CLASS_ID = 'DEPOSIT_PRIV'
			AND PROD.C_10 not like '%Текущий счет%'

			AND DOC.REF40 = PROD.ID
			AND DOC.C_7 = PROD.C_3
	--		AND (DOC.C_8 like '202%' or DOC.C_8 like '30102%')
			AND PROD.REF17 = PRC.COLLECTION_ID

		`
		],
		['C_4', 'C_5']
	)	

}