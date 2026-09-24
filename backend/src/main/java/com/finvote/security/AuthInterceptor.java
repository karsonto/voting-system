package com.finvote.security;

import com.finvote.common.ApiException;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Arrays;

/**
 * 鉴权拦截器：处理 {@link RequiresAuth} 注解。
 *
 * 前端通过 {@code X-Auth-Token} 请求头携带令牌（大屏与评委端的轮询也走同一个头）。
 */
public class AuthInterceptor implements HandlerInterceptor {

    public static final String TOKEN_HEADER = "X-Auth-Token";

    private final TokenService tokenService;

    public AuthInterceptor(TokenService tokenService) {
        this.tokenService = tokenService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }
        HandlerMethod method = (HandlerMethod) handler;
        RequiresAuth annotation = method.getMethodAnnotation(RequiresAuth.class);
        if (annotation == null) {
            annotation = method.getBeanType().getAnnotation(RequiresAuth.class);
        }
        if (annotation == null) {
            return true;
        }

        TokenPayload payload = tokenService.verify(request.getHeader(TOKEN_HEADER));
        String[] roles = annotation.roles();
        if (roles.length > 0 && !Arrays.asList(roles).contains(payload.getRole())) {
            throw ApiException.forbidden("当前账号无权访问该接口");
        }
        AuthContext.set(payload);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        AuthContext.clear();
    }
}
