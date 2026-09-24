package com.finvote.domain;

import lombok.Data;

/**
 * 评委。
 *
 * {@code currentProjectId} 即设计稿中「当前评审项目」，由后台配置台实时调度。
 */
@Data
public class Judge {

    private Long id;
    private Long competitionId;
    private String name;
    private String org;
    /** 4 位数字 PIN，仅用于现场身份核对。 */
    private String pin;
    private Long currentProjectId;
    private int sortOrder;
    private boolean active;
}
