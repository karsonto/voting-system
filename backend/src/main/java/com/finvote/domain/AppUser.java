package com.finvote.domain;

import lombok.Data;

/**
 * 后台账号。
 */
@Data
public class AppUser {

    private Long id;
    private String username;
    private String passwordHash;
    private String displayName;
    private String role;
    private boolean enabled;
    private long createdAt;
}
