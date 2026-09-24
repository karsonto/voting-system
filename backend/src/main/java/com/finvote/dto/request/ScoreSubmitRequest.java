package com.finvote.dto.request;

import lombok.Data;

import javax.validation.constraints.NotNull;
import java.util.Map;

/**
 * 评委提交 / 更新一份评分。
 */
@Data
public class ScoreSubmitRequest {

    @NotNull(message = "不能为空")
    private Long projectId;

    /** 维度 ID → 得分。 */
    @NotNull(message = "不能为空")
    private Map<Long, Integer> values;

    private String comment = "";
}
