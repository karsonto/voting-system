package com.finvote.config;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.Map;

/**
 * 给已经建好的库补上后续新增的列。
 *
 * schema.sql 使用 CREATE TABLE IF NOT EXISTS，不会改动已有表。
 * 当前 SQLite 驱动也不接受 ALTER TABLE ... ADD COLUMN IF NOT EXISTS，
 * 所以在这里先查表结构，缺列再补。
 */
@Component
public class SchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    public SchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void migrate() {
        if (!hasColumn("project", "mentor")) {
            jdbcTemplate.execute("ALTER TABLE project ADD COLUMN mentor TEXT NOT NULL DEFAULT ''");
        }
        if (!hasColumn("judge", "avatar")) {
            jdbcTemplate.execute("ALTER TABLE judge ADD COLUMN avatar TEXT NOT NULL DEFAULT ''");
        }
        if (!hasColumn("competition", "locale")) {
            jdbcTemplate.execute("ALTER TABLE competition ADD COLUMN locale TEXT NOT NULL DEFAULT 'zh-Hans'");
        }
    }

    private boolean hasColumn(String table, String column) {
        List<Map<String, Object>> columns = jdbcTemplate.queryForList("PRAGMA table_info(" + table + ")");
        for (Map<String, Object> row : columns) {
            Object name = row.get("name");
            if (name == null) {
                name = row.get("NAME");
            }
            if (name != null && column.equalsIgnoreCase(name.toString())) {
                return true;
            }
        }
        return false;
    }
}
