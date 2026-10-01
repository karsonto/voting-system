package com.finvote.config;

import com.finvote.security.AuthInterceptor;
import com.finvote.security.TokenService;
import com.finvote.service.AvatarStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web 层配置：注册鉴权拦截器、静态资源与开发期 CORS。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final TokenService tokenService;
    private final AvatarStorage avatarStorage;
    private final boolean corsEnabled;

    public WebConfig(TokenService tokenService,
                     AvatarStorage avatarStorage,
                     @Value("${finvote.cors-enabled:false}") boolean corsEnabled) {
        this.tokenService = tokenService;
        this.avatarStorage = avatarStorage;
        this.corsEnabled = corsEnabled;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor(tokenService))
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/public/**");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (!corsEnabled) {
            return;
        }
        // 仅在前后端分离调试时开启：finvote.cors-enabled=true
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = avatarStorage.directory().toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/avatars/**").addResourceLocations(location);
        // 前端为 history 路由，其余路径统一交给 index.html
        registry.addResourceHandler("/**").addResourceLocations("classpath:/static/");
    }
}
