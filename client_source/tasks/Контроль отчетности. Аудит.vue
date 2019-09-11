<template>
<div>

<pre>Журналы изменения справочников, оповещений ответственных исполнителей 
и отправки отчетности в Банк России</pre>
  <v-radio-group v-model="logType" @click="getLog" class="mt-0 mb-2" row hide-details>
    <v-radio 
      v-for="log in Object.keys(logs)"
      :key="log"
      :label="logs[log].title"
      :value="log"
    /> 
  </v-radio-group>

  <v-card-title >
    <v-card class="elevation-2" color="blue lighten-5">
      <v-layout>
    		<datepicker label="Дата с:" v-model="dateBegin" :allowedDates="allowedBegin" class="ml-4 mt-3" />
    		<datepicker label="Дата по:" v-model="dateEnd" :allowedDates="allowedEnd" class="mx-4 mt-3" />
      </v-layout>
    </v-card>

    <v-spacer/>
    <v-spacer/>
    <v-spacer/>
    <v-text-field
      v-model="search"
      append-icon="search"
      label="Поиск"
      hide-details
      clearable
    />
  </v-card-title>

  <v-data-table 
    :headers="logs[logType].header"
    :items="log"
    :search="search"
    :pagination.sync="pagination"
    item-key="date"
    class="elevation-1"
    no-data-text="Данных не найдено"
  >
    <template slot="headers" slot-scope="props">
      <tr bgcolor="#acdbff" bordercolor="white" class="elevation-3">
        <th     
          v-for="header in props.headers"
          :width="header.width"
          :key="header.text"
          :class="['column sortable', pagination.descending ? 'desc' : 'asc', header.value === pagination.sortBy ? 'active' : '']"
          @click="changeSort(header.value)"
        >
          <b>{{ header.text }}</b>
          <v-icon small>arrow_upward</v-icon>
        </th>
      </tr>
    </template>
    <template slot="items" slot-scope="props">
      <tr :style="(logType=='alert' && !(props.item.result && JSON.parse(props.item.result).status == 'OK')) ? 'color: red' : ''">
        <td v-for="header in logs[logType].header">{{ props.item[header.value] }}</td>
      </tr>
    </template>
  </v-data-table>
</div>
</template>

<script>
  import {pxhr} from 'lib';
  import moment from 'moment';
  moment.locale('ru');  // устанавливаем русский язык в названиях месяцев

  export default {
    data: () => ({
      params: ['logs','logType','dateBegin','dateEnd'],
      search: '',
      pagination: {
        sortBy: 'date',
        descending: 'desc',
        rowsPerPage: 10
      },
      dateBegin: '',
      dateEnd: '',
      logType: 'edit',
      log: [],
      logs: {
        'edit': { 
          title: 'Журнал изменений', 
          header: [
            { text: 'Дата/время',      value: 'date',      width: "170px" },
            { text: 'Пользователь',    value: 'user'                      },
            { text: 'Справочник',      value: 'tableName'                 },
            { text: 'Запись',          value: 'record'                    },
            { text: 'Параметр',        value: 'param'                     },
            { text: 'Новое значение',  value: 'value_new'                 },
            { text: 'Старое значение', value: 'value_old'                 }
          ]
        },
        'alert': { 
          title: 'Журнал оповещений', 
          header: [
            { text: 'Дата/время', value: 'date', width: "170px" },
            { text: 'Канал',      value: 'chanel'               },
            { text: 'Получатель', value: 'to'                   },
            { text: 'Сообщение',  value: 'message'              },
            { text: 'Результат',  value: 'result'               }
          ]
        },
        'send': { 
          title: 'Журнал отправки в ЦБ',  
          header: [
            { text: 'Дата обработки',       value: 'date',     width: "170px" },
            { text: 'Форма (ОКУД)',         value: 'code',     width: '1px'   },
            { text: 'Периодичность',        value: 'period',   width: '1px'   },
            { text: 'Вид отчета',           value: 'type',                    },
            { text: 'Рег. №',               value: 'dep',      width: '1px'   },
            { text: 'Отчетная дата',        value: 'dateRep',  width: "1px"   },
            { text: 'Дата отправки (факт)', value: 'rezDate',  width: "170px" },
            { text: 'Код',                  value: 'rezCode',  width: '1px'   },
            { text: 'Результат',            value: 'rezText'                  },
            { text: 'Файл квитанции',       value: 'file'                     }
          ]
        }
      }
      
    }),

  	created : function(){ 
      this.getLog();
    },

    watch: {
      dateBegin: function() {
        this.getLog();
      },
      dateEnd: function() {
        this.getLog();
      }
    },

    methods: {
  		getLog : function() {
  			var self = this;
  			pxhr({ method:'get', url: 'forms?'+self.logType })
  			.then(function(res){  
          self.log = res.filter( el => (self.dateBegin ? el.date >= self.dateBegin + ' 00:00:00' : true) && (self.dateEnd ? el.date <= self.dateEnd + ' 23:59:59' : true) )
          if(self.logType == 'edit')
    				self.log.map(function(el) { 
              el.record = JSON.parse(el.record);
              el.record = `${el.record.name} (id ${el.record.id})`; 
              return el; 
            });
/*          if(self.logType == 'alert')
    				self.log.map(function(el) { 
              el.result = JSON.parse(el.result);
              el.result = `${el.result.status_text ? el.result.status+': '+el.result.status_text : el.result.status} ${el.result.sms ? '('+Object.keys(el.result.sms).map(item => item+': '+(el.result.sms[item].status_text ? el.result.sms[item].status+': '+el.result.sms[item].status_text : el.result.sms[item].status))+')' : ''}`; 
              return el; 
            });            
*/
  			})
  			.catch(function(err){console.log(err)})
  		},
      
      allowedBegin(val) {
        return this.dateEnd ? val <= this.dateEnd : true;
      },

      allowedEnd(val) {
        return this.dateBegin ? val >= this.dateBegin : true;
      },

      changeSort (column) {
        if (this.pagination.sortBy === column) {
          this.pagination.descending = !this.pagination.descending
        } else {
          this.pagination.sortBy = column
          this.pagination.descending = false
        }
      }
    }
  }
</script>
<style>
.layout {
  display: inline-block;
  width: 100%;
}
</style>