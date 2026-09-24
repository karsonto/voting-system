package com.finvote.service;

import com.finvote.common.ApiException;
import com.finvote.domain.AppUser;
import com.finvote.config.FinVoteProperties;
import com.finvote.repository.AppUserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 后台账号服务。
 */
@Service
public class AdminUserService {

    private final AppUserRepository appUserRepository;
    private final FinVoteProperties properties;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AdminUserService(AppUserRepository appUserRepository, FinVoteProperties properties) {
        this.appUserRepository = appUserRepository;
        this.properties = properties;
    }

    /**
     * 首次启动时创建默认管理员。
     *
     * <p>仅在库中没有任何账号时执行，不会覆盖已有密码。</p>
     */
    @Transactional
    public void bootstrapIfEmpty() {
        if (appUserRepository.count() > 0) {
            return;
        }
        AppUser user = new AppUser();
        user.setUsername(properties.getBootstrapAdminUsername());
        user.setPasswordHash(passwordEncoder.encode(properties.getBootstrapAdminPassword()));
        user.setDisplayName("赛事管理员");
        user.setRole("ADMIN");
        user.setEnabled(true);
        user.setCreatedAt(System.currentTimeMillis());
        appUserRepository.insert(user);
    }

    public AppUser authenticate(String username, String rawPassword) {
        AppUser user = username == null ? null : appUserRepository.findByUsername(username.trim());
        if (user == null || !user.isEnabled() || !passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw ApiException.unauthorized("账号或密码不正确");
        }
        return user;
    }

    public AppUser require(Long id) {
        AppUser user = appUserRepository.findById(id);
        if (user == null) {
            throw ApiException.unauthorized("账号不存在，请重新登录");
        }
        return user;
    }

    public void changePassword(Long id, String currentPassword, String newPassword) {
        AppUser user = require(id);
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw ApiException.badRequest("当前密码不正确");
        }
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw ApiException.badRequest("新密码至少 6 位");
        }
        appUserRepository.updatePassword(id, passwordEncoder.encode(newPassword.trim()));
    }

    /** 判断是否仍在使用出厂默认密码，用于后台顶部提示。 */
    public boolean usingDefaultPassword(AppUser user) {
        return passwordEncoder.matches(properties.getBootstrapAdminPassword(), user.getPasswordHash());
    }
}
