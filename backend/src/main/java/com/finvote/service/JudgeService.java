package com.finvote.service;

import com.finvote.common.ApiException;
import com.finvote.domain.Competition;
import com.finvote.domain.Dimension;
import com.finvote.domain.Judge;
import com.finvote.domain.Project;
import com.finvote.domain.ScoreEntry;
import com.finvote.dto.JudgeSessionResponse;
import com.finvote.dto.ProjectView;
import com.finvote.dto.ScoreView;
import com.finvote.repository.ScoreRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 评委端服务：身份核对 + 会话数据组装。
 */
@Service
public class JudgeService {

    private final StateAssembler stateAssembler;
    private final CompetitionService competitionService;
    private final ScoreRepository scoreRepository;

    public JudgeService(StateAssembler stateAssembler,
                        CompetitionService competitionService,
                        ScoreRepository scoreRepository) {
        this.stateAssembler = stateAssembler;
        this.competitionService = competitionService;
        this.scoreRepository = scoreRepository;
    }

    /**
     * 评委登录校验：按 ID 或姓名定位评委并核对 PIN。
     *
     * @return 通过校验的评委
     * @throws ApiException 未找到评委、账号停用或 PIN 不正确
     */
    public Judge authenticate(Long judgeId, String name, String pin) {
        Competition competition = competitionService.current();
        List<Judge> judges = stateAssembler.loadJudges(competition.getId());

        Judge target = null;
        if (judgeId != null) {
            for (Judge j : judges) {
                if (j.getId().equals(judgeId)) {
                    target = j;
                    break;
                }
            }
        } else if (name != null && !name.trim().isEmpty()) {
            String wanted = name.trim();
            for (Judge j : judges) {
                if (j.getName().equalsIgnoreCase(wanted)) {
                    target = j;
                    break;
                }
            }
        }
        if (target == null) {
            throw ApiException.unauthorized("未找到该评委，请与组委会核对名单");
        }
        if (!target.isActive()) {
            throw ApiException.forbidden("该评委账号已停用，请联系组委会");
        }
        if (pin == null || !target.getPin().equals(pin.trim())) {
            throw ApiException.unauthorized("PIN 码不正确，请重新输入");
        }
        return target;
    }

    /** 评委当前有效的评委信息；账号被删除时抛出 401 让前端退回登入页。 */
    public Judge require(Long judgeId) {
        Competition competition = competitionService.current();
        for (Judge j : stateAssembler.loadJudges(competition.getId())) {
            if (j.getId().equals(judgeId)) {
                if (!j.isActive()) {
                    throw ApiException.forbidden("该评委账号已停用，请联系组委会");
                }
                return j;
            }
        }
        throw ApiException.unauthorized("评委账号已失效，请重新登录");
    }

    /** 组装评委端会话。 */
    public JudgeSessionResponse session(Judge judge) {
        Competition competition = competitionService.current();
        List<Dimension> dimensions = stateAssembler.loadDimensions(competition.getId());
        List<Project> projects = stateAssembler.loadProjects(competition.getId());
        List<Judge> judges = stateAssembler.loadJudges(competition.getId());
        List<ScoreEntry> entries = stateAssembler.loadScores(competition.getId());

        Map<Long, Project> projectIndex = stateAssembler.indexProjects(projects);
        Map<Long, Judge> judgeIndex = stateAssembler.indexJudges(judges);
        Map<Long, Map<Long, Integer>> items = scoreRepository.findAllItems(competition.getId());
        Map<Long, Integer> submittedByProject = stateAssembler.submittedCountByProject(entries);

        JudgeSessionResponse response = new JudgeSessionResponse();
        response.setVersion(competitionService.version());
        response.setUpdatedAt(competition.getUpdatedAt());
        response.setCompetition(stateAssembler.toView(competition, dimensions));
        response.setDimensions(stateAssembler.dimensions(dimensions));
        response.setProjects(stateAssembler.projects(projects, submittedByProject, judges.size()));
        response.setJudge(stateAssembler.judgeView(judge));
        response.setStats(stateAssembler.stats(projects, judges, entries, competition.rule()));

        Project current = judge.getCurrentProjectId() == null
                ? null : projectIndex.get(judge.getCurrentProjectId());
        if (current != null) {
            ProjectView view = new ProjectView();
            view.setId(current.getId());
            view.setName(current.getName());
            view.setTeam(current.getTeam());
            view.setTrack(current.getTrack());
            view.setSortOrder(current.getSortOrder());
            view.setJudgeCount(judges.size());
            view.setSubmittedCount(submittedByProject.getOrDefault(current.getId(), 0));
            response.setCurrentProject(view);
        }

        Map<Long, ScoreView> myScores = new LinkedHashMap<Long, ScoreView>();
        for (ScoreEntry entry : entries) {
            if (!entry.getJudgeId().equals(judge.getId())) {
                continue;
            }
            myScores.put(entry.getProjectId(),
                    stateAssembler.scoreView(entry, items.get(entry.getId()), projectIndex, judgeIndex));
        }
        response.setMyScores(myScores);
        response.setMySubmittedProjectIds(new java.util.ArrayList<Long>(myScores.keySet()));
        response.setMySubmittedCount(myScores.size());
        return response;
    }

    /** 生成随机 4 位 PIN，供后台新增评委时预填。 */
    public String randomPin() {
        return String.format("%04d", 1000 + (int) (Math.random() * 8999));
    }
}
