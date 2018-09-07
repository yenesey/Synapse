--
-- Файл сгенерирован с помощью SQLiteStudio v3.1.1 в Пт сен 7 14:54:03 2018
--
-- Использованная кодировка текста: System
--
PRAGMA foreign_keys = off;

-- Таблица: jobs
CREATE TABLE jobs (
    id          INTEGER  PRIMARY KEY ASC AUTOINCREMENT,
    task                 CONSTRAINT task_class REFERENCES objects (id) ON DELETE CASCADE
                                                                       ON UPDATE CASCADE,
    params      TEXT,
    schedule    TEXT,
    enabled     BOOLEAN,
    description TEXT,
    last        DATETIME,
    code        INTEGER
);


-- Таблица: objects
CREATE TABLE objects (
    id          INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    class       TEXT,
    name        TEXT,
    description TEXT,
    UNIQUE (
        class,
        name
    )
);

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        1,
                        'admin',
                        'Пользователи',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        2,
                        'admin',
                        'Планировщик',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        3,
                        'admin',
                        'SQL Запрос',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        4,
                        'admin',
                        'Задачи',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        20,
                        'deps',
                        '001%',
                        'Головной офис'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        21,
                        'deps',
                        '002%',
                        'Филиал'
                    );


INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        32,
                        'ibs',
                        'IBS.VW_CRIT_BANK_CLIENT',
                        'Договоры ИКБ'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        33,
                        'ibs',
                        'IBS.VW_CRIT_DEPART',
                        'Справочник подразделений'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        34,
                        'ibs',
                        'IBS.VW_CRIT_CL_ORG',
                        'Справочник организаций'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        35,
                        'ibs',
                        'IBS.VW_CRIT_USER',
                        'Справочник пользователей'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        37,
                        'ibs',
                        'IBS.VW_CRIT_AC_FIN',
                        'Финансовые счета'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        44,
                        'todos',
                        'Кредитование',
                        'Управление клиентского обслуживания СФ'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        45,
                        'groups',
                        'УИТ',
                        NULL
                    );


INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        48,
                        'groups',
                        'ОО',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        54,
                        'groups',
                        'Администраторы',
                        'Администраторы Synapse'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        55,
                        'ibs',
                        'IBS.VW_CRIT_BRANCH',
                        'Справочник филиалов'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        101,
                        'tasks',
                        'Форма 122',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        106,
                        'tasks',
                        'Переоценка',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        107,
                        'tasks',
                        'Форма 115',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        108,
                        'tasks',
                        'Форма 128',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        109,
                        'tasks',
                        'Скачать с FIO',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        112,
                        'tasks',
                        'Обязательный контроль',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        113,
                        'tasks',
                        'Форма 303',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        114,
                        'tasks',
                        'Активные Клиенты',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        115,
                        'tasks',
                        'Поддержка ДБО',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        116,
                        'tasks',
                        'Протокол ЗОД',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        118,
                        'tasks',
                        'Дебиторская задолженность',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        128,
                        'tasks',
                        'Форма 115. полная',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        139,
                        'tasks',
                        'validate',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        141,
                        'tasks',
                        '562-П',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        142,
                        'tasks',
                        '440-П',
                        'Отправка в налоговую'
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        150,
                        'tasks',
                        'CD запись',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        151,
                        'tasks',
                        'CD просмотр',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        157,
                        'tasks',
                        'Движение средств ФЛ',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        159,
                        'tasks',
                        'Реестры привлечений-изъятий',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        160,
                        'tasks',
                        'Управленческая отчетность',
                        ''
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        161,
                        'tasks',
                        'Отпуск',
                        NULL
                    );

INSERT INTO objects (
                        id,
                        class,
                        name,
                        description
                    )
                    VALUES (
                        162,
                        'tasks',
                        'Справочник БИК',
                        NULL
                    );


-- Таблица: objects_meta
CREATE TABLE objects_meta (
    object      REFERENCES objects (id) ON DELETE CASCADE,
    meta   TEXT
);

INSERT INTO objects_meta (
                             object,
                             meta
                         )
                         VALUES (
                             33,
                             '{"column":"C_1", "operator":"like", "class":"deps"}'
                         );

INSERT INTO objects_meta (
                             object,
                             meta
                         )
                         VALUES (
                             35,
                             '{"column":"C_3", "operator":"like", "class":"deps"}'
                         );

INSERT INTO objects_meta (
                             object,
                             meta
                         )
                         VALUES (
                             48,
                             '{"dwr":"172.22.1.16", "dirEHD":"\\\\kr-fs-05\\Common\\Archive\\CFT\\EAC"}'
                         );

INSERT INTO objects_meta (
                             object,
                             meta
                         )
                         VALUES (
                             49,
                             '{"dirEHD":"\\\\irk-fs-01\\Common\\Archive\\CFT\\EAC"}'
                         );

INSERT INTO objects_meta (
                             object,
                             meta
                         )
                         VALUES (
                             55,
                             '{"column":"C_1", "operator":"like", "class":"deps"}'
                         );


-- Таблица: settings
CREATE TABLE settings (
    [group]     TEXT,
    [key]       TEXT,
    value,
    description TEXT,
    PRIMARY KEY (
        [group] ASC,
        [key] ASC
    )
);


INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'path',
                         'users',
                         'users',
                         'пользовательские каталоги'
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ntlm',
                         'dc',
                         'ldap://bank-ad',
                         'контроллер домена'
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ntlm',
                         'domain',
                         'bank.ru',
                         'домен'
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ibs',
                         'password',
                         '',
                         NULL
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ibs',
                         'user',
                         'test',
                         NULL
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'socket',
                         'timeout',
                         3600000,
                         '= 1000 мс * 60 с * 30 мин'
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'tasks',
                         'history',
                         40,
                         'сколько папок истории запросов хранить в users\%username%'
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ntlm',
                         'dn',
                         'DC=bank, DC=ru',
                         NULL
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ntlm',
                         'password',
                         '',
                         NULL
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ntlm',
                         'user',
                         'synapse_ad',
                         'пользователь для доступа в LDAP'
                     );


INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'mail',
                         'host',
                         'some.bank.loc',
                         NULL
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'mail',
                         'port',
                         25,
                         NULL
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ibs',
                         'schema',
                         'db.db',
                         'она же <connectString>'
                     );


INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'bank',
                         'prefix',
                         'TVR',
                         'префикс для VW_CRIT_${prefix}'
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ssl',
                         'password',
                         1,
                         'пароль (если есть)'
                     );

INSERT INTO settings (
                         [group],
                         [key],
                         value,
                         description
                     )
                     VALUES (
                         'ssl',
                         'cert',
                         'name.pfx',
                         'имя файла сертификата безопасности'
                     );



-- Таблица: users
CREATE TABLE users (
    id       INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    login    TEXT    NOT NULL,
    disabled BOOLEAN,
    name     TEXT,
    email    TEXT
);

INSERT INTO users (
                      id,
                      login,
                      disabled,
                      name,
                      email
                  )
                  VALUES (
                      1,
                      'login(replace with yours)',
                      NULL,
                      'Фамилия Имя Отчетво (заменить на свои)',
                      'name@mail.ru'
                  );



-- Таблица: user_access
CREATE TABLE user_access (
    user           REFERENCES users (id) ON DELETE CASCADE
                                         ON UPDATE CASCADE,
    object         REFERENCES objects (id) ON DELETE CASCADE
                                           ON UPDATE CASCADE,
    access INTEGER
);

INSERT INTO user_access (
                            user,
                            object,
                            access
                        )
                        VALUES (
                            1,
                            1,
                            NULL
                        );

INSERT INTO user_access (
                            user,
                            object,
                            access
                        )
                        VALUES (
                            1,
                            2,
                            NULL
                        );


INSERT INTO user_access (
                            user,
                            object,
                            access
                        )
                        VALUES (
                            1,
                            3,
                            NULL
                        );

INSERT INTO user_access (
                            user,
                            object,
                            access
                        )
                        VALUES (
                            1,
                            4,
                            NULL
                        );





-- Индекс: login
CREATE UNIQUE INDEX login ON users (
    login COLLATE NOCASE ASC
);


-- Индекс: name
CREATE INDEX name ON objects (
    name
);


-- Индекс: user_object
CREATE UNIQUE INDEX user_object ON user_access (
    user,
    object
);

PRAGMA foreign_keys = on;
