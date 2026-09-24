package com.finvote.service;

import com.finvote.common.ApiException;
import com.finvote.domain.Competition;
import com.finvote.domain.Dimension;
import com.finvote.domain.Judge;
import com.finvote.domain.Project;
import com.finvote.domain.ScoreEntry;
import com.finvote.domain.ScoreRule;
import com.finvote.dto.BoardRowView;
import com.finvote.dto.CompetitionView;
import com.finvote.dto.DimensionView;
import com.finvote.dto.JudgeAdminView;
import com.finvote.dto.JudgeView;
import com.finvote.dto.ProjectView;
import com.finvote.dto.PublicStateResponse;
import com.finvote.dto.AdminStateResponse;
import com.finvote.dto.RuleOptionView;
import com.finvote.dto.ScoreView;
import com.finvote.dto.StatsView;
import com.finvote.domain.ScoreScale;
import com.finvote.repository.DimensionRepository;
import com.finvote.repository.JudgeRepository;
import com.finvote.repository.ProjectRepository;
import com.finvote.repository.ScoreRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 组装各类视图对象。
 *
 * <p>所有读取接口都经过这里，好处是「隐藏 PIN」「揭晓前隐藏分数」这类规则只在一个地方实现，
 * 不会出现某个接口漏掉脱敏的情况。</p>
 */
@Service
public class StateAssembler {

    private final DimensionRepository dimensionRepository;
    private final ProjectRepository projectRepository;
    private final JudgeRepository judgeRepository;
    private final ScoreRepository scoreRepository;

    public StateAssembler(DimensionRepository dimensionRepository,
                          ProjectRepository projectRepository,
                          JudgeRepository judgeRepository,
                          ScoreRepository scoreRepository) {
        this.dimensionRepository = dimensionRepository;
        this.projectRepository = projectRepository;
        this.judgeRepository = judgeRepository;
        this.scoreRepository = scoreRepository;
    }

    // ------------------------------------------------------------------ 赛事

    public CompetitionView toView(Competition competition, List<Dimension> dimensions) {
        CompetitionView view = new CompetitionView();
        view.setId(competition.getId());
        view.setName(competition.getName());
        view.setStage(competition.getStage());
        view.setOpen(competition.isOpen());
        view.setRevealed(competition.isRevealed());
        view.setRev(competition.getVersion());
        view.setUpdatedAt(competition.getUpdatedAt());
        view.setVersion(competition.getVersion());

        ScoreScale scale = competition.scale();
        view.setScaleId(scale.getId());
        view.setScaleLabel(scale.getLabel());
        view.setScaleDescription(scale.getDescription());
        view.setMaxPerDimension(scale.getMaxPerDimension());

        ScoreRule rule = competition.rule();
        view.setRuleId(rule.getId());
        view.setRuleLabel(rule.getLabel());
        view.setRuleDescription(rule.getDescription());

        view.setDimensionCount(dimensions == null ? 0 : dimensions.size());
        view.setDimensionWeightSum(ScoreCalculator.totalWeight(dimensions));

        List<RuleOptionView> scaleOptions = new ArrayList<RuleOptionView>();
        for (ScoreScale s : ScoreScale.values()) {
            scaleOptions.add(new RuleOptionView(s.getId(), s.getLabel(), s.getDescription(), s.isSupported()));
        }
        view.setScaleOptions(scaleOptions);

        List<RuleOptionView> ruleOptions = new ArrayList<RuleOptionView>();
        for (ScoreRule r : ScoreRule.values()) {
            ruleOptions.add(new RuleOptionView(r.getId(), r.getLabel(), r.getDescription(), true));
        }
        view.setRuleOptions(ruleOptions);
        return view;
    }

    public List<DimensionView> dimensions(List<Dimension> dimensions) {
        List<DimensionView> list = new ArrayList<DimensionView>();
        for (Dimension d : dimensions) {
            DimensionView v = new DimensionView();
            v.setId(d.getId());
            v.setName(d.getName());
            v.setWeight(d.getWeight());
            v.setSortOrder(d.getSortOrder());
            list.add(v);
        }
        return list;
    }

    public List<ProjectView> projects(List<Project> projects, Map<Long, Integer> submittedByProject, int judgeCount) {
        List<ProjectView> list = new ArrayList<ProjectView>();
        for (Project p : projects) {
            ProjectView v = new ProjectView();
            v.setId(p.getId());
            v.setName(p.getName());
            v.setTeam(p.getTeam());
            v.setTrack(p.getTrack());
            v.setSortOrder(p.getSortOrder());
            v.setJudgeCount(judgeCount);
            Integer submitted = submittedByProject.get(p.getId());
            v.setSubmittedCount(submitted == null ? 0 : submitted);
            list.add(v);
        }
        return list;
    }

    public List<JudgeView> judges(List<Judge> judges) {
        List<JudgeView> list = new ArrayList<JudgeView>();
        for (Judge j : judges) {
            list.add(judgeView(j));
        }
        return list;
    }

    public JudgeView judgeView(Judge judge) {
        JudgeView v = new JudgeView();
        v.setId(judge.getId());
        v.setName(judge.getName());
        v.setOrg(judge.getOrg());
        v.setCurrentProjectId(judge.getCurrentProjectId());
        v.setSortOrder(judge.getSortOrder());
        v.setActive(judge.isActive());
        return v;
    }

    public List<JudgeAdminView> judgesAdmin(List<Judge> judges, Map<Long, Map<Long, ScoreEntry>> scoresByJudge) {
        List<JudgeAdminView> list = new ArrayList<JudgeAdminView>();
        for (Judge j : judges) {
            JudgeAdminView v = new JudgeAdminView();
            v.setId(j.getId());
            v.setName(j.getName());
            v.setOrg(j.getOrg());
            v.setPin(j.getPin());
            v.setCurrentProjectId(j.getCurrentProjectId());
            v.setSortOrder(j.getSortOrder());
            v.setActive(j.isActive());

            Map<Long, ScoreEntry> mine = scoresByJudge.get(j.getId());
            v.setSubmittedCount(mine == null ? 0 : mine.size());
            v.setSubmittedOnCurrent(j.getCurrentProjectId() != null
                    && mine != null && mine.containsKey(j.getCurrentProjectId()));
            list.add(v);
        }
        return list;
    }

    // ------------------------------------------------------------------ 评分

    /** 把评分单与逐维度得分拼成视图。 */
    public List<ScoreView> scores(List<ScoreEntry> entries,
                                  Map<Long, Map<Long, Integer>> items,
                                  Map<Long, Project> projectIndex,
                                  Map<Long, Judge> judgeIndex) {
        List<ScoreView> list = new ArrayList<ScoreView>();
        for (ScoreEntry entry : entries) {
            list.add(scoreView(entry, items.get(entry.getId()), projectIndex, judgeIndex));
        }
        return list;
    }

    public ScoreView scoreView(ScoreEntry entry,
                               Map<Long, Integer> values,
                               Map<Long, Project> projectIndex,
                               Map<Long, Judge> judgeIndex) {
        ScoreView v = new ScoreView();
        v.setId(entry.getId());
        v.setJudgeId(entry.getJudgeId());
        v.setProjectId(entry.getProjectId());
        v.setComment(entry.getComment());
        v.setWeightedTotal(ScoreCalculator.round2(entry.getWeightedTotal()));
        v.setCreatedAt(entry.getCreatedAt());
        v.setUpdatedAt(entry.getUpdatedAt());

        Judge judge = judgeIndex.get(entry.getJudgeId());
        v.setJudgeName(judge == null ? null : judge.getName());
        Project project = projectIndex.get(entry.getProjectId());
        v.setProjectName(project == null ? null : project.getName());

        Map<Long, Integer> ordered = new LinkedHashMap<Long, Integer>();
        if (values != null) {
            ordered.putAll(values);
        }
        v.setValues(ordered);
        return v;
    }

    /** 项目 ID → 已提交评分数。 */
    public Map<Long, Integer> submittedCountByProject(List<ScoreEntry> entries) {
        Map<Long, Integer> result = new HashMap<Long, Integer>();
        for (ScoreEntry entry : entries) {
            Integer current = result.get(entry.getProjectId());
            result.put(entry.getProjectId(), current == null ? 1 : current + 1);
        }
        return result;
    }

    /** 评委 ID → (项目 ID → 评分单)。 */
    public Map<Long, Map<Long, ScoreEntry>> scoresByJudge(List<ScoreEntry> entries) {
        Map<Long, Map<Long, ScoreEntry>> result = new HashMap<Long, Map<Long, ScoreEntry>>();
        for (ScoreEntry entry : entries) {
            Map<Long, ScoreEntry> mine = result.get(entry.getJudgeId());
            if (mine == null) {
                mine = new HashMap<Long, ScoreEntry>();
                result.put(entry.getJudgeId(), mine);
            }
            mine.put(entry.getProjectId(), entry);
        }
        return result;
    }

    // ------------------------------------------------------------------ 大屏

    /**
     * 生成排行榜。
     *
     * @param maskScores 是否隐藏分数。公开接口传 {@code !competition.isRevealed()}，
     *                   后台接口与 CSV 导出传 {@code false}——组委会在赛程中需要随时看到成绩，
     *                   只有对会场公开的大屏才需要在揭晓前保密。
     */
    public List<BoardRowView> board(List<Project> projects,
                                    List<Judge> judges,
                                    List<ScoreEntry> entries,
                                    ScoreRule rule,
                                    boolean maskScores) {
        Map<Long, Integer> submittedByProject = submittedCountByProject(entries);
        Map<Long, List<Double>> totalsByProject = new HashMap<Long, List<Double>>();
        Map<Long, List<Long>> submittedJudgesByProject = new HashMap<Long, List<Long>>();
        for (ScoreEntry entry : entries) {
            List<Double> totals = totalsByProject.get(entry.getProjectId());
            if (totals == null) {
                totals = new ArrayList<Double>();
                totalsByProject.put(entry.getProjectId(), totals);
            }
            totals.add(entry.getWeightedTotal());

            List<Long> submittedJudges = submittedJudgesByProject.get(entry.getProjectId());
            if (submittedJudges == null) {
                submittedJudges = new ArrayList<Long>();
                submittedJudgesByProject.put(entry.getProjectId(), submittedJudges);
            }
            submittedJudges.add(entry.getJudgeId());
        }

        List<BoardRowView> rows = new ArrayList<BoardRowView>();
        int order = 1;
        for (Project p : projects) {
            BoardRowView row = new BoardRowView();
            row.setProjectId(p.getId());
            row.setProjectName(p.getName());
            row.setTeam(p.getTeam());
            row.setTrack(p.getTrack());
            row.setOrder(order++);
            row.setJudgeCount(judges.size());

            Integer submitted = submittedByProject.get(p.getId());
            row.setSubmittedCount(submitted == null ? 0 : submitted);

            List<Long> submittedJudges = submittedJudgesByProject.get(p.getId());
            if (submittedJudges != null) {
                row.setSubmittedJudgeIds(submittedJudges);
            }

            List<Double> totals = totalsByProject.get(p.getId());
            if (totals != null && !totals.isEmpty()) {
                List<Double> sorted = new ArrayList<Double>(totals);
                Collections.sort(sorted);
                row.setHighest(ScoreCalculator.round2(sorted.get(sorted.size() - 1)));
                row.setLowest(ScoreCalculator.round2(sorted.get(0)));
                row.setEffectiveCount(rule.effectiveCount(sorted.size()));
                double mean = rule.aggregate(sorted);
                if (!Double.isNaN(mean)) {
                    row.setMean(ScoreCalculator.round2(mean));
                }
            } else {
                row.setEffectiveCount(0);
            }

            if (maskScores) {
                // 未揭晓：不下发分数，避免有人直接请求接口就提前看到结果
                row.setMasked(true);
                row.setMean(null);
                row.setHighest(null);
                row.setLowest(null);
            } else {
                row.setMasked(false);
            }
            rows.add(row);
        }

        if (!maskScores) {
            Collections.sort(rows, new Comparator<BoardRowView>() {
                @Override
                public int compare(BoardRowView a, BoardRowView b) {
                    Double x = a.getMean();
                    Double y = b.getMean();
                    if (x == null && y == null) {
                        return Integer.compare(a.getOrder(), b.getOrder());
                    }
                    if (x == null) {
                        return 1;
                    }
                    if (y == null) {
                        return -1;
                    }
                    int cmp = Double.compare(y, x);
                    return cmp != 0 ? cmp : Integer.compare(a.getOrder(), b.getOrder());
                }
            });
            for (int i = 0; i < rows.size(); i++) {
                rows.get(i).setRank(i + 1);
            }
        } else {
            for (BoardRowView row : rows) {
                row.setRank(0);
            }
        }
        return rows;
    }

    // ------------------------------------------------------------------ 统计

    public StatsView stats(List<Project> projects, List<Judge> judges, List<ScoreEntry> entries, ScoreRule rule) {
        StatsView stats = new StatsView();
        stats.setProjectCount(projects.size());
        stats.setJudgeCount(judges.size());
        stats.setScoreCount(entries.size());
        stats.setTotalPossibleScores(projects.size() * judges.size());
        // 「有效评分份数」按每个项目可采信的份数计算（评委数去掉极值），
        // 与设计稿「有效评委数 = 评委数 6 − 2 = 4 份」的口径一致。
        stats.setEffectiveScoreCount(rule.effectiveCount(judges.size()));

        Map<Long, Integer> submittedByProject = submittedCountByProject(entries);
        int covered = 0;
        for (Project p : projects) {
            Integer submitted = submittedByProject.get(p.getId());
            if (submitted != null && submitted > 0) {
                covered++;
            }
        }
        stats.setCoveredProjectCount(covered);
        return stats;
    }

    // ------------------------------------------------------------------ 整体

    /** 查询某位评委对某个项目的评分明细，没有则返回 null。 */
    public ScoreView findScore(Long competitionId, Long judgeId, Long projectId) {
        List<ScoreEntry> entries = scoreRepository.findByCompetition(competitionId);
        ScoreEntry target = null;
        for (ScoreEntry entry : entries) {
            if (entry.getJudgeId().equals(judgeId) && entry.getProjectId().equals(projectId)) {
                target = entry;
                break;
            }
        }
        if (target == null) {
            return null;
        }
        Map<Long, Map<Long, Integer>> items = scoreRepository.findAllItems(competitionId);
        return scoreView(target, items.get(target.getId()),
                indexProjects(loadProjects(competitionId)), indexJudges(loadJudges(competitionId)));
    }

    /** 公开状态（大屏、评委端登入页、总览页使用）。 */
    public PublicStateResponse publicState(Competition competition,
                                           List<Dimension> dimensions,
                                           List<Project> projects,
                                           List<Judge> judges,
                                           List<ScoreEntry> entries,
                                           long version) {
        PublicStateResponse response = new PublicStateResponse();
        response.setVersion(version);
        response.setUpdatedAt(competition.getUpdatedAt());
        response.setCompetition(toView(competition, dimensions));
        response.setDimensions(dimensions(dimensions));
        response.setProjects(projects(projects, submittedCountByProject(entries), judges.size()));
        response.setJudges(judges(judges));
        response.setBoard(board(projects, judges, entries, competition.rule(), !competition.isRevealed()));
        response.setStats(stats(projects, judges, entries, competition.rule()));

        Long currentProjectId = resolveCurrentProject(judges);
        response.setCurrentProjectId(currentProjectId);
        response.setJudgesAligned(currentProjectId != null && allAligned(judges, currentProjectId));
        return response;
    }

    /** 后台全量状态。 */
    public AdminStateResponse adminState(Competition competition,
                                         List<Dimension> dimensions,
                                         List<Project> projects,
                                         List<Judge> judges,
                                         List<ScoreEntry> entries,
                                         long version,
                                         String username,
                                         String displayName) {
        AdminStateResponse response = new AdminStateResponse();
        response.setVersion(version);
        response.setUpdatedAt(competition.getUpdatedAt());
        response.setCompetition(toView(competition, dimensions));
        response.setDimensions(dimensions(dimensions));
        response.setProjects(projects(projects, submittedCountByProject(entries), judges.size()));

        Map<Long, Map<Long, Integer>> items = scoreRepository.findAllItems(competition.getId());
        response.setJudges(judgesAdmin(judges, scoresByJudge(entries)));

        Map<Long, Project> projectIndex = indexProjects(projects);
        Map<Long, Judge> judgeIndex = indexJudges(judges);
        response.setScores(scores(entries, items, projectIndex, judgeIndex));
        // 后台不做遮罩：组委会在赛程中需要随时掌握成绩
        response.setBoard(board(projects, judges, entries, competition.rule(), false));
        response.setStats(stats(projects, judges, entries, competition.rule()));
        response.setCurrentUsername(username);
        response.setCurrentDisplayName(displayName);
        return response;
    }

    public Map<Long, Project> indexProjects(List<Project> projects) {
        Map<Long, Project> index = new HashMap<Long, Project>();
        for (Project p : projects) {
            index.put(p.getId(), p);
        }
        return index;
    }

    public Map<Long, Judge> indexJudges(List<Judge> judges) {
        Map<Long, Judge> index = new HashMap<Long, Judge>();
        for (Judge j : judges) {
            index.put(j.getId(), j);
        }
        return index;
    }

    public Map<Long, Dimension> indexDimensions(List<Dimension> dimensions) {
        Map<Long, Dimension> index = new HashMap<Long, Dimension>();
        for (Dimension d : dimensions) {
            index.put(d.getId(), d);
        }
        return index;
    }

    /**
     * 推断「正在评审」的项目：取被调度评委最多的那个项目；
     * 若并列则取列表中靠前的，保证多次请求结果稳定。
     */
    public Long resolveCurrentProject(List<Judge> judges) {
        Map<Long, Integer> counter = new HashMap<Long, Integer>();
        for (Judge j : judges) {
            if (j.getCurrentProjectId() == null) {
                continue;
            }
            Integer current = counter.get(j.getCurrentProjectId());
            counter.put(j.getCurrentProjectId(), current == null ? 1 : current + 1);
        }
        if (counter.isEmpty()) {
            return null;
        }
        Long best = null;
        int bestCount = -1;
        for (Judge j : judges) {
            Long pid = j.getCurrentProjectId();
            if (pid == null) {
                continue;
            }
            int count = counter.get(pid);
            if (count > bestCount) {
                bestCount = count;
                best = pid;
            }
        }
        return best;
    }

    private boolean allAligned(List<Judge> judges, Long projectId) {
        if (judges.isEmpty()) {
            return false;
        }
        for (Judge j : judges) {
            if (!projectId.equals(j.getCurrentProjectId())) {
                return false;
            }
        }
        return true;
    }

    // ------------------------------------------------------------------ 便捷读取

    public List<Dimension> loadDimensions(Long competitionId) {
        return dimensionRepository.findByCompetition(competitionId);
    }

    public List<Project> loadProjects(Long competitionId) {
        return projectRepository.findByCompetition(competitionId);
    }

    public List<Judge> loadJudges(Long competitionId) {
        return judgeRepository.findByCompetition(competitionId);
    }

    public List<ScoreEntry> loadScores(Long competitionId) {
        return scoreRepository.findByCompetition(competitionId);
    }
}
