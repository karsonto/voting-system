package com.finvote.dto.request;

import lombok.Data;

/**
 * 批量调整规模：把项目数 / 评委数调整到指定值（不足则补占位条目，超出则删除末尾条目）。
 */
@Data
public class ScaleRequest {

    private Integer projectCount;
    private Integer judgeCount;
}
