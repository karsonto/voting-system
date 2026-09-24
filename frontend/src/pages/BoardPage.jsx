import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePublicState } from '../hooks/usePublicState.js'
import { currentClock, formatScore, initial, joinText, pad2, percent } from '../lib/format.js'

/**
 * 总分大屏。
 *
 * 深色投影布局，独立于通用 Layout：
 * - 未揭晓：只展示各项目的提交进度，分数一栏显示「待揭晓」，后端也不会下发分数
 * - 已揭晓：按计分规则算出排名，第一名高亮
 */
export function BoardPage() {
  const { state, loading, error } = usePublicState({ interval: 1500 })
  const [clock, setClock] = useState(() => currentClock())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(currentClock()), 10000)
    return () => window.clearInterval(timer)
  }, [])

  if (loading && !state) return <BoardSkeleton />
  if (error && !state) return <BoardError error={error} />

  const competition = state?.competition
  const board = state?.board ?? []
  const judges = state?.judges ?? []
  const stats = state?.stats
  const revealed = !!competition?.revealed
  const currentProject = (state?.projects ?? []).find((p) => p.id === state?.currentProjectId)

  const totalScores = stats?.scoreCount ?? 0
  const totalPossible = stats?.totalPossibleScores ?? 0

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-[radial-gradient(125%_90%_at_14%_-10%,#26386F_0%,#1B2749_32%,transparent_68%),radial-gradient(75%_65%_at_100%_108%,#243A6B_0%,transparent_60%)] bg-[#141C33] px-9 py-6 text-[#EEF1F8] max-lg:overflow-auto max-lg:px-5">
      {/* 顶部 */}
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-6">
        <div>
          <div className="font-mono text-[13px] uppercase tracking-[0.12em] text-[#93A0C4]">
            FINVOTE · 现场总分大屏
          </div>
          <h1 className="mt-2 text-[clamp(24px,2.1vw,40px)] font-semibold leading-[1.1] tracking-[-0.025em]">
            {competition?.name || '未命名赛事'}
          </h1>
          <p className="mt-2 text-[clamp(14px,1.05vw,20px)] text-[#93A0C4]">
            {competition?.stage || '—'} · {stats?.projectCount ?? 0} 个项目 / {stats?.judgeCount ?? 0} 位评委
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <BoardPill
            tone={revealed ? 'ok' : competition?.open ? 'info' : 'warn'}
            live={!revealed && !!competition?.open}
          >
            {revealed ? '结果已揭晓' : competition?.open ? '评分进行中' : '评分通道已关闭'}
          </BoardPill>

          <span className="rounded-full bg-white/[0.08] px-3.5 py-1.5 font-mono text-[13px] text-[#B9C2DD]">
            已收到 {totalScores} / {totalPossible} 份
          </span>

          <span className="font-mono text-[clamp(26px,2.3vw,44px)] font-semibold leading-none tracking-[-0.02em] tnum">
            {clock}
          </span>

          <FullscreenButton />
        </div>
      </header>

      {/* 主体 */}
      <main className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1fr_30%]">
        {/* 排行榜 */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1E2A4C]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
            <span className="text-[clamp(17px,1.35vw,24px)] font-semibold">
              {revealed ? '最终排名' : '各项目现场评分进度'}
            </span>
            <span className="font-mono text-[clamp(12px,0.92vw,16px)] text-[#93A0C4]">
              {revealed
                ? `按「${competition?.ruleLabel || '—'}」计算 · 满分 100`
                : '各项目按出场顺序排列 · 分数将在揭晓后公布'}
            </span>
          </div>

          <div className="flex-1 overflow-auto px-3.5 pb-3.5 pt-2">
            {board.length === 0 ? (
              <p className="py-16 text-center text-[#93A0C4]">组委会还没有录入参赛项目。</p>
            ) : (
              board.map((row) => (
                <BoardRow key={row.projectId} row={row} revealed={revealed} topScore={topScore(board)} />
              ))
            )}
          </div>
        </section>

        {/* 侧栏 */}
        <aside className="flex min-h-0 flex-col gap-4">
          <div className="rounded-xl border border-white/10 bg-[#1E2A4C] px-5 py-5">
            <div className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-[#93A0C4]">正在评审</div>
            <div className="mt-2.5 text-[clamp(20px,1.7vw,32px)] font-semibold leading-tight tracking-[-0.02em]">
              {currentProject?.name || '等待调度'}
            </div>
            <div className="mt-2 text-[clamp(13px,0.98vw,18px)] text-[#93A0C4]">
              {currentProject
                ? joinText(state?.judgesAligned ? '全员统一评审' : '委员分散评审', currentProject.team, currentProject.track)
                : '请在后台把评委分配到项目'}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="font-mono text-[clamp(14px,1.05vw,20px)] font-semibold tnum">
                {currentProject?.submittedCount ?? 0} / {stats?.judgeCount ?? 0}
              </span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <i
                  className="block h-full rounded-full bg-[#6B85EE] transition-[width] duration-500"
                  style={{
                    width: `${percent(currentProject?.submittedCount ?? 0, stats?.judgeCount ?? 0)}%`,
                  }}
                />
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-[#1E2A4C] px-5 py-4">
            <div className="mb-3.5 font-mono text-[12.5px] uppercase tracking-[0.08em] text-[#93A0C4]">
              评委提交状态
            </div>
            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
              {judges.map((judge) => {
                const row = currentProject ? board.find((r) => r.projectId === currentProject.id) : null
                const done = !!row?.submittedJudgeIds?.includes(judge.id)
                return (
                  <div
                    key={judge.id}
                    className={`flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 ${
                      done ? 'border-[#6B85EE]/40' : 'border-white/10'
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${done ? 'bg-[#6B85EE]' : 'bg-white/15'}`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[clamp(12.5px,0.92vw,16px)] font-semibold">
                        {judge.name}
                      </span>
                      <span className="block font-mono text-[clamp(10px,0.72vw,12.5px)] text-[#93A0C4]">
                        {done ? '已提交' : '待评分'}
                      </span>
                    </span>
                  </div>
                )
              })}
              {judges.length === 0 && <p className="text-[#93A0C4]">还没有评委名单。</p>}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1E2A4C] px-5 py-4">
            <div className="mb-2.5 font-mono text-[12.5px] uppercase tracking-[0.08em] text-[#93A0C4]">
              计分规则
            </div>
            <p className="text-[clamp(13px,0.98vw,18px)] leading-relaxed">{competition?.ruleLabel || '—'}</p>
            <p className="mt-2 text-[clamp(12px,0.9vw,16px)] text-[#93A0C4]">
              有效评委数 {stats?.effectiveScoreCount ?? 0} 份 · 每个维度加权折算为 0–100 分
            </p>
          </div>
        </aside>
      </main>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-5 border-t border-white/10 pt-3.5 font-mono text-[clamp(11px,0.82vw,15px)] text-[#93A0C4]">
        <span>{competition?.name?.split(' · ')[0] || 'FinVote'}组委会</span>
        <span className="flex items-center gap-4">
          <Link to="/" className="hover:text-[#EEF1F8]">
            返回总览
          </Link>
          <span>
            数据更新{' '}
            {state?.updatedAt ? new Date(state.updatedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '—'}
          </span>
        </span>
      </footer>
    </div>
  )
}

function topScore(board) {
  return board.reduce((max, row) => (row.mean !== null && row.mean !== undefined ? Math.max(max, row.mean) : max), 0) || 100
}

function BoardRow({ row, revealed, topScore: max }) {
  const isLead = revealed && row.rank === 1 && row.mean !== null
  const pct = revealed
    ? row.mean === null
      ? 0
      : Math.min(100, (row.mean / max) * 100)
    : percent(row.submittedCount, row.judgeCount)

  return (
    <div
      className={`grid grid-cols-[74px_1fr_auto] items-center gap-5 border-b border-white/10 px-3 py-3.5 last:border-b-0 ${
        isLead ? 'rounded-[10px] border-b-transparent bg-[#6B85EE]/[0.16]' : ''
      }`}
    >
      <div
        className={`text-center font-mono text-[clamp(22px,1.9vw,36px)] font-bold tracking-[-0.02em] ${
          isLead ? 'text-[#EEF1F8]' : 'text-[#93A0C4]'
        }`}
      >
        {pad2(revealed ? row.rank || row.order : row.order)}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[clamp(22px,1.9vw,38px)] font-semibold leading-[1.12] tracking-[-0.02em]">
          {row.projectName}
        </div>
        <div className="mt-1.5 truncate text-[clamp(13px,1vw,19px)] text-[#93A0C4]">
          {joinText(row.team, row.track)}
        </div>
        <div className="mt-2.5 h-2 max-w-[760px] overflow-hidden rounded-full bg-white/[0.09]">
          <i
            className={`block h-full rounded-full transition-[width] duration-500 ${isLead ? 'bg-[#6B85EE]' : 'bg-[#93A0C4]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="min-w-[170px] text-right">
        {revealed && row.mean !== null ? (
          <>
            <div
              className={`font-mono text-[clamp(30px,2.8vw,60px)] font-semibold leading-none tracking-[-0.03em] tnum ${
                isLead ? 'text-[#EEF1F8]' : ''
              }`}
            >
              {formatScore(row.mean)}
              <span className="ml-1.5 text-[0.34em] font-medium text-[#93A0C4]">分</span>
            </div>
            <span className="mt-1.5 block font-mono text-[clamp(10.5px,0.78vw,14px)] text-[#93A0C4]">
              {row.effectiveCount} 份有效分
            </span>
          </>
        ) : (
          <>
            <div className="font-mono text-[clamp(13px,1vw,18px)] tracking-[0.14em] text-[#93A0C4]">待揭晓</div>
            <span className="mt-1.5 block font-mono text-[clamp(10.5px,0.78vw,14px)] text-[#93A0C4]">
              {row.submittedCount} / {row.judgeCount} 位评委已评
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function BoardPill({ tone, live, children }) {
  const tones = {
    ok: 'bg-[#4ADE9B]/[0.16] text-[#7BE5B4]',
    info: 'bg-[#6B85EE]/[0.18] text-[#A8B9FF]',
    warn: 'bg-[#F5C36A]/[0.15] text-[#F5C36A]',
  }
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[13px] ${
        tones[tone] || tones.info
      }`}
    >
      {live && <span className="h-2 w-2 rounded-full bg-current animate-pulse-soft" />}
      {children}
    </span>
  )
}

function FullscreenButton() {
  const [full, setFull] = useState(false)

  useEffect(() => {
    const handler = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  async function toggle() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      else await document.exitFullscreen()
    } catch {
      /* 某些浏览器/投影环境不允许脚本全屏，忽略即可 */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-[10px] border border-white/15 px-3 py-2.5 text-[13px] text-[#93A0C4] transition hover:border-white/40 hover:text-[#EEF1F8]"
    >
      {full ? '退出全屏' : '全屏'}
    </button>
  )
}

function BoardSkeleton() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#141C33] text-[#93A0C4]">
      <span className="font-mono text-sm">正在连接赛事数据…</span>
    </div>
  )
}

function BoardError({ error }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#141C33] px-6">
      <div className="max-w-[520px] rounded-xl border border-white/10 bg-[#1E2A4C] p-8 text-center text-[#EEF1F8]">
        <h1 className="text-lg font-semibold">无法连接赛事数据</h1>
        <p className="mt-2 text-[13.5px] text-[#93A0C4]">
          {error?.message || '请确认后端服务已启动，然后刷新本页。'}
        </p>
      </div>
    </div>
  )
}
