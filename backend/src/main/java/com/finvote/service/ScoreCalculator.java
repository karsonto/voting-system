package com.finvote.service;

import com.finvote.domain.Dimension;

import java.util.List;
import java.util.Map;

/**
 * 计分工具：把「逐维度得分」折算为百分制总分。
 *
 * <p>每个维度的满分即其权重（权重 30% → 该维度满分 30 分），
 * 因此总分 = 各维度得分直接相加（权重合计为 100 时即 0–100 分）。</p>
 */
public final class ScoreCalculator {

    private ScoreCalculator() {
    }

    public static int totalWeight(List<Dimension> dimensions) {
        int sum = 0;
        for (Dimension d : dimensions) {
            sum += d.getWeight();
        }
        return sum;
    }

    /**
     * 总分 = 各维度得分直接相加。
     *
     * <p>维度满分 = 权重，故直接相加即得百分制总分；权重合计不为 100 时
     * 仍按实际得分相加，保持「维度满分即权重」的语义。</p>
     */
    public static double weightedTotal(List<Dimension> dimensions, Map<Long, Double> values) {
        if (dimensions == null || dimensions.isEmpty()) {
            return 0d;
        }
        double total = 0d;
        for (Dimension d : dimensions) {
            Double value = values == null ? null : values.get(d.getId());
            if (value == null) {
                continue;
            }
            total += value;
        }
        return total;
    }

    /** 保留两位小数，避免浮点误差影响排名展示。 */
    public static double round2(double value) {
        return Math.round(value * 100d) / 100d;
    }
}
