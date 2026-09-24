package com.finvote.dto;

import lombok.Data;

/**
 * 项目视图，附带评分进度。
 */
@Data
public class ProjectView {

    private Long id;
    private String name;
    private String team;
    private String track;
    private int sortOrder;

    /** 已提交评分的评委数。 */
    private int submittedCount;
    /** 当前评委总数。 */
    private int judgeCount;
}
