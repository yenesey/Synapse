<template>
<div>

<pre>Сведения о депозитах юридических и физических лиц закрытых в указанный день.</pre>

  <datepicker label="Отчет за" name="dateRep" :value="moment().add(-1, 'day').format('YYYY-MM-DD')"></datepicker>

  <select-dep-db/>

</div>
</template>


