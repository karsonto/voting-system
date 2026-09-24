package com.finvote.dto.request;

import lombok.Data;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

/**
 * 新增 / 修改评分维度。
 */
@Data
public class DimensionRequest {

    @NotBlank(message = "不能为空")
    @Size(max = 40, message = "长度不能超过 40")
    private String name;

    @NotNull(message = "不能为空")
    @Min(value = 0, message = "不能小于 0")
    @Max(value = 100, message = "不能大于 100")
    private Integer weight;
}
