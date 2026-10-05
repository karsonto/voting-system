package com.finvote.common;

/**
 * 全系统共用的界面语言。后台改这一项，总览、评委端和大屏一起跟着变。
 */
public final class LocaleCopy {

    public static final String HANS = "zh-Hans";
    public static final String HANT = "zh-Hant";
    public static final String EN = "en";

    private LocaleCopy() {
    }

    /** 无法识别时返回 null，调用方据此拒绝写入。 */
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.trim();
        if (value.isEmpty()) {
            return null;
        }
        if (HANS.equalsIgnoreCase(value) || "zh-CN".equalsIgnoreCase(value) || "zh".equalsIgnoreCase(value)) {
            return HANS;
        }
        if (HANT.equalsIgnoreCase(value) || "zh-TW".equalsIgnoreCase(value) || "zh-HK".equalsIgnoreCase(value)) {
            return HANT;
        }
        if (EN.equalsIgnoreCase(value) || "en-US".equalsIgnoreCase(value) || "en-GB".equalsIgnoreCase(value)) {
            return EN;
        }
        return null;
    }

    public static String orDefault(String raw) {
        String normalized = normalize(raw);
        return normalized == null ? HANS : normalized;
    }

    public static String unnamedEvent(String locale) {
        if (EN.equals(orDefault(locale))) {
            return "Untitled event";
        }
        if (HANT.equals(orDefault(locale))) {
            return "未命名賽事";
        }
        return "未命名赛事";
    }

    public static String firstRound(String locale) {
        if (EN.equals(orDefault(locale))) {
            return "Round 1";
        }
        if (HANT.equals(orDefault(locale))) {
            return "第一輪";
        }
        return "第一轮";
    }

    public static String projectPlaceholder(String locale, int index) {
        if (EN.equals(orDefault(locale))) {
            return "Untitled project " + index;
        }
        if (HANT.equals(orDefault(locale))) {
            return "待命名項目 " + index;
        }
        return "待命名项目 " + index;
    }

    public static String teamPlaceholder(String locale) {
        if (EN.equals(orDefault(locale))) {
            return "Team TBD";
        }
        if (HANT.equals(orDefault(locale))) {
            return "待填寫團隊";
        }
        return "待填写团队";
    }

    public static String trackPlaceholder(String locale) {
        if (EN.equals(orDefault(locale))) {
            return "Track TBD";
        }
        if (HANT.equals(orDefault(locale))) {
            return "待定賽道";
        }
        return "待定赛道";
    }

    public static String judgePlaceholder(String locale, int index) {
        if (EN.equals(orDefault(locale))) {
            return "Judge " + index;
        }
        if (HANT.equals(orDefault(locale))) {
            return "評委 " + index;
        }
        return "评委 " + index;
    }

    public static String orgPlaceholder(String locale) {
        if (EN.equals(orDefault(locale))) {
            return "Organization TBD";
        }
        if (HANT.equals(orDefault(locale))) {
            return "待填寫機構";
        }
        return "待填写机构";
    }

    public static String[] scoreHeaders(String locale) {
        if (EN.equals(orDefault(locale))) {
            return new String[]{"Judge", "Organization", "Project", "Team", "Track", "Mentor", "Weighted total", "Submitted at", "Updated at"};
        }
        if (HANT.equals(orDefault(locale))) {
            return new String[]{"評委", "機構", "項目", "團隊", "賽道", "導師", "加權總分", "提交時間", "更新時間"};
        }
        return new String[]{"评委", "机构", "项目", "团队", "赛道", "导师", "加权总分", "提交时间", "更新时间"};
    }

    public static String[] rankingHeaders(String locale) {
        if (EN.equals(orDefault(locale))) {
            return new String[]{"Rank", "Project", "Team", "Track", "Mentor", "Submitted judges", "Judge count",
                    "Scores counted", "Final score", "Highest", "Lowest", "Scoring rule"};
        }
        if (HANT.equals(orDefault(locale))) {
            return new String[]{"排名", "項目", "團隊", "賽道", "導師", "已提交評委數", "評委總數",
                    "有效評分份數", "最終得分", "最高分", "最低分", "計分規則"};
        }
        return new String[]{"排名", "项目", "团队", "赛道", "导师", "已提交评委数", "评委总数",
                "有效评分份数", "最终得分", "最高分", "最低分", "计分规则"};
    }

    public static String ruleLabel(String locale, String ruleId) {
        String id = ruleId == null ? "" : ruleId;
        if (EN.equals(orDefault(locale))) {
            if ("drop-high".equals(id)) {
                return "Drop the highest score";
            }
            if ("mean".equals(id)) {
                return "Average of all judges";
            }
            return "Drop the highest and lowest";
        }
        if (HANT.equals(orDefault(locale))) {
            if ("drop-high".equals(id)) {
                return "去掉一個最高分";
            }
            if ("mean".equals(id)) {
                return "全部評委取平均";
            }
            return "去掉最高分與最低分";
        }
        if ("drop-high".equals(id)) {
            return "去掉一个最高分";
        }
        if ("mean".equals(id)) {
            return "全部评委取平均";
        }
        return "去掉最高分与最低分";
    }
}
