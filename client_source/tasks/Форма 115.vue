<template>
<div>

<pre>Сведения о ссудах и условных обязательствах кредитного характера, в том числе по ПОС, ПОТ, 
которые НА ОТЧЕТНУЮ ДАТУ должны отражаться в ф.0409115, ф.0409155</pre>

  <datepicker label="Отчет на" name="dateRep" :value="moment().format('YYYY-MM-01')"></datepicker><br>

  <select-dep/>

  <v-checkbox label="включая п.3.12.1, п.3.12.2" name="full" hide-details></v-checkbox>

</div>
</template>
