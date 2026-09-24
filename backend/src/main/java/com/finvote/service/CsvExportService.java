package com.finvote.service;

import com.finvote.domain.Competition;
import com.finvote.domain.Dimension;
import com.finvote.domain.Judge;
import com.finvote.domain.Project;
import com.finvote.domain.ScoreEntry;
import com.finvote.dto.BoardRowView;
import com.finvote.repository.ScoreRepository;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * CSV 导出。
 *
 * <p>输出带 UTF-8 BOM，Excel 直接打开不会乱码；单元格按 RFC 4180 转义。</p>
 */
@Service
public class CsvExportService {

    private static final String BOM = "\uFEFF";
    private static final String CRLF = "\r\n";

    private final CompetitionService competitionService;
    private final StateAssembler stateAssembler;
    private final ScoreRepository scoreRepository;

    private final SimpleDateFormat dateTimeFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    public CsvExportService(CompetitionService competitionService,
                            StateAssembler stateAssembler,
                            ScoreRepository scoreRepository) {
        this.competitionService = competitionService;
        this.stateAssembler = stateAssembler;
        this.scoreRepository = scoreRepository;
    }

    /** 评分明细：一行 = 一位评委对一个项目的一份评分。 */
    public String exportScores() {
        Competition competition = competitionService.current();
        Long id = competition.getId();
        List<Dimension> dimensions = stateAssembler.loadDimensions(id);
        List<Project> projects = stateAssembler.loadProjects(id);
        List<Judge> judges = stateAssembler.loadJudges(id);
        List<ScoreEntry> entries = stateAssembler.loadScores(id);
        Map<Long, Map<Long, Integer>> items = scoreRepository.findAllItems(id);
        Map<Long, Project> projectIndex = stateAssembler.indexProjects(projects);
        Map<Long, Judge> judgeIndex = stateAssembler.indexJudges(judges);

        StringBuilder sb = new StringBuilder(BOM);

        List<String> header = new ArrayList<String>();
        header.addAll(Arrays.asList("评委", "机构", "项目", "团队", "赛道"));
        for (Dimension d : dimensions) {
            header.add(d.getName() + "(" + d.getWeight() + "%)");
        }
        header.addAll(Arrays.asList("加权总分", "提交时间", "更新时间"));
        appendRow(sb, header);

        for (ScoreEntry entry : entries) {
            Judge judge = judgeIndex.get(entry.getJudgeId());
            Project project = projectIndex.get(entry.getProjectId());
            Map<Long, Integer> values = items.get(entry.getId());

            List<String> row = new ArrayList<String>();
            row.add(judge == null ? "" : judge.getName());
            row.add(judge == null ? "" : judge.getOrg());
            row.add(project == null ? "" : project.getName());
            row.add(project == null ? "" : project.getTeam());
            row.add(project == null ? "" : project.getTrack());
            for (Dimension d : dimensions) {
                Integer value = values == null ? null : values.get(d.getId());
                row.add(value == null ? "" : String.valueOf(value));
            }
            row.add(format(entry.getWeightedTotal()));
            row.add(dateTimeFormat.format(new Date(entry.getCreatedAt())));
            row.add(dateTimeFormat.format(new Date(entry.getUpdatedAt())));
            appendRow(sb, row);
        }
        return sb.toString();
    }

    /**
     * 项目排名。
     *
     * <p>导出属于赛后存档行为，因此不套用「未揭晓就隐藏分数」的规则，
     * 始终输出按规则计算出的最终得分。</p>
     */
    public String exportRanking() {
        Competition competition = competitionService.current();
        Long id = competition.getId();
        List<Project> projects = stateAssembler.loadProjects(id);
        List<Judge> judges = stateAssembler.loadJudges(id);
        List<ScoreEntry> entries = stateAssembler.loadScores(id);

        List<BoardRowView> rows = stateAssembler.board(projects, judges, entries, competition.rule(), false);

        StringBuilder sb = new StringBuilder(BOM);
        appendRow(sb, Arrays.asList("排名", "项目", "团队", "赛道", "已提交评委数", "评委总数",
                "有效评分份数", "最终得分", "最高分", "最低分", "计分规则"));

        for (BoardRowView row : rows) {
            List<String> line = new ArrayList<String>();
            line.add(row.getRank() == 0 ? "" : String.valueOf(row.getRank()));
            line.add(row.getProjectName());
            line.add(row.getTeam());
            line.add(row.getTrack());
            line.add(String.valueOf(row.getSubmittedCount()));
            line.add(String.valueOf(row.getJudgeCount()));
            line.add(String.valueOf(row.getEffectiveCount()));
            line.add(row.getMean() == null ? "" : format(row.getMean()));
            line.add(row.getHighest() == null ? "" : format(row.getHighest()));
            line.add(row.getLowest() == null ? "" : format(row.getLowest()));
            line.add(competition.rule().getLabel());
            appendRow(sb, line);
        }
        return sb.toString();
    }

    private void appendRow(StringBuilder sb, List<String> cells) {
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(csvCell(cells.get(i)));
        }
        sb.append(CRLF);
    }

    private String csvCell(String value) {
        String text = value == null ? "" : value;
        if (text.indexOf(',') >= 0 || text.indexOf('"') >= 0
                || text.indexOf('\n') >= 0 || text.indexOf('\r') >= 0) {
            return '"' + text.replace("\"", "\"\"") + '"';
        }
        return text;
    }

    private String format(double value) {
        return String.format("%.2f", value);
    }
}
