package com.finvote.controller;

import com.finvote.domain.Competition;
import com.finvote.domain.Dimension;
import com.finvote.domain.Judge;
import com.finvote.domain.Project;
import com.finvote.domain.ScoreEntry;
import com.finvote.dto.PublicStateResponse;
import com.finvote.dto.VersionResponse;
import com.finvote.service.CompetitionService;
import com.finvote.service.StateAssembler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 无需鉴权的公开接口：大屏、评委端登录页、总览页使用。
 *
 * <p>这里刻意不返回 PIN、不返回未揭晓的分数——脱敏规则统一在
 * {@link StateAssembler} 内实现，避免各接口各写一份。</p>
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final CompetitionService competitionService;
    private final StateAssembler stateAssembler;

    public PublicController(CompetitionService competitionService, StateAssembler stateAssembler) {
        this.competitionService = competitionService;
        this.stateAssembler = stateAssembler;
    }

    /** 轻量版本号：前端按 1~2 秒的频率轮询，只有版本变化时才拉全量。 */
    @GetMapping("/version")
    public VersionResponse version() {
        return new VersionResponse(competitionService.version(), competitionService.updatedAt());
    }

    /** 全量公开状态。 */
    @GetMapping("/state")
    public PublicStateResponse state() {
        Competition competition = competitionService.current();
        Long id = competition.getId();
        List<Dimension> dimensions = stateAssembler.loadDimensions(id);
        List<Project> projects = stateAssembler.loadProjects(id);
        List<Judge> judges = stateAssembler.loadJudges(id);
        List<ScoreEntry> entries = stateAssembler.loadScores(id);

        return stateAssembler.publicState(competition, dimensions, projects, judges, entries,
                competitionService.version());
    }

    /** 评委名单（仅姓名与机构），评委端登录下拉框使用。 */
    @GetMapping("/judges")
    public List<com.finvote.dto.JudgeView> judges() {
        return stateAssembler.judges(stateAssembler.loadJudges(competitionService.currentId()));
    }

    /** 项目列表（含提交进度）。 */
    @GetMapping("/projects")
    public List<com.finvote.dto.ProjectView> projects() {
        Long id = competitionService.currentId();
        List<Judge> judges = stateAssembler.loadJudges(id);
        List<ScoreEntry> entries = stateAssembler.loadScores(id);
        return stateAssembler.projects(stateAssembler.loadProjects(id),
                stateAssembler.submittedCountByProject(entries), judges.size());
    }
}
