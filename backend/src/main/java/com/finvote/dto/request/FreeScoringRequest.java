package com.finvote.dto.request;

import lombok.Data;

/**
 * 自由打分模式开关。
 */
@Data
public class FreeScoringRequest {

    /** true 进入自由打分（同时取消全部调度并打开评分通道），false 退出自由打分。 */
    private Boolean enabled;
}
