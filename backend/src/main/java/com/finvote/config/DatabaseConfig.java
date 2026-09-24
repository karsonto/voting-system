package com.finvote.config;

import org.sqlite.SQLiteDataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.io.File;

/**
 * SQLite 数据源。
 *
 * 通过 JDBC URL 参数开启外键约束与 WAL 模式：
 * - foreign_keys=on  让 ON DELETE CASCADE 生效（PRAGMA 是按连接生效的，写在 URL 里最可靠）
 * - busy_timeout     避免并发写入时立刻抛 SQLITE_BUSY
 */
@Configuration
public class DatabaseConfig {

    private final FinVoteProperties properties;

    public DatabaseConfig(FinVoteProperties properties) {
        this.properties = properties;
    }

    @Bean
    public DataSource dataSource() {
        File file = new File(properties.getDbPath()).getAbsoluteFile();
        File parent = file.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IllegalStateException("无法创建数据库目录: " + parent.getAbsolutePath());
        }

        SQLiteDataSource dataSource = new SQLiteDataSource();
        dataSource.setUrl("jdbc:sqlite:" + file.getPath().replace('\\', '/')
                + "?foreign_keys=on&busy_timeout=10000&journal_mode=WAL");
        return dataSource;
    }
}
