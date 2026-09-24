package com.finvote.dto.request;

import lombok.Data;

/**
 * 修改管理员密码。
 */
@Data
public class ChangePasswordRequest {

    private String currentPassword;
    private String newPassword;
}
