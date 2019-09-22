--
-- File generated with SQLiteStudio v3.2.1 on �� ��� 21 09:32:13 2019
--
-- Text encoding used: System
--
PRAGMA foreign_keys = off;
BEGIN TRANSACTION;

-- Table: config
DROP TABLE IF EXISTS config;

CREATE TABLE config (
    id    INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    id_p  INTEGER REFERENCES config (id) ON DELETE CASCADE
                  NOT NULL,
    [key] STRING  NOT NULL,
    value STRING
);

INSERT INTO config (
                       id,
                       id_p,
                       [key],
                       value
                   )
                   VALUES (
-                      1,
-                      1,
                       'root',
                       NULL
                   );

INSERT INTO config (
                       id,
                       id_p,
                       [key],
                       value
                   )
                   VALUES (
                       7,
-                      1,
                       'system',
                       NULL
                   );

INSERT INTO config (
                       id,
                       id_p,
                       [key],
                       value
                   )
                   VALUES (
                       12,
-                      1,
                       'objects',
                       NULL
                   );

INSERT INTO config (
                       id,
                       id_p,
                       [key],
                       value
                   )
                   VALUES (
                       13,
                       12,
                       'tasks',
                       NULL
                   );

INSERT INTO config (
                       id,
                       id_p,
                       [key],
                       value
                   )
                   VALUES (
                       14,
                       13,
                       'Переоценка',
                       NULL
                   );


-- Index: idp_key
DROP INDEX IF EXISTS idp_key;

CREATE UNIQUE INDEX idp_key ON config (
    id_p,
    "key"
);


-- Index: 
DROP INDEX IF EXISTS "";

CREATE INDEX "" ON config (
    id_p ASC
);


COMMIT TRANSACTION;
PRAGMA foreign_keys = on;
