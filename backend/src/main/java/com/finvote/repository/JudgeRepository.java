package com.finvote.repository;

import com.finvote.domain.Judge;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 璇勫鏁版嵁璁块棶銆? */
@Repository
public class JudgeRepository {

    private static final RowMapper<Judge> ROW_MAPPER = (rs, rowNum) -> {
        Judge j = new Judge();
        j.setId(rs.getLong("id"));
        j.setCompetitionId(rs.getLong("competition_id"));
        j.setName(rs.getString("name"));
        j.setOrg(rs.getString("org"));
        j.setPin(rs.getString("pin"));
        long projectId = rs.getLong("current_project_id");
        j.setCurrentProjectId(rs.wasNull() ? null : projectId);
        j.setSortOrder(rs.getInt("sort_order"));
        j.setActive(rs.getInt("active") == 1);
        return j;
    };

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbc;

    public JudgeRepository(JdbcTemplate jdbcTemplate, NamedParameterJdbcTemplate namedJdbc) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedJdbc = namedJdbc;
    }

    public List<Judge> findByCompetition(Long competitionId) {
        return jdbcTemplate.query("SELECT * FROM judge WHERE competition_id = ? ORDER BY sort_order, id",
                ROW_MAPPER, competitionId);
    }

    public Judge findById(Long id) {
        List<Judge> list = jdbcTemplate.query("SELECT * FROM judge WHERE id = ?", ROW_MAPPER, id);
        return list.isEmpty() ? null : list.get(0);
    }

    public Long insert(Judge j) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        namedJdbc.update("INSERT INTO judge (competition_id, name, org, pin, current_project_id, sort_order, active) "
                        + "VALUES (:competitionId, :name, :org, :pin, :currentProjectId, :sortOrder, :active)",
                new MapSqlParameterSource()
                        .addValue("competitionId", j.getCompetitionId())
                        .addValue("name", j.getName())
                        .addValue("org", j.getOrg())
                        .addValue("pin", j.getPin())
                        .addValue("currentProjectId", j.getCurrentProjectId())
                        .addValue("sortOrder", j.getSortOrder())
                        .addValue("active", j.isActive() ? 1 : 0),
                keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? null : key.longValue();
    }

    public void update(Long id, String name, String org, String pin, Boolean active, Integer sortOrder) {
        StringBuilder sql = new StringBuilder("UPDATE judge SET id = id");
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("id", id);
        if (name != null) {
            sql.append(", name = :name");
            params.addValue("name", name);
        }
        if (org != null) {
            sql.append(", org = :org");
            params.addValue("org", org);
        }
        if (pin != null) {
            sql.append(", pin = :pin");
            params.addValue("pin", pin);
        }
        if (active != null) {
            sql.append(", active = :active");
            params.addValue("active", active ? 1 : 0);
        }
        if (sortOrder != null) {
            sql.append(", sort_order = :sortOrder");
            params.addValue("sortOrder", sortOrder);
        }
        sql.append(" WHERE id = :id");
        namedJdbc.update(sql.toString(), params);
    }

    /** 鍗曠嫭淇敼鏌愪綅璇勫銆屽綋鍓嶈瘎瀹￠」鐩€嶏紙鍏佽浼?null 琛ㄧず鍙栨秷鍒嗛厤锛夈€?*/
    public void updateCurrentProject(Long id, Long projectId, boolean clear) {
        if (clear) {
            jdbcTemplate.update("UPDATE judge SET current_project_id = NULL WHERE id = ?", id);
        } else {
            jdbcTemplate.update("UPDATE judge SET current_project_id = ? WHERE id = ?", projectId, id);
        }
    }

    /** 鎵归噺鎶婅嫢骞茶瘎濮旇皟搴﹀埌鍚屼竴椤圭洰銆?*/
    public void dispatchAll(List<Long> judgeIds, Long projectId) {
        if (judgeIds == null || judgeIds.isEmpty()) {
            return;
        }
        namedJdbc.update("UPDATE judge SET current_project_id = :projectId WHERE id IN (:ids)",
                new MapSqlParameterSource()
                        .addValue("projectId", projectId)
                        .addValue("ids", judgeIds));
    }

    public void delete(Long id) {
        jdbcTemplate.update("DELETE FROM score WHERE judge_id = ?", id);
        jdbcTemplate.update("DELETE FROM judge WHERE id = ?", id);
    }

    public void deleteAll(Long competitionId) {
        jdbcTemplate.update("DELETE FROM score WHERE competition_id = ?", competitionId);
        jdbcTemplate.update("DELETE FROM judge WHERE competition_id = ?", competitionId);
    }

    public int maxSortOrder(Long competitionId) {
        Integer max = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(sort_order), -1) FROM judge WHERE competition_id = ?", Integer.class, competitionId);
        return max == null ? -1 : max;
    }

    public long count(Long competitionId) {
        Long n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM judge WHERE competition_id = ?",
                Long.class, competitionId);
        return n == null ? 0L : n;
    }
}
