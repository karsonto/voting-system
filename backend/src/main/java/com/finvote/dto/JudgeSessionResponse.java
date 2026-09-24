package com.finvote.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 评委端会话：公开状态 + 该评委自己的数据。
 */
@Data
public class JudgeSessionResponse {

    private long version;
    private long updatedAt;

    private CompetitionView competition;
    private List<DimensionView> dimensions;
    private List<ProjectView> projects;

    private JudgeView judge;
    /** 该评委当前评审的项目。 */
    private ProjectView currentProject;

    /** 该评委已提交的评分单，key = 项目 ID。 */
    private Map<Long, ScoreView> myScores;
    /** 已提交评分的项目 ID 列表（进度接口用）。 */
    private List<Long> mySubmittedProjectIds;
    private int mySubmittedCount;

    private StatsView stats;
}
