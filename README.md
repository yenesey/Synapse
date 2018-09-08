# -= Synapse =-
   Инструментарий интеграции ИТ-сервисов для банковских ИТ-инженеров
на базе самых современных веб-технологий
   
 ###  WHY Node.js? 
 Система построена на Node.js, потому что на момент создания, это хорошая платформа, как для создания серверной части, так и для сборки WEB-клиента. Одна среда, один язык для клиента и сервера, и куча готовых модулей почти на все случаи жизни. Помимо Node.js как собственно, ядра системы, задействованы такие "модные" штуки, как Express, Webpack, Vue.js, Vuetify
    
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
     |-/app.js          - основное приложение (сервер); подробности настройки
                         запуска см. в app.js в комментариях
 ```

## Установка
### Необходимые компоненты (prerequisites)
- nodejs (https://nodejs.org/)
- git  (https://git-scm.com/download/win)
- Oracle Instant Сlient (потребуется для компиляции и установки модуля oracledb см. документацию по модулю https://github.com/oracle/node-oracledb) 
- windows-build-tools (пакет утилит Python, C++, node-gyp с помощью которых nodejs компилирует платформо-зависимые модули
```
        (!!!) с правами администратора:
        \> npm install --global --production windows-build-tools
```
в командной строке, в каталоге, где предполагается разместить проект и выполните:
```
        \> git clone https://github.com/yenesey/Synapse
        \> cd Synapse
        \> npm install
        
```
(!!!) корректная работа некоторых модулей не гарантируется, поэтому в подкаталоге /.other/node_modules сохранены рабочие копии таких модулей для возможности замены вручную.

### С помощью "SQLite Studio" (http://sqlitestudio.pl):

- cоздайте чистую базу /db/synapse.db, выполнив скрипт "./other/db.sql"
- отредактируйте таблицу [users]: login, name, email для первой учетной записи, подставив соответственно, свои реквизиты из домена
- отредактируйте таблицу [settings]: установите логин и пароль технологических пользователей для доступа в ntlm и ibso, а также имя файла сертификата безопасности в /sslcert/ и пароль для сертификата для группы ssl
    
## Запуск приложения
    
###  Рабочий режим  
```
        \> node app --production
```
   Серверное приложение отдает по запросу клиенту статические файлы с приложением из каталога /client, таким образом выполняя функции web-сервера. Также сервер обрабатывает все запросы, поступающие из клиентского приложения, выполняя функции бэк-енд
   
###  Режим разработки
```
        \> node app
```
   Серверное приложение выполняет сборку клиентского приложения из исходных файлов в каталоге /client_source/ "на лету". Для сборки используется популярный сборщик (bundler) - Webpack. Основой клиентского приложения является компонентный фреймворк Vue.js. Если во время работы, в данном режиме изменить какой-нибудь файл (компонент) клиентской части, <изменения> будут отгружены в клиентский браузер и отображены в ту же секунду. Для понимания работы сборщика следует изучить документацию по Webpack.
   
###  Рекомендации
 - сервер выводит информацию в stdout, который можно перенаправить в  файл (на усмотрение администратора)
 - для запуска в Windows в качестве сервиса рекомендуется использовать nssm. Запустите nssm.exe и следуйте указаниям, которые дает программа.

## Самостоятельная разработка задачи (специализированного модуля)
   
   Задача состоит из следующих компонентов:

- /tasks/<имя_модуля>.js   
- /client_source/tasks/<имя_модуля>.html 
- /db/synapse.db:[objects] class='tasks' name=<имя_модуля>

###  Чтобы самому написать задачу /tasks/ вам потребуется знание JavaScript.
 Желательно (но не обязательно) знать JavaScript в версии ES5.1 с функционалкой (forEach, map, reduce), и ES6 со всеми этими Promise, стрелочными фунцкиями. Для запросов к базам данных понадобится знание SQL и изучение готовых примеров. В подкаталоге /tasks/ расположены отдельные модули для каждой решаемой задачи. Модули запускаются в отдельном процессе node, получают параметры через командную строку и отдают информацию в основной процесс через <stdout>. Для примера см. /tasks/validate.js. Дополнительно, схема работы клиента и сервера подробно описана в /core/tasks.js
   
###  В подкаталоге /client_source/tasks/ расположены .html файлы для
 реализации интерфейса пользователя. Для примера см. validate.html. Для начала достаточно немного понимать как работает язык html. В продвинутом варианте, можно добавлять расширенный функционал Vue, поскольку *.html файлы в /tasks/ по сути тоже Vue-компоненты.
   
###  Имя модуля /tasks/ и интерфейса /client_source/tasks/ должно совпадать.
 Кроме того в системную базу данных /db/synapse.db в таблицу [objects] необходимо внести запись cо значениями: class="tasks" и name="имя модуля" (рекомендуется делать через SQLite editor). После внесения записи в базу данных, администратор может раздавать доступы в WEB-интерфейсе самой системы.

<hr>

## Снимки экрана

### v2.9 (@latest)
![# -= Synapse =-](https://github.com/yenesey/Synapse/blob/master/.other/memories/v2.9.png)

### v2.8
![# -= Synapse =-](https://github.com/yenesey/Synapse/blob/master/.other/memories/synapse.png)

