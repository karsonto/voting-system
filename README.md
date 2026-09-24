# FinVote · 演讲评赛投票系统

面向现场演讲/路演比赛的评分系统。四位一体：**后台配置台**编排赛事，**评委评分端**现场打分，**总分大屏**揭晓排名，**概览页**掌握全局。

单体交付——前端构建产物打进 Spring Boot 的 `static` 目录，最终只有一个 JAR，一条命令即可在现场笔记本上跑起来。

![技术栈](https://img.shields.io/badge/Java-8-orange) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-2.7.18-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![SQLite](https://img.shields.io/badge/SQLite-WAL-lightgrey) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 目录

- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [四大页面](#四大页面)
- [业务流程](#业务流程)
- [计分规则](#计分规则)
- [API 参考](#api-参考)
- [数据库结构](#数据库结构)
- [配置项](#配置项)
- [项目结构](#项目结构)
- [开发调试](#开发调试)
- [端到端测试](#端到端测试)
- [设计取舍](#设计取舍)

---

## 核心特性

| 特性 | 说明 |
|---|---|
| **揭晓前严格保密** | 未揭晓时后端**不下发任何分数**，直接请求接口也拿不到结果，可放心提前把大屏投到会场 |
| **版本号驱动的实时同步** | 全局 `data_version` 计数器，前端 1~2 秒轮询，仅版本变化才拉全量数据 |
| **随机调度出场顺序** | 一键为每位评委随机分配出场项目，保证打分顺序无规律可循 |
| **三种计分规则** | 去极值平均 / 去掉最高分 / 全部取平均，随时切换并立即重算 |
| **维度权重可调** | 权重合计不必等于 100%，删除维度后按剩余权重自动重算总分 |
| **CSV 导出** | 评分明细与项目排名，带 UTF-8 BOM，Excel 直接打开不乱码 |
| **双角色令牌鉴权** | 管理员（密码）与评委（PIN）两套独立登录，令牌有效期可配置 |
| **单 JAR 交付** | 无需 Nginx、无需 Node 环境，`java -jar` 即跑 |

---

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 后端 | Java 8 + Spring Boot 2.7.18 | 现场机器往往只有 JDK 8，兼容性优先 |
| 数据访问 | `JdbcTemplate` + 手写 SQL | 不用 ORM，SQLite 下最稳定、排查最直接 |
| 数据库 | SQLite（WAL 模式） | 零运维、单文件，赛事数据拷贝即备份 |
| 前端 | React 18 + Vite 5 | 构建快，产物小 |
| 样式 | Tailwind CSS 3 | 与设计稿的配色/间距体系一一对应 |
| 鉴权 | 自研 HMAC 签名令牌 | 不引入完整 Spring Security，只借用 `BCryptPasswordEncoder` 做密码散列 |
| 部署 | 单 JAR / Docker | 两种方式任选 |

---

## 快速开始

### 前置条件

- JDK 8 或以上（已在 JDK 8 编译目标下验证）
- 仅需运行现成 JAR 时无需 Node 与 Maven

### 方式一：本地运行（推荐用于开发）

```bash
# 1. 后端打包（仓库已含前端产物，因此可直接打包出完整 JAR）
cd backend
mvn -DskipTests package

# 2. 启动
java -jar target/finvote.jar
```

浏览器打开 <http://localhost:8080> 即可。

### 方式二：Docker（推荐用于交付）

```bash
# 建议先改密钥与密码
cp .env.example .env

# 构建并启动
docker compose up -d --build
```

Windows 上也可以用随附的脚本，功能等价：

```powershell
.\docker.ps1 -Action start     # 构建并启动，末尾打印访问地址
.\docker.ps1 -Action backup    # 备份 SQLite 到 .\backup\
.\docker.ps1 -Action logs      # 查看日志
.\docker.ps1 -Action reset     # 清空数据卷，回到空库
```

### 方式三：直接拉取官方镜像

CI 会在每次发布时自动构建镜像并推送到 Docker Hub，不装 JDK/Maven/Node 也能直接跑：

```bash
# 最新版（把 <dockerhub-user> 换成你的 Docker Hub 用户名）
docker run -d --name finvote \
  -p 8080:8080 \
  -v finvote-data:/app/data \
  -e FINVOTE_SECRET=请换成随机长字符串 \
  -e FINVOTE_ADMIN_PASSWORD=请换成强密码 \
  <dockerhub-user>/finvote:latest

# 指定版本（推荐，可复现）
docker run -d -p 8080:8080 -v finvote-data:/app/data <dockerhub-user>/finvote:v1.0.0
```

> 数据必须挂到 `/app/data`，否则容器删除时 SQLite 文件会一起丢失。

### 镜像标签规则

| 触发方式 | 生成的标签 |
|---|---|
| 推送到 `main` | `latest`、`main`、`sha-<短哈希>` |
| 推送 `v*` 标签（如 `v1.0.0`） | `v1.0.0`、`sha-<短哈希>` |
| 手动触发 workflow | 仅 `sha-<短哈希>` |

生产环境建议固定版本标签，不要用 `latest`。

### 默认账号

| 角色 | 凭据 | 说明 |
|---|---|---|
| 管理员 | `admin` / `admin123` | 首次启动自动创建。**登录后请立即修改** |
| 评委 | 由后台添加时生成 | 使用评委姓名 + 随机 PIN 登录 |

数据库起始为空库，不含任何演示数据。

---

## 四大页面

| 路径 | 页面 | 面向 | 职责 |
|---|---|---|---|
| `/` | 概览页 | 所有人 | 赛事进度、评委/项目/维度统计、各角色入口 |
| `/admin` | 后台配置台 | 组委会 | 赛制、维度权重、项目、评委、实时调度、现场开关、导出 |
| `/judge` | 评委评分端 | 评委 | 对当前项目按维度打分，支持草稿暂存与撤回 |
| `/board` | 总分大屏 | 会场投影 | 揭晓前显示出场顺序，揭晓后显示得分与排名 |

后台配置台分三个标签页：

- **赛制配置** — 赛事名称与环节、评分制式、计分规则、维度与权重
- **项目与评委** — 项目清单（队伍/赛道）、评委名册（姓名/机构/PIN）、批量生成
- **实时调度** — 逐项指定当前评审项目、一键随机分配、单条评分查看与清除

---

## 业务流程

```
① 配置          ② 开赛                ③ 评分              ④ 揭晓
后台建维度/项目  打开评分通道          评委登录打分        开启大屏揭晓
后台建评委       调度当前项目          可反复修改          大屏显示分数排名
                 ↓                     ↓                   ↓
                                   轮询版本号变化 → 大屏/后台实时刷新
```

典型现场流程：

1. 后台录入维度与权重、项目清单、评委名册
2. 为每位评委分配出场顺序（或一键随机）
3. 打开「评分通道」，评委用姓名 + PIN 登录 `/judge` 打分
4. 大屏 `/board` 提前投出——此时只显示出场顺序，**不含任何分数**
5. 全部评分完成后，后台打开「大屏揭晓」，大屏立即显示得分与排名
6. 导出 CSV 归档

---

## 计分规则

### 两步计算

**第一步：单个评委对一个项目**

评委对每个维度给出 0–100 的整数分，按维度权重折算为加权总分：

```
加权总分 = Σ(维度得分 × 维度权重) / Σ(维度权重)
```

权重合计不必等于 100%。例如维度权重 25/25/20/20/10，评委打 90/80/70/60/50：

```
(90×25 + 80×25 + 70×20 + 60×20 + 50×10) / 100 = 73.5
```

**第二步：多位评委合并为项目得分**

后台可切换三种规则：

| 规则 ID | 名称 | 行为 | 生效条件 |
|---|---|---|---|
| `trimmed-mean` | 去掉最高分与最低分 | 去掉一个最高、一个最低后取平均 | 评委数 ≥ 3 |
| `drop-high` | 去掉一个最高分 | 去掉单个最高分后取平均 | 评委数 ≥ 2 |
| `mean` | 全部评委取平均 | 不做极值处理 | 总是 |

以三位评委对某项目打出 `73.5 / 100 / 60` 为例：

| 规则 | 计算 | 得分 | 有效份数 |
|---|---|---|---|
| 去极值平均 | (73.5) / 1 | **73.5** | 1 |
| 去掉最高分 | (73.5 + 60) / 2 | 66.75 | 2 |
| 全部取平均 | (73.5 + 100 + 60) / 3 | **77.83** | 3 |

> 评委份数不足时规则自动降级（如仅 2 位评委时「去极值平均」退化为取平均），不会报错或丢失评分。

---

## API 参考

### 通用约定

- 所有接口以 `/api` 为前缀
- 鉴权令牌通过请求头传递：`X-Auth-Token: <token>`
- 时间戳统一为毫秒数
- 错误响应体：`{ "message": "..." }`，配合对应 HTTP 状态码

### 公开接口（无需令牌）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/public/version` | 轻量版本号，供前端高频轮询 |
| GET | `/api/public/state` | 全量公开状态（投屏用，未揭晓时分数为 null） |
| GET | `/api/public/judges` | 评委名单（仅姓名与机构） |
| GET | `/api/public/projects` | 项目列表（含提交进度） |

### 认证接口

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/admin/login` | — | 管理员登录 |
| POST | `/api/auth/judge/login` | — | 评委登录（姓名 + PIN） |
| GET | `/api/auth/me` | 任意角色 | 校验令牌是否有效 |
| POST | `/api/auth/logout` | 任意角色 | 退出登录 |
| POST | `/api/auth/admin/password` | 管理员 | 修改管理员密码 |
| GET | `/api/auth/context` | — | 登录页所需的赛事上下文（名称/环节/是否开放） |

### 后台接口（需管理员令牌）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/state` | 后台全量状态，一次请求拿齐所有数据 |
| PUT | `/api/admin/competition` | 更新赛事名称、环节、评分制式、计分规则 |
| PUT | `/api/admin/switches` | 开关评分通道与大屏揭晓 |
| POST/PUT/DELETE | `/api/admin/dimensions[/{id}]` | 维度增删改 |
| POST/PUT/DELETE | `/api/admin/projects[/{id}]` | 项目增删改 |
| POST/PUT/DELETE | `/api/admin/judges[/{id}]` | 评委增删改 |
| GET | `/api/admin/judges/random-pin` | 生成随机 PIN |
| POST | `/api/admin/dispatch` | 指定某位评委的当前评审项目 |
| POST | `/api/admin/dispatch/next` | 随机为评委分配出场顺序 |
| GET/DELETE | `/api/admin/scores/{judgeId}/{projectId}` | 查看/清除单条评分 |
| DELETE | `/api/admin/scores` | 清空全部评分 |
| POST | `/api/admin/scale` | 按目标数量批量增删项目与评委 |
| POST | `/api/admin/reset` | 重置为空白配置（保留管理员账号） |
| GET | `/api/admin/export/scores.csv` | 导出评分明细 CSV |
| GET | `/api/admin/export/ranking.csv` | 导出项目排名 CSV |

### 评委接口（需评委令牌）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/judge/session` | 会话数据：当前项目、维度权重、我的进度 |
| POST | `/api/judge/scores` | 提交或更新一份评分 |
| GET | `/api/judge/progress` | 我的评分进度 |
| GET | `/api/judge/scores` | 我的全部评分明细 |

---

## 数据库结构

SQLite 单文件，首次启动自动建表（`backend/src/main/resources/schema.sql`，语句均幂等）。

| 表 | 用途 | 关键约束 |
|---|---|---|
| `app_user` | 后台管理员账号 | `username` 唯一，密码经 BCrypt 散列 |
| `competition` | 赛事与全局开关 | 单赛事实现，保留多赛事扩展能力 |
| `dimension` | 评分维度与权重 | 级联删除于赛事 |
| `project` | 参赛项目 | 级联删除于赛事；含队伍与赛道 |
| `judge` | 评委 | `current_project_id` 即实时调度的当前项目，项目删除时置 NULL |
| `score` | 评分单（评委 × 项目） | `UNIQUE(judge_id, project_id)`，重复提交即更新 |
| `score_item` | 评分单的逐维度得分 | 级联删除于评分单 |
| `data_version` | 全局变更版本号 | 单行表（`CHECK (id = 1)`） |

数据源通过 JDBC URL 参数开启关键行为：

```
jdbc:sqlite:<db-path>?foreign_keys=on&busy_timeout=10000&journal_mode=WAL
```

- `foreign_keys=on` — `PRAGMA` 是按连接生效的，写在 URL 里最可靠，保证级联删除生效
- `journal_mode=WAL` — 允许读写并发，避免大屏高频轮询时阻塞写入

> **备份提醒**：WAL 模式下最新写入可能还在 `-wal` 文件里，直接复制主文件会丢数据。请使用 `docker.ps1 -Action backup`，它会先停容器归并 WAL 再复制。

---

## 配置项

`backend/src/main/resources/application.yml`，均可用环境变量覆盖（便于容器部署）：

| 配置 | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| `server.port` | — | `8080` | 服务端口 |
| `finvote.db-path` | `FINVOTE_DB_PATH` | `data/finvote.db` | 数据库文件，相对路径基于启动目录 |
| `finvote.secret` | `FINVOTE_SECRET` | 开发用占位值 | **令牌签名密钥，正式部署务必修改** |
| `finvote.admin-token-minutes` | — | `720` | 管理员令牌有效期（分钟） |
| `finvote.judge-token-minutes` | — | `720` | 评委令牌有效期（分钟） |
| `finvote.bootstrap-admin-username` | `FINVOTE_ADMIN_USERNAME` | `admin` | 首次启动创建的管理员账号 |
| `finvote.bootstrap-admin-password` | `FINVOTE_ADMIN_PASSWORD` | `admin123` | 首次启动创建的管理员密码 |
| `finvote.cors-enabled` | — | `false` | 前后端分离调试时开启 |

管理员账号**仅在库中无任何账号时创建**，改这两项不会覆盖已存在账号的密码。

---

## 项目结构

```
voting-system/
├── .github/workflows/
│   └── docker-publish.yml            CI：打标签即自动构建并推送镜像
├── backend/                          Spring Boot 后端
│   ├── Dockerfile                    三阶段构建：前端 → 后端 → 运行时
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/finvote/
│       │   ├── config/               数据源、Web、启动初始化、配置属性
│       │   ├── controller/           REST 接口层
│       │   ├── domain/               领域模型与枚举（计分规则、评分制式）
│       │   ├── dto/                  接口出参与入参
│       │   ├── repository/           JdbcTemplate 数据访问
│       │   ├── security/             令牌签发校验、鉴权拦截器
│       │   ├── service/              业务逻辑（计分、调度、导出）
│       │   └── common/               异常与统一错误处理
│       └── resources/
│           ├── application.yml
│           ├── schema.sql            建表语句（幂等）
│           └── static/               前端构建产物（已提交，见 .gitignore 说明）
├── frontend/                         React + Vite + Tailwind
│   └── src/
│       ├── components/               通用组件（布局、Toast、UI 原子）
│       ├── hooks/                    数据轮询与草稿暂存
│       ├── lib/                      API 客户端、格式化工具
│       └── pages/                    四个页面与后台各功能面板
├── design/                           原始设计稿（HTML，供对照）
├── tools/e2e-test.ps1                端到端验收脚本
├── docker-compose.yml
├── docker.ps1 / docker.cmd           交付脚本
└── .env.example

---

## 开发调试

前后端分离热更新：

```bash
# 终端 1：后端（顺带开启 CORS 便于调试）
cd backend && mvn spring-boot:run -Dspring-boot.run.arguments=--finvote.cors-enabled=true

# 终端 2：前端
cd frontend && npm install && npm run dev
```

Vite 会监听 <http://localhost:5173> 并把 `/api` 代理到 8080。

构建前端并输出到后端 static：

```bash
cd frontend && npm run build
```

`vite.config.js` 的 `outDir` 已指向 `../backend/src/main/resources/static`，因此构建后直接 `mvn package` 即可得到含最新前端的 JAR。

```bash
# 一条命令完成前后端打包
cd frontend && npm run build && cd ../backend && mvn -DskipTests package
```

---

## 持续集成与发布

`.github/workflows/docker-publish.yml` 在每次发布时自动构建镜像并推送到 Docker Hub。

**触发条件**：推送到 `main`、推送 `v*` 标签、或在 Actions 页面手动触发。

**需要配置的两个仓库密钥**（Settings → Secrets and variables → Actions）：

| 密钥 | 说明 |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub [Access Token](https://hub.docker.com/settings/security)，**不要用登录密码** |

**发布一个新版本的完整流程**：

```bash
git tag v1.0.0
git push origin v1.0.0        # 触发 CI，产出镜像 <user>/finvote:v1.0.0
```

几个实现要点：构建上下文为**仓库根目录**（镜像里要同时拿到 `frontend` 与 `backend`），`file` 指向 `backend/Dockerfile`；平台固定 `linux/amd64`，兼容绝大多数现场机器；启用 GitHub Actions 缓存（`cache-from/to: type=gha`），依赖未变动时重建通常只需十几秒。

> 想在本机复现 CI 的构建路径：`docker buildx build --platform linux/amd64 -f backend/Dockerfile -t finvote:ci-check --load .`

> **首次配置后 CI 会失败一次**，日志报 `Username and password required` —— 这说明工作流本身正常，只是仓库还没配那两个密钥。配好密钥后重新运行即可通过。

---

## 端到端测试

随附覆盖 18 个场景、61 项断言的验收脚本，会自行重置数据库状态，可重复运行：

```bash
# 先启动服务，然后
powershell -ExecutionPolicy Bypass -File tools/e2e-test.ps1
```

```
通过: 61   失败: 0
```

覆盖范围：登录与鉴权 → 赛事配置 → 维度权重 → 项目/评委增删 → 实时调度 → 评分提交与撤回 → 三种计分规则切换 → **揭晓前分数遮罩** → CSV 导出 → 维度删除后重算 → 版本号递增 → 评分清空 → 配置重置 → 静态资源与 SPA 路由。

> 脚本含中文输出，必须带 UTF-8 BOM 保存，否则 Windows PowerShell 5.1 会因代码页问题解析失败。

---

## 设计取舍

几处刻意的工程决策，记录在此以免后来者误解：

**为什么用 `JdbcTemplate` 而不是 JPA？**
SQLite 与 ORM 的方言适配长期存在摩擦（自增主键回填、`ON CONFLICT`、`PRAGMA` 等）。赛事系统 SQL 数量有限且清晰，手写 SQL 反而更稳定、性能更可控、出问题更容易定位。

**为什么用轮询而不是 WebSocket？**
现场环境网络常不可控（可能只有手机热点）。轮询更易穿透、断线自动恢复、无需维护长连接状态。配合版本号机制，无变更时只是一个极轻的整数响应。

**为什么分数遮罩做在后端？**
如果只在前端隐藏，任何人打开浏览器控制台或直接请求接口就能提前看到结果。系统在返回 DTO 阶段就把分数置为 null，`/api/public/state` 根本不包含该字段。后台与 CSV 导出不受遮罩影响，组委会在赛程中始终看得到成绩。

**为什么前端产物也提交进仓库？**
这样克隆后一条 `mvn package` 就能得到可直接运行的完整 JAR，现场不装 Node 也能出包。构建时会由 Vite 的 `emptyOutDir` 整体覆盖，不会出现新旧文件混杂。

**为什么令牌自研而不上 Spring Security？**
需求只有「两类角色 + 令牌校验」，引入完整安全框架会带来大量与 SQLite 无关的配置负担。自研方案约 200 行，签名用 HMAC-SHA256，密码用官方 `BCryptPasswordEncoder`，边界清晰且易懂易审。

**已知限制**：单赛事实现（表结构已预留多赛事扩展）、评分制式目前仅支持「百分制 · 多维度加权」（十分制与排名制在枚举中预留）、备份需短暂停服。

---

## License

MIT
