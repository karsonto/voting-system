package com.finvote.dto.request;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 后台管理员登录。
 */
@Data
public class AdminLoginRequest {

    @NotBlank(message = "不能为空")
    private String username;

    @NotBlank(message = "不能为空")
    private String password;
}
