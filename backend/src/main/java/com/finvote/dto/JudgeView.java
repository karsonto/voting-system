package com.finvote.dto;

import lombok.Data;

/**
 * 评委视图（公开）：不含 PIN。
 */
@Data
public class JudgeView {

    private Long id;
    private String name;
    private String org;
    private Long currentProjectId;
    private int sortOrder;
    private boolean active;
}
