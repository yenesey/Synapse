# -= Synapse =-
 Инструментарий создания и исполнения микросервисов для ИТ-службы предприятия

## Каталоги и их предназначение
```
/synapse/
  |-/.other/        - прочие файлы дистрибутива
  |-/client/        - место для готового клиентского приложения
  |-/client_source/ - исходный код клиентского приложения
  |-/core/          - файлы ядра Synapse
  |-/db/            
    |-synapse.db    - основная база данных Synapse
  |-/node_modules/  - стандартный системный каталог модулей nodejs
  |-/sslcert/       - сертификаты для https соединения
  |-/tasks/         - "задачи" - отдельные модули для отдельных задач
  |-/users/         - папки с результатами работы для пользователей
  |
  |-/package.json    - стандартный файл-описание пакета npm
  |-/synapse.js      - основное приложение (сервер); подробности настройки
                      запуска см. в app.js в комментариях
 ```

## Установка
### Необходимые компоненты (prerequisites)
- nodejs (https://nodejs.org/)
- git (https://git-scm.com/download/)
- Oracle Instant Сlient (https://www.oracle.com/database/technologies/instant-client/downloads.html)
```
C правами администратора:
\> npm install --global --production windows-build-tools
```

### Скачивание
В каталоге, где предполагается разместить проект и выполните:
```
\> git clone https://github.com/yenesey/Synapse
```
`Note:` Как вариант без git, можно скачать в браузере, и распаковать вручную (Clone or download \ Download zip)
```
\> cd Synapse
\> npm install
```

### Создание стартовой базы данных
Запуск редактора базы данных (в каталоге Synapse)
```
\> npm run db
```
Если все сделано правильно, появится сообщение о том что база создана, и командная строка с приглашением ко вводу. Скопируйте и вставьте в командную строку:
```js
\> var imp = load('.other/defaults.js'); for (let key in imp) t[key] = imp[key];
```

### Редактирование настроек в базе
В базе данных, существующей, или только что созданной, редактируйте параметры в той же командной строке что и предыдущий пункт (см. выше)
Первое, что необходимо настроить это ntlm авторизацию в домене:
```js
\> t.config.ntlm
{
  dc: 'ldap://bank-ad',
  dn: 'DC=bank, DC=name, DC=ru',
  domain: '<put dns name here>',
  password: '<put password here>',
  user: '<put username here>'
}
```
Задание нужного параметра

`Note:` При наборе пути не обязательно печатать имена полностью, наберите часть имени и нажмите [Tab]
```js
\> t.config.ntlm.domain = 'bank.ad.com'
\> t.config.ntlm.user = 'ad_tech_user'
```
`Note:` При правильно настроенном ntlm можно пробовать запускать приложение в заходить через браузер.
При первом входе в браузере покажется ваш логин и надпись ниже: "Запросите доступ". 
В ветке t.users будет создан пользователь с вашим логином. Перезайдите в редактор базы
```js
\> npm run db
\> t.users
{
  <loginName>: {
    created:""
    email:
    name
  }
}
```
Выдайте себе права администратора:
```js
\> t.users.<подставить ваш login>._acl = [t.objects.admin._.users.id]
```
Теперь перезапустите приложение. Войдите через браузер и через меню Настройки \ Пользователи, 
выберите себя и выдайте все необходимые права


## Запуск приложения
    
###  Через node  
```
\> node synapse [--development] [--dev-server] [--port=N] [--base-url] [--ssl] [--service]
```

&emsp;--development  - запуск в режиме разработки, аналог переменной окружения NODE_ENV=development<br>
&emsp;--dev-server   - только фронт (сборка клиента webpack + hot)<br>
&emsp;--base-url     - дает знать клиенту, куда бросать AJAX запросы (для разработки)<br>
&emsp;--port=N       - задать прослушиваемый порт, аналог переменной окружения PORT<br>
&emsp;--ssl          - запуск в режиме https, нужны сертификаты в конфигурации (не рекомендуется для --development)<br>
&emsp;--service      - запустить как службу (влияет на обработку сигналов прерывания и закрытия процесса)<br>

###  Через npm
```
\> npm run dev-front
\> npm run dev-back
\> npm run build

```
`dev-front` - сборка клиентского приложения из исходных файлов в каталоге /client_source/ "на лету". Для сборки используется популярный сборщи(bundler) - Webpack. Основой клиентского приложения является компонентный фреймворк Vue.js. Если во время работы, в данном режиме изменить фай(компонент) клиентской части, то изменения будут отгружены в клиентский браузер и отображены в ту же секунду.
  
`dev-back` - реализует бекэнд и его api/endpoints

`build` - сборка статического клиента для пром. эксплуктации.
   
###  Рекомендации
 - сервер выводит информацию в stdout, который можно перенаправить в  файл (на усмотрение администратора)
 - для запуска в Windows в качестве сервиса рекомендуется использовать nssm. Запустите nssm.exe и следуйте указаниям, которые дает программа.

## Самостоятельная разработка задачи (специализированного модуля)
   
Задача состоит из следующих компонентов:

- /tasks/<имя_модуля>.js   
- /client_source/tasks/<имя_модуля>.vue
- /db/synapse.db/<$tree>/objects/tasks/<имя_модуля>

###  Чтобы самому написать задачу /tasks/ вам потребуется знание JavaScript.
Желательно (но не обязательно) знать JavaScript в версии ES5.1 с функционалкой (forEach, map, reduce), и ES6 со всеми этими Promise, стрелочнымифунцкиями. Для запросов к базам данных понадобится знание SQL и изучение готовых примеров. В подкаталоге /tasks/ расположены отдельные модули длякаждой решаемой задачи. Модули запускаются в отдельном процессе node, получают параметры через командную строку и отдают информацию в основнойпроцесс через <stdout>. Для примера см. /tasks/validate.js. Дополнительно, схема работы клиента и сервера подробно описана в /core/tasks.js
   
###  В подкаталоге /client_source/tasks/ расположены .vue файлы для
реализации интерфейса пользователя. Для примера см. validate.vue. Для начала достаточно немного понимать как работает язык html. В продвинутом варианте, можно добавлять расширенный функционал Vue.
   
###  Имя модуля /tasks/ и интерфейса /client_source/tasks/ должно совпадать.
Кроме того,  необходимо внести запись в системную базу данных /db/synapse.db/<$tree>/objects/tasks/<имя модуля>
Это позволит администратору раздавать права на задачу, тем самым позволяя ей появиться в меню пользователей

<hr>

## Снимки экрана

### v3.4 (@latest)
<img src="/.other/memories/v3.4.png" alt="Synapse v3.4"/>

### v2.8
<img src="/.other/memories/synapse.png" alt="Synapse v2.8"/>

