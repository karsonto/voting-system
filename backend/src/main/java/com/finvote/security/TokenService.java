package com.finvote.security;

import com.finvote.common.ApiException;
import com.finvote.config.FinVoteProperties;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * 轻量级无状态令牌：base64url(payload) + "." + base64url(HMAC-SHA256(payload))。
 *
 * 之所以不引入 Spring Security / JWT 库，是因为本系统只有「管理员」和「评委」两种角色，
 * 且令牌仅在同一台机器上的前后端之间使用，自签自验足够，同时避免了额外的依赖负担。
 */
@Component
public class TokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SEPARATOR = ".";
    private static final String FIELD_SEPARATOR = "\u0001";

    private final FinVoteProperties properties;
    private final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
    private final Base64.Decoder decoder = Base64.getUrlDecoder();

    public TokenService(FinVoteProperties properties) {
        this.properties = properties;
    }

    public String issueAdminToken(Long userId, String username, String displayName) {
        long expiresAt = System.currentTimeMillis() + properties.getAdminTokenMinutes() * 60_000L;
        return issue(TokenPayload.ROLE_ADMIN, userId, displayName == null || displayName.isEmpty() ? username : displayName,
                expiresAt);
    }

    public String issueJudgeToken(Long judgeId, String judgeName) {
        long expiresAt = System.currentTimeMillis() + properties.getJudgeTokenMinutes() * 60_000L;
        return issue(TokenPayload.ROLE_JUDGE, judgeId, judgeName, expiresAt);
    }

    private String issue(String role, Long subjectId, String name, long expiresAt) {
        String payload = role + FIELD_SEPARATOR + subjectId + FIELD_SEPARATOR + name + FIELD_SEPARATOR + expiresAt;
        byte[] payloadBytes = payload.getBytes(StandardCharsets.UTF_8);
        byte[] signature = sign(payloadBytes);
        return encoder.encodeToString(payloadBytes) + SEPARATOR + encoder.encodeToString(signature);
    }

    /**
     * 校验并解析令牌。
     *
     * @throws ApiException 令牌缺失、格式错误、签名不匹配或已过期
     */
    public TokenPayload verify(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw ApiException.unauthorized("缺少访问令牌，请先登录");
        }
        String[] parts = token.trim().split("\\" + SEPARATOR);
        if (parts.length != 2) {
            throw ApiException.unauthorized("访问令牌格式不正确");
        }
        byte[] payloadBytes;
        byte[] signature;
        try {
            payloadBytes = decoder.decode(parts[0]);
            signature = decoder.decode(parts[1]);
        } catch (IllegalArgumentException ex) {
            throw ApiException.unauthorized("访问令牌格式不正确");
        }
        if (!MessageDigest.isEqual(sign(payloadBytes), signature)) {
            throw ApiException.unauthorized("访问令牌签名校验失败");
        }
        String[] fields = new String(payloadBytes, StandardCharsets.UTF_8).split(FIELD_SEPARATOR, -1);
        if (fields.length != 4) {
            throw ApiException.unauthorized("访问令牌内容不完整");
        }
        TokenPayload payload;
        try {
            payload = new TokenPayload(fields[0], Long.valueOf(fields[1]), fields[2], Long.parseLong(fields[3]));
        } catch (NumberFormatException ex) {
            throw ApiException.unauthorized("访问令牌内容不合法");
        }
        if (payload.isExpired()) {
            throw ApiException.unauthorized("登录已过期，请重新登录");
        }
        return payload;
    }

    private byte[] sign(byte[] payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(properties.getSecret().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return mac.doFinal(payload);
        } catch (Exception ex) {
            throw new IllegalStateException("令牌签名失败", ex);
        }
    }
}
