package com.finvote.domain;

import lombok.Data;

/**
 * 评分单的逐维度得分。
 */
@Data
public class ScoreItem {

    private Long id;
    private Long scoreEntryId;
    private Long dimensionId;
    private int value;
}
