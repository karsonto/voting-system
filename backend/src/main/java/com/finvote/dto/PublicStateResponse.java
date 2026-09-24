package com.finvote.dto;

import lombok.Data;

/**
 * 公开状态：评委端与大屏都从这里取数据。
 */
@Data
public class PublicStateResponse {

    private long version;
    private long updatedAt;

    private CompetitionView competition;
    private java.util.List<DimensionView> dimensions;
    private java.util.List<ProjectView> projects;
    /** 评委名单（不含 PIN），大屏用其展示提交状态、评委端用它渲染登入下拉框。 */
    private java.util.List<JudgeView> judges;
    private java.util.List<BoardRowView> board;
    /** 当前「正在评审」的项目，即大多数评委被调度到的项目。 */
    private Long currentProjectId;
    /** 评委是否全部被调度到同一个项目。 */
    private boolean judgesAligned;
    private StatsView stats;
}
