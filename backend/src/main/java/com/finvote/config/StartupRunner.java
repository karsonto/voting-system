package com.finvote.config;

import com.finvote.service.AdminUserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.stereotype.Component;

/**
 * 启动时的初始化：确保至少存在一个管理员账号，并打印访问地址。
 */
@Component
public class StartupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupRunner.class);

    private final AdminUserService adminUserService;
    private final FinVoteProperties properties;

    public StartupRunner(AdminUserService adminUserService, FinVoteProperties properties) {
        this.adminUserService = adminUserService;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        adminUserService.bootstrapIfEmpty();
        log.info("FinVote 已启动");
        log.info("  数据库文件   : {}", properties.getDbPath());
        log.info("  后台配置台   : http://localhost:8080/admin");
        log.info("  评委评分端   : http://localhost:8080/judge");
        log.info("  总分大屏     : http://localhost:8080/board");
        log.info("  默认管理员   : {} / {}（请登录后尽快修改）",
                properties.getBootstrapAdminUsername(), properties.getBootstrapAdminPassword());
    }
}
