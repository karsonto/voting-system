import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, authApi, downloadExport, storage } from '../lib/api.js'
import { useAdminState } from '../hooks/useAdminState.js'
import { Toast, useToast } from '../components/Toast.jsx'
import { Pill } from '../components/ui.jsx'
import { AdminLogin } from './AdminLogin.jsx'
import { InfoPanel } from './admin/InfoPanel.jsx'
import { ScalePanel } from './admin/ScalePanel.jsx'
import { RulePanel } from './admin/RulePanel.jsx'
import { DimensionPanel } from './admin/DimensionPanel.jsx'
import { ProjectTable } from './admin/ProjectTable.jsx'
import { JudgeTable } from './admin/JudgeTable.jsx'
import { DispatchPanel } from './admin/DispatchPanel.jsx'
import { StagePanel } from './admin/StagePanel.jsx'
import { currentClockFull } from '../lib/format.js'

const TABS = [
  { id: 'setup', label: '赛制配置' },
  { id: 'roster', label: '项目与评委' },
  { id: 'dispatch', label: '实时调度' },
  { id: 'stage', label: '揭晓与导出' },
]

/**
 * 后台配置台。
 *
 * 未登录时展示登录页；登录后由 {@link useAdminState} 按版本号轮询，
 * 因此组委会可以实时看到评委端的提交进度。
 */
export function AdminPage() {
  const [hasToken, setHasToken] = useState(() => !!storage.getAdminToken())
  const { state, loading, mutate, error } = useAdminState({ enabled: hasToken })
  const { message, show } = useToast()
  const [tab, setTab] = useState('setup')
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async (action, successMessage) => {
      setBusy(true)
      try {
        await mutate(action)
        if (successMessage) show(successMessage)
        return true
      } catch (err) {
        if (err.status !== 401) show(err.message || '操作失败')
        return false
      } finally {
        setBusy(false)
      }
    },
    [mutate, show],
  )

  const competition = state?.competition
  const dimensions = useMemo(() => state?.dimensions ?? [], [state])
  const projects = useMemo(() => state?.projects ?? [], [state])
  const judges = useMemo(() => state?.judges ?? [], [state])
  const stats = state?.stats
  const judgeCount = judges.length

  // ------------------------------------------------------------ 各面板的回调

  const handleSaveInfo = (payload) => run(() => adminApi.updateCompetition(payload))

  const handleApplyScale = (projectCount, judgeCountValue) =>
    run(
      () => adminApi.applyScale(projectCount, judgeCountValue),
      `规模已调整为 ${projectCount} 个项目 / ${judgeCountValue} 位评委`,
    )

  const handleSelectScale = (scaleId) =>
    run(() => adminApi.updateCompetition({ scaleId }), '评分制式已更新')

  const handleSelectRule = (ruleId) => run(() => adminApi.updateCompetition({ ruleId }), '计分规则已更新')

  const handleAddDimension = () =>
    run(() => adminApi.addDimension({ name: '新维度', weight: 0 }), '已添加维度，请设置名称与权重')

  const handleUpdateDimension = (id, payload) => run(() => adminApi.updateDimension(id, payload))

  const handleDeleteDimension = async (id) => {
    const dimension = dimensions.find((d) => d.id === id)
    if (dimensions.length <= 1) {
      show('至少需要保留一个评分维度')
      return
    }
    const hasScores = (stats?.scoreCount ?? 0) > 0
    const confirmed = window.confirm(
      `确定删除维度「${dimension?.name ?? ''}」吗？` +
        (hasScores ? '\n已提交的评分会按剩余维度重新折算总分。' : ''),
    )
    if (!confirmed) return
    await run(() => adminApi.deleteDimension(id), '维度已删除，评分总分已重算')
  }

  const handleAddProject = (payload) => run(() => adminApi.addProject(payload), '项目已添加')

  const handleUpdateProject = (id, payload) => run(() => adminApi.updateProject(id, payload), '项目已更新')

  const handleDeleteProject = async (project) => {
    const confirmed = window.confirm(
      `确定删除项目「${project.name}」吗？\n该项目的评分会一并删除，调度到该项目的评委将变为未分配。`,
    )
    if (!confirmed) return
    await run(() => adminApi.deleteProject(project.id), '项目已删除')
  }

  const handleAddJudge = (payload) => run(() => adminApi.addJudge(payload), '评委已添加')

  const handleUpdateJudge = (id, payload) => run(() => adminApi.updateJudge(id, payload), '评委已更新')

  const handleDeleteJudge = async (judge) => {
    const confirmed = window.confirm(`确定删除评委「${judge.name}」吗？\n该评委的全部评分会被删除，此操作不可撤销。`)
    if (!confirmed) return
    await run(() => adminApi.deleteJudge(judge.id), '评委已删除')
  }

  const handleRandomPin = () => adminApi.randomPin()

  const handleDispatchAll = (judgeIds, projectId) =>
    run(
      () => adminApi.dispatch(judgeIds, projectId),
      projectId === null
        ? '已取消全部调度'
        : `已切换到「${projects.find((p) => p.id === projectId)?.name ?? ''}」`,
    )

  const handleDispatchOne = (judgeId, projectId) =>
    run(() => adminApi.dispatch([judgeId], projectId), '已更新该评委的评审项目')

  const handleDispatchNext = async () => {
    setBusy(true)
    try {
      const result = await mutate(() => adminApi.dispatchNext())
      const next = projects.find((p) => p.id === result?.projectId)
      show(next ? `已切到下一项：${next.name}` : '已切到下一项')
    } catch (err) {
      if (err.status !== 401) show(err.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const handleClearScore = async (judge) => {
    const project = projects.find((p) => p.id === judge.currentProjectId)
    const confirmed = window.confirm(`确定清空「${judge.name}」对「${project?.name ?? ''}」的评分吗？`)
    if (!confirmed) return
    await run(() => adminApi.clearScore(judge.id, judge.currentProjectId), '已清空该评委的评分')
  }

  const handleToggleOpen = (open) =>
    run(() => adminApi.updateSwitches({ open }), open ? '评分通道已开启' : '评分通道已关闭')

  const handleToggleReveal = (revealed) =>
    run(() => adminApi.updateSwitches({ revealed }), revealed ? '大屏已揭晓结果' : '大屏已隐藏分数')

  const handleExport = async (kind) => {
    setBusy(true)
    try {
      await downloadExport(kind)
      show(kind === 'ranking' ? '项目排名已导出' : '评分明细已导出')
    } catch (err) {
      show(err.message || '导出失败')
    } finally {
      setBusy(false)
    }
  }

  const handleClearScores = async () => {
    const confirmed = window.confirm(
      `确定清空全部 ${stats?.scoreCount ?? 0} 份评分吗？\n项目、评委与维度配置会保留，此操作不可撤销。`,
    )
    if (!confirmed) return
    await run(() => adminApi.clearAllScores(), '评分已全部清空')
  }

  const handleReset = async () => {
    await run(() => adminApi.reset(), '配置已重置为空白状态')
  }

  const handleLogout = async () => {
    try {
      await authApi.logout('ADMIN')
    } catch {
      /* 令牌无状态，退出失败也不影响本地清理 */
    }
    storage.clearAdmin()
    setHasToken(false)
    show('已退出登录')
  }

  // ------------------------------------------------------------ 渲染

  if (!hasToken) {
    return (
      <AdminLogin
        onSuccess={() => {
          setHasToken(true)
          show('登录成功')
        }}
      />
    )
  }

  if (loading && !state) {
    return (
      <div className="mx-auto max-w-[1200px] px-8 py-14 max-md:px-4">
        <div className="h-4 w-48 animate-pulse rounded bg-ink/10" />
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-ink/10" />
          <div className="h-64 animate-pulse rounded-lg bg-ink/10" />
        </div>
      </div>
    )
  }

  const weightSum = competition?.dimensionWeightSum ?? 0

  const tabCounts = {
    setup: `${dimensions.length} 维度`,
    roster: `${projects.length}/${judges.length}`,
    dispatch: `${projects.filter((p) => p.submittedCount > 0).length} 项有分`,
    stage: competition?.revealed ? '已揭晓' : '未揭晓',
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6 max-md:px-4">
      <div className="grid gap-6 lg:grid-cols-[236px_1fr]">
        {/* 侧边栏 */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-[76px] lg:h-[calc(100vh-100px)] lg:overflow-auto">
          <div className="panel p-3">
            <div className="flex items-center gap-2.5 px-2 pb-3.5">
              <span className="grid h-6 w-6 place-items-center rounded-md border border-ink font-mono text-xs font-bold">
                FV
              </span>
              <span className="text-[15px] font-semibold">FinVote 后台</span>
            </div>

            <div className="mb-3.5 rounded border border-line px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">当前赛事</div>
              <div className="mt-1 text-[13.5px] font-semibold leading-snug">{competition?.name || '未命名赛事'}</div>
              <div className="meta mt-1">{competition?.stage || '—'}</div>
            </div>

            <nav className="flex flex-col gap-0.5 max-lg:flex-row max-lg:flex-wrap">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition ${
                    tab === item.id
                      ? 'bg-ink/[0.05] font-semibold text-ink'
                      : 'text-ink-muted hover:bg-ink/[0.03] hover:text-ink'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[11px] text-ink-muted">{tabCounts[item.id]}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-1 pt-4">
              <Link to="/" className="btn btn-ghost btn-sm justify-start">
                返回总览
              </Link>
              <Link to="/board" className="btn btn-ghost btn-sm justify-start">
                打开总分大屏
              </Link>
              <button type="button" className="btn btn-ghost btn-sm justify-start" onClick={handleLogout}>
                退出登录
              </button>
            </div>
          </div>

          {usingDefaultPassword() && (
            <div className="rounded-lg border border-danger-ink/30 bg-danger-soft px-3.5 py-3">
              <p className="text-[12.5px] text-danger-ink">
                管理员仍在使用默认密码，请到「揭晓与导出 → 管理员密码」处修改。
              </p>
            </div>
          )}
        </aside>

        {/* 主区 */}
        <div className="min-w-0">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-semibold">后台配置台</h1>
              <p className="meta mt-1">
                {projects.length} 个项目 · {judges.length} 位评委 · {stats?.scoreCount ?? 0} 份评分
                {state?.updatedAt ? ` · 数据更新 ${currentClockFull(new Date(state.updatedAt))}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {weightSum !== 100 && <Pill tone="danger">维度权重合计 {weightSum}%</Pill>}
              <Pill tone={competition?.open ? 'ok' : 'warn'} live={competition?.open}>
                {competition?.open ? '评分开放中' : '评分已关闭'}
              </Pill>
              <button
                type="button"
                className={competition?.open ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                onClick={() => handleToggleOpen(!competition?.open)}
                disabled={busy}
              >
                {competition?.open ? '关闭评分' : '开启评分'}
              </button>
            </div>
          </header>

          {error && error.status !== 401 && (
            <div className="mb-5 rounded border border-danger-ink/30 bg-danger-soft px-4 py-3 text-[13px] text-danger-ink">
              {error.message}
            </div>
          )}

          {tab === 'setup' && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-5 xl:grid-cols-2">
                <InfoPanel
                  competition={competition}
                  stats={stats}
                  onSave={handleSaveInfo}
                  onApplyScale={handleApplyScale}
                  busy={busy}
                  toast={show}
                />
                <ScalePanel competition={competition} onSelect={handleSelectScale} busy={busy} toast={show} />
              </div>

              <RulePanel
                competition={competition}
                stats={stats}
                onSelect={handleSelectRule}
                busy={busy}
              />

              <DimensionPanel
                dimensions={dimensions}
                onAdd={handleAddDimension}
                onUpdate={handleUpdateDimension}
                onDelete={handleDeleteDimension}
                busy={busy}
              />
            </div>
          )}

          {tab === 'roster' && (
            <div className="flex flex-col gap-5">
              <ProjectTable
                projects={projects}
                judgeCount={judgeCount}
                onAdd={handleAddProject}
                onUpdate={handleUpdateProject}
                onDelete={handleDeleteProject}
                busy={busy}
              />
              <JudgeTable
                judges={judges}
                projects={projects}
                onAdd={handleAddJudge}
                onUpdate={handleUpdateJudge}
                onDelete={handleDeleteJudge}
                onRandomPin={handleRandomPin}
                busy={busy}
              />
            </div>
          )}

          {tab === 'dispatch' && (
            <DispatchPanel
              judges={judges}
              projects={projects}
              currentProjectId={resolveCurrentProjectId(judges)}
              judgesAligned={isAligned(judges)}
              onDispatchAll={handleDispatchAll}
              onDispatchOne={handleDispatchOne}
              onNext={handleDispatchNext}
              onClearScore={handleClearScore}
              busy={busy}
            />
          )}

          {tab === 'stage' && (
            <StagePanel
              competition={competition}
              stats={stats}
              usingDefaultPassword={usingDefaultPassword()}
              onToggleOpen={handleToggleOpen}
              onToggleReveal={handleToggleReveal}
              onExport={handleExport}
              onClearScores={handleClearScores}
              onReset={handleReset}
              busy={busy}
              toast={show}
            />
          )}
        </div>
      </div>

      <Toast message={message} />
    </div>
  )
}

/** 与后端一致的口径：被调度评委最多的项目即「正在评审」。 */
function resolveCurrentProjectId(judges) {
  const counter = new Map()
  judges.forEach((judge) => {
    if (judge.currentProjectId === null || judge.currentProjectId === undefined) return
    counter.set(judge.currentProjectId, (counter.get(judge.currentProjectId) || 0) + 1)
  })
  if (counter.size === 0) return null
  let best = null
  let bestCount = -1
  judges.forEach((judge) => {
    if (judge.currentProjectId === null || judge.currentProjectId === undefined) return
    const count = counter.get(judge.currentProjectId)
    if (count > bestCount) {
      bestCount = count
      best = judge.currentProjectId
    }
  })
  return best
}

function isAligned(judges) {
  if (judges.length === 0) return false
  const first = judges[0].currentProjectId
  return first !== null && first !== undefined && judges.every((j) => j.currentProjectId === first)
}

/** 从本地资料判断是否仍在使用默认密码。 */
function usingDefaultPassword() {
  const profile = storage.getAdminProfile()
  return !!profile?.usingDefaultPassword
}
