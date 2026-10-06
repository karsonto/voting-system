package com.finvote.dto.request;

import lombok.Data;

/**
 * 倒计时控制请求。
 *
 * <p>minutes：倒计时时长（分钟），0 表示清除配置。</p>
 * <p>action：start（开始倒计时）/ pause（暂停）/ reset（重置）。</p>
 */
@Data
public class CountdownRequest {

    private Integer minutes;
    private String action;
}
