{
    "config": {
        "api": {
            "cft-web-proxy": {
                "enabled": false
            }
        },
        "bank": {
            "prefix": "TVR"
        },
        "mail": {
            "host": "ip address || dns name here",
            "port": 25
        },
        "ntlm": {
            "dc": "ldap://bank-ad",
            "dn": "DC=bank, DC=name, DC=ru",
            "domain": "<put dns name here>",
            "password": "<put password here>",
            "user": "<put username here>"
        },
        "oracle": {
            "t": {
                "connectString": "(DESCRIPTION =\n    (ADDRESS_LIST =\n      (ADDRESS = (PROTOCOL = TCP)(HOST = t1-vip.bank.tavrich.ru)(PORT = 1521))\n      (ADDRESS = (PROTOCOL = TCP)(HOST = t2-vip.bank.tavrich.ru)(PORT = 1521))\n    )\n    (CONNECT_DATA =\n      (SERVICE_NAME = T2000)\n      (FAILOVER_MODE =\n        (TYPE = SELECT)\n        (METHOD = BASIC)\n        (RETRIES = 20)\n        (DELAY = 5)\n      )\n    )\n  )",
                "password": "",
                "user": ""
            },
            "ibso": {
                "connectString": "(DESCRIPTION = (ADDRESS_LIST = (ADDRESS = (PROTOCOL = TCP)(Host = 10.142.2.70)(Port = 1525)) ) (CONNECT_DATA = (SID = tavr)))",
                "oldPassword": "",
                "password": "",
                "user": ""
            },
            "warehouse": {
                "connectString": "(DESCRIPTION =\n    (ADDRESS_LIST =\n      (ADDRESS = (PROTOCOL = TCP)(HOST = t1-vip.bank.tavrich.ru)(PORT = 1521))\n      (ADDRESS = (PROTOCOL = TCP)(HOST = t2-vip.bank.tavrich.ru)(PORT = 1521))\n    )\n    (CONNECT_DATA =\n      (SERVICE_NAME = T2000)\n      (FAILOVER_MODE =\n        (TYPE = SELECT)\n        (METHOD = BASIC)\n        (RETRIES = 20)\n        (DELAY = 5)\n      )\n    )\n  )",
                "password": "warehouse",
                "user": "WH"
            }
        },
        "path": {
            "users": ".\\users",
            "xtech": ".\\xtech"
        },
        "socket": {
            "timeout": 3600000
        },
        "ssl": {
            "cert": "syn2020.pfx",
            "password": 1
        },
        "tasks": {
            "history": 40
        }
    },


    "objects": {
        "admin": {
            "scheduler": {
                "description": "Планировщик"
            },
            "sql": {
                "description": "SQL Запрос"
            },
            "system": {
                "description": "Конф. системы"
            },
            "tasks": {
                "description": "Задачи"
            },
            "users": {
                "description": "Пользователи"
            }
        },
        "deps": {
            "001%": {
                "description": "Головной офис"
            },
            "002%": {
                "description": "Филиал"
            }
        },
        "groups": {
            "Администраторы": {
                "description": "Администраторы Synapse"
            },
            "СФ ОО": {
                "dirEHD": "\\\\kr-fs-05\\Common\\Archive\\CFT\\EAC",
                "dwr": "172.22.1.16"
            },
            "СФ ОО в г. Иркутске": {
                "dirEHD": "\\\\irk-fs-01\\Common\\Archive\\CFT\\EAC"
            },
            "СФ УИТ": {},
            "СФ УКО": {}
        },
        "ibs": {
            "IBS.VW_CRIT_AC_FIN": {
                "description": "Финансовые счета"
            },
            "IBS.VW_CRIT_BANK_CLIENT": {
                "description": "Договоры ИКБ"
            },
            "IBS.VW_CRIT_BRANCH": {
                "constraint": {
                    "class": "deps",
                    "column": "C_1",
                    "operator": "like"
                },
                "description": "Справочник филиалов"
            },
            "IBS.VW_CRIT_CL_ORG": {
                "description": "Справочник организаций"
            },
            "IBS.VW_CRIT_DEPART": {
                "description": "Справочник подразделений"
            },
            "IBS.VW_CRIT_FAKTURA": {},
            "IBS.VW_CRIT_USER": {
                "description": "Справочник пользователей"
            }
        },
        "menu": {
            "cb": {
                "description": "ЦБ",
                "icon": "account_balance"
            },
            "cd": {
                "description": "Работа с CD",
                "icon": "disc_full"
            },
            "default": {},
            "fns": {
                "description": "ФНС",
                "icon": "work"
            },
            "test": {
                "description": "Тестирование",
                "icon": "location_searching"
            },
            "tools": {
                "description": "Утилиты",
                "icon": "build",
                "start": 0
            },
            "wh": {
                "description": "WAREHOUSE",
                "icon": "archive"
            }
        },
        "tasks": {
            "validate": {},
            "wh_ibs_acc_fin": {
                "description": "Загрузка счетов",
                "menu": "wh"
            },
            "wh_ibs_acc_saldo": {
                "description": "Обороты и остатки по счетам",
                "menu": "wh"
            },
            "wh_ibs_acc_saldo_checker": {
                "description": "Сверка с балансом",
                "menu": "wh"
            },
            "wh_ibs_acc_saldo_range": {
                "description": "Загрузка счетов в диапазоне дат",
                "menu": "wh"
            },
            "wh_ibs_bin_dict": {
                "description": "Загрузка справочника БИН-ов",
                "menu": "wh"
            },
            "wh_ibs_cards": {
                "description": "Загрузка карт",
                "menu": "wh"
            },
            "wh_ibs_clients": {
                "description": "Загрузка клиентов",
                "menu": "wh"
            },
            "wh_ibs_credits": {
                "description": "Загрузка кредитов",
                "menu": "wh"
            },
            "wh_ibs_depart": {
                "description": "Загрузка подразделений",
                "menu": "wh"
            },
            "wh_ibs_deposits": {
                "description": "Загрузка депозитов",
                "menu": "wh"
            },
            "wh_ibs_ip_products": {
                "description": "Загрузка справочника карт продуктов",
                "menu": "wh"
            },
            "wh_ibs_main_docum": {
                "description": "Загрузка документов",
                "menu": "wh"
            },
            "wh_ibs_transactions": {
                "description": "Загрузка карточных транзакций",
                "menu": "wh"
            },
            "wh_import_excel": {
                "description": "Импорт данных из Excel",
                "menu": "wh"
            },
            "АРТ - карта телефоны": {
                "description": "Для ежедневной выгрузки номеров телефонов клиентов"
            },
            "Отчет по доходности в разрезе карт продуктов": {},
            "Отчет по картам МИР": {
                "description": "Отчет участника платежной системы МИР"
            },
            "СМС по открытым овердрафтам": {},
            "Сверка заданного счета с балансом": {},
            "Хэш номера паспорта и СНИЛС": {
                "menu": "tools",
                "normal": 1
            }
        }
    },
    "users": {
    },
    "jobs": []
}