<template>
<div>

<pre>Формирование отчетов по ПКЛ (показатель краткосрочной ликвидности)
на указанную дату</pre>

  <datepicker label="Отчет на" name="dateRep" :value="moment().add(-1, 'day').format('YYYY-MM-DD')"></datepicker><br>

  <select-dep-db/>
  <br>
  <v-checkbox label="п.2.2.4" name="2.2.4" style="margin:0" hide-details></v-checkbox>
  <v-checkbox label="п.2.2.1 (включая п.2.2.3.5)" name="2.2.1" style="margin:0" hide-details></v-checkbox>
  <v-checkbox label="п.2.2.5 (включая п.2.2.3.5)" name="2.2.5" style="margin:0" hide-details></v-checkbox>
  <v-checkbox label="п.2.4.18" name="2.4.18" style="margin:0" hide-details></v-checkbox>
  <v-checkbox label="п.3.5" name="3.5" style="margin:0" hide-details></v-checkbox>

</div>
</template>
