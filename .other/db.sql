--
-- File generated with SQLiteStudio v3.2.1 on Чт сен 26 21:50:36 2019
--
-- Text encoding used: UTF-8
--
PRAGMA foreign_keys = off;
BEGIN TRANSACTION;

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
    id          INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    class       TEXT,
    name        TEXT,
    description TEXT,
    UNIQUE (
        class,
        name
    )
);


-- Table: objects_meta
DROP TABLE IF EXISTS objects_meta;

CREATE TABLE objects_meta (
    object      REFERENCES objects (id) ON DELETE CASCADE,
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


-- Table: system
DROP TABLE IF EXISTS system;

CREATE TABLE system (
    id    INTEGER PRIMARY KEY ASC AUTOINCREMENT,
    idp   INTEGER REFERENCES system (id) ON DELETE CASCADE
                  NOT NULL,
    [key] STRING  NOT NULL,
    value STRING
);


-- Table: system_loops
DROP TABLE IF EXISTS system_loops;

CREATE TABLE system_loops (
    id1  INTEGER   REFERENCES system (id) ON DELETE CASCADE ON UPDATE CASCADE,
    id2  INTEGER   REFERENCES system (id) ON DELETE CASCADE ON UPDATE CASCADE,
    attr CHAR (16) 
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

CREATE INDEX "" ON system (
    idp ASC
);


-- Index: idp_and_key
DROP INDEX IF EXISTS idp_and_key;

CREATE UNIQUE INDEX idp_and_key ON system (
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


-- Index: one_to_one
DROP INDEX IF EXISTS one_to_one;

CREATE UNIQUE INDEX one_to_one ON system_loops (
    id1,
    id2
);


-- Index: user_object
DROP INDEX IF EXISTS user_object;

CREATE UNIQUE INDEX user_object ON user_access (
    user,
    object
);


-- View: vw_system_recursive
DROP VIEW IF EXISTS vw_system_recursive;
CREATE VIEW vw_system_recursive AS
WITH RECURSIVE Node (
        id,
        level,
        path
    )
    AS (
        SELECT id,
               0,
               [key]
          FROM system
         WHERE idp = -1 AND 
               id != -1
        UNION
        SELECT system.id,
               Node.level + 1,
               Node.path || '/' || [key]
          FROM system,
               Node
         WHERE system.idp = Node.id
    )
    SELECT Node.path,
           system.id,
           substr('                       ', 1, level * 6) || "key" AS [key],
           system.value
      FROM Node,
           system
     WHERE system.id = Node.id
     ORDER BY Node.path;


COMMIT TRANSACTION;
PRAGMA foreign_keys = on;
