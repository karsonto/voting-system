package com.finvote.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 一份评分单。{@code values} 为「维度 ID → 得分」。
 */
@Data
public class ScoreView {

    private Long id;
    private Long judgeId;
    private String judgeName;
    private Long projectId;
    private String projectName;
    private String comment;
    private double weightedTotal;
    private long createdAt;
    private long updatedAt;
    private Map<Long, Integer> values = new LinkedHashMap<Long, Integer>();
}
