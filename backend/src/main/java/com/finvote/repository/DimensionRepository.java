package com.finvote.repository;

import com.finvote.domain.Dimension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 璇勫垎缁村害鏁版嵁璁块棶銆? */
@Repository
public class DimensionRepository {

    private static final RowMapper<Dimension> ROW_MAPPER = (rs, rowNum) -> {
        Dimension d = new Dimension();
        d.setId(rs.getLong("id"));
        d.setCompetitionId(rs.getLong("competition_id"));
        d.setName(rs.getString("name"));
        d.setWeight(rs.getInt("weight"));
        d.setSortOrder(rs.getInt("sort_order"));
        return d;
    };

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbc;

    public DimensionRepository(JdbcTemplate jdbcTemplate, NamedParameterJdbcTemplate namedJdbc) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedJdbc = namedJdbc;
    }

    public List<Dimension> findByCompetition(Long competitionId) {
        return jdbcTemplate.query("SELECT * FROM dimension WHERE competition_id = ? ORDER BY sort_order, id",
                ROW_MAPPER, competitionId);
    }

    public Dimension findById(Long id) {
        List<Dimension> list = jdbcTemplate.query("SELECT * FROM dimension WHERE id = ?", ROW_MAPPER, id);
        return list.isEmpty() ? null : list.get(0);
    }

    public Long insert(Dimension d) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        namedJdbc.update("INSERT INTO dimension (competition_id, name, weight, sort_order) "
                        + "VALUES (:competitionId, :name, :weight, :sortOrder)",
                new MapSqlParameterSource()
                        .addValue("competitionId", d.getCompetitionId())
                        .addValue("name", d.getName())
                        .addValue("weight", d.getWeight())
                        .addValue("sortOrder", d.getSortOrder()),
                keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? null : key.longValue();
    }

    public void update(Long id, String name, Integer weight, Integer sortOrder) {
        StringBuilder sql = new StringBuilder("UPDATE dimension SET id = id");
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("id", id);
        if (name != null) {
            sql.append(", name = :name");
            params.addValue("name", name);
        }
        if (weight != null) {
            sql.append(", weight = :weight");
            params.addValue("weight", weight);
        }
        if (sortOrder != null) {
            sql.append(", sort_order = :sortOrder");
            params.addValue("sortOrder", sortOrder);
        }
        sql.append(" WHERE id = :id");
        namedJdbc.update(sql.toString(), params);
    }

    public void delete(Long id) {
        jdbcTemplate.update("DELETE FROM score_item WHERE dimension_id = ?", id);
        jdbcTemplate.update("DELETE FROM dimension WHERE id = ?", id);
    }

    public void deleteAll(Long competitionId) {
        jdbcTemplate.update("DELETE FROM score_item WHERE dimension_id IN "
                + "(SELECT id FROM dimension WHERE competition_id = ?)", competitionId);
        jdbcTemplate.update("DELETE FROM dimension WHERE competition_id = ?", competitionId);
    }

    public int maxSortOrder(Long competitionId) {
        Integer max = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(sort_order), -1) FROM dimension WHERE competition_id = ?", Integer.class, competitionId);
        return max == null ? -1 : max;
    }

    public int sumWeight(Long competitionId) {
        Integer sum = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(weight), 0) FROM dimension WHERE competition_id = ?", Integer.class, competitionId);
        return sum == null ? 0 : sum;
    }
}
