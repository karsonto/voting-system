package com.finvote.domain;

import java.util.Arrays;

/**
 * 评分制式。
 *
 * 目前系统实际支持「百分制 · 多维度加权」，其余制式在枚举中预留并标记为不可用，
 * 后台配置台沿用设计稿的做法，点击未支持项时给出提示。
 */
public enum ScoreScale {

    WEIGHTED_100("weighted-100", "百分制 · 多维度加权",
            "每个维度 0–100 分，按权重折算为最终得分", 100, 1, true),

    WEIGHTED_10("weighted-10", "十分制 · 多维度加权",
            "每维度 0–10 分，再折算百分制", 10, 1, false),

    RANK("rank", "排名制",
            "评委对项目排序，按名次计分", 0, 1, false);

    private final String id;
    private final String label;
    private final String description;
    private final int maxPerDimension;
    private final int step;
    private final boolean supported;

    ScoreScale(String id, String label, String description, int maxPerDimension, int step, boolean supported) {
        this.id = id;
        this.label = label;
        this.description = description;
        this.maxPerDimension = maxPerDimension;
        this.step = step;
        this.supported = supported;
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

    public int getMaxPerDimension() {
        return maxPerDimension;
    }

    public int getStep() {
        return step;
    }

    public boolean isSupported() {
        return supported;
    }

    /** 该制式下加权总分的满分值。 */
    public double getMaxTotal() {
        return 100d;
    }

    public static ScoreScale fromId(String id) {
        if (id != null) {
            for (ScoreScale scale : values()) {
                if (scale.id.equalsIgnoreCase(id.trim())) {
                    return scale;
                }
            }
        }
        return WEIGHTED_100;
    }

    public static String supportedLabel() {
        return Arrays.stream(values()).filter(ScoreScale::isSupported).map(ScoreScale::getLabel)
                .findFirst().orElse(WEIGHTED_100.label);
    }
}
