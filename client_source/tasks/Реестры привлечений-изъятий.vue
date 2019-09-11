<template>
<div>

	<table class="synapse" style="margin-top:2em; float:none;">
		<tr>
			<th colspan=3 style="font-weight: normal;">Условия отбора</th>
		</tr>
	  <tr>
	    <td>Интервал</td>
	    <td align="center"> 
				<datepicker label="c" name="date1" :value="moment().subtract(7, 'days').startOf('week').add(1, 'days').format('YYYY-MM-DD')"></datepicker> 
			</td>
	    <td align="center"> 
				<datepicker label="по" name="date2" :value="moment().subtract(7, 'days').startOf('week').add(5, 'days').format('YYYY-MM-DD')"></datepicker> 
			</td>	
	  </tr>
	  <tr>
	    <td>Суммы не менее</td>
			<td colspan=2 style="padding-left:0.82em">
				<input type="text" name="limit" value="50000000" save>
			</td>
	  </tr>


		<tr>
			<th style="font-weight: normal">Вид</th>
			<th style="font-weight: normal">Привлечения</th>
			<th style="font-weight: normal">Изъятия</th>
		</tr>

	  <tr>
			<td>Физ. лица</td>
			<td align="center">
			  <input type="checkbox" name="in_fl" checked="true" save>
			</td>
			<td align="center">
				<input type="checkbox" name="out_fl" checked="true" save>
			</td>
	  </tr>

	  <tr>
			<td>Юр. лица - депозиты</td>
			<td align="center">
				<input type="checkbox" name="in_ul_dep" checked="true" save>
			</td>
			<td align="center">
				<input type="checkbox" name="out_ul_dep" checked="true" save>
			</td>
	  </tr>

	  <tr>
			<td>Юр. лица - расч. счета</td>
			<td align="center">
					<input type="checkbox" name="in_ul_ras" checked="true" save>
			</td>
			<td align="center">
				<input type="checkbox" name="out_ul_ras" checked="true" save>
			</td>
	  </tr>
 	</table>

</div>
</template>
