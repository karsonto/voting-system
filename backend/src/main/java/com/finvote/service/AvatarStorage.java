package com.finvote.service;

import com.finvote.common.ApiException;
import com.finvote.config.FinVoteProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * 评委头像存在数据库同级的 avatars 目录，随数据目录一起备份。
 */
@Service
public class AvatarStorage {

    private static final long MAX_BYTES = 2L * 1024 * 1024;

    private final Path directory;

    public AvatarStorage(FinVoteProperties properties) {
        Path db = Paths.get(properties.getDbPath());
        if (!db.isAbsolute()) {
            db = Paths.get(System.getProperty("user.dir")).resolve(db);
        }
        Path parent = db.toAbsolutePath().normalize().getParent();
        if (parent == null) {
            parent = Paths.get(System.getProperty("user.dir")).resolve("data");
        }
        this.directory = parent.resolve("avatars").normalize();
    }

    @PostConstruct
    public void init() throws IOException {
        Files.createDirectories(directory);
    }

    public Path directory() {
        return directory;
    }

    /** 保存头像并返回文件名。同一评委再次上传会覆盖旧文件。 */
    public String store(Long judgeId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("请选择头像图片");
        }
        if (file.getSize() > MAX_BYTES) {
            throw ApiException.badRequest("头像不能超过 2MB");
        }
        String type = file.getContentType();
        if (type != null && !type.toLowerCase().startsWith("image/")) {
            throw ApiException.badRequest("请上传图片文件");
        }
        String ext = extensionOf(file.getOriginalFilename());
        String filename = "judge-" + judgeId + "." + ext;
        deleteOther(judgeId, filename);
        try {
            Files.copy(file.getInputStream(), directory.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw ApiException.badRequest("头像保存失败");
        }
        return filename;
    }

    public void delete(String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return;
        }
        String safe = Paths.get(filename).getFileName().toString();
        if (!safe.matches("judge-\\d+\\.(jpg|jpeg|png|gif|webp)")) {
            return;
        }
        try {
            Files.deleteIfExists(directory.resolve(safe));
        } catch (IOException ignored) {
            // 文件已经被清掉时不影响删评委
        }
    }

    private void deleteOther(Long judgeId, String keep) {
        String[] exts = {"jpg", "jpeg", "png", "gif", "webp"};
        for (String ext : exts) {
            String name = "judge-" + judgeId + "." + ext;
            if (!name.equals(keep)) {
                delete(name);
            }
        }
    }

    private String extensionOf(String original) {
        String ext = "";
        if (original != null) {
            int dot = original.lastIndexOf('.');
            if (dot >= 0 && dot < original.length() - 1) {
                ext = original.substring(dot + 1).toLowerCase();
            }
        }
        if ("jpeg".equals(ext)) {
            ext = "jpg";
        }
        if (!"jpg".equals(ext) && !"png".equals(ext) && !"gif".equals(ext) && !"webp".equals(ext)) {
            throw ApiException.badRequest("头像只支持 jpg、png、gif、webp");
        }
        return ext;
    }
}
