import { useEffect, useMemo, useRef, useState } from 'react'
import { authApi, judgeApi, publicApi, storage } from '../lib/api.js'
import { useJudgeSession, useDraftStorage } from '../hooks/useJudgeSession.js'
import { Toast, useToast } from '../components/Toast.jsx'
import { Pill } from '../components/ui.jsx'
import { clampScore, formatScore1, initial } from '../lib/format.js'
import { joinText, pad2 } from '../lib/format.js'

/**
 * 评委评分端。
 *
 * 未登录时是登录页；登录后进入评分台，通过高频轮询感知「主持人是否把我切到了别的项目」。
 */
export function JudgePage() {
  const [hasToken, setHasToken] = useState(() => !!storage.getJudgeToken())
  const { message, show } = useToast(2400)

  // 评委端是独立全屏页，锁住文档滚动，避免 iPad / 桌面出现页面滚动条
  useEffect(() => {
    const previous = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = previous
    }
  }, [])

  if (!hasToken) {
    return (
      <>
        <JudgeLogin
          onSuccess={() => {
            setHasToken(true)
            show('登录成功')
          }}
        />
        <Toast message={message} />
      </>
    )
  }

  return (
    <>
      <ScoringConsole
        onLogout={() => {
          storage.clearJudge()
          setHasToken(false)
          show('已退出登录')
        }}
        toast={show}
      />
      <Toast message={message} />
    </>
  )
}

/* ------------------------------------------------------------------ 登录 */

function JudgeLogin({ onSuccess }) {
  const [judges, setJudges] = useState([])
  const [judgeId, setJudgeId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingJudges, setLoadingJudges] = useState(true)

  useEffect(() => {
    let alive = true
    publicApi
      .judges()
      .then((data) => {
        if (!alive) return
        setJudges(Array.isArray(data) ? data : [])
        if (Array.isArray(data) && data.length > 0) setJudgeId(String(data[0].id))
      })
      .catch((err) => {
        if (alive) setError(err.message || '无法获取评委名单')
      })
      .finally(() => {
        if (alive) setLoadingJudges(false)
      })
    return () => {
      alive = false
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!judgeId) {
      setError('请选择评委')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('请输入 4 位 PIN 码')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const data = await authApi.judgeLogin(Number(judgeId), pin)
      storage.setJudgeToken(data.token)
      storage.setJudgeProfile({ judgeId: data.judgeId, name: data.name, org: data.org })
      onSuccess?.()
    } catch (err) {
      setError(err.message || '登入失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingJudges) {
    return (
      <div className="grid h-dvh place-items-center px-4">
        <div className="h-40 w-full max-w-[440px] animate-pulse rounded-lg bg-ink/10" />
      </div>
    )
  }

  if (judges.length === 0) {
    return (
      <div className="mx-auto grid h-dvh max-w-[520px] place-items-center px-4">
        <div className="panel p-8 text-center">
          <h2 className="text-lg font-semibold">暂无可用评委</h2>
          <p className="hint mt-2">
            组委会还没有在后台录入评委名单。请联系工作人员完成配置后再登入。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-dvh place-items-center px-4">
      <div className="w-full max-w-[440px] rounded-lg border border-line bg-surface p-8 shadow-card">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-[7px] border border-ink font-mono text-[13px] font-bold">
            FV
          </span>
          <span className="text-base font-semibold">评委评分端</span>
        </div>

        <h2 className="text-[19px] font-semibold">验证评委身份</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-muted">
          选择你的姓名并输入 4 位 PIN，即可进入评分台。PIN 由组委会在后台配置。
        </p>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">评委</span>
            <select className="select" value={judgeId} onChange={(e) => setJudgeId(e.target.value)}>
              {judges.map((judge) => (
                <option key={judge.id} value={judge.id}>
                  {joinText(judge.name, judge.org?.split(' · ')[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">PIN 码</span>
            <input
              className="input input-num text-center tracking-[0.3em]"
              value={pin}
              inputMode="numeric"
              maxLength={4}
              placeholder="4 位数字"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </label>

          <p className="min-h-[18px] text-[12.5px] text-danger-ink">{error}</p>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? '验证中…' : '登入评分台'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 评分台 */

function ScoringConsole({ onLogout, toast }) {
  const { session, loading, error, reload } = useJudgeSession({ interval: 1500 })
  const profile = storage.getJudgeProfile()
  const judge = session?.judge
  const dimensions = useMemo(() => session?.dimensions ?? [], [session])
  const competition = session?.competition
  const currentProject = session?.currentProject
  const maxScore = competition?.maxPerDimension ?? 100

  const { read, write, clear } = useDraftStorage(judge?.id ?? profile?.judgeId)

  const [formValues, setFormValues] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [historyId, setHistoryId] = useState(null)

  // 记录上一轮的项目 ID，用于判断「是否被调度切换」
  const lastProjectIdRef = useRef(null)
  const seenOnceRef = useRef(false)

  const currentProjectId = currentProject?.id ?? null
  const existingScore = currentProjectId ? session?.myScores?.[currentProjectId] : null

  // 项目切换或维度变化时，重新装载表单
  useEffect(() => {
    if (!currentProjectId || dimensions.length === 0) return

    const switched = lastProjectIdRef.current !== null && lastProjectIdRef.current !== currentProjectId
    lastProjectIdRef.current = currentProjectId

    const score = session?.myScores?.[currentProjectId]
    const draft = read(currentProjectId)

    const next = {}
    dimensions.forEach((dimension) => {
      const fromScore = score?.values?.[dimension.id]
      const fromDraft = draft?.values?.[dimension.id]
      if (typeof fromDraft === 'number') next[dimension.id] = fromDraft
      else if (typeof fromScore === 'number') next[dimension.id] = fromScore
      else next[dimension.id] = Math.round(maxScore * 0.8) // 与设计稿一致：默认 80% 分值
    })
    setFormValues(next)

    if (switched && currentProject) {
      toast(`已切换评审项目：${currentProject.name}`)
    }
    seenOnceRef.current = true
    // 仅在项目 ID 或维度结构变化时重载，避免每次轮询都覆盖用户正在输入的分数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, dimensions.map((d) => d.id).join(',')])

  const weightedTotal = useMemo(() => {
    let weighted = 0
    let weight = 0
    dimensions.forEach((dimension) => {
      const value = formValues[dimension.id]
      if (typeof value !== 'number') return
      weighted += value * dimension.weight
      weight += dimension.weight
    })
    if (weight > 0) return weighted / weight
    const values = Object.values(formValues).filter((v) => typeof v === 'number')
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }, [dimensions, formValues])

  const weightSum = competition?.dimensionWeightSum ?? 0
  const allScored = dimensions.every((d) => typeof formValues[d.id] === 'number')

  function updateValue(dimensionId, rawValue) {
    const value = clampScore(rawValue, maxScore)
    setFormValues((previous) => {
      const next = { ...previous, [dimensionId]: value }
      if (currentProjectId) write(currentProjectId, { values: next })
      return next
    })
  }

  async function handleSubmit() {
    if (!currentProjectId) {
      toast('当前没有可评分的项目')
      return
    }
    if (!allScored) {
      toast('请先完成所有维度的打分')
      return
    }
    setSubmitting(true)
    try {
      const result = await judgeApi.submit(currentProjectId, formValues, '')
      clear(currentProjectId)
      await reload()
      toast(`已提交「${currentProject.name}」评分：${formatScore1(result?.weightedTotal)} 分`)
    } catch (err) {
      toast(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout('JUDGE')
    } catch {
      /* 忽略 */
    }
    onLogout?.()
  }

  if (loading && !session) return <ConsoleSkeleton />

  if (error && !session) {
    return (
      <div className="grid h-dvh place-items-center px-4">
        <div className="panel max-w-[560px] border-danger-ink/30 p-6">
          <h2 className="text-lg font-semibold text-danger-ink">无法加载评分台</h2>
          <p className="hint mt-2">{error.message}</p>
          <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={onLogout}>
            返回登入页
          </button>
        </div>
      </div>
    )
  }

  const name = judge?.name ?? profile?.name ?? '评委'
  const myScores = session?.myScores ?? {}
  const projects = session?.projects ?? []
  const submittedCount = Object.keys(myScores).length
  const projectCount = projects.length
  const open = competition?.open
  const scoredProjects = projects.filter((project) => myScores[project.id])
  const activeHistoryId = scoredProjects.some((project) => sameId(project.id, historyId))
    ? historyId
    : scoredProjects.some((project) => sameId(project.id, currentProjectId))
      ? currentProjectId
      : (scoredProjects[scoredProjects.length - 1]?.id ?? null)
  const historyProject = projects.find((project) => sameId(project.id, activeHistoryId))
  const historyBreakdown = breakdownOf(activeHistoryId ? myScores[activeHistoryId] : null, dimensions)

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-canvas">
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink/[0.06] font-mono text-xs font-bold">
            {initial(name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight">{name}</span>
            <span className="block truncate font-mono text-[11px] text-ink-muted">
              {judge?.org || profile?.org || '—'}
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Pill tone={open ? 'info' : 'warn'} live={open}>
            {open ? '已连接' : '通道已暂停'}
          </Pill>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            退出
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 gap-3 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
        <section className="flex min-h-0 flex-col gap-3">
          <div className="panel shrink-0 px-4 py-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              当前评审项目
            </div>
            <h1 className="mt-1 truncate text-[clamp(20px,2.4vw,28px)] font-semibold leading-tight tracking-[-0.025em]">
              {currentProject?.name || '暂未分配评审项目'}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone="idle">{currentProject?.team || '—'}</Pill>
              <Pill tone="idle">{currentProject?.track || '—'}</Pill>
              {currentProject && (
                <Pill tone="info">
                  {pad2(projects.findIndex((project) => sameId(project.id, currentProject.id)) + 1)} / {pad2(projectCount)}
                </Pill>
              )}
            </div>
          </div>

          <div className="panel flex min-h-0 flex-1 flex-col">
            <div className="panel-head shrink-0 py-2.5">
              <span className="panel-title">多维度打分</span>
              <span className="meta">
                0–{maxScore} · 权重 {weightSum}%
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-evenly px-4 py-1">
              {dimensions.length === 0 ? (
                <p className="hint text-center">组委会还没有配置评分维度。</p>
              ) : (
                dimensions.map((dimension) => (
                  <DimensionControl
                    key={dimension.id}
                    dimension={dimension}
                    max={maxScore}
                    value={formValues[dimension.id]}
                    disabled={!currentProjectId}
                    onChange={(value) => updateValue(dimension.id, value)}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3">
          <div className="panel shrink-0">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-ink-muted">加权总分</div>
                <div className="font-mono text-[32px] font-semibold leading-none tracking-[-0.03em] tnum">
                  {formatScore1(weightedTotal)}
                  <span className="ml-1 text-[13px] font-medium text-ink-muted">分</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary shrink-0"
                onClick={handleSubmit}
                disabled={submitting || !open || !currentProjectId || !allScored}
              >
                {submitting ? '提交中…' : existingScore ? '更新评分' : '提交评分'}
              </button>
            </div>
          </div>

          <div className="panel flex min-h-0 flex-1 flex-col">
            <div className="panel-head shrink-0 py-2.5">
              <span className="panel-title">我的评分进度</span>
              <span className="meta">
                {submittedCount} / {projectCount}
              </span>
            </div>

            <div className="shrink-0 border-b border-line px-3 py-2">
              {historyProject ? (
                <>
                  <div className="truncate text-[12.5px] font-medium" title={historyProject.name}>
                    {historyProject.name}
                    <span className="ml-2 font-normal text-ink-muted">维度分数</span>
                  </div>
                  <div className="mt-1.5 flex max-h-12 flex-wrap gap-1.5 overflow-hidden">
                    {historyBreakdown.length === 0 ? (
                      <span className="hint">这份评分没有维度明细。</span>
                    ) : (
                      historyBreakdown.map((row) => (
                        <span key={row.id} className="pill pill-idle">
                          {row.name} {row.value}
                        </span>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="hint">提交后点选项目，可回看各维度分数。</p>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-evenly overflow-hidden px-2 py-1">
              {projectCount === 0 && <p className="hint px-2 text-center">还没有参赛项目。</p>}
              {projects.map((project) => {
                const score = myScores[project.id]
                const isCurrent = sameId(project.id, currentProjectId)
                const selected = sameId(project.id, activeHistoryId)
                return (
                  <button
                    key={project.id}
                    type="button"
                    disabled={!score}
                    onClick={() => setHistoryId(project.id)}
                    className={`flex min-h-0 items-center justify-between gap-2 rounded px-2 py-1 text-left disabled:cursor-default ${
                      selected ? 'bg-info-soft' : 'hover:bg-ink/[0.03]'
                    }`}
                  >
                    <span className={`min-w-0 truncate text-[13px] ${isCurrent ? 'font-semibold' : ''}`}>
                      {isCurrent ? '当前 · ' : ''}
                      {project.name}
                    </span>
                    <Pill tone={score ? 'ok' : 'idle'}>
                      {score ? `${formatScore1(score.weightedTotal)}` : '待评'}
                    </Pill>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

/** 把一份已提交评分展开成「维度名 → 分数」，供进度区回看。 */
function breakdownOf(score, dimensions) {
  if (!score?.values) return []
  const used = new Set()
  const rows = []
  dimensions.forEach((dimension) => {
    const value = score.values[dimension.id] ?? score.values[String(dimension.id)]
    used.add(String(dimension.id))
    if (value === undefined || value === null) return
    rows.push({ id: dimension.id, name: dimension.name, value })
  })
  Object.entries(score.values).forEach(([id, value]) => {
    if (used.has(String(id)) || value === undefined || value === null) return
    rows.push({ id, name: `维度 ${id}`, value })
  })
  return rows
}

function sameId(left, right) {
  return left != null && right != null && String(left) === String(right)
}

/** 单个维度的滑杆 + 数值输入。行高随剩余空间收缩，保证整页不出现滚动条。 */
function DimensionControl({ dimension, value, max, disabled, onChange }) {
  const safeValue = typeof value === 'number' ? value : Math.round(max * 0.8)

  return (
    <div className="min-h-0 py-1">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="truncate text-[13.5px] font-medium">{dimension.name}</span>
        <span className="shrink-0 font-mono text-[11px] text-ink-muted">权重 {dimension.weight}%</span>
      </div>

      <div className="grid grid-cols-[1fr_64px] items-center gap-2.5">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={safeValue}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-full cursor-pointer accent-brand-600"
          aria-label={`${dimension.name} 得分`}
        />
        <input
          className="input input-num px-1 py-1 text-center"
          type="number"
          min={0}
          max={max}
          value={safeValue}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${dimension.name} 数值`}
        />
      </div>
    </div>
  )
}

function ConsoleSkeleton() {
  return (
    <div className="grid h-dvh grid-cols-1 gap-3 p-3 md:grid-cols-[1.4fr_0.9fr]">
      <div className="animate-pulse rounded-lg bg-ink/10" />
      <div className="animate-pulse rounded-lg bg-ink/10" />
    </div>
  )
}
