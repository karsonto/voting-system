package com.finvote.service;

import com.finvote.common.ApiException;
import com.finvote.domain.Competition;
import com.finvote.domain.Dimension;
import com.finvote.domain.Judge;
import com.finvote.domain.Project;
import com.finvote.domain.ScoreEntry;
import com.finvote.repository.ScoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 评分提交。评委可以对自己评过的项目重复提交（覆盖更新），直到后台关闭评分通道。
 */
@Service
public class ScoringService {

    private final CompetitionService competitionService;
    private final StateAssembler stateAssembler;
    private final ScoreRepository scoreRepository;

    public ScoringService(CompetitionService competitionService,
                          StateAssembler stateAssembler,
                          ScoreRepository scoreRepository) {
        this.competitionService = competitionService;
        this.stateAssembler = stateAssembler;
        this.scoreRepository = scoreRepository;
    }

    @Transactional
    public ScoreEntry submit(Judge judge, Long projectId, Map<Long, Double> rawValues, String comment) {
        Competition competition = competitionService.current();
        if (!competition.isOpen()) {
            throw ApiException.forbidden("评分通道已关闭，暂时无法提交");
        }

        Project project = null;
        for (Project p : stateAssembler.loadProjects(competition.getId())) {
            if (p.getId().equals(projectId)) {
                project = p;
                break;
            }
        }
        if (project == null) {
            throw ApiException.notFound("参赛项目不存在");
        }

        List<Dimension> dimensions = stateAssembler.loadDimensions(competition.getId());
        if (dimensions.isEmpty()) {
            throw ApiException.badRequest("还没有配置评分维度，请联系组委会");
        }

        Map<Long, Double> values = new LinkedHashMap<Long, Double>();
        for (Dimension dimension : dimensions) {
            Double value = rawValues == null ? null : rawValues.get(dimension.getId());
            if (value == null) {
                throw ApiException.badRequest("维度「" + dimension.getName() + "」尚未打分");
            }
            // 每个维度的满分即其权重（权重 30% → 满分 30 分）；收敛到 0.1 步幅并校验范围
            double max = dimension.getWeight();
            double snapped = snapToTenth(value);
            if (snapped < 0 || snapped > max) {
                throw ApiException.badRequest("维度「" + dimension.getName() + "」的得分需在 0–" + max + " 之间");
            }
            values.put(dimension.getId(), snapped);
        }

        double total = ScoreCalculator.weightedTotal(dimensions, values);
        long now = System.currentTimeMillis();

        ScoreEntry entry = new ScoreEntry();
        entry.setCompetitionId(competition.getId());
        entry.setProjectId(projectId);
        entry.setJudgeId(judge.getId());
        entry.setComment(comment == null ? "" : comment.trim());
        entry.setWeightedTotal(total);
        entry.setCreatedAt(now);
        entry.setUpdatedAt(now);

        Long scoreId = scoreRepository.save(entry);
        for (Map.Entry<Long, Double> item : values.entrySet()) {
            scoreRepository.insertItem(scoreId, item.getKey(), item.getValue());
        }

        competitionService.touch();

        entry.setId(scoreId);
        return entry;
    }

    /** 清空某位评委对某个项目的评分（后台调度台的「清空」按钮）。 */
    @Transactional
    public void clearByJudgeAndProject(Long judgeId, Long projectId) {
        scoreRepository.deleteByJudgeAndProject(judgeId, projectId);
        competitionService.touch();
    }

    /** 把任意数值收敛到 0.1 的整数倍，消除前端浮点噪声（如 73.50000000000001 → 73.5）。 */
    private static double snapToTenth(double value) {
        if (!Double.isFinite(value)) {
            return 0d;
        }
        return Math.round(value * 10d) / 10d;
    }
}
