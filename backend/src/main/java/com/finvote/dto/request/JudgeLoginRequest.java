package com.finvote.dto.request;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 评委登录：凭姓名对应的评委 ID（或姓名）+ 4 位 PIN。
 */
@Data
public class JudgeLoginRequest {

    /** 优先按 ID 匹配；为空时按姓名匹配。 */
    private Long judgeId;

    private String name;

    @NotBlank(message = "不能为空")
    private String pin;
}
