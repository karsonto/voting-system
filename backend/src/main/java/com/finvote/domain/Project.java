package com.finvote.domain;

import lombok.Data;

/**
 * 参赛项目。
 */
@Data
public class Project {

    private Long id;
    private Long competitionId;
    private String name;
    private String team;
    private String track;
    /** 导师姓名，可空。 */
    private String mentor;
    private int sortOrder;
}
