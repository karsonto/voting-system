package com.finvote.domain;

import lombok.Data;

/**
 * 评分单：一位评委对一个项目一份。同一评委可修改，因此带 created/updated 时间戳。
 */
@Data
public class ScoreEntry {

    private Long id;
    private Long competitionId;
    private Long projectId;
    private Long judgeId;
    private String comment;
    /** 提交时按当时的维度权重折算出的百分制总分，便于排行榜直接读取。 */
    private double weightedTotal;
    private long createdAt;
    private long updatedAt;
}
