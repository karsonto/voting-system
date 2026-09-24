package com.finvote.dto;

import lombok.Data;

import java.util.List;

/**
 * 赛事信息视图。含制式与规则的展示文案，前端无需再维护一份枚举文案。
 */
@Data
public class CompetitionView {

    private Long id;
    private String name;
    private String stage;

    private String scaleId;
    private String scaleLabel;
    private String scaleDescription;
    private int maxPerDimension;

    private String ruleId;
    private String ruleLabel;
    private String ruleDescription;

    private boolean open;
    private boolean revealed;
    /** 赛事自身的修订号，与全局 version 一同用于前端判断刷新。 */
    private long rev;
    private long updatedAt;
    private long version;

    /** 当前维度权重合计，用于前端提示是否配平到 100%。 */
    private int dimensionWeightSum;
    private int dimensionCount;

    private List<RuleOptionView> ruleOptions;
    private List<RuleOptionView> scaleOptions;
}
