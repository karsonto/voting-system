package com.finvote.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * finvote.* 配置项。
 */
@Data
@ConfigurationProperties(prefix = "finvote")
public class FinVoteProperties {

    /** SQLite 数据库文件路径，相对路径基于进程启动目录。 */
    private String dbPath = "data/finvote.db";

    /** 令牌签名密钥，正式部署务必修改。 */
    private String secret = "finvote-dev-secret-change-me";

    /** 后台管理员令牌有效期（分钟）。 */
    private int adminTokenMinutes = 720;

    /** 评委令牌有效期（分钟）。 */
    private int judgeTokenMinutes = 720;

    /** 首次启动自动创建的管理员账号。 */
    private String bootstrapAdminUsername = "admin";

    /** 首次启动自动创建的管理员密码。 */
    private String bootstrapAdminPassword = "admin123";
}
