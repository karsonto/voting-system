@echo off
rem ==========================================================================
rem FinVote 容器化交付脚本（Windows cmd 版，等价于 docker.ps1）
rem
rem 本文件保存为 UTF-8（无 BOM），因此先切到 65001 代码页，
rem 否则 cmd 会按 GBK 解析中文导致输出乱码。
rem ==========================================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set IMAGE=finvote:1.0.0
set PORT=8080
if exist ".env" (
  for /f "tokens=1,2 delims==" %%a in ('findstr /b /c:"FINVOTE_PORT" .env 2^>nul') do set PORT=%%b
)

if "%~1"=="" goto usage
if /i "%~1"=="build"  goto build
if /i "%~1"=="start"  goto start
if /i "%~1"=="stop"   goto stop
if /i "%~1"=="status" goto status
if /i "%~1"=="logs"   goto logs
if /i "%~1"=="backup" goto backup
if /i "%~1"=="reset"  goto reset
goto usage

:checkdocker
docker info >nul 2>&1
if errorlevel 1 (
  echo 无法连接 Docker 守护进程，请先启动 Docker Desktop。
  exit /b 1
)
exit /b 0

:build
call :checkdocker || exit /b 1
echo 构建镜像 %IMAGE%（首次会下载基础镜像与依赖，耗时较长）
rem 上下文必须是仓库根目录：镜像里要同时拿到 frontend 与 backend
docker build -f backend/Dockerfile -t %IMAGE% .
if errorlevel 1 ( echo 镜像构建失败 & exit /b 1 )
echo 构建完成：%IMAGE%
goto :eof

:start
call :checkdocker || exit /b 1
echo 构建并启动容器（数据保存在命名卷 %VOLUME%，容器重建不丢）
docker compose up -d --build
if errorlevel 1 ( echo 启动失败 & exit /b 1 )
echo.
echo FinVote 已启动，正在等待就绪...
set READY=0
for /l %%i in (1,1,30) do (
  curl -fsS -o nul http://localhost:%PORT%/api/public/version 2>nul && set READY=1
  if !READY!==1 goto ready
  timeout /t 2 /nobreak >nul
)
echo 服务未在预期时间内就绪，请执行 docker.cmd logs 查看日志
goto :eof

:ready
echo.
echo 概览页     http://localhost:%PORT%/
echo 后台配置台 http://localhost:%PORT%/admin
echo 评委评分端 http://localhost:%PORT%/judge
echo 总分大屏   http://localhost:%PORT%/board
echo.
echo 默认管理员 admin / admin123 —— 请登录后立即修改密码
goto :eof

:stop
call :checkdocker || exit /b 1
docker compose down
echo 容器已停止（数据卷 %VOLUME% 已保留）
goto :eof

:status
call :checkdocker || exit /b 1
docker compose ps
goto :eof

:logs
call :checkdocker || exit /b 1
docker compose logs -f --tail 200
goto :eof

:backup
call :checkdocker || exit /b 1
set STAMP=%DATE:~0,4%%DATE:~5,2%%DATE:~8,2%-%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set STAMP=%STAMP: =0%
if not exist "backup" mkdir "backup"

rem 数据库就映射在宿主机 .\data 下，直接用文件复制即可
if not exist "data\finvote.db" (
  echo 未找到 data\finvote.db，服务可能尚未首次启动过
  goto :eof
)

rem SQLite 开了 WAL，最新写入可能还在 -wal 文件里没落回主库。
rem 为了拿到一致快照，先停容器让 WAL 归并，再复制。
set WASRUNNING=
for /f "delims=" %%n in ('docker ps --filter "name=^/finvote$" --format "{{.Names}}"') do set WASRUNNING=%%n
if defined WASRUNNING (
  echo 先停止容器，确保 WAL 中的写入已归并到主库...
  docker compose stop >nul
)

copy /y "data\finvote.db" "backup\finvote-%STAMP%.db" >nul
rem 保险起见把伴生文件一并带走，便于在别处完整还原
if exist "data\finvote.db-wal" copy /y "data\finvote.db-wal" "backup\finvote-%STAMP%.db-wal" >nul
if exist "data\finvote.db-shm" copy /y "data\finvote.db-shm" "backup\finvote-%STAMP%.db-shm" >nul

if defined WASRUNNING (
  echo 重新启动容器...
  docker compose start >nul
)

if exist "backup\finvote-%STAMP%.db" (
  echo 备份完成：backup\finvote-%STAMP%.db
  echo 恢复方式：docker.cmd stop，把该文件覆盖回 data\finvote.db，再 docker.cmd start
) else (
  echo 备份失败
)
goto :eof

:reset
call :checkdocker || exit /b 1
echo 此操作将删除 data\finvote.db，所有赛事数据与账号都会丢失。
set /p ANSWER=确认请输入 YES:
if /i not "%ANSWER%"=="YES" ( echo 已取消 & goto :eof )
docker compose down >nul
rem 数据库映射在宿主机 ./data 目录，必须显式删除文件；
rem docker compose down -v 只清理命名卷，对宿主目录无效。
if exist "data\finvote.db" del /q "data\finvote.db*"
echo 数据已清空，下次启动为全新空库
goto :eof

:usage
echo 用法: docker.cmd {build^|start^|stop^|status^|logs^|backup^|reset}
endlocal
