package com.finvote.controller;

import com.finvote.domain.Judge;
import com.finvote.domain.ScoreEntry;
import com.finvote.dto.JudgeSessionResponse;
import com.finvote.dto.ScoreView;
import com.finvote.dto.request.ScoreSubmitRequest;
import com.finvote.security.AuthContext;
import com.finvote.security.RequiresAuth;
import com.finvote.security.TokenPayload;
import com.finvote.service.JudgeService;
import com.finvote.service.ScoringService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 评委端接口，需要评委令牌。
 */
@RestController
@RequestMapping("/api/judge")
@RequiresAuth(roles = TokenPayload.ROLE_JUDGE)
public class JudgeController {

    private final JudgeService judgeService;
    private final ScoringService scoringService;

    public JudgeController(JudgeService judgeService, ScoringService scoringService) {
        this.judgeService = judgeService;
        this.scoringService = scoringService;
    }

    /** 评委端会话：当前评审项目、维度权重、我的评分进度。 */
    @GetMapping("/session")
    public JudgeSessionResponse session() {
        Judge judge = judgeService.require(currentJudgeId());
        return judgeService.session(judge);
    }

    /** 提交或更新一份评分。 */
    @PostMapping("/scores")
    public Map<String, Object> submit(@Valid @RequestBody ScoreSubmitRequest request) {
        Judge judge = judgeService.require(currentJudgeId());
        ScoreEntry entry = scoringService.submit(judge, request.getProjectId(), request.getValues(), request.getComment());

        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("success", true);
        body.put("scoreId", entry.getId());
        body.put("weightedTotal", Math.round(entry.getWeightedTotal() * 100d) / 100d);
        return body;
    }

    /**
     * 轻量进度接口。
     *
     * <p>评委端在主循环里频繁调用它检查「是否被调度到新项目」，
     * 返回内容比 {@link #session()} 小得多。</p>
     */
    @GetMapping("/progress")
    public Map<String, Object> progress() {
        Judge judge = judgeService.require(currentJudgeId());
        JudgeSessionResponse session = judgeService.session(judge);

        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("version", session.getVersion());
        body.put("open", session.getCompetition().isOpen());
        body.put("currentProjectId", judge.getCurrentProjectId());
        body.put("currentProjectName",
                session.getCurrentProject() == null ? null : session.getCurrentProject().getName());
        body.put("submittedCount", session.getMySubmittedCount());
        body.put("projectCount", session.getProjects() == null ? 0 : session.getProjects().size());
        body.put("mySubmittedProjectIds", session.getMySubmittedProjectIds());
        return body;
    }

    /** 我的全部评分明细。 */
    @GetMapping("/scores")
    public Map<Long, ScoreView> myScores() {
        return judgeService.session(judgeService.require(currentJudgeId())).getMyScores();
    }

    private Long currentJudgeId() {
        TokenPayload payload = AuthContext.get();
        return payload == null ? null : payload.getSubjectId();
    }
}
