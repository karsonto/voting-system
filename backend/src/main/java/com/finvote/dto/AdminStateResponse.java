package com.finvote.dto;

import lombok.Data;

/**
 * 后台全量状态：后台配置台唯一的读取接口。
 */
@Data
public class AdminStateResponse {

    private long version;
    private long updatedAt;

    private CompetitionView competition;
    private java.util.List<DimensionView> dimensions;
    private java.util.List<ProjectView> projects;
    private java.util.List<JudgeAdminView> judges;
    /** 全部评分单（含逐维度得分）。 */
    private java.util.List<ScoreView> scores;
    private java.util.List<BoardRowView> board;
    private StatsView stats;

    private String currentUsername;
    private String currentDisplayName;
}
