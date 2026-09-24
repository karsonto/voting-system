package com.finvote.service;

import com.finvote.domain.Dimension;

import java.util.List;
import java.util.Map;

/**
 * 计分工具：把「逐维度得分 + 维度权重」折算为百分制加权总分。
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
     * 加权折算。
     *
     * <p>公式：&sum;(得分 &times; 权重) / &sum;(权重)。权重合计为 0 时退化为算术平均，
     * 保证「维度全部为 0 权重」这种异常配置下仍能得到一个可解释的分数。</p>
     */
    public static double weightedTotal(List<Dimension> dimensions, Map<Long, Integer> values) {
        if (dimensions == null || dimensions.isEmpty()) {
            return 0d;
        }
        double weightedSum = 0d;
        double weightSum = 0d;
        double plainSum = 0d;
        int counted = 0;

        for (Dimension d : dimensions) {
            Integer value = values == null ? null : values.get(d.getId());
            if (value == null) {
                continue;
            }
            weightedSum += value * d.getWeight();
            weightSum += d.getWeight();
            plainSum += value;
            counted++;
        }
        if (counted == 0) {
            return 0d;
        }
        if (weightSum <= 0d) {
            return plainSum / counted;
        }
        return weightedSum / weightSum;
    }

    /** 保留两位小数，避免浮点误差影响排名展示。 */
    public static double round2(double value) {
        return Math.round(value * 100d) / 100d;
    }
}
