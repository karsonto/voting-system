package com.finvote.repository;

import com.finvote.domain.Project;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 鍙傝禌椤圭洰鏁版嵁璁块棶銆? */
@Repository
public class ProjectRepository {

    private static final RowMapper<Project> ROW_MAPPER = (rs, rowNum) -> {
        Project p = new Project();
        p.setId(rs.getLong("id"));
        p.setCompetitionId(rs.getLong("competition_id"));
        p.setName(rs.getString("name"));
        p.setTeam(rs.getString("team"));
        p.setTrack(rs.getString("track"));
        p.setSortOrder(rs.getInt("sort_order"));
        return p;
    };

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbc;

    public ProjectRepository(JdbcTemplate jdbcTemplate, NamedParameterJdbcTemplate namedJdbc) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedJdbc = namedJdbc;
    }

    public List<Project> findByCompetition(Long competitionId) {
        return jdbcTemplate.query("SELECT * FROM project WHERE competition_id = ? ORDER BY sort_order, id",
                ROW_MAPPER, competitionId);
    }

    public Project findById(Long id) {
        List<Project> list = jdbcTemplate.query("SELECT * FROM project WHERE id = ?", ROW_MAPPER, id);
        return list.isEmpty() ? null : list.get(0);
    }

    public Long insert(Project p) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        namedJdbc.update("INSERT INTO project (competition_id, name, team, track, sort_order) "
                        + "VALUES (:competitionId, :name, :team, :track, :sortOrder)",
                new MapSqlParameterSource()
                        .addValue("competitionId", p.getCompetitionId())
                        .addValue("name", p.getName())
                        .addValue("team", p.getTeam())
                        .addValue("track", p.getTrack())
                        .addValue("sortOrder", p.getSortOrder()),
                keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? null : key.longValue();
    }

    public void update(Long id, String name, String team, String track, Integer sortOrder) {
        StringBuilder sql = new StringBuilder("UPDATE project SET id = id");
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("id", id);
        if (name != null) {
            sql.append(", name = :name");
            params.addValue("name", name);
        }
        if (team != null) {
            sql.append(", team = :team");
            params.addValue("team", team);
        }
        if (track != null) {
            sql.append(", track = :track");
            params.addValue("track", track);
        }
        if (sortOrder != null) {
            sql.append(", sort_order = :sortOrder");
            params.addValue("sortOrder", sortOrder);
        }
        sql.append(" WHERE id = :id");
        namedJdbc.update(sql.toString(), params);
    }

    /** 鍒犻櫎椤圭洰锛氬悓鏃舵竻鎺夊叾璇勫垎锛屽苟鎶婅皟搴﹀埌璇ラ」鐩殑璇勫缃负鏈垎閰嶃€?*/
    public void delete(Long id) {
        jdbcTemplate.update("UPDATE judge SET current_project_id = NULL WHERE current_project_id = ?", id);
        jdbcTemplate.update("DELETE FROM score WHERE project_id = ?", id);
        jdbcTemplate.update("DELETE FROM project WHERE id = ?", id);
    }

    public void deleteAll(Long competitionId) {
        jdbcTemplate.update("UPDATE judge SET current_project_id = NULL WHERE competition_id = ?", competitionId);
        jdbcTemplate.update("DELETE FROM score WHERE competition_id = ?", competitionId);
        jdbcTemplate.update("DELETE FROM project WHERE competition_id = ?", competitionId);
    }

    public int maxSortOrder(Long competitionId) {
        Integer max = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(sort_order), -1) FROM project WHERE competition_id = ?", Integer.class, competitionId);
        return max == null ? -1 : max;
    }

    public long count(Long competitionId) {
        Long n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM project WHERE competition_id = ?",
                Long.class, competitionId);
        return n == null ? 0L : n;
    }
}
