package com.finvote.dto;

import lombok.Data;

/**
 * 评委视图（后台）：含 PIN 与当前项目的提交状态。
 */
@Data
public class JudgeAdminView {

    private Long id;
    private String name;
    private String org;
    private String pin;
    private Long currentProjectId;
    private int sortOrder;
    private boolean active;

    /** 该评委当前项目是否已提交评分。 */
    private boolean submittedOnCurrent;
    /** 该评委已提交评分的项目数。 */
    private int submittedCount;
}
