package com.finvote.dto;

import lombok.Data;

/**
 * 大屏排行榜的一行。
 *
 * 未揭晓时 {@code masked = true}，此时 {@code mean} 为 null，只暴露提交进度。
 */
@Data
public class BoardRowView {

    private Long projectId;
    private String projectName;
    private String team;
    private String track;

    /** 按出场顺序的名次（未揭晓时即出场序号）。 */
    private int order;
    /** 揭晓后的排名；未揭晓为 0。 */
    private int rank;

    /** 项目得分；未揭晓或无有效分时为 null。 */
    private Double mean;
    private boolean masked;

    private int submittedCount;
    private int judgeCount;
    private int effectiveCount;

    /**
     * 已提交评分的评委 ID。
     *
     * <p>只暴露「是否提交」这一事实，不含任何分数，因此揭晓前也可以安全下发，
     * 大屏正是用它渲染每位评委的提交状态。</p>
     */
    private java.util.List<Long> submittedJudgeIds = new java.util.ArrayList<Long>();

    private Double highest;
    private Double lowest;
}
