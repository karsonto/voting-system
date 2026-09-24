package com.finvote.controller;

import com.finvote.domain.Competition;
import com.finvote.domain.Dimension;
import com.finvote.domain.Judge;
import com.finvote.domain.Project;
import com.finvote.domain.ScoreEntry;
import com.finvote.dto.AdminStateResponse;
import com.finvote.dto.ScoreView;
import com.finvote.dto.request.CompetitionUpdateRequest;
import com.finvote.dto.request.DimensionRequest;
import com.finvote.dto.request.DispatchRequest;
import com.finvote.dto.request.JudgeRequest;
import com.finvote.dto.request.ProjectRequest;
import com.finvote.dto.request.ScaleRequest;
import com.finvote.dto.request.SwitchUpdateRequest;
import com.finvote.security.AuthContext;
import com.finvote.security.RequiresAuth;
import com.finvote.security.TokenPayload;
import com.finvote.service.AdminService;
import com.finvote.service.AdminUserService;
import com.finvote.service.CompetitionService;
import com.finvote.service.ScoringService;
import com.finvote.service.StateAssembler;
import com.finvote.service.JudgeService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 后台配置台接口，全部需要管理员令牌。
 */
@RestController
@RequestMapping("/api/admin")
@RequiresAuth(roles = TokenPayload.ROLE_ADMIN)
public class AdminController {

    private final AdminService adminService;
    private final CompetitionService competitionService;
    private final StateAssembler stateAssembler;
    private final ScoringService scoringService;
    private final JudgeService judgeService;
    private final AdminUserService adminUserService;

    public AdminController(AdminService adminService,
                           CompetitionService competitionService,
                           StateAssembler stateAssembler,
                           ScoringService scoringService,
                           JudgeService judgeService,
                           AdminUserService adminUserService) {
        this.adminService = adminService;
        this.competitionService = competitionService;
        this.stateAssembler = stateAssembler;
        this.scoringService = scoringService;
        this.judgeService = judgeService;
        this.adminUserService = adminUserService;
    }

    /** 后台全量状态：一次请求拿到配置台需要的所有数据。 */
    @GetMapping("/state")
    public AdminStateResponse state() {
        TokenPayload payload = AuthContext.get();
        com.finvote.domain.AppUser user = payload == null ? null : adminUserService.require(payload.getSubjectId());

        Competition competition = competitionService.current();
        Long id = competition.getId();

        List<Dimension> dimensions = stateAssembler.loadDimensions(id);
        List<Project> projects = stateAssembler.loadProjects(id);
        List<Judge> judges = stateAssembler.loadJudges(id);
        List<ScoreEntry> entries = stateAssembler.loadScores(id);

        return stateAssembler.adminState(competition, dimensions, projects, judges, entries,
                competitionService.version(),
                user == null ? null : user.getUsername(),
                user == null ? null : user.getDisplayName());
    }

    // -------------------------------------------------------------- 赛制

    @PutMapping("/competition")
    public Map<String, Object> updateCompetition(@RequestBody CompetitionUpdateRequest request) {
        adminService.updateCompetition(request.getName(), request.getStage(),
                request.getScaleId(), request.getRuleId());
        return ok();
    }

    @PutMapping("/switches")
    public Map<String, Object> updateSwitches(@RequestBody SwitchUpdateRequest request) {
        adminService.updateSwitches(request.getOpen(), request.getRevealed());
        return ok();
    }

    // -------------------------------------------------------------- 维度

    @PostMapping("/dimensions")
    public Map<String, Object> addDimension(@Valid @RequestBody DimensionRequest request) {
        Long id = adminService.addDimension(request);
        Map<String, Object> body = ok();
        body.put("id", id);
        return body;
    }

    @PutMapping("/dimensions/{id}")
    public Map<String, Object> updateDimension(@PathVariable Long id, @Valid @RequestBody DimensionRequest request) {
        adminService.updateDimension(id, request);
        return ok();
    }

    @DeleteMapping("/dimensions/{id}")
    public Map<String, Object> deleteDimension(@PathVariable Long id) {
        adminService.deleteDimension(id);
        return ok();
    }

    // -------------------------------------------------------------- 项目

    @PostMapping("/projects")
    public Map<String, Object> addProject(@Valid @RequestBody ProjectRequest request) {
        Long id = adminService.addProject(request);
        Map<String, Object> body = ok();
        body.put("id", id);
        return body;
    }

    @PutMapping("/projects/{id}")
    public Map<String, Object> updateProject(@PathVariable Long id, @Valid @RequestBody ProjectRequest request) {
        adminService.updateProject(id, request);
        return ok();
    }

    @DeleteMapping("/projects/{id}")
    public Map<String, Object> deleteProject(@PathVariable Long id) {
        adminService.deleteProject(id);
        return ok();
    }

    // -------------------------------------------------------------- 评委

    @PostMapping("/judges")
    public Map<String, Object> addJudge(@Valid @RequestBody JudgeRequest request) {
        Long id = adminService.addJudge(request);
        Map<String, Object> body = ok();
        body.put("id", id);
        return body;
    }

    @PutMapping("/judges/{id}")
    public Map<String, Object> updateJudge(@PathVariable Long id, @Valid @RequestBody JudgeRequest request) {
        adminService.updateJudge(id, request);
        return ok();
    }

    @DeleteMapping("/judges/{id}")
    public Map<String, Object> deleteJudge(@PathVariable Long id) {
        adminService.deleteJudge(id);
        return ok();
    }

    /** 随机 PIN，供新增评委表单预填。 */
    @GetMapping("/judges/random-pin")
    public Map<String, Object> randomPin() {
        Map<String, Object> body = ok();
        body.put("pin", judgeService.randomPin());
        return body;
    }

    // -------------------------------------------------------------- 调度

    @PostMapping("/dispatch")
    public Map<String, Object> dispatch(@RequestBody DispatchRequest request) {
        adminService.dispatch(request.getJudgeIds(), request.getProjectId());
        return ok();
    }

    @PostMapping("/dispatch/next")
    public Map<String, Object> dispatchToNext() {
        Long projectId = adminService.dispatchToNextProject();
        Map<String, Object> body = ok();
        body.put("projectId", projectId);
        return body;
    }

    /** 清空某位评委对某个项目的评分。 */
    @DeleteMapping("/scores/{judgeId}/{projectId}")
    public Map<String, Object> clearScore(@PathVariable Long judgeId, @PathVariable Long projectId) {
        scoringService.clearByJudgeAndProject(judgeId, projectId);
        return ok();
    }

    /** 查询某位评委对某个项目的评分明细。 */
    @GetMapping("/scores/{judgeId}/{projectId}")
    public ScoreView scoreDetail(@PathVariable Long judgeId, @PathVariable Long projectId) {
        return stateAssembler.findScore(competitionService.currentId(), judgeId, projectId);
    }

    /** 清空全部评分。 */
    @DeleteMapping("/scores")
    public Map<String, Object> clearAllScores() {
        adminService.clearScores();
        return ok();
    }

    // -------------------------------------------------------------- 批量

    @PostMapping("/scale")
    public Map<String, Object> applyScale(@RequestBody ScaleRequest request) {
        adminService.applyScale(request.getProjectCount(), request.getJudgeCount());
        return ok();
    }

    /** 重置为空白配置（保留管理员账号）。 */
    @PostMapping("/reset")
    public Map<String, Object> reset() {
        adminService.resetAll();
        return ok();
    }

    private Map<String, Object> ok() {
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("success", true);
        body.put("version", competitionService.version());
        return body;
    }
}
