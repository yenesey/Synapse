<template>
<div>

<pre>Информация по вкладам ФЛ на указанную дату</pre>

  <datepicker label="Отчет на" name="dateRep" :value="moment().format('YYYY-MM-DD')"></datepicker><br>

  <select-dep-db/>

</div>
</template>
