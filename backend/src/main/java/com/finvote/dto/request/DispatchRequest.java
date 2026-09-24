package com.finvote.dto.request;

import lombok.Data;

/**
 * 评委调度：把某位（或全部）评委切换到指定项目。
 */
@Data
public class DispatchRequest {

    /** 目标项目 ID；传 null 表示取消分配（仅在 judgeIds 未指定时生效）。 */
    private Long projectId;

    /** 待调度的评委；为空表示全部评委。 */
    private java.util.List<Long> judgeIds;
}
