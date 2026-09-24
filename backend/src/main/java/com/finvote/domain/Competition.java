package com.finvote.domain;

import lombok.Data;

/**
 * 赛事（当前实现为单赛事，表结构保留了多赛事扩展能力）。
 */
@Data
public class Competition {

    private Long id;
    private String name;
    private String stage;
    /** {@link ScoreScale#getId()} */
    private String scaleId;
    /** {@link ScoreRule#getId()} */
    private String ruleId;
    private boolean open;
    private boolean revealed;
    /** 全局自增版本号，供前端轮询判断是否需要刷新。 */
    private long version;
    private long updatedAt;
    private long createdAt;

    public ScoreScale scale() {
        return ScoreScale.fromId(scaleId);
    }

    public ScoreRule rule() {
        return ScoreRule.fromId(ruleId);
    }
}
