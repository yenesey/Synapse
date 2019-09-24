--
-- File generated with SQLiteStudio v3.2.1 on Вт сен 24 17:19:29 2019
--
-- Text encoding used: UTF-8
--
PRAGMA foreign_keys = off;
BEGIN TRANSACTION;

-- Table: config
DROP TABLE IF EXISTS config;

CREATE TABLE config (
    id    INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    idp   INTEGER REFERENCES config (id) ON DELETE CASCADE
                  NOT NULL,
    [key] STRING  NOT NULL,
    value STRING
);


-- Table: jobs
DROP TABLE IF EXISTS jobs;

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


-- Table: objects
DROP TABLE IF EXISTS objects;

CREATE TABLE objects (
    id    INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    class TEXT,
    name  TEXT,
    UNIQUE (
        class,
        name
    )
);


-- Table: objects_meta
DROP TABLE IF EXISTS objects_meta;

CREATE TABLE objects_meta (
    object      REFERENCES objects (id) ON DELETE CASCADE
                UNIQUE,
    meta   TEXT
);


-- Table: settings
DROP TABLE IF EXISTS settings;

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


-- Table: user_access
DROP TABLE IF EXISTS user_access;

CREATE TABLE user_access (
    user           REFERENCES users (id) ON DELETE CASCADE
                                         ON UPDATE CASCADE,
    object         REFERENCES objects (id) ON DELETE CASCADE
                                           ON UPDATE CASCADE,
    access INTEGER
);


-- Table: users
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id       INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    login    TEXT    NOT NULL,
    disabled BOOLEAN,
    name     TEXT,
    email    TEXT
);


-- Index: 
DROP INDEX IF EXISTS "";

CREATE INDEX "" ON config (
    idp ASC
);


-- Index: idp_and_key
DROP INDEX IF EXISTS idp_and_key;

CREATE UNIQUE INDEX idp_and_key ON config (
    idp,
    "key"
);


-- Index: login
DROP INDEX IF EXISTS login;

CREATE UNIQUE INDEX login ON users (
    login COLLATE NOCASE ASC
);


-- Index: name
DROP INDEX IF EXISTS name;

CREATE INDEX name ON objects (
    name
);


-- Index: user_object
DROP INDEX IF EXISTS user_object;

CREATE UNIQUE INDEX user_object ON user_access (
    user,
    object
);


-- View: vw_config_recursive
DROP VIEW IF EXISTS vw_config_recursive;
CREATE VIEW vw_config_recursive AS
WITH RECURSIVE Node (
        id,
        level,
        path
    )
    AS (
        SELECT id,
               0,
               [key]
          FROM config
         WHERE idp = -1 AND 
               id != -1
        UNION
        SELECT config.id,
               Node.level + 1,
               Node.path || '/' || [key]
          FROM config,
               Node
         WHERE config.idp = Node.id
    )
    SELECT Node.path,
           config.id,
           substr('                       ', 1, level * 6) || "key" AS [key],
           config.value
      FROM Node,
           config
     WHERE config.id = Node.id
     ORDER BY Node.path;


-- View: vw_objects_meta
DROP VIEW IF EXISTS vw_objects_meta;
CREATE VIEW vw_objects_meta AS
    SELECT objects.*,
           objects_meta.meta
      FROM objects
           LEFT JOIN
           objects_meta ON objects.id = objects_meta.object;


COMMIT TRANSACTION;
PRAGMA foreign_keys = on;
