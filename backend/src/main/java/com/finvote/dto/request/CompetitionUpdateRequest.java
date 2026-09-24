package com.finvote.dto.request;

import lombok.Data;

/**
 * 赛事基本信息与赛制配置。字段为 null 表示不修改。
 */
@Data
public class CompetitionUpdateRequest {

    private String name;
    private String stage;
    /** 评分制式 ID，仅支持 weighted-100。 */
    private String scaleId;
    /** 计分规则 ID。 */
    private String ruleId;
}
