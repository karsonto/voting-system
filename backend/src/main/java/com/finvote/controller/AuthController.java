package com.finvote.controller;

import com.finvote.common.ApiException;
import com.finvote.domain.AppUser;
import com.finvote.domain.Competition;
import com.finvote.dto.request.AdminLoginRequest;
import com.finvote.dto.request.ChangePasswordRequest;
import com.finvote.dto.request.JudgeLoginRequest;
import com.finvote.security.AuthContext;
import com.finvote.security.RequiresAuth;
import com.finvote.security.TokenPayload;
import com.finvote.security.TokenService;
import com.finvote.service.AdminUserService;
import com.finvote.service.CompetitionService;
import com.finvote.service.JudgeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 登录相关接口。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AdminUserService adminUserService;
    private final JudgeService judgeService;
    private final TokenService tokenService;
    private final CompetitionService competitionService;

    public AuthController(AdminUserService adminUserService,
                          JudgeService judgeService,
                          TokenService tokenService,
                          CompetitionService competitionService) {
        this.adminUserService = adminUserService;
        this.judgeService = judgeService;
        this.tokenService = tokenService;
        this.competitionService = competitionService;
    }

    /** 后台管理员登录。 */
    @PostMapping("/admin/login")
    public Map<String, Object> adminLogin(@Valid @RequestBody AdminLoginRequest request) {
        AppUser user = adminUserService.authenticate(request.getUsername(), request.getPassword());
        String token = tokenService.issueAdminToken(user.getId(), user.getUsername(), user.getDisplayName());

        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("token", token);
        body.put("username", user.getUsername());
        body.put("displayName", user.getDisplayName());
        body.put("role", user.getRole());
        body.put("usingDefaultPassword", adminUserService.usingDefaultPassword(user));
        return body;
    }

    /** 评委登录：凭工号对应的评委 + PIN。 */
    @PostMapping("/judge/login")
    public Map<String, Object> judgeLogin(@Valid @RequestBody JudgeLoginRequest request) {
        com.finvote.domain.Judge judge = judgeService.authenticate(request.getJudgeId(), request.getName(), request.getPin());
        String token = tokenService.issueJudgeToken(judge.getId(), judge.getName());

        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("token", token);
        body.put("judgeId", judge.getId());
        body.put("name", judge.getName());
        body.put("org", judge.getOrg());
        body.put("role", TokenPayload.ROLE_JUDGE);
        return body;
    }

    /** 校验令牌是否仍然有效（前端启动时用它判断是否需要跳回登录页）。 */
    @GetMapping("/me")
    @RequiresAuth
    public Map<String, Object> me() {
        TokenPayload payload = AuthContext.get();
        if (payload == null) {
            throw ApiException.unauthorized("未登录");
        }
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("role", payload.getRole());
        body.put("subjectId", payload.getSubjectId());
        body.put("name", payload.getName());
        if (payload.isAdmin()) {
            AppUser user = adminUserService.require(payload.getSubjectId());
            body.put("username", user.getUsername());
            body.put("displayName", user.getDisplayName());
            body.put("usingDefaultPassword", adminUserService.usingDefaultPassword(user));
        }
        return body;
    }

    /** 退出登录：令牌无状态，前端清掉本地存储即可，这里只做一次记录。 */
    @PostMapping("/logout")
    @RequiresAuth
    public Map<String, Object> logout() {
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("success", true);
        return body;
    }

    /** 修改管理员密码。 */
    @PostMapping("/admin/password")
    @RequiresAuth(roles = TokenPayload.ROLE_ADMIN)
    public Map<String, Object> changePassword(@RequestBody ChangePasswordRequest request) {
        TokenPayload payload = AuthContext.get();
        if (payload == null || !payload.isAdmin()) {
            throw ApiException.forbidden("仅管理员可修改密码");
        }
        adminUserService.changePassword(payload.getSubjectId(), request.getCurrentPassword(), request.getNewPassword());
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("success", true);
        return body;
    }

    /**
     * 登录页需要的赛事上下文（赛事名、环节、评分通道是否开放）。
     *
     * <p>刻意设计为无需鉴权：登录页在拿到令牌之前就要展示赛事名称。</p>
     */
    @GetMapping("/context")
    public Map<String, Object> context() {
        Competition competition = competitionService.current();
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("competitionName", competition.getName());
        body.put("stage", competition.getStage());
        body.put("open", competition.isOpen());
        return body;
    }
}
