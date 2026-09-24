package com.finvote;

import com.finvote.config.FinVoteProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/**
 * FinVote · 演讲评赛系统
 *
 * 后端同时承载：后台配置台 / 评委评分端 / 总分大屏 三个前端页面所需的 REST 接口。
 */
@SpringBootApplication
@EnableConfigurationProperties(FinVoteProperties.class)
public class FinVoteApplication {

    public static void main(String[] args) {
        SpringApplication.run(FinVoteApplication.class, args);
    }
}
