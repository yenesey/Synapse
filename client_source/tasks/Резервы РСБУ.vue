<template>
<div>

<pre>Формирование отчета по резервам РСБУ за дату</pre>

  <datepicker label="Отчет за" name="dateRep" :value="moment().format('YYYY-MM-DD')"></datepicker><br>

  <label>Список 1: Cчета по учету резервов</label>
  <textarea name="accList1" rows="3" class="pa-2 mb-4" style="width:100%; border: 2px solid; border-radius: 4px;" save/> 

  <label>Список 2: Cчета корректировок резервов</label>
  <textarea name="accList2" rows="3" class="pa-2" style="width:100%; border: 2px solid; border-radius: 4px;" save/> 

</div>
</template>

