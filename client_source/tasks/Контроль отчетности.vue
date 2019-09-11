<template>
<div>

<pre>Система контроля сдачи отчетности</pre>
  <v-card-title class="pt-0">
    <v-btn small fab dark color="light-blue darken-4" 
      @click="editedItem = clone(defaultItem); dialogTitle='Добавить форму'; dialogAdd = true; " >
      <v-icon>add</v-icon>
    </v-btn>

    <v-btn small fab dark color="light-blue darken-3" 
      @click="getForms(true)" >
      <v-icon>sync</v-icon>
    </v-btn>

    <v-btn small fab dark color="light-blue darken-2"
      @click="getHoliday(); dialogHoliday = true" >
      <v-icon>event_available</v-icon>
    </v-btn>

    <v-btn small fab dark color="light-blue darken-1" 
      @click="getUsers(); dialogUsers = true" >
      <v-icon>group</v-icon>
    </v-btn>

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
    :headers="headers"
    :items="forms"
    :search="search"
    :pagination.sync="pagination"
    :loading="loadForm"
    expand
    item-key="id"
    hide-actions
    class="elevation-1"
    no-data-text=""
  >
    <v-progress-linear slot="progress" color="blue" height="3" indeterminate />
    <template slot="headers" slot-scope="props">
      <tr bgcolor="#acdbff" bordercolor="white" class="elevation-3">
        <th     
          v-for="header in props.headers"
          :width="header.width"
          :key="header.text"
          :class="['column sortable', pagination.descending ? 'desc' : 'asc', header.value === pagination.sortBy ? 'active' : '']"
          @click="changeSort(pagination, header.value)"
        >
          <b>{{ header.text }}</b>
          <v-icon small>arrow_upward</v-icon>
        </th>
        <th width="1px">
        </th>
      </tr>
    </template>
    <template slot="items" slot-scope="props">
      <tr 
        :style="props.item.datePlan == moment().add(-4,'hours').format('YYYY-MM-DD') ? 'color: teal' : (props.item.datePlan < moment().add(-4,'hours').format('YYYY-MM-DD') ? 'color: red' : '')"
      >
        <td v-if="props.item.alert && props.item.alert.length" class="pl-3"><v-icon color="orange" class="mr-2" @click="props.expanded = !props.expanded">warning</v-icon>{{ props.item.code }}</td>
        <td class="pl-5" v-else>{{ props.item.code }}</td>
        <td>{{ props.item.period }}</td>
        <td>{{ props.item.type }}</td>
        <td>{{ props.item.dep }}</td>
        <td align="center">{{ props.item.datePlan }}</td>
        <td align="center">{{ props.item.dateRep }}</td>
        <td>{{ props.item.control1.name.join(', ') }}</td>
        
        <v-menu offset-y transition="scale-transition">
          <v-toolbar-side-icon slot="activator" />
          <v-list>
             <v-list-tile @click="editedItem = clone(props.item); dialogTitle='Редактировать форму'; dialogAdd = true;">
              <v-list-tile-action> <v-icon>edit</v-icon> </v-list-tile-action>
              <v-list-tile-content> редактировать </v-list-tile-content>
            </v-list-tile>
            <v-list-tile @click="editedItem = clone(props.item); dialogDel = true;">
              <v-list-tile-action> <v-icon>delete</v-icon> </v-list-tile-action>
              <v-list-tile-content> удалить </v-list-tile-content>
            </v-list-tile>
            <v-divider />
             <v-list-tile @click="editedItem = clone(props.item); logType='edit'; getLog(); dialogLog = true;">
              <v-list-tile-action> <v-icon>assignment_turned_in</v-icon> </v-list-tile-action>
              <v-list-tile-content> журнал изменений </v-list-tile-content>
            </v-list-tile>
             <v-list-tile @click="editedItem = clone(props.item); logType='send'; getLog(); dialogLog = true;">
              <v-list-tile-action> <v-icon>assistant</v-icon> </v-list-tile-action>
              <v-list-tile-content> журнал отправки в ЦБ </v-list-tile-content>
            </v-list-tile>
          </v-list>
        </v-menu>
      </tr>
    </template>
    <template slot="expand" slot-scope="props">
      <v-card class="elevation-1" flat color="blue lighten-5">
        <v-card-text class="pa-2">
          <div v-for="alert in props.item.alert">
            <v-icon small class="mx-2">{{ alert.icon }}</v-icon>
            <i> {{ alert.message }} </i>
          </div>
        </v-card-text>
      </v-card>
    </template>
  </v-data-table>

  <v-dialog v-model="dialogAdd" width="700">
    <v-card>
      <v-toolbar dark color="light-blue darken-4">
        <span class="headline">{{ dialogTitle }}</span>
      </v-toolbar>

      <v-card >
        <v-tabs v-model="activeTab">
          <v-tab><v-icon class="mr-2">assignment</v-icon>Форма</v-tab>
          <v-tab-item>
            <v-card-text>
              <v-layout style="display: flex">
                <v-text-field v-model="editedItem.code" label="* Код ОКУД" style="width:10%" />
                <v-spacer/>
                <v-text-field v-model="editedItem.type" label="Вид отчета" style="width:50%" />
                <v-spacer/>
                <v-text-field v-model="editedItem.dep" label="Рег. №" style="width:10%" />
              </v-layout>
              <v-textarea 
                label="Наименование" 
                v-model="editedItem.name" 
                rows="1"  
                outline 
                auto-grow  
                hide-details
              />
        
              <v-container class="elevation-4 mt-3">
                <v-select v-model="editedItem.period" label="Периодичность" :items="Object.keys(periods)" @change="editedItem.periodParam.skip=[]" class="mb-3" no-data-text="" hide-details/>
                <v-layout style="display: flex">
                  <i class="my-1" style="font-size:16px">каждый</i>
                  <v-text-field v-model="editedItem.periodParam.days" type="number" class="textNum mx-2 mt-1" hide-details/>
                  <i class="my-1" style="font-size:16px">день</i>
                  <v-checkbox v-model="editedItem.periodParam.holiday" label="учитывать выходные и праздничные дни" class="textNum ml-4 mt-0" hide-details />           
                </v-layout>

                <v-card class="elevation-3 blue lighten-5 mt-3">
                  <v-card-title>
                    <v-layout style="display: flex">
                      <v-icon class="ma-2">exit_to_app</v-icon>
                      <label style="font-size:16px" class="mt-2">смещение даты на</label>        
                      <v-text-field v-if="editedItem.periodParam.offset" v-model="editedItem.periodParam.offset.kol" type="number" class="mx-2" style="width: 43px; " hide-details/>
                      <v-select v-if="editedItem.periodParam.offset" v-model="editedItem.periodParam.offset.period" class="mx-2" :items="[{text:'дней',value:'day'},{text:'месяцев',value:'month'}]" item-text="text" item-value="value" no-data-text="Данных не найдено" hide-details />
                    </v-layout>  
                    <label class="mt-4">* без учета выходных и праздничных дней</label> 
                  </v-card-title>
                </v-card>

                <v-select v-if="Object.keys(periods[editedItem.period]).length"
                  v-model="editedItem.periodParam.skip" 
                  label="Исключить"
                  :items="Object.keys(periods[editedItem.period])"
                  multiple chips outline
                  class="mt-4"
                  no-data-text="Данных не найдено"
                  hide-details
                />   
              </v-container>
            </v-card-text>
          </v-tab-item>
  
          <v-tab><v-icon class="mr-2">alarm</v-icon>Оповещение</v-tab>
          <v-tab-item>
            <v-card-text>
              <div style="width: 100%; display:inline-block" >
                <table class="synapse" width="100%">
                  <tr>
                    <th>Ответственные</th>
                    <th>Время</th>
                  </tr>
                  <tr v-for="control in [ {label: '* Исполнители', field: 'control1'}, 
                                          {label: '* Менеджеры', field: 'control2'}, 
                                          {label: '* Руководители', field: 'control3'} ]">
                    <td>
                      <v-select
                        :label="control.label"
                        v-model="editedItem[control.field].name"
                        :items="users.map(el => el.name)"
                        multiple chips box
                        no-data-text="Данных не найдено"
                        hide-details
                      />
                    </td>
                    <td width="110px">
                      <timepicker class="mt-1" label="Время" v-model="editedItem[control.field].shedule"/>
                    </td>
                  </tr>
                </table>
              </div>
  
              <v-text-field
                label="Текст для SMS" 
                :value="sms" 
                outline 
                readonly
                hint="длина одной СМС - 70 символов" 
                persistent-hint
                counter="70"
              />
            </v-card-text>
          </v-tab-item>
        </v-tabs>
      </v-card>

      <v-card-actions>
        <label class="ml-2">* Поля обязательные для заполнения</label> 
        <v-spacer/>
        <v-btn color="blue darken-1" flat @click="dialogAdd = false">Отмена</v-btn>
        <v-btn color="blue darken-1" flat @click="checkForm(editedItem); if(alertMessage.length) dialogCheck = true; else if(sms.length > 70) dialogAlert=true; else {dialogAdd = false; editForm()}">Сохранить</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogLog" max-width="70%">
    <v-card>
      <v-card-title class="headline">
        {{ headersLog[logType].title }} {{ editedItem.code }}
      </v-card-title>
      <v-card-text>
        <v-data-table 
          :headers="headersLog[logType].header"
          :items="logs"
          item-key="id"
          :pagination.sync="paginationLog"
          class="elevation-1"
          no-data-text="Данных не найдено"
        >
          <template slot="headers" slot-scope="props">
            <tr bgcolor="#acdbff" bordercolor="white" class="elevation-3">
              <th     
                v-for="header in props.headers"
                :width="header.width"
                :class="['column sortable', paginationLog.descending ? 'desc' : 'asc', header.value === paginationLog.sortBy ? 'active' : '']"
                :key="header.text"
                @click="changeSort(paginationLog, header.value)"
              >
                <b>{{ header.text }}</b>
                <v-icon small>arrow_upward</v-icon>
              </th>
            </tr>
          </template>
          <template slot="items" slot-scope="props">
            <tr>
              <td v-for="header in headersLog[logType].header">{{ props.item[header.value] }}</td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn color="blue darken-1" flat @click="dialogLog = false">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogDel" persistent max-width="370">
    <v-card>
      <v-card-title class="pa-0">
        <v-alert :value="true" type="warning" class="ma-0" style="width:100%">Удалить выделенную запись?</v-alert>
      </v-card-title>
      <v-card-text>
        <b>{{ editedItem.code }}</b> <br>
        <i>{{ editedItem.name }}</i>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn color="blue darken-1" flat @click="dialogDel = false">Нет</v-btn>
        <v-btn color="blue darken-1" flat @click="dialogDel = false; editForm(true)">Да</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogHoliday" max-width="330px">
    <v-card>
      <v-toolbar dark color="light-blue darken-2">
        <v-icon class="pr-2" style="font-size: 24px; ">event_available</v-icon>
        <span style="font-size: 16px;">Выходные и праздничные дни</span> 
      </v-toolbar>

      <v-card color="blue lighten-4" class="elevation-4">
        <v-card-actions>
          <v-btn color="red" flat @click="holidaysYear(holidayYear)">Заполнить выходные</v-btn>
          <i>за</i>
          <v-text-field v-model="holidayYear" type="number" min=1 class="textNum ma-2" hide-details/>
          <i >год</i>
        </v-card-actions>  
      </v-card>

      <v-card-text>
  			<v-date-picker 
          v-model="holiday"
          multiple
          first-day-of-week=1 
          locale="ru-ru" 
          no-title 
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer/>
        <v-btn color="blue darken-1" flat @click="dialogHoliday = false">Отмена</v-btn>
        <v-btn color="blue darken-1" flat @click="editHoliday(); dialogHoliday = false">Сохранить</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogUsers" max-width="700px">
    <v-card>
      <v-toolbar dark color="light-blue darken-1">
        <v-icon class="pr-2" style="font-size: 36px; ">group</v-icon>
        <span class="headline">Ответственные исполнители</span> 
      </v-toolbar>

      <v-card-text>
        <v-layout style="display: flex">
          <dlookup
          	label="Добавить сотрудника"
            v-model="userAdd"
          	db="ldap:"
          	fields="displayName,mail" 
          	look-in="displayName%,mail%"
            style="width:350px"
          	@select="selectUserAD"
            :get-label="labelUser"
          >
            <i slot-scope="{item, index}" style="width:10px">
              {{item.displayName}} <i style="color:teal"> {{(item.mail) ? '(' + item.mail + ')':''}} </i>
            </i>
          </dlookup>
          <v-btn small fab dark color="blue" @click="editedUser.name && userAdd ? editUser() : 1" class="mt-0 ml-2 mb-3">
            <v-icon>add</v-icon>
          </v-btn>
        </v-layout>

        <v-data-table 
          :headers="headersUser"
          :items="users"
          :pagination.sync="paginationUsers"
          item-key="id"
          disable-initial-sort
          class="elevation-1"
          no-data-text=""
        >
          <template slot="headers" slot-scope="props">
            <tr bgcolor="#acdbff" class="elevation-3">
              <th     
                v-for="header in props.headers"
                v-if="header.text != 'id'"
                :width="header.width"
                :key="header.text"
              >
                <b>{{ header.text }}</b>
              </th>
              <th width="1px"></th>
            </tr>
          </template>
          <template slot="items" slot-scope="props">
            <tr>
              <td 
                v-for="header in headersUser"
                v-if="header.text != 'id'"
              >
                <v-edit-dialog 
                  @open="editedUser = clone(props.item)" 
                  @close="props.item[header.value] = editedUser[header.value]" 
                  @save="editedUser = clone(props.item); editUser()"
                  large
                  cancel-text="Отмена" 
                  save-text="Сохранить"
                >
                  {{ props.item[header.value] }}
                  <template slot="input">
                    <v-text-field :label="header.text" v-model="props.item[header.value]" :mask="header.mask" single-line clearable hide-details />
                  </template>
                </v-edit-dialog>
              </td>
              <td align="center" class="px-0">
                <v-icon @click="editedUser = clone(props.item); dialogDelUser = true">delete</v-icon>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn color="blue darken-1" flat @click="dialogUsers = false">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogDelUser" persistent max-width="500">
    <v-card>
      <v-card-title class="pa-0">
        <v-alert :value="true" type="warning" class="ma-0" style="width:100%">Удалить выделенную запись?</v-alert>
      </v-card-title>
      <v-card-text>
        <b>{{ editedUser.name }} <i style="color:teal"> {{(editedUser.email) ? '(' + editedUser.email + ')':''}} </i></b> <br>
        {{ editedUser.phone }} <br><br>
        <u> Этот пользователь будет удален из контроллеров всех форм:</u> <br>
        <i> Исполнитель: </i> {{ Array.from(new Set(forms.filter(el => el.control1.name.indexOf(editedUser.name) >= 0 ).map(el => el.code))).join(', ') }} <br>
        <i> Менеджер: </i> {{ Array.from(new Set(forms.filter(el => el.control2.name.indexOf(editedUser.name) >= 0 ).map(el => el.code))).join(', ') }} <br>
        <i> Руководитель: </i> {{ Array.from(new Set(forms.filter(el => el.control3.name.indexOf(editedUser.name) >= 0 ).map(el => el.code))).join(', ') }} <br>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn color="blue darken-1" flat @click="dialogDelUser = false">Нет</v-btn>
        <v-btn color="blue darken-1" flat @click="dialogDelUser = false; editUser(true)">Да</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogCheck" max-width="500">
    <v-card>
      <v-card-title class="pa-0">
        <v-alert :value="true" type="warning" class="ma-0" style="width:100%">Не заполнены обязательные параметры</v-alert>
      </v-card-title>
      <v-card-text>
        <pre>{{ alertMessage.join('\r\n') }}</pre>
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn color="blue darken-1" flat @click="dialogCheck = false">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialogAlert" persistent max-width="500">
    <v-card>
      <v-card-title class="pa-0">
        <v-alert :value="true" type="info" class="ma-0" style="width:100%">Превышено количество символов в тексте СМС: <b><font color=red size=3>{{ sms.length }}</font></b></v-alert>
      </v-card-title>
      <v-card-actions>
        <v-spacer/>
        <v-btn color="blue darken-2" flat @click="dialogAlert = false">Вернуться</v-btn>
        <v-btn color="blue darken-1" flat @click="dialogAlert = false; dialogAdd = false; editForm()">Продолжить</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</div>
</template>

<script>
  import {pxhr} from 'lib';
  import moment from 'moment';
  moment.locale('ru');  // устанавливаем русский язык в названиях месяцев

  export default {
    data: () => ({
      params: [],
      activeTab: 0,
      search: '',
      dialogAdd: false,
      dialogHoliday: false,
      dialogLog: false,
      dialogDel: false,
      dialogUsers: false,
      dialogDelUser: false,
      dialogTitle: '',
      dialogCheck: false,
      dialogAlert: false,
      shedule: null,
      menuTime: false,
      alertMessage: [],
      editedItem: {},
      defaultItem: {
        id: null,
        code: '',
        type: '',
        dep: '',
        name: '',
        period: 'нерегулярная',
        periodParam: { days:1, holiday:false, offset:{kol:0, period:'day'}, skip:[] },
        control1: {name:[], shedule:null}, 
        control2: {name:[], shedule:null},
        control3: {name:[], shedule:null}
      },
      editedUser: {
        id: null,
        name: '',
        email: '',
        phone: ''
      },
      periods: {
        'нерегулярная': {'первый рабочий день месяца':'YYYY-MM-01'},
        'суточная':     {'первый рабочий день месяца':'YYYY-MM-01'},    
        'декадная':     {},   
        'месячная':     {'январь':'YYYY-01-01',
                         'февраль':'YYYY-02-01',
                         'март':'YYYY-03-01',
                         'апрель':'YYYY-04-01',
                         'май':'YYYY-05-01',
                         'июнь':'YYYY-06-01',
                         'июль':'YYYY-07-01',
                         'август':'YYYY-08-01',
                         'сентябрь':'YYYY-09-01',
                         'октябрь':'YYYY-10-01',
                         'ноябрь':'YYYY-11-01',
                         'декабрь':'YYYY-12-01'},   
        'квартальная':  {'1 квартал':'YYYY-01-01',
                         '2 квартал':'YYYY-04-01',
                         '3 квартал':'YYYY-07-01',
                         '4 квартал':'YYYY-10-01'}, 
        'полугодовая':  {},
        'годовая':      {}  
      },
      pagination: {
        sortBy: 'datePlan',
        rowsPerPage: -1
      },
      paginationUsers: {
        rowsPerPage: 10
      },
      paginationLog: {
        sortBy: 'date',
        descending: 'desc',
        rowsPerPage: 10
      },
      headers: [
        { text: 'Форма отчетности (ОКУД)',  value: 'code',     width: '1px' },
        { text: 'Периодичность',            value: 'period',   width: '1px' },
        { text: 'Вид отчета',               value: 'type',                  },
        { text: 'Рег. №',                   value: 'dep',      width: '1px' },
        { text: 'Дата отправки (план)',     value: 'datePlan', width: '1px' },
        { text: 'Отчетная дата',            value: 'dateRep',  width: '1px' },
        { text: 'Исполнители',              value: 'control1'               }
      ],
      headersUser: [
        { text: 'id',      value: 'id'  },
        { text: 'ФИО',     value: 'name'  },
        { text: 'E-mail',  value: 'email' },
        { text: 'Телефон', value: 'phone', mask: "# ###-###-####" }
      ],
      headersLog: {
        'edit': { 
          title: 'Журнал изменений', 
          header: [
            { text: 'Дата/время',      value: 'date',      width: "170px" },
            { text: 'Пользователь',    value: 'user'                      },
            { text: 'Параметр',        value: 'param'                     },
            { text: 'Новое значение',  value: 'value_new'                 },
            { text: 'Старое значение', value: 'value_old'                 }
          ]
        },
        'send': { 
          title: 'Журнал отправки в ЦБ',  
          header: [
            { text: 'Дата обработки',       value: 'date',     width: "170px" },
            { text: 'Отчетная дата',        value: 'dateRep',  width: "1px"   },
            { text: 'Дата отправки (факт)', value: 'rezDate',  width: "170px" },
            { text: 'Код',                  value: 'rezCode',  width: '1px'   },
            { text: 'Результат',            value: 'rezText'                  },
            { text: 'Файл квитанции',       value: 'file'                     }
          ]
        }
      },
      logType: 'edit',
      userAdd: '',
      users: [],
      loadForm: false,
      forms: [],
      logs: [],
      holiday: [],
      holidayYear: 2000
    }),

  	created : function(){ 
      this.holidayYear = (new Date).getFullYear();
      this.getHoliday();

      this.getUsers();

      this.editedItem = this.clone(this.defaultItem);
      this.getForms(true);
    },

  	watch : {
  		dialogAdd : function(newVal){	
  			if(!newVal) 
          this.activeTab = 0;
  		}
  	},

    computed: {
      sms: function() {return 'Не отправлена '+this.editedItem.code+' на '+(this.editedItem.dateRep ? this.editedItem.dateRep : 'YYYY-MM-DD').split("-").reverse().join(".")+(this.editedItem.control1.name && this.editedItem.control1.name.length ? ' '+this.editedItem.control1.name.map(item => item.split(' ')[0]).join(',') : '');} 
    },
  
    methods: {
  		getForms : function(check) {
  			var self = this;
        self.loadForm = true;
        self.forms = [];
  			pxhr({ method:'get', url: 'forms' + (check ? '?check' : '') })
  			.then( res => self.forms = res.map(function(item){
            if(item.periodParam.skip)
              item.periodParam.skip = item.periodParam.skip.map(el => {
                for(var key in self.periods[item.period])  
                  if (self.periods[item.period][key] == el) return key; 
              });

            item['alert']=[];

            if(!item.code) 
              item['alert'].push({icon: 'assignment', message: 'Не указан код формы (ОКУД)'});
            if(!item.control1.name.length) 
              item['alert'].push({icon: 'assignment_ind', message: 'Не указан Исполнитель'});
            if(!item.control2.name.length) 
              item['alert'].push({icon: 'assignment_ind', message: 'Не указан Менеджер'});
            if(!item.control3.name.length)
              item['alert'].push({icon: 'assignment_ind', message: 'Не указан Руководитель'});
            if (!item.control1.shedule)
              item['alert'].push({icon: 'alarm_off', message: 'Не указано время оповещения Исполнителя'});
            if (!item.control2.shedule)
              item['alert'].push({icon: 'alarm_off', message: 'Не указано время оповещения Менеджера'});
            if (!item.control3.shedule)
              item['alert'].push({icon: 'alarm_off', message: 'Не указано время оповещения Руководителя'});
  
            return item;
          }) 
        )
        .then(() => self.loadForm = false)
  			.catch(function(err){console.log(err)})
/*
    			pxhr({ method:'get', url: 'forms?crons' })
    			.then( res => console.log(res))
    			.catch(function(err){console.log(err)})
*/
  		},

      editForm : function(del) {
        var self = this;
        self.editedItem.periodParam.skip = self.editedItem.periodParam.skip.map(item => self.periods[self.editedItem.period][item]) ;
        self.editedItem.periodParam = JSON.stringify(self.editedItem.periodParam);
        self.editedItem.control1 = JSON.stringify(self.editedItem.control1);
        self.editedItem.control2 = JSON.stringify(self.editedItem.control2);
        self.editedItem.control3 = JSON.stringify(self.editedItem.control3);

    		pxhr({ method:(typeof del == 'boolean' && del) ? 'delete' : 'put', url: 'forms', data: self.editedItem })
    		.then(function(res){
          self.getForms(); // обновляем информацию
    		})
    		.catch(function(err){console.log(err)})
      },

      checkForm : function(item) {
        this.alertMessage = [];

        if(!item.code) this.alertMessage.push('Не указан код формы (ОКУД)');
        if((item.period == 'месячная' || item.period == 'квартальная') && item.periodParam.skip.length == Object.keys(this.periods[item.period]).length) this.alertMessage.push('Нельзя исключить все периоды')
        if(!item.control1.name.length) this.alertMessage.push('Не указан Исполнитель');
        if(!item.control2.name.length) this.alertMessage.push('Не указан Менеджер');
        if(!item.control3.name.length) this.alertMessage.push('Не указан Руководитель');

        return this.alertMessage.length
      },

  		getUsers : function() {
  			var self = this;
  			pxhr({ method:'get', url: 'forms?user' })
  			.then(function(res){
  				self.users = res;
  			})
  			.catch(function(err){console.log(err)})
  		},

      editUser : function(del) {
        var self = this;
    		pxhr({ method:(typeof del == 'boolean' && del) ? 'delete' : 'put', url: 'forms?user', data: self.editedUser })
    		.then(function(res){
          self.getUsers(); // обновляем информацию о пользователях
          self.userAdd = '';
          self.editedUser = {
                              id: null,
                              name: '',
                              email: '',
                              phone: ''
                            };
          self.getForms(); // обновляем информацию о формах
    		})
    		.catch(function(err){console.log(err)})
      },

  		getLog : function() {
  			var self = this;
  			pxhr({ method:'get', url: 'forms?'+self.logType+'='+self.editedItem.id })
  			.then(function(res){
  				self.logs = res;
  			})
  			.catch(function(err){console.log(err)})
  		},

  		getHoliday : function() {
  			var self = this;
  			pxhr({ method:'get', url: 'forms?holiday' })
  			.then(function(res){
  				self.holiday = res.map(item => item.date);
  			})
  			.catch(function(err){console.log(err)})
  		},

  		editHoliday : function() {
        var self = this;

    		pxhr({ method:'put', url: 'forms?holiday', 
          data:{
            holiday: self.holiday
          } 
        })
    		.then(function(res){
          self.getForms(); // обновляем информацию
    		})
    		.catch(function(err){console.log(err)})
  		},

      holidaysYear : function(year) {
        var date = moment(year+'-12-31');
        while (date.year() == year) {
          if (date.weekday() > 4 )
            this.holiday.push(date.format('YYYY-MM-DD'))

          date.add(-1, 'day');      
        }
      },

      changeSort (pgn, column) {
        if (pgn.sortBy === column) {
          pgn.descending = !pgn.descending
        } else {
          pgn.sortBy = column
          pgn.descending = false
        }
      },

  		selectUserAD : function(event) {
  			this.editedUser.id = null;
  			this.editedUser.name = event.displayName;
  			this.editedUser.email = event.mail;
  			this.editedUser.phone = '';
  		},

  		labelUser : function(item){
  			return item.displayName
  		},

  		clone : function(item){
  			return JSON.parse(JSON.stringify(item))
  		}
    }
  }
</script>

<style>

.textNum input {
	padding : 0 0 0 5px ;
  width: 1px ;
}

.material-icons {
  display: inline-flex;
}

.v-small-dialog__content {
  background: #fff;
  width: 350px ;
}

.v-input--selection-controls .v-input__slot {
  margin: 0;
}

.exclude:hover {
padding-left: 16px
}
</style>