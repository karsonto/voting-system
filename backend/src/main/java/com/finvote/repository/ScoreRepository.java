package com.finvote.repository;

import com.finvote.domain.ScoreEntry;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 评分单数据访问。
 */
@Repository
public class ScoreRepository {

    private static final RowMapper<ScoreEntry> ROW_MAPPER = (rs, rowNum) -> {
        ScoreEntry s = new ScoreEntry();
        s.setId(rs.getLong("id"));
        s.setCompetitionId(rs.getLong("competition_id"));
        s.setProjectId(rs.getLong("project_id"));
        s.setJudgeId(rs.getLong("judge_id"));
        s.setComment(rs.getString("comment"));
        s.setWeightedTotal(rs.getDouble("weighted_total"));
        s.setCreatedAt(rs.getLong("created_at"));
        s.setUpdatedAt(rs.getLong("updated_at"));
        return s;
    };

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbc;

    public ScoreRepository(JdbcTemplate jdbcTemplate, NamedParameterJdbcTemplate namedJdbc) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedJdbc = namedJdbc;
    }

    public List<ScoreEntry> findByCompetition(Long competitionId) {
        return jdbcTemplate.query("SELECT * FROM score WHERE competition_id = ? ORDER BY id", ROW_MAPPER, competitionId);
    }

    public ScoreEntry findByJudgeAndProject(Long judgeId, Long projectId) {
        List<ScoreEntry> list = jdbcTemplate.query("SELECT * FROM score WHERE judge_id = ? AND project_id = ?",
                ROW_MAPPER, judgeId, projectId);
        return list.isEmpty() ? null : list.get(0);
    }

    public long countByCompetition(Long competitionId) {
        Long n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM score WHERE competition_id = ?",
                Long.class, competitionId);
        return n == null ? 0L : n;
    }

    /** 保存或覆盖一份评分单，返回其主键。 */
    public Long save(ScoreEntry entry) {
        ScoreEntry existing = findByJudgeAndProject(entry.getJudgeId(), entry.getProjectId());
        if (existing != null) {
            jdbcTemplate.update("UPDATE score SET comment = ?, weighted_total = ?, updated_at = ? WHERE id = ?",
                    entry.getComment(), entry.getWeightedTotal(), entry.getUpdatedAt(), existing.getId());
            jdbcTemplate.update("DELETE FROM score_item WHERE score_id = ?", existing.getId());
            return existing.getId();
        }
        KeyHolder keyHolder = new GeneratedKeyHolder();
        namedJdbc.update("INSERT INTO score (competition_id, project_id, judge_id, comment, weighted_total, "
                        + "created_at, updated_at) VALUES (:competitionId, :projectId, :judgeId, :comment, "
                        + ":weightedTotal, :createdAt, :updatedAt)",
                new MapSqlParameterSource()
                        .addValue("competitionId", entry.getCompetitionId())
                        .addValue("projectId", entry.getProjectId())
                        .addValue("judgeId", entry.getJudgeId())
                        .addValue("comment", entry.getComment())
                        .addValue("weightedTotal", entry.getWeightedTotal())
                        .addValue("createdAt", entry.getCreatedAt())
                        .addValue("updatedAt", entry.getUpdatedAt()),
                keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? null : key.longValue();
    }

    public void insertItem(Long scoreId, Long dimensionId, int value) {
        jdbcTemplate.update("INSERT INTO score_item (score_id, dimension_id, value) VALUES (?, ?, ?)",
                scoreId, dimensionId, value);
    }

    /** 仅更新加权总分（维度权重变化后重算用），不影响逐维度得分。 */
    public void updateWeightedTotal(Long scoreId, double weightedTotal) {
        jdbcTemplate.update("UPDATE score SET weighted_total = ?, updated_at = ? WHERE id = ?",
                weightedTotal, System.currentTimeMillis(), scoreId);
    }

    /** 一次性查出所有评分单的逐维度得分，key = scoreId。 */
    public Map<Long, Map<Long, Integer>> findAllItems(Long competitionId) {
        Map<Long, Map<Long, Integer>> result = new HashMap<Long, Map<Long, Integer>>();
        jdbcTemplate.query(
                "SELECT si.score_id, si.dimension_id, si.value FROM score_item si "
                        + "JOIN score s ON s.id = si.score_id WHERE s.competition_id = ?",
                rs -> {
                    Long scoreId = rs.getLong("score_id");
                    Map<Long, Integer> items = result.get(scoreId);
                    if (items == null) {
                        items = new HashMap<Long, Integer>();
                        result.put(scoreId, items);
                    }
                    items.put(rs.getLong("dimension_id"), rs.getInt("value"));
                }, competitionId);
        return result;
    }

    public void deleteByJudgeAndProject(Long judgeId, Long projectId) {
        ScoreEntry existing = findByJudgeAndProject(judgeId, projectId);
        if (existing == null) {
            return;
        }
        jdbcTemplate.update("DELETE FROM score_item WHERE score_id = ?", existing.getId());
        jdbcTemplate.update("DELETE FROM score WHERE id = ?", existing.getId());
    }

    public void deleteByJudge(Long judgeId) {
        jdbcTemplate.update("DELETE FROM score_item WHERE score_id IN (SELECT id FROM score WHERE judge_id = ?)", judgeId);
        jdbcTemplate.update("DELETE FROM score WHERE judge_id = ?", judgeId);
    }

    public void deleteAll(Long competitionId) {
        jdbcTemplate.update("DELETE FROM score_item WHERE score_id IN (SELECT id FROM score WHERE competition_id = ?)",
                competitionId);
        jdbcTemplate.update("DELETE FROM score WHERE competition_id = ?", competitionId);
    }

    /** 某评委已提交的项目 ID 集合。 */
    public List<Long> findScoredProjectIds(Long judgeId) {
        return new ArrayList<Long>(namedJdbc.queryForList(
                "SELECT project_id FROM score WHERE judge_id = :judgeId",
                Collections.singletonMap("judgeId", judgeId), Long.class));
    }
}
