package com.finvote.repository;

import com.finvote.domain.AppUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 鍚庡彴璐﹀彿鏁版嵁璁块棶銆? */
@Repository
public class AppUserRepository {

    private static final RowMapper<AppUser> ROW_MAPPER = (rs, rowNum) -> {
        AppUser u = new AppUser();
        u.setId(rs.getLong("id"));
        u.setUsername(rs.getString("username"));
        u.setPasswordHash(rs.getString("password_hash"));
        u.setDisplayName(rs.getString("display_name"));
        u.setRole(rs.getString("role"));
        u.setEnabled(rs.getInt("enabled") == 1);
        u.setCreatedAt(rs.getLong("created_at"));
        return u;
    };

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbc;

    public AppUserRepository(JdbcTemplate jdbcTemplate, NamedParameterJdbcTemplate namedJdbc) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedJdbc = namedJdbc;
    }

    public AppUser findByUsername(String username) {
        List<AppUser> list = jdbcTemplate.query("SELECT * FROM app_user WHERE username = ?", ROW_MAPPER, username);
        return list.isEmpty() ? null : list.get(0);
    }

    public AppUser findById(Long id) {
        List<AppUser> list = jdbcTemplate.query("SELECT * FROM app_user WHERE id = ?", ROW_MAPPER, id);
        return list.isEmpty() ? null : list.get(0);
    }

    public long count() {
        Long n = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM app_user", Long.class);
        return n == null ? 0L : n;
    }

    public Long insert(AppUser u) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        namedJdbc.update("INSERT INTO app_user (username, password_hash, display_name, role, enabled, created_at) "
                        + "VALUES (:username, :passwordHash, :displayName, :role, :enabled, :createdAt)",
                new MapSqlParameterSource()
                        .addValue("username", u.getUsername())
                        .addValue("passwordHash", u.getPasswordHash())
                        .addValue("displayName", u.getDisplayName())
                        .addValue("role", u.getRole())
                        .addValue("enabled", u.isEnabled() ? 1 : 0)
                        .addValue("createdAt", u.getCreatedAt()),
                keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? null : key.longValue();
    }

    public void updatePassword(Long id, String passwordHash) {
        jdbcTemplate.update("UPDATE app_user SET password_hash = ? WHERE id = ?", passwordHash, id);
    }
}
