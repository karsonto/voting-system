# ==========================================================================
# 构建方式：在仓库根目录执行
#   docker build -f backend/Dockerfile -t finvote:1.0.0 .
# 或在根目录执行 docker compose up -d --build
#
# 注意：构建上下文必须是仓库根目录，因为镜像里要同时拿到 frontend 与 backend。
#
# 为什么拆成两个构建阶段：
#   Node 与 JDK 8 很难塞进同一个基础镜像——把 alpine 的 node 二进制拷进 glibc 的
#   Debian 镜像会因为 musl/glibc 不兼容而直接报 "node: not found"。
#   所以前端在 node 镜像里构建，后端在 maven 镜像里构建，产物用 COPY --from 传递。
# ==========================================================================

# ---- 阶段一：前端构建 ----
FROM node:20-alpine AS frontend-build

WORKDIR /build/frontend

# 先只拷贝依赖描述文件，让 npm 安装层能被缓存复用
COPY frontend/package.json frontend/package-lock.json* ./
# 有 lock 文件时用 ci 保证可复现；没有时退回 install
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY frontend ./

# vite.config.js 里 outDir 指向 ../backend/src/main/resources/static（方便本地开发），
# 容器里改写到镜像内的中立目录，避免污染构建上下文
RUN npx vite build --outDir /build/static --emptyOutDir

# ---- 阶段二：后端构建 ----
# 该镜像自带 Maven 与 JDK 8，省去在容器里 apt 安装与切换 JAVA_HOME 的折腾
FROM maven:3.9-eclipse-temurin-8 AS backend-build

WORKDIR /build/backend

# 同理，先拉依赖以复用缓存
COPY backend/pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

COPY backend/src ./src

# 关键一步：把前端产物放进 static，Spring Boot 打包时才会一并塞进 JAR
COPY --from=frontend-build /build/static ./src/main/resources/static

RUN mvn -B -DskipTests package

# ---- 阶段三：运行时 ----
FROM eclipse-temurin:8-jre

ENV TZ=Asia/Shanghai \
    LANG=C.UTF-8 \
    JAVA_OPTS="-Xms256m -Xmx512m -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Shanghai" \
    FINVOTE_DB_PATH=/app/data/finvote.db

# curl 供健康检查使用（temurin 基础镜像不自带）
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 数据库目录挂载点：务必挂卷，否则容器被删除时 SQLite 文件会一起丢失
RUN mkdir -p /app/data
VOLUME ["/app/data"]

COPY --from=backend-build /build/backend/target/finvote.jar /app/finvote.jar

EXPOSE 8080

# /api/public/version 是公开接口，无需令牌，适合做存活探测
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/api/public/version || exit 1

# 用 sh -c 包一层，让 JAVA_OPTS 里的多个参数被正确展开；exec 保证 JVM 成为 1 号进程，能收到停止信号
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/finvote.jar"]
