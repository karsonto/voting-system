package com.finvote.security;

/**
 * 令牌载荷。
 */
public class TokenPayload {

    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_JUDGE = "JUDGE";

    private final String role;
    private final Long subjectId;
    private final String name;
    private final long expiresAt;

    public TokenPayload(String role, Long subjectId, String name, long expiresAt) {
        this.role = role;
        this.subjectId = subjectId;
        this.name = name;
        this.expiresAt = expiresAt;
    }

    public String getRole() {
        return role;
    }

    public Long getSubjectId() {
        return subjectId;
    }

    public String getName() {
        return name;
    }

    public long getExpiresAt() {
        return expiresAt;
    }

    public boolean isAdmin() {
        return ROLE_ADMIN.equals(role);
    }

    public boolean isJudge() {
        return ROLE_JUDGE.equals(role);
    }

    public boolean isExpired() {
        return System.currentTimeMillis() > expiresAt;
    }
}
