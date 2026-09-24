package com.finvote.dto;

import lombok.Data;

/**
 * 变更版本：前端高频轮询这个接口，只有版本变化时才去拉全量数据。
 */
@Data
public class VersionResponse {

    private long version;
    private long updatedAt;

    public VersionResponse(long version, long updatedAt) {
        this.version = version;
        this.updatedAt = updatedAt;
    }
}
