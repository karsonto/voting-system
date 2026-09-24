package com.finvote.dto.request;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

/**
 * 新增 / 修改参赛项目。
 */
@Data
public class ProjectRequest {

    @NotBlank(message = "不能为空")
    @Size(max = 120, message = "长度不能超过 120")
    private String name;

    @Size(max = 120, message = "长度不能超过 120")
    private String team = "";

    @Size(max = 80, message = "长度不能超过 80")
    private String track = "";
}
