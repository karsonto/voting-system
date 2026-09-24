package com.finvote.controller;

import com.finvote.security.RequiresAuth;
import com.finvote.security.TokenPayload;
import com.finvote.service.CsvExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

/**
 * 数据导出。
 */
@RestController
@RequestMapping("/api/admin/export")
@RequiresAuth(roles = TokenPayload.ROLE_ADMIN)
public class ExportController {

    private final CsvExportService csvExportService;

    public ExportController(CsvExportService csvExportService) {
        this.csvExportService = csvExportService;
    }

    /** 评分明细 CSV。 */
    @GetMapping("/scores.csv")
    public ResponseEntity<byte[]> scores() {
        return csv("FinVote_评分明细.csv", csvExportService.exportScores());
    }

    /** 项目排名 CSV。 */
    @GetMapping("/ranking.csv")
    public ResponseEntity<byte[]> ranking() {
        return csv("FinVote_项目排名.csv", csvExportService.exportRanking());
    }

    private ResponseEntity<byte[]> csv(String filename, String content) {
        byte[] body;
        try {
            body = content.getBytes("UTF-8");
        } catch (UnsupportedEncodingException ex) {
            body = content.getBytes();
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"; filename*=UTF-8''"
                + urlEncode(filename));
        headers.setContentLength(body.length);
        return new ResponseEntity<byte[]>(body, headers, org.springframework.http.HttpStatus.OK);
    }

    private String urlEncode(String value) {
        try {
            return URLEncoder.encode(value, "UTF-8").replace("+", "%20");
        } catch (UnsupportedEncodingException ex) {
            return value;
        }
    }
}
