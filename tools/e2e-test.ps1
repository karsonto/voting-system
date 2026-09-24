# FinVote 端到端接口验证
# 用法: powershell -ExecutionPolicy Bypass -File tools\e2e-test.ps1
#       powershell -ExecutionPolicy Bypass -File tools\e2e-test.ps1 -Port 8081
param(
    # 服务端口。默认 8080；若本机 8080 已被 IDE 调试进程占用，可指定其他端口。
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$Base = "http://localhost:$Port"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$script:Pass = 0
$script:Fail = 0

function Send-Json {
    param(
        [string]$Method,
        [string]$Path,
        $Body = $null,
        [string]$Token = $null
    )
    $headers = @{}
    if ($Token) { $headers['X-Auth-Token'] = $Token }

    $params = @{
        Uri         = "$Base$Path"
        Method      = $Method
        Headers     = $headers
        ContentType = 'application/json; charset=utf-8'
    }
    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 8 -Compress
        $params['Body'] = [System.Text.Encoding]::UTF8.GetBytes($json)
    }
    return Invoke-RestMethod @params
}

function Check {
    param([string]$Name, [bool]$Condition, [string]$Detail = '')
    if ($Condition) {
        $script:Pass++
        Write-Host "  [PASS] $Name" -ForegroundColor Green
    } else {
        $script:Fail++
        Write-Host "  [FAIL] $Name $Detail" -ForegroundColor Red
    }
}

# Invoke-WebRequest 的 Content 在 PowerShell 5.1 下可能是 String，也可能是 byte[]，
# 取决于响应的 Content-Type，这里统一转成字符串再断言。
function Get-ResponseText {
    param($Response)
    if ($Response.Content -is [byte[]]) {
        return [System.Text.Encoding]::UTF8.GetString($Response.Content)
    }
    return [string]$Response.Content
}

Write-Host "`n=== 1. 公开接口 ===" -ForegroundColor Cyan
$version = Send-Json GET '/api/public/version'
Check 'GET /api/public/version 返回 version' ($null -ne $version.version) "got=$($version.version)"

$state = Send-Json GET '/api/public/state'
Check 'GET /api/public/state 返回赛事' ($null -ne $state.competition)
Check '评委名单不含 PIN 字段' ($null -eq $state.judges[0].pin -or $state.judges[0].PSObject.Properties.Name -notcontains 'pin')
$v0 = $state.version

Write-Host "`n=== 2. 未鉴权访问后台接口应被拒绝 ===" -ForegroundColor Cyan
$rejected = $false
try { Send-Json GET '/api/admin/state' | Out-Null } catch { $rejected = $_.Exception.Response.StatusCode.value__ -eq 401 }
Check 'GET /api/admin/state 无令牌返回 401' $rejected

$wrongPwd = $false
try { Send-Json POST '/api/auth/admin/login' @{ username = 'admin'; password = 'wrong-password' } | Out-Null } catch { $wrongPwd = $true }
Check '错误密码登录被拒绝' $wrongPwd

Write-Host "`n=== 3. 管理员登录 ===" -ForegroundColor Cyan
$login = Send-Json POST '/api/auth/admin/login' @{ username = 'admin'; password = 'admin123' }
$admin = $login.token
Check '管理员登录成功并返回令牌' ([bool]$admin)

$me = Send-Json GET '/api/auth/me' -Token $admin
Check 'GET /api/auth/me 返回 ADMIN 角色' ($me.role -eq 'ADMIN')

# 让脚本可反复执行：先清空上一轮留下的配置
Send-Json POST '/api/admin/reset' -Token $admin | Out-Null
$fresh = Send-Json GET '/api/admin/state' -Token $admin
Check '测试前置：库已重置为空白' ($fresh.projects.Count -eq 0 -and $fresh.judges.Count -eq 0 -and $fresh.dimensions.Count -eq 0)

Write-Host "`n=== 4. 配置赛制 ===" -ForegroundColor Cyan
Send-Json PUT '/api/admin/competition' @{ name = '端到端测试赛事'; stage = '第一轮'; ruleId = 'trimmed-mean' } -Token $admin | Out-Null
$cfg = Send-Json GET '/api/admin/state' -Token $admin
Check '赛事名称已更新' ($cfg.competition.name -eq '端到端测试赛事') "got=$($cfg.competition.name)"
Check '计分规则为去掉最高最低分' ($cfg.competition.ruleId -eq 'trimmed-mean')
Check '未支持的评分制式被拒绝' $(try { Send-Json PUT '/api/admin/competition' @{ scaleId = 'rank' } -Token $admin | Out-Null; $false } catch { $true })

# 维度：25 + 25 + 20 + 20 + 10 = 100
$dimIds = @()
foreach ($d in @(@('专业度', 25), @('逻辑深度', 25), @('表达感染力', 20), @('创新价值', 20), @('时间控制', 10))) {
    $r = Send-Json POST '/api/admin/dimensions' @{ name = $d[0]; weight = $d[1] } -Token $admin
    $dimIds += $r.id
}
$cfg = Send-Json GET '/api/admin/state' -Token $admin
Check '创建 5 个维度' ($cfg.dimensions.Count -eq 5) "got=$($cfg.dimensions.Count)"
Check '维度权重合计 100%' ($cfg.competition.dimensionWeightSum -eq 100) "got=$($cfg.competition.dimensionWeightSum)"

Write-Host "`n=== 5. 录入项目与评委 ===" -ForegroundColor Cyan
$projIds = @()
foreach ($name in @('项目Alpha', '项目Beta')) {
    $r = Send-Json POST '/api/admin/projects' @{ name = $name; team = '测试团队'; track = '测试赛道' } -Token $admin
    $projIds += $r.id
}
$judgeIds = @()
$pins = @()
foreach ($n in @(@('甲评委', '1001'), @('乙评委', '1002'), @('丙评委', '1003'))) {
    $r = Send-Json POST '/api/admin/judges' @{ name = $n[0]; org = '测试机构'; pin = $n[1] } -Token $admin
    $judgeIds += $r.id
    $pins += $n[1]
}
$cfg = Send-Json GET '/api/admin/state' -Token $admin
Check '创建 2 个项目' ($cfg.projects.Count -eq 2)
Check '创建 3 位评委' ($cfg.judges.Count -eq 3)
Check '新增 PIN 校验：3 位数字被拒绝' $(try { Send-Json POST '/api/admin/judges' @{ name = '错PIN'; pin = '123'; org = '' } -Token $admin | Out-Null; $false } catch { $true })

Write-Host "`n=== 6. 关闭通道时禁止提交 ===" -ForegroundColor Cyan
Send-Json PUT '/api/admin/switches' @{ open = $false } -Token $admin | Out-Null
$judgeLogin = Send-Json POST '/api/auth/judge/login' @{ judgeId = $judgeIds[0]; pin = '1001' }
$judgeToken = $judgeLogin.token
Check '评委登录成功' ([bool]$judgeToken)

$blockedSubmit = $false
try {
    Send-Json POST '/api/judge/scores' @{ projectId = $projIds[0]; values = @{ "$($dimIds[0])" = 90 } } -Token $judgeToken | Out-Null
} catch { $blockedSubmit = $true }
Check '通道关闭时提交被拒绝' $blockedSubmit

$badPin = $false
try { Send-Json POST '/api/auth/judge/login' @{ judgeId = $judgeIds[0]; pin = '9999' } | Out-Null } catch { $badPin = $true }
Check '错误 PIN 被拒绝' $badPin

Write-Host "`n=== 7. 开放通道并调度 ===" -ForegroundColor Cyan
Send-Json PUT '/api/admin/switches' @{ open = $true } -Token $admin | Out-Null
Send-Json POST '/api/admin/dispatch' @{ judgeIds = $judgeIds; projectId = $projIds[0] } -Token $admin | Out-Null

$session = Send-Json GET '/api/judge/session' -Token $judgeToken
Check '评委当前项目已被调度' ($session.currentProject.id -eq $projIds[0]) "got=$($session.currentProject.id)"

Write-Host "`n=== 8. 提交评分与加权计算 ===" -ForegroundColor Cyan
# 甲评委对项目A: 90/80/70/60/50 -> 加权 = (90*25+80*25+70*20+60*20+50*10)/100 = 73.5
$values = @{}
$values["$($dimIds[0])"] = 90
$values["$($dimIds[1])"] = 80
$values["$($dimIds[2])"] = 70
$values["$($dimIds[3])"] = 60
$values["$($dimIds[4])"] = 50
$submit = Send-Json POST '/api/judge/scores' @{ projectId = $projIds[0]; values = $values; comment = '测试评语' } -Token $judgeToken
Check '加权总分计算正确 (73.5)' ([math]::Abs($submit.weightedTotal - 73.5) -lt 0.01) "got=$($submit.weightedTotal)"

$missingDim = $false
try {
    Send-Json POST '/api/judge/scores' @{ projectId = $projIds[0]; values = @{ "$($dimIds[0])" = 90 } } -Token $judgeToken | Out-Null
} catch { $missingDim = $true }
Check '缺少维度打分被拒绝' $missingDim

$outOfRange = $false
try {
    $bad = @{}
    foreach ($id in $dimIds) { $bad["$id"] = 101 }
    Send-Json POST '/api/judge/scores' @{ projectId = $projIds[0]; values = $bad } -Token $judgeToken | Out-Null
} catch { $outOfRange = $true }
Check '超出 0-100 的分数被拒绝' $outOfRange

Write-Host "`n=== 9. 揭晓前分数必须隐藏 ===" -ForegroundColor Cyan
$pub = Send-Json GET '/api/public/state'
Check '未揭晓时 masked=true' ($pub.board[0].masked -eq $true)
Check '未揭晓时不下发 mean' ($null -eq $pub.board[0].mean) "got=$($pub.board[0].mean)"
Check '未揭晓时不下发 highest' ($null -eq $pub.board[0].highest)
Check '但会下发提交进度' ($pub.board[0].submittedCount -eq 1) "got=$($pub.board[0].submittedCount)"
$raw = Invoke-WebRequest -Uri "$Base/api/public/state" -UseBasicParsing
$rawText = Get-ResponseText $raw
Check '公开响应体内不含 mean 字段' ($rawText -notmatch '"mean":')
Check '公开响应体内不含 weightedTotal 字段' ($rawText -notmatch '"weightedTotal"')
Check '统计口径：有效评委数 = 评委数 - 2' ($pub.stats.effectiveScoreCount -eq 1) "got=$($pub.stats.effectiveScoreCount)"

Write-Host "`n=== 10. 去掉最高最低分 ===" -ForegroundColor Cyan
# 三位评委对项目A分别打 73.5 / 100 / 60 -> 去掉最高(100)最低(60) 取 73.5
$scores = @(@(90, 80, 70, 60, 50), @(100, 100, 100, 100, 100), @(60, 60, 60, 60, 60))
for ($i = 1; $i -lt 3; $i++) {
    $tok = (Send-Json POST '/api/auth/judge/login' @{ judgeId = $judgeIds[$i]; pin = $pins[$i] }).token
    $vals = @{}
    for ($k = 0; $k -lt 5; $k++) { $vals["$($dimIds[$k])"] = $scores[$i][$k] }
    Send-Json POST '/api/judge/scores' @{ projectId = $projIds[0]; values = $vals; comment = '' } -Token $tok | Out-Null
}

# 注意：后台接口不受「揭晓前隐藏分数」限制（组委会随时可看），
# 因此这里可以直接断言计算结果。
$revealed = Send-Json GET '/api/admin/state' -Token $admin
$rowA = $revealed.board | Where-Object { $_.projectId -eq $projIds[0] }
Check '3 份有效评分' ($rowA.submittedCount -eq 3) "got=$($rowA.submittedCount)"
Check '有效份数 = 3 - 2 = 1' ($rowA.effectiveCount -eq 1) "got=$($rowA.effectiveCount)"
Check '去极值后得分 = 73.5' ([math]::Abs($rowA.mean - 73.5) -lt 0.01) "got=$($rowA.mean)"
Check '最高分记录为 100' ([math]::Abs($rowA.highest - 100) -lt 0.01) "got=$($rowA.highest)"
Check '最低分记录为 60' ([math]::Abs($rowA.lowest - 60) -lt 0.01) "got=$($rowA.lowest)"

Write-Host "`n=== 11. 揭晓（公开接口开始下发分数） ===" -ForegroundColor Cyan
$beforeReveal = Send-Json GET '/api/public/state'
Check '揭晓前公开接口仍隐藏分数' ($null -eq $beforeReveal.board[0].mean)

Send-Json PUT '/api/admin/switches' @{ revealed = $true } -Token $admin | Out-Null
$pub = Send-Json GET '/api/public/state'
Check '揭晓后 masked=false' ($pub.board[0].masked -eq $false)
Check '揭晓后下发 mean' ($null -ne $pub.board[0].mean) "got=$($pub.board[0].mean)"
Check '揭晓后排名从 1 开始' ($pub.board[0].rank -eq 1)
Check '分数降序排列' ($pub.board[0].mean -ge $pub.board[1].mean)

Write-Host "`n=== 12. 切换计分规则 ===" -ForegroundColor Cyan
Send-Json PUT '/api/admin/competition' @{ ruleId = 'mean' } -Token $admin | Out-Null
$meanState = Send-Json GET '/api/admin/state' -Token $admin
$rowMean = $meanState.board | Where-Object { $_.projectId -eq $projIds[0] }
# (73.5 + 100 + 60) / 3 = 77.83
Check '全部取平均 = 77.83' ([math]::Abs($rowMean.mean - 77.83) -lt 0.02) "got=$($rowMean.mean)"
Check '有效份数为 3' ($rowMean.effectiveCount -eq 3)
Send-Json PUT '/api/admin/competition' @{ ruleId = 'trimmed-mean' } -Token $admin | Out-Null

Write-Host "`n=== 13. CSV 导出 ===" -ForegroundColor Cyan
$csv = Invoke-WebRequest -Uri "$Base/api/admin/export/scores.csv" -Headers @{ 'X-Auth-Token' = $admin } -UseBasicParsing
$csvText = Get-ResponseText $csv
Check '评分明细 CSV 返回 200' ($csv.StatusCode -eq 200)
Check 'CSV 带 UTF-8 BOM' ($csvText.StartsWith([char]0xFEFF))
Check 'CSV 含维度列' ($csvText -match '专业度\(25%\)')
Check 'CSV 含加权总分列' ($csvText -match '加权总分')

$rank = Invoke-WebRequest -Uri "$Base/api/admin/export/ranking.csv" -Headers @{ 'X-Auth-Token' = $admin } -UseBasicParsing
$rankText = Get-ResponseText $rank
Check '排名 CSV 含最终得分列' ($rankText -match '最终得分')

Write-Host "`n=== 14. 维度删除后重算总分 ===" -ForegroundColor Cyan
Send-Json DELETE "/api/admin/dimensions/$($dimIds[4])" -Token $admin | Out-Null
$after = Send-Json GET '/api/admin/state' -Token $admin
Check '维度减少为 4 个' ($after.dimensions.Count -eq 4) "got=$($after.dimensions.Count)"
Check '权重合计变为 90%' ($after.competition.dimensionWeightSum -eq 90)
# 甲评委剩余维度 90/80/70/60 权重 25/25/20/20 -> (90*25+80*25+70*20+60*20)/90 = 76.11
$scoreA = $after.scores | Where-Object { $_.judgeId -eq $judgeIds[0] } | Select-Object -First 1
Check '删除维度后加权总分按剩余权重重算' ([math]::Abs($scoreA.weightedTotal - 76.11) -lt 0.02) "got=$($scoreA.weightedTotal)"

Write-Host "`n=== 15. 版本号递增（实时同步基础） ===" -ForegroundColor Cyan
$v1 = (Send-Json GET '/api/public/version').version
Start-Sleep -Milliseconds 60
Send-Json POST '/api/admin/projects' @{ name = '项目Gamma'; team = ''; track = '' } -Token $admin | Out-Null
$v2 = (Send-Json GET '/api/public/version').version
Check '写操作后版本号递增' ($v2 -gt $v1) "v1=$v1 v2=$v2"

Write-Host "`n=== 16. 清理 ===" -ForegroundColor Cyan
Send-Json DELETE '/api/admin/scores' -Token $admin | Out-Null
$cleared = Send-Json GET '/api/admin/state' -Token $admin
Check '评分已清空' ($cleared.stats.scoreCount -eq 0)
Check '项目与评委保留' ($cleared.projects.Count -eq 3 -and $cleared.judges.Count -eq 3)

Write-Host "`n=== 17. 重置配置 ===" -ForegroundColor Cyan
Send-Json POST '/api/admin/reset' -Token $admin | Out-Null
$reset = Send-Json GET '/api/admin/state' -Token $admin
Check '项目已清空' ($reset.projects.Count -eq 0)
Check '评委已清空' ($reset.judges.Count -eq 0)
Check '维度已清空' ($reset.dimensions.Count -eq 0)
Check '管理员账号仍可访问' ($reset.currentUsername -eq 'admin')

Write-Host "`n=== 18. 静态资源 ===" -ForegroundColor Cyan
foreach ($path in @('/', '/admin', '/judge', '/board')) {
    $r = Invoke-WebRequest -Uri "$Base$path" -UseBasicParsing
    $body = Get-ResponseText $r
    Check "GET $path 返回 200 且为 HTML" ($r.StatusCode -eq 200 -and $body -match '<div id="root">')
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 通过: $script:Pass   失败: $script:Fail" -ForegroundColor $(if ($script:Fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "========================================`n"
exit $script:Fail
