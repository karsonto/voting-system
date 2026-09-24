package com.finvote.dto;

import lombok.Data;

/**
 * 维度视图。
 */
@Data
public class DimensionView {

    private Long id;
    private String name;
    private int weight;
    private int sortOrder;
}
