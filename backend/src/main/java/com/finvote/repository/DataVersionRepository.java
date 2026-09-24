package com.finvote.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 鍏ㄥ眬鍙樻洿鐗堟湰鍙枫€? *
 * 鍚庡彴鐨勪换浣曞啓鎿嶄綔閮戒細鎶婄増鏈彿 +1锛屽墠绔疆璇?`/api/public/version` 鍒ゆ柇鏄惁闇€瑕侀噸鏂版媺鏁版嵁锛? * 杩欐牱鏃繚璇併€屽疄鏃跺悓姝ャ€嶏紝鍙堥伩鍏嶆瘡娆¤疆璇㈤兘浼犺緭鍏ㄩ噺璧涗簨鏁版嵁銆? */
@Repository
public class DataVersionRepository {

    private final JdbcTemplate jdbcTemplate;

    public DataVersionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long current() {
        Long version = jdbcTemplate.queryForObject("SELECT version FROM data_version WHERE id = 1", Long.class);
        return version == null ? 0L : version;
    }

    /** 鐗堟湰鍙?+1锛岃繑鍥炴柊鐗堟湰鍙枫€?*/
    public long bump() {
        jdbcTemplate.update("UPDATE data_version SET version = version + 1, updated_at = ? WHERE id = 1",
                System.currentTimeMillis());
        return current();
    }
}
