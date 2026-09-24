package com.finvote.security;

/**
 * 把当前请求的令牌载荷放进 ThreadLocal，供 Controller 读取当前登录者。
 */
public final class AuthContext {

    private static final ThreadLocal<TokenPayload> HOLDER = new ThreadLocal<TokenPayload>();

    private AuthContext() {
    }

    public static void set(TokenPayload payload) {
        HOLDER.set(payload);
    }

    public static TokenPayload get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }
}
