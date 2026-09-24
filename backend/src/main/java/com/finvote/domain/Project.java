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
    private int sortOrder;
}
