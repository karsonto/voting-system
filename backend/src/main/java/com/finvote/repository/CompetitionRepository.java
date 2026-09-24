package com.finvote.repository;

import com.finvote.domain.Competition;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 璧涗簨鏁版嵁璁块棶銆? */
@Repository
public class CompetitionRepository {

    private static final String COLUMNS =
            "id, name, stage, scale_id, rule_id, is_open, revealed, version, updated_at, created_at";

    private static final RowMapper<Competition> ROW_MAPPER = (rs, rowNum) -> {
        Competition c = new Competition();
        c.setId(rs.getLong("id"));
        c.setName(rs.getString("name"));
        c.setStage(rs.getString("stage"));
        c.setScaleId(rs.getString("scale_id"));
        c.setRuleId(rs.getString("rule_id"));
        c.setOpen(rs.getInt("is_open") == 1);
        c.setRevealed(rs.getInt("revealed") == 1);
        c.setVersion(rs.getLong("version"));
        c.setUpdatedAt(rs.getLong("updated_at"));
        c.setCreatedAt(rs.getLong("created_at"));
        return c;
    };

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbc;

    public CompetitionRepository(JdbcTemplate jdbcTemplate, NamedParameterJdbcTemplate namedJdbc) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedJdbc = namedJdbc;
    }

    /** 褰撳墠璧涗簨锛堝崟璧涗簨鍦烘櫙涓嬪嵆绗竴鏉★級銆?*/
    public Competition findCurrent() {
        List<Competition> list = jdbcTemplate.query(
                "SELECT " + COLUMNS + " FROM competition ORDER BY id LIMIT 1", ROW_MAPPER);
        return list.isEmpty() ? null : list.get(0);
    }

    public Competition findById(Long id) {
        List<Competition> list = jdbcTemplate.query(
                "SELECT " + COLUMNS + " FROM competition WHERE id = ?", ROW_MAPPER, id);
        return list.isEmpty() ? null : list.get(0);
    }

    public long count() {
        Long n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM competition", Long.class);
        return n == null ? 0L : n;
    }

    public Long insert(Competition c) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        namedJdbc.update("INSERT INTO competition (name, stage, scale_id, rule_id, is_open, revealed, version, updated_at, created_at) "
                        + "VALUES (:name, :stage, :scaleId, :ruleId, :open, :revealed, :version, :updatedAt, :createdAt)",
                new MapSqlParameterSource()
                        .addValue("name", c.getName())
                        .addValue("stage", c.getStage())
                        .addValue("scaleId", c.getScaleId())
                        .addValue("ruleId", c.getRuleId())
                        .addValue("open", c.isOpen() ? 1 : 0)
                        .addValue("revealed", c.isRevealed() ? 1 : 0)
                        .addValue("version", c.getVersion())
                        .addValue("updatedAt", c.getUpdatedAt())
                        .addValue("createdAt", c.getCreatedAt()),
                keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? null : key.longValue();
    }

    public void updateBasics(Long id, String name, String stage, String scaleId, String ruleId) {
        namedJdbc.update("UPDATE competition SET name = :name, stage = :stage, scale_id = :scaleId, "
                        + "rule_id = :ruleId, updated_at = :updatedAt WHERE id = :id",
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("name", name)
                        .addValue("stage", stage)
                        .addValue("scaleId", scaleId)
                        .addValue("ruleId", ruleId)
                        .addValue("updatedAt", System.currentTimeMillis()));
    }

    public void updateSwitches(Long id, Boolean open, Boolean revealed) {
        StringBuilder sql = new StringBuilder("UPDATE competition SET updated_at = :updatedAt");
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("updatedAt", System.currentTimeMillis());
        if (open != null) {
            sql.append(", is_open = :open");
            params.addValue("open", open ? 1 : 0);
        }
        if (revealed != null) {
            sql.append(", revealed = :revealed");
            params.addValue("revealed", revealed ? 1 : 0);
        }
        sql.append(" WHERE id = :id");
        namedJdbc.update(sql.toString(), params);
    }

    /** 閫掑璧涗簨鑷韩鐨勭増鏈彿锛堝墠绔睍绀虹殑 rev锛夈€?*/
    public void bumpVersion(Long id) {
        jdbcTemplate.update("UPDATE competition SET version = version + 1 WHERE id = ?", id);
    }

    /** 浠呭埛鏂版洿鏂版椂闂淬€?*/
    public void touch(Long id) {
        jdbcTemplate.update("UPDATE competition SET updated_at = ? WHERE id = ?", System.currentTimeMillis(), id);
    }
}
