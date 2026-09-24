package com.finvote.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 计分规则：把多位评委的加权总分合并为一个项目得分。
 */
public enum ScoreRule {

    /** 去掉一个最高分与一个最低分后取平均（评委数 &ge; 3 时生效）。 */
    TRIMMED_MEAN("trimmed-mean", "去掉最高分与最低分",
            "评委数 ≥ 3 时，去掉一个最高分与一个最低分后取平均"),

    /** 去掉一个最高分后取平均（评委数 &ge; 2 时生效）。 */
    DROP_HIGH("drop-high", "去掉一个最高分",
            "去掉单个最高分后取平均，保留其余评委"),

    /** 全部有效评分取平均。 */
    MEAN("mean", "全部评委取平均",
            "不做极值处理，直接对全部有效评分取平均");

    private final String id;
    private final String label;
    private final String description;

    ScoreRule(String id, String label, String description) {
        this.id = id;
        this.label = label;
        this.description = description;
    }

    public String getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }

    /**
     * 在给定评委人数下，本规则实际采信的评分份数。
     *
     * @param submittedCount 已提交的有效评分份数
     */
    public int effectiveCount(int submittedCount) {
        switch (this) {
            case TRIMMED_MEAN:
                return submittedCount >= 3 ? submittedCount - 2 : submittedCount;
            case DROP_HIGH:
                return submittedCount >= 2 ? submittedCount - 1 : submittedCount;
            case MEAN:
            default:
                return submittedCount;
        }
    }

    /**
     * 把一批加权总分按本规则合并为项目得分。入参可无序，方法内部自行排序。
     *
     * @param totals 各评委对该项目的加权总分
     * @return 合并后的得分；当没有有效评分时返回 {@code Double.NaN}
     */
    public double aggregate(List<Double> totals) {
        if (totals == null || totals.isEmpty()) {
            return Double.NaN;
        }
        List<Double> sorted = new ArrayList<Double>(totals);
        java.util.Collections.sort(sorted);

        List<Double> used = sorted;
        if (this == TRIMMED_MEAN && sorted.size() >= 3) {
            used = sorted.subList(1, sorted.size() - 1);
        } else if (this == DROP_HIGH && sorted.size() >= 2) {
            used = sorted.subList(0, sorted.size() - 1);
        }
        if (used.isEmpty()) {
            return Double.NaN;
        }
        double sum = 0d;
        for (Double value : used) {
            sum += value;
        }
        return sum / used.size();
    }

    public static ScoreRule fromId(String id) {
        if (id != null) {
            for (ScoreRule rule : values()) {
                if (rule.id.equalsIgnoreCase(id.trim())) {
                    return rule;
                }
            }
        }
        return TRIMMED_MEAN;
    }

    public static List<ScoreRule> all() {
        return Arrays.asList(values());
    }
}
