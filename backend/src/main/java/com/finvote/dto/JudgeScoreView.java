package com.finvote.dto;

import lombok.Data;

/**
 * 当前项目上一位评委的得分，供现场大屏展示评委卡片。
 * 尚未提交时 {@code score} 为 null。
 */
@Data
public class JudgeScoreView {

    private Long judgeId;
    private String name;
    private String org;
    private Double score;
    /** 头像访问路径，未上传时为 null。 */
    private String avatar;
}
