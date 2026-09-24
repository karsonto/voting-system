package com.finvote.service;

import com.finvote.common.ApiException;
import com.finvote.domain.Competition;
import com.finvote.domain.Dimension;
import com.finvote.domain.Judge;
import com.finvote.domain.Project;
import com.finvote.domain.ScoreRule;
import com.finvote.domain.ScoreScale;
import com.finvote.domain.ScoreEntry;
import com.finvote.dto.request.DimensionRequest;
import com.finvote.dto.request.JudgeRequest;
import com.finvote.dto.request.ProjectRequest;
import com.finvote.repository.DimensionRepository;
import com.finvote.repository.JudgeRepository;
import com.finvote.repository.ProjectRepository;
import com.finvote.repository.ScoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 后台配置台的写操作。
 *
 * <p>每个写方法结束后都会调用 {@link CompetitionService#touch()} 递增版本号，
 * 评委端与大屏通过轮询版本号感知变更——这是「实时同步」的实现方式。</p>
 */
@Service
public class AdminService {

    private static final int MAX_ROSTER_SIZE = 24;

    private final CompetitionService competitionService;
    private final DimensionRepository dimensionRepository;
    private final ProjectRepository projectRepository;
    private final JudgeRepository judgeRepository;
    private final ScoreRepository scoreRepository;

    public AdminService(CompetitionService competitionService,
                        DimensionRepository dimensionRepository,
                        ProjectRepository projectRepository,
                        JudgeRepository judgeRepository,
                        ScoreRepository scoreRepository) {
        this.competitionService = competitionService;
        this.dimensionRepository = dimensionRepository;
        this.projectRepository = projectRepository;
        this.judgeRepository = judgeRepository;
        this.scoreRepository = scoreRepository;
    }

    // ---------------------------------------------------------------- 赛制

    @Transactional
    public void updateCompetition(String name, String stage, String scaleId, String ruleId) {
        Competition competition = competitionService.current();

        String nextName = competition.getName();
        if (name != null) {
            String trimmed = name.trim();
            if (trimmed.isEmpty()) {
                throw ApiException.badRequest("赛事名称不能为空");
            }
            nextName = trimmed;
        }
        String nextStage = stage == null ? competition.getStage() : stage.trim();

        String nextScaleId = competition.getScaleId();
        if (scaleId != null && !scaleId.trim().isEmpty()) {
            ScoreScale scale = ScoreScale.fromId(scaleId);
            if (!scale.isSupported()) {
                throw ApiException.badRequest("当前版本仅支持「" + ScoreScale.supportedLabel() + "」");
            }
            nextScaleId = scale.getId();
        }

        String nextRuleId = competition.getRuleId();
        if (ruleId != null && !ruleId.trim().isEmpty()) {
            nextRuleId = ScoreRule.fromId(ruleId).getId();
        }

        competitionService.updateBasics(competition.getId(), nextName, nextStage, nextScaleId, nextRuleId);
        competitionService.touch();
    }

    @Transactional
    public void updateSwitches(Boolean open, Boolean revealed) {
        Competition competition = competitionService.current();
        if (open == null && revealed == null) {
            return;
        }
        competitionService.updateSwitches(competition.getId(), open, revealed);
        competitionService.touch();
    }

    // ---------------------------------------------------------------- 维度

    @Transactional
    public Long addDimension(DimensionRequest request) {
        Competition competition = competitionService.current();
        Dimension dimension = new Dimension();
        dimension.setCompetitionId(competition.getId());
        dimension.setName(request.getName().trim());
        dimension.setWeight(request.getWeight());
        dimension.setSortOrder(dimensionRepository.maxSortOrder(competition.getId()) + 1);
        Long id = dimensionRepository.insert(dimension);
        competitionService.touch();
        return id;
    }

    @Transactional
    public void updateDimension(Long id, DimensionRequest request) {
        requireDimension(id);
        dimensionRepository.update(id, request.getName().trim(), request.getWeight(), null);
        competitionService.touch();
    }

    /**
     * 删除维度。
     *
     * <p>已提交的评分单里该维度的得分记录会一并删除，但评分单本身保留，
     * 其加权总分按「剩余维度重新折算」的方式重算，避免出现分数与实际维度不一致。</p>
     */
    @Transactional
    public void deleteDimension(Long id) {
        Competition competition = competitionService.current();
        requireDimension(id);

        List<Dimension> remaining = new ArrayList<Dimension>();
        for (Dimension d : dimensionRepository.findByCompetition(competition.getId())) {
            if (!d.getId().equals(id)) {
                remaining.add(d);
            }
        }
        dimensionRepository.delete(id);
        recalculateAllScores(competition.getId(), remaining);
        competitionService.touch();
    }

    // ---------------------------------------------------------------- 项目

    @Transactional
    public Long addProject(ProjectRequest request) {
        Competition competition = competitionService.current();
        if (projectRepository.count(competition.getId()) >= MAX_ROSTER_SIZE) {
            throw ApiException.badRequest("参赛项目最多 " + MAX_ROSTER_SIZE + " 个");
        }
        Project project = new Project();
        project.setCompetitionId(competition.getId());
        project.setName(request.getName().trim());
        project.setTeam(safe(request.getTeam()));
        project.setTrack(safe(request.getTrack()));
        project.setSortOrder(projectRepository.maxSortOrder(competition.getId()) + 1);
        Long id = projectRepository.insert(project);

        assignUnassignedJudges(competition.getId(), id);
        competitionService.touch();
        return id;
    }

    @Transactional
    public void updateProject(Long id, ProjectRequest request) {
        requireProject(id);
        projectRepository.update(id, request.getName().trim(), safe(request.getTeam()), safe(request.getTrack()), null);
        competitionService.touch();
    }

    @Transactional
    public void deleteProject(Long id) {
        requireProject(id);
        projectRepository.delete(id);
        competitionService.touch();
    }

    // ---------------------------------------------------------------- 评委

    @Transactional
    public Long addJudge(JudgeRequest request) {
        Competition competition = competitionService.current();
        if (judgeRepository.count(competition.getId()) >= MAX_ROSTER_SIZE) {
            throw ApiException.badRequest("评委最多 " + MAX_ROSTER_SIZE + " 位");
        }
        Judge judge = new Judge();
        judge.setCompetitionId(competition.getId());
        judge.setName(request.getName().trim());
        judge.setOrg(safe(request.getOrg()));
        judge.setPin(request.getPin().trim());
        judge.setActive(request.getActive() == null || request.getActive());
        judge.setSortOrder(judgeRepository.maxSortOrder(competition.getId()) + 1);
        judge.setCurrentProjectId(firstProjectId(competition.getId()));
        Long id = judgeRepository.insert(judge);
        competitionService.touch();
        return id;
    }

    @Transactional
    public void updateJudge(Long id, JudgeRequest request) {
        requireJudge(id);
        judgeRepository.update(id, request.getName().trim(), safe(request.getOrg()),
                request.getPin().trim(), request.getActive(), null);
        competitionService.touch();
    }

    @Transactional
    public void deleteJudge(Long id) {
        requireJudge(id);
        judgeRepository.delete(id);
        competitionService.touch();
    }

    // ---------------------------------------------------------------- 调度

    /**
     * 调度评委到指定项目。
     *
     * @param judgeIds  目标评委；为空表示全部评委
     * @param projectId 目标项目；为空表示取消分配
     */
    @Transactional
    public void dispatch(List<Long> judgeIds, Long projectId) {
        Competition competition = competitionService.current();
        if (projectId != null) {
            requireProject(projectId);
        }

        List<Long> targets = new ArrayList<Long>();
        for (Judge judge : judgeRepository.findByCompetition(competition.getId())) {
            if (judgeIds == null || judgeIds.isEmpty() || judgeIds.contains(judge.getId())) {
                targets.add(judge.getId());
            }
        }
        if (targets.isEmpty()) {
            throw ApiException.badRequest("没有可调度的评委");
        }
        if (projectId == null) {
            for (Long id : targets) {
                judgeRepository.updateCurrentProject(id, null, true);
            }
        } else {
            judgeRepository.dispatchAll(targets, projectId);
        }
        competitionService.touch();
    }

    /** 切到下一个项目（按出场顺序循环）。 */
    @Transactional
    public Long dispatchToNextProject() {
        Competition competition = competitionService.current();
        List<Project> projects = projectRepository.findByCompetition(competition.getId());
        if (projects.isEmpty()) {
            throw ApiException.badRequest("还没有参赛项目");
        }
        List<Judge> judges = judgeRepository.findByCompetition(competition.getId());
        Long current = judges.isEmpty() ? null : judges.get(0).getCurrentProjectId();

        int index = -1;
        for (int i = 0; i < projects.size(); i++) {
            if (projects.get(i).getId().equals(current)) {
                index = i;
                break;
            }
        }
        Project next = projects.get((index + 1 + projects.size()) % projects.size());

        List<Long> all = new ArrayList<Long>();
        for (Judge j : judges) {
            all.add(j.getId());
        }
        if (!all.isEmpty()) {
            judgeRepository.dispatchAll(all, next.getId());
        }
        competitionService.touch();
        return next.getId();
    }

    // ---------------------------------------------------------------- 批量操作

    /** 批量调整项目数与评委数。 */
    @Transactional
    public void applyScale(Integer projectCount, Integer judgeCount) {
        Competition competition = competitionService.current();

        if (projectCount != null) {
            int target = clamp(projectCount);
            List<Project> projects = projectRepository.findByCompetition(competition.getId());
            while (projects.size() < target) {
                Project project = new Project();
                project.setCompetitionId(competition.getId());
                project.setName("待命名项目 " + (projects.size() + 1));
                project.setTeam("待填写团队");
                project.setTrack("待定赛道");
                project.setSortOrder(projectRepository.maxSortOrder(competition.getId()) + 1);
                project.setId(projectRepository.insert(project));
                projects.add(project);
            }
            while (projects.size() > target) {
                Project removed = projects.remove(projects.size() - 1);
                projectRepository.delete(removed.getId());
            }
        }

        if (judgeCount != null) {
            int target = clamp(judgeCount);
            List<Judge> judges = judgeRepository.findByCompetition(competition.getId());
            Long defaultProject = firstProjectId(competition.getId());
            while (judges.size() < target) {
                Judge judge = new Judge();
                judge.setCompetitionId(competition.getId());
                judge.setName("评委 " + (judges.size() + 1));
                judge.setOrg("待填写机构");
                judge.setPin(String.format("%04d", 1000 + (judges.size() + 1) * 7 % 9000));
                judge.setActive(true);
                judge.setSortOrder(judgeRepository.maxSortOrder(competition.getId()) + 1);
                judge.setCurrentProjectId(defaultProject);
                judge.setId(judgeRepository.insert(judge));
                judges.add(judge);
            }
            while (judges.size() > target) {
                Judge removed = judges.remove(judges.size() - 1);
                judgeRepository.delete(removed.getId());
            }
            assignUnassignedJudges(competition.getId(), defaultProject);
        }

        competitionService.touch();
    }

    /** 清空全部评分，但保留项目、评委与维度配置。 */
    @Transactional
    public void clearScores() {
        Competition competition = competitionService.current();
        scoreRepository.deleteAll(competition.getId());
        competitionService.touch();
    }

    /**
     * 重置为空白状态：清空项目、评委、维度与评分。
     *
     * <p>对应设计稿里的「重置演示数据」按钮，本系统不预置演示数据，
     * 因此重置后是一张干净的配置表。</p>
     */
    @Transactional
    public void resetAll() {
        Competition competition = competitionService.current();
        Long id = competition.getId();
        scoreRepository.deleteAll(id);
        judgeRepository.deleteAll(id);
        projectRepository.deleteAll(id);
        dimensionRepository.deleteAll(id);
        competitionService.updateBasics(id, "未命名赛事", "第一轮",
                ScoreScale.WEIGHTED_100.getId(), ScoreRule.TRIMMED_MEAN.getId());
        competitionService.updateSwitches(id, false, false);
        competitionService.touch();
    }

    // ---------------------------------------------------------------- 内部

    /** 维度变更后重算全部评分单的加权总分。 */
    private void recalculateAllScores(Long competitionId, List<Dimension> dimensions) {
        Map<Long, Map<Long, Integer>> allItems = scoreRepository.findAllItems(competitionId);
        for (ScoreEntry entry : scoreRepository.findByCompetition(competitionId)) {
            double total = ScoreCalculator.weightedTotal(dimensions, allItems.get(entry.getId()));
            scoreRepository.updateWeightedTotal(entry.getId(), total);
        }
    }

    /** 新项目创建后，把尚未分配项目的评委挂到它上面。 */
    private void assignUnassignedJudges(Long competitionId, Long projectId) {
        if (projectId == null) {
            return;
        }
        for (Judge judge : judgeRepository.findByCompetition(competitionId)) {
            if (judge.getCurrentProjectId() == null) {
                judgeRepository.updateCurrentProject(judge.getId(), projectId, false);
            }
        }
    }

    private Long firstProjectId(Long competitionId) {
        List<Project> projects = projectRepository.findByCompetition(competitionId);
        return projects.isEmpty() ? null : projects.get(0).getId();
    }

    private Dimension requireDimension(Long id) {
        Dimension dimension = dimensionRepository.findById(id);
        if (dimension == null) {
            throw ApiException.notFound("评分维度不存在");
        }
        return dimension;
    }

    private Project requireProject(Long id) {
        Project project = projectRepository.findById(id);
        if (project == null) {
            throw ApiException.notFound("参赛项目不存在");
        }
        return project;
    }

    private Judge requireJudge(Long id) {
        Judge judge = judgeRepository.findById(id);
        if (judge == null) {
            throw ApiException.notFound("评委不存在");
        }
        return judge;
    }

    private int clamp(int value) {
        if (value < 0) {
            throw ApiException.badRequest("数量不能为负数");
        }
        if (value > MAX_ROSTER_SIZE) {
            throw ApiException.badRequest("数量最多 " + MAX_ROSTER_SIZE);
        }
        return value;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
