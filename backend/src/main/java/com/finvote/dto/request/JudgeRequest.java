package com.finvote.dto.request;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

/**
 * 新增 / 修改评委。
 */
@Data
public class JudgeRequest {

    @NotBlank(message = "不能为空")
    @Size(max = 40, message = "长度不能超过 40")
    private String name;

    @Size(max = 120, message = "长度不能超过 120")
    private String org = "";

    @NotBlank(message = "不能为空")
    @Pattern(regexp = "\\d{4}", message = "必须为 4 位数字")
    private String pin;

    private Boolean active;
}
