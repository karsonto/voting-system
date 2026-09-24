package com.finvote.domain;

import lombok.Data;

/**
 * 评分维度及其权重。
 */
@Data
public class Dimension {

    private Long id;
    private Long competitionId;
    private String name;
    private int weight;
    private int sortOrder;
}
