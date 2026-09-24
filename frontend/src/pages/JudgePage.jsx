import { useEffect, useMemo, useRef, useState } from 'react'
import { authApi, judgeApi, publicApi, storage } from '../lib/api.js'
import { useJudgeSession, useDraftStorage } from '../hooks/useJudgeSession.js'
import { Toast, useToast } from '../components/Toast.jsx'
import { Pill } from '../components/ui.jsx'
import { clampScore, formatScore1, initial, percent } from '../lib/format.js'
import { joinText, pad2 } from '../lib/format.js'

/**
 * 评委评分端。
 *
 * 未登录时是登录页；登录后进入评分台，通过高频轮询感知「主持人是否把我切到了别的项目」。
 */
export function JudgePage() {
  const [hasToken, setHasToken] = useState(() => !!storage.getJudgeToken())
  const { message, show } = useToast(2400)

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
      <div className="grid min-h-[calc(100vh-140px)] place-items-center px-4">
        <div className="h-40 w-full max-w-[440px] animate-pulse rounded-lg bg-ink/10" />
      </div>
    )
  }

  if (judges.length === 0) {
    return (
      <div className="mx-auto max-w-[520px] px-4 py-16">
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
    <div className="grid min-h-[calc(100vh-140px)] place-items-center px-4 py-12">
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
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [switchNotice, setSwitchNotice] = useState(null)

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
    setComment(draft?.comment ?? score?.comment ?? '')

    if (switched && currentProject) {
      setSwitchNotice(currentProject.name)
      toast(`已切换评审项目：${currentProject.name}`)
    }
    seenOnceRef.current = true
    // 仅在项目 ID 或维度结构变化时重载，避免每次轮询都覆盖用户正在输入的分数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, dimensions.map((d) => d.id).join(',')])

  // 首次进入时用已有评分初始化（不覆盖草稿）
  useEffect(() => {
    if (!currentProjectId || !existingScore) return
    setComment((prev) => (prev ? prev : existingScore.comment || ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingScore?.id])

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
      if (currentProjectId) write(currentProjectId, { values: next, comment })
      return next
    })
  }

  function updateComment(value) {
    setComment(value)
    if (currentProjectId) write(currentProjectId, { values: formValues, comment: value })
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
      const result = await judgeApi.submit(currentProjectId, formValues, comment.trim())
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
      <div className="mx-auto max-w-[560px] px-4 py-16">
        <div className="panel border-danger-ink/30 p-6">
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
  const submittedCount = Object.keys(myScores).length
  const projectCount = session?.projects?.length ?? 0
  const open = competition?.open

  return (
    <div>
      <header className="sticky top-[57px] z-10 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-7 py-3 max-md:px-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/[0.06] font-mono text-sm font-bold">
              {initial(name)}
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">{name}</span>
              <span className="block font-mono text-[11.5px] text-ink-muted">{judge?.org || profile?.org || '—'}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Pill tone={open ? 'info' : 'warn'} live={open}>
              {open ? '已连接调度台' : '通道已暂停'}
            </Pill>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1160px] px-7 py-7 max-md:px-4">
        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          {/* 左栏：打分 */}
          <div>
            <div className="mb-3.5 flex flex-col gap-2.5">
              {switchNotice && (
                <div className="flex items-center gap-2.5 rounded bg-info-soft px-3.5 py-2.5 text-[13px] text-info-ink animate-rise-in">
                  <span className="dot" />
                  <span>主持人已把你切换到「{switchNotice}」，可开始评分</span>
                  <button
                    type="button"
                    className="ml-auto text-[12px] underline-offset-2 hover:underline"
                    onClick={() => setSwitchNotice(null)}
                  >
                    知道了
                  </button>
                </div>
              )}

              {!open && (
                <div className="flex items-center gap-2.5 rounded bg-warn-soft px-3.5 py-3 text-[13px] text-warn-ink">
                  <span>评分通道已暂停，请联系组委会开启后再提交。</span>
                </div>
              )}
            </div>

            <div className="panel relative overflow-hidden p-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                当前评审项目 · 由组委会实时调度
              </div>
              <h1 className="mt-2 text-[clamp(24px,3vw,34px)] font-semibold leading-tight tracking-[-0.025em]">
                {currentProject?.name || '暂未分配评审项目'}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone="idle">{currentProject?.team || '—'}</Pill>
                <Pill tone="idle">{currentProject?.track || '—'}</Pill>
                {currentProject && (
                  <Pill tone="info">
                    项目{' '}
                    {pad2((session?.projects?.findIndex((p) => p.id === currentProject.id) ?? 0) + 1)} /{' '}
                    {pad2(projectCount)}
                  </Pill>
                )}
              </div>
            </div>

            <div className="panel mt-5">
              <div className="panel-head">
                <span className="panel-title">多维度打分</span>
                <span className="meta">
                  每维度 0–{maxScore} 分 · 权重合计 {weightSum}%
                </span>
              </div>
              <div className="panel-body pt-1">
                {dimensions.length === 0 ? (
                  <p className="hint py-6 text-center">组委会还没有配置评分维度。</p>
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

            <div className="panel mt-5">
              <div className="panel-head">
                <span className="panel-title">评语（选填）</span>
              </div>
              <div className="panel-body">
                <textarea
                  className="textarea resize-y leading-relaxed"
                  rows={3}
                  placeholder="给选手的一句话点评，将随评分一并存档"
                  value={comment}
                  maxLength={500}
                  onChange={(e) => updateComment(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 右栏：总分与进度 */}
          <div className="flex flex-col gap-5">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">加权总分</span>
                <span className="meta">{existingScore ? '已提交（可更新）' : '未提交'}</span>
              </div>
              <div className="panel-body">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="font-mono text-[40px] font-semibold leading-none tracking-[-0.03em] tnum">
                      {formatScore1(weightedTotal)}
                      <span className="ml-1 text-[14px] font-medium text-ink-muted">分</span>
                    </div>
                    <p className="hint mt-1.5">
                      {dimensions.length} 个维度加权折算 · 权重合计 {weightSum}%
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-block mt-5"
                  onClick={handleSubmit}
                  disabled={submitting || !open || !currentProjectId || !allScored}
                >
                  {submitting ? '提交中…' : existingScore ? '更新评分' : '提交评分'}
                </button>

                <p className="hint mt-2.5">
                  {!currentProjectId
                    ? '等待组委会把你调度到某个项目。'
                    : !open
                      ? '评分通道已暂停，暂时无法提交。'
                      : existingScore
                        ? '重复提交会覆盖此前的分数，直到通道关闭。'
                        : '提交后仍可返回修改，直到通道关闭。'}
                </p>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">我的评分进度</span>
                <span className="meta">
                  {submittedCount} / {projectCount} 已提交
                </span>
              </div>
              <div className="panel-body pt-1">
                {(session?.projects ?? []).map((project) => {
                  const score = myScores[project.id]
                  const isCurrent = project.id === currentProjectId
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
                    >
                      <span
                        className={`truncate text-[13px] ${isCurrent ? 'font-semibold' : ''}`}
                        title={project.name}
                      >
                        {project.name}
                      </span>
                      <Pill tone={score ? 'ok' : 'idle'}>
                        {score ? `${formatScore1(score.weightedTotal)} 分` : '待评'}
                      </Pill>
                    </div>
                  )
                })}

                {projectCount === 0 && <p className="hint py-4 text-center">还没有参赛项目。</p>}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">计分规则</span>
              </div>
              <div className="panel-body flex flex-col gap-2.5">
                <p className="hint">
                  现行计分规则：{competition?.ruleLabel || '—'}（{competition?.ruleDescription || '—'}）。
                </p>
                <p className="hint">你的这一份评分将与其他评委的评分一起，按上述规则计算项目最终成绩。</p>
                <p className="hint">
                  当前该项目已有 {percent(currentProject?.submittedCount ?? 0, projectCount)}% 的评委提交
                  （{currentProject?.submittedCount ?? 0} / {projectCount} 位）。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 单个维度的滑杆 + 数值输入。 */
function DimensionControl({ dimension, value, max, disabled, onChange }) {
  const safeValue = typeof value === 'number' ? value : Math.round(max * 0.8)

  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="text-[14.5px] font-medium">{dimension.name}</span>
        <span className="font-mono text-xs text-ink-muted">权重 {dimension.weight}%</span>
      </div>

      <div className="grid grid-cols-[1fr_78px] items-center gap-3.5">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={safeValue}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-full cursor-pointer accent-brand-600"
          aria-label={`${dimension.name} 得分`}
        />
        <input
          className="input input-num text-center"
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
    <div className="mx-auto max-w-[1160px] px-7 py-7 max-md:px-4">
      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="h-80 animate-pulse rounded-lg bg-ink/10" />
        <div className="h-60 animate-pulse rounded-lg bg-ink/10" />
      </div>
    </div>
  )
}
