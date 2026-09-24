-- FinVote 数据库结构（SQLite）
-- 由 Spring Boot 在启动时执行（spring.sql.init.mode=always）
-- 语句均为幂等，可重复执行

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 后台管理员账号
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_user (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    display_name  TEXT    NOT NULL DEFAULT '',
    role          TEXT    NOT NULL DEFAULT 'ADMIN',
    enabled       INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- 赛事（当前实现为单赛事，保留多赛事扩展能力）
-- version 全局自增版本号，前端据此判断是否需要刷新（实时同步用）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competition (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    stage      TEXT    NOT NULL DEFAULT '',
    scale_id   TEXT    NOT NULL DEFAULT 'weighted-100',
    rule_id    TEXT    NOT NULL DEFAULT 'trimmed-mean',
    is_open    INTEGER NOT NULL DEFAULT 1,
    revealed   INTEGER NOT NULL DEFAULT 0,
    version    INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- 评分维度与权重
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dimension (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    name           TEXT    NOT NULL,
    weight         INTEGER NOT NULL DEFAULT 0,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (competition_id) REFERENCES competition (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dimension_comp ON dimension (competition_id, sort_order);

-- ---------------------------------------------------------------------------
-- 参赛项目
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    name           TEXT    NOT NULL,
    team           TEXT    NOT NULL DEFAULT '',
    track          TEXT    NOT NULL DEFAULT '',
    sort_order     INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (competition_id) REFERENCES competition (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_comp ON project (competition_id, sort_order);

-- ---------------------------------------------------------------------------
-- 评委。current_project_id 即「当前评审项目」，由后台配置台实时调度
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS judge (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id     INTEGER NOT NULL,
    name               TEXT    NOT NULL,
    org                TEXT    NOT NULL DEFAULT '',
    pin                TEXT    NOT NULL,
    current_project_id INTEGER,
    sort_order         INTEGER NOT NULL DEFAULT 0,
    active             INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (competition_id) REFERENCES competition (id) ON DELETE CASCADE,
    FOREIGN KEY (current_project_id) REFERENCES project (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_judge_comp ON judge (competition_id, sort_order);

-- ---------------------------------------------------------------------------
-- 评分单（一位评委对一个项目一份）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS score (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    project_id     INTEGER NOT NULL,
    judge_id       INTEGER NOT NULL,
    comment        TEXT    NOT NULL DEFAULT '',
    weighted_total REAL    NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL,
    UNIQUE (judge_id, project_id),
    FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE,
    FOREIGN KEY (judge_id) REFERENCES judge (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_score_project ON score (project_id);
CREATE INDEX IF NOT EXISTS idx_score_judge ON score (judge_id);

-- ---------------------------------------------------------------------------
-- 评分单的逐维度得分
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS score_item (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    score_id     INTEGER NOT NULL,
    dimension_id INTEGER NOT NULL,
    value        INTEGER NOT NULL,
    UNIQUE (score_id, dimension_id),
    FOREIGN KEY (score_id) REFERENCES score (id) ON DELETE CASCADE,
    FOREIGN KEY (dimension_id) REFERENCES dimension (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_score_item_score ON score_item (score_id);

-- ---------------------------------------------------------------------------
-- 前端轮询「变更版本」，避免每次请求都拉全量数据
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_version (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    version    INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO data_version (id, version, updated_at) VALUES (1, 0, 0);
