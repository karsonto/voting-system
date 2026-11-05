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
    /** 自由打分模式：开启后评委不再受调度限制，可自行选择任意项目评分。 */
    private boolean freeScoring;
    /** 界面语言：zh-Hans / zh-Hant / en。全系统共用这一项。 */
    private String locale;
    /** 倒计时时长（分钟），0 表示未配置。 */
    private int countdownMinutes;
    /** 倒计时是否正在运行。 */
    private boolean countdownRunning;
    /** 倒计时截止时间（毫秒 epoch），running 时有效。 */
    private long countdownEndAt;
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
