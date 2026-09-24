package com.finvote.service;

import com.finvote.common.ApiException;
import com.finvote.domain.Competition;
import com.finvote.domain.ScoreScale;
import com.finvote.repository.CompetitionRepository;
import com.finvote.repository.DataVersionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 赛事生命周期与版本号维护。
 *
 * <p>所有写操作统一走 {@link #touch()}，它会同时递增全局版本号与赛事修订号，
 * 前端轮询到版本变化后重新拉取数据，从而实现「实时同步」。</p>
 */
@Service
public class CompetitionService {

    private final CompetitionRepository competitionRepository;
    private final DataVersionRepository dataVersionRepository;

    public CompetitionService(CompetitionRepository competitionRepository,
                              DataVersionRepository dataVersionRepository) {
        this.competitionRepository = competitionRepository;
        this.dataVersionRepository = dataVersionRepository;
    }

    /** 当前赛事；首次访问时创建一条空赛事（不含项目、评委、维度）。 */
    @Transactional
    public Competition current() {
        Competition competition = competitionRepository.findCurrent();
        if (competition == null) {
            competition = createDefault();
        }
        return competition;
    }

    public Long currentId() {
        return current().getId();
    }

    private Competition createDefault() {
        long now = System.currentTimeMillis();
        Competition competition = new Competition();
        competition.setName("未命名赛事");
        competition.setStage("第一轮");
        competition.setScaleId(ScoreScale.WEIGHTED_100.getId());
        competition.setRuleId(com.finvote.domain.ScoreRule.TRIMMED_MEAN.getId());
        competition.setOpen(false);
        competition.setRevealed(false);
        competition.setVersion(1L);
        competition.setUpdatedAt(now);
        competition.setCreatedAt(now);
        Long id = competitionRepository.insert(competition);
        competition.setId(id);
        dataVersionRepository.bump();
        return competition;
    }

    public Competition require(Long id) {
        Competition competition = competitionRepository.findById(id);
        if (competition == null) {
            throw ApiException.notFound("赛事不存在");
        }
        return competition;
    }

    public void updateBasics(Long id, String name, String stage, String scaleId, String ruleId) {
        competitionRepository.updateBasics(id, name, stage, scaleId, ruleId);
    }

    public void updateSwitches(Long id, Boolean open, Boolean revealed) {
        competitionRepository.updateSwitches(id, open, revealed);
    }

    /** 递增版本号，标记数据已变更。 */
    public long touch() {
        Competition competition = current();
        competitionRepository.bumpVersion(competition.getId());
        return dataVersionRepository.bump();
    }

    public long version() {
        return dataVersionRepository.current();
    }

    public long updatedAt() {
        Competition competition = competitionRepository.findCurrent();
        return competition == null ? 0L : competition.getUpdatedAt();
    }
}
