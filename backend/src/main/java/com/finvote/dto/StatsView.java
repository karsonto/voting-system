package com.finvote.dto;

import lombok.Data;

/**
 * 全局统计指标。
 */
@Data
public class StatsView {

    private int projectCount;
    private int judgeCount;
    /** 已提交的评分单份数。 */
    private int scoreCount;
    /** 可提交的评分单总份数（项目数 × 评委数）。 */
    private int totalPossibleScores;
    /** 已产生有效成绩的项目数。 */
    private int coveredProjectCount;
    /**
     * 每个项目实际采信的评分份数（评委数按现行规则去掉极值之后）。
     *
     * <p>例如 6 位评委 + 去掉最高最低分 → 4 份，与设计稿「有效评委数 = 评委数 6 − 2」一致。</p>
     */
    private int effectiveScoreCount;
}
