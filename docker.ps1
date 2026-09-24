<#
.SYNOPSIS
  FinVote 容器化交付脚本（构建 / 启动 / 停止 / 看日志 / 备份 / 重置数据）。

.DESCRIPTION
  在项目根目录执行。首次使用前确保 Docker Desktop 已启动。

.EXAMPLE
  .\docker.ps1 -Action build      # 构建镜像 finvote:1.0.0
  .\docker.ps1 -Action start      # 构建并后台启动，最后打印访问地址
  .\docker.ps1 -Action status     # 查看容器与健康状态
  .\docker.ps1 -Action logs       # 跟踪日志（Ctrl+C 退出，不影响容器）
  .\docker.ps1 -Action stop       # 停止并移除容器（保留 .\data 数据）
  .\docker.ps1 -Action backup     # 把 SQLite 备份到 .\backup\ 目录
  .\docker.ps1 -Action reset      # 清空 .\data 数据库，回到空库（危险，需二次确认）
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('build', 'start', 'stop', 'status', 'logs', 'backup', 'reset')]
    [string]$Action,

    # 宿主机端口，默认读 .env 里的 FINVOTE_PORT，再退回 8080
    [int]$Port = 0
)

$ErrorActionPreference = 'Stop'
$ImageName = 'finvote:1.0.0'
$ContainerName = 'finvote'
$Root = $PSScriptRoot

Set-Location $Root

function Assert-Docker {
    # 守护进程没起来时给出人话提示，而不是抛一堆 npipe 报错
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "无法连接 Docker 守护进程。请先启动 Docker Desktop，等待鲸鱼图标变为运行中后重试。"
    }
}

function Get-HostPort {
    if ($Port -gt 0) { return $Port }
    $envFile = Join-Path $Root '.env'
    if (Test-Path $envFile) {
        $match = Select-String -Path $envFile -Pattern '^\s*FINVOTE_PORT\s*=\s*(\d+)' | Select-Object -First 1
        if ($match) { return [int]$match.Matches[0].Groups[1].Value }
    }
    return 8080
}

function Wait-Healthy {
    param([int]$HostPort)

    $url = "http://localhost:$HostPort/api/public/version"
    Write-Host "  等待服务就绪 " -NoNewline
    for ($i = 0; $i -lt 60; $i++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Host " OK" -ForegroundColor Green
                return $true
            }
        } catch { }
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
    Write-Host " 超时" -ForegroundColor Yellow
    return $false
}

switch ($Action) {

    'build' {
        Assert-Docker
        Write-Host "[1/1] 构建镜像 $ImageName（首次会下载基础镜像与 npm/maven 依赖，耗时较长）" -ForegroundColor Cyan
        # 上下文必须是根目录：镜像里要同时拿到 frontend 与 backend
        docker build -f backend/Dockerfile -t $ImageName .
        if ($LASTEXITCODE -ne 0) { throw "镜像构建失败" }
        Write-Host "构建完成：$ImageName" -ForegroundColor Green
    }

    'start' {
        Assert-Docker
        Write-Host "构建并启动容器（数据保存在命名卷 $VolumeName，容器重建不丢）" -ForegroundColor Cyan
        docker compose up -d --build
        if ($LASTEXITCODE -ne 0) { throw "启动失败" }

        $hostPort = Get-HostPort
        if (Wait-Healthy -HostPort $hostPort) {
            Write-Host ""
            Write-Host "FinVote 已启动" -ForegroundColor Green
            Write-Host "  概览页   http://localhost:$hostPort/"
            Write-Host "  后台配置台 http://localhost:$hostPort/admin"
            Write-Host "  评委评分端 http://localhost:$hostPort/judge"
            Write-Host "  总分大屏   http://localhost:$hostPort/board"
            Write-Host ""
            Write-Host "  默认管理员 admin / admin123 —— 请登录后立即修改密码" -ForegroundColor Yellow
        } else {
            Write-Host "服务未在预期时间内就绪，请执行 .\docker.ps1 -Action logs 查看日志" -ForegroundColor Yellow
        }
    }

    'stop' {
        Assert-Docker
        docker compose down
        Write-Host "容器已停止（数据卷 $VolumeName 已保留）" -ForegroundColor Green
    }

    'status' {
        Assert-Docker
        docker compose ps
    }

    'logs' {
        Assert-Docker
        docker compose logs -f --tail 200
    }

    'backup' {
        Assert-Docker
        $backupDir = Join-Path $Root 'backup'
        if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $target = Join-Path $backupDir "finvote-$stamp.db"

        # 数据库就映射在宿主机 .\data 下，直接用文件复制即可，无需临时容器
        $dbFile = Join-Path $Root 'data\finvote.db'
        if (-not (Test-Path $dbFile)) {
            Write-Host "未找到数据库 $dbFile，服务可能尚未首次启动过" -ForegroundColor Yellow
            return
        }

        # SQLite 开了 WAL，最新写入可能还在 -wal 文件里没落回主库。
        # 为了拿到一致快照，先停容器让 WAL 归并，再复制。
        $running = docker ps --filter "name=^/$ContainerName$" --format "{{.Names}}"
        $wasRunning = [bool]$running
        if ($wasRunning) {
            Write-Host "先停止容器，确保 WAL 中的写入已归并到主库..." -ForegroundColor Cyan
            docker compose stop | Out-Null
        }

        Copy-Item $dbFile $target -Force
        # 保险起见把伴生文件一并带走，便于在别处完整还原
        foreach ($suffix in @('-wal', '-shm')) {
            $side = "$dbFile$suffix"
            if (Test-Path $side) { Copy-Item $side "$target$suffix" -Force }
        }

        if ($wasRunning) {
            Write-Host "重新启动容器..." -ForegroundColor Cyan
            docker compose start | Out-Null
            # 备份过程中停了服务，重启后等它真正可用再返回，避免使用者立刻访问报错
            $hostPort = Get-HostPort
            if (-not (Wait-Healthy -HostPort $hostPort)) {
                Write-Host "服务尚未就绪，请稍等片刻或查看 .\docker.ps1 -Action logs" -ForegroundColor Yellow
            }
        }

        $sizeKb = [math]::Round((Get-Item $target).Length / 1KB, 1)
        Write-Host "备份完成：$target（$sizeKb KB）" -ForegroundColor Green
        Write-Host "恢复方式：先 .\docker.ps1 -Action stop，把该文件覆盖回 .\data\finvote.db，再 -Action start" -ForegroundColor Yellow
    }

    'reset' {
        Assert-Docker
        Write-Host "此操作将删除 .\data\finvote.db，所有赛事数据与账号都会丢失。" -ForegroundColor Red
        $answer = Read-Host "确认请输入 YES"
        if ($answer -ne 'YES') {
            Write-Host "已取消" -ForegroundColor Yellow
            return
        }
        docker compose down | Out-Null
        # 数据库映射在宿主机 ./data 目录，因此必须显式删除文件；
        # docker compose down -v 只清理命名卷，对宿主目录无效。
        Get-ChildItem (Join-Path $Root 'data') -Filter 'finvote.db*' -ErrorAction SilentlyContinue | Remove-Item -Force
        Write-Host "数据已清空，下次启动为全新空库" -ForegroundColor Green
    }
}
