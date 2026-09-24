package com.finvote.dto.request;

import lombok.Data;

/**
 * 现场开关。
 */
@Data
public class SwitchUpdateRequest {

    /** 评分通道是否开放。 */
    private Boolean open;
    /** 大屏是否揭晓结果。 */
    private Boolean revealed;
}
