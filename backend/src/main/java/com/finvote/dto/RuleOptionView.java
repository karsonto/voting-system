package com.finvote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 评分制式 / 计分规则的可选项，供后台配置台渲染选项卡。
 */
@Data
@AllArgsConstructor
public class RuleOptionView {

    private String id;
    private String label;
    private String description;
    /** 是否已被系统实际支持（未支持的项前端置灰并给出提示）。 */
    private boolean supported;
}
