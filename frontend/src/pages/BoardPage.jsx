import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePublicState } from '../hooks/usePublicState.js'
import { currentClock, formatScore } from '../lib/format.js'
import icbcLogo from '../assets/icbc-asia-logo.png'

/**
 * 现场总分大屏。
 *
 * 布局参照现场打分系统：左侧排行榜，中间当前项目与评委得分，右侧放大的总分。
 * 只把已经有分数的项目放进排行榜。
 */
export function BoardPage() {
  const { state, loading, error } = usePublicState({ interval: 1500 })
  const [clock, setClock] = useState(() => currentClock())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(currentClock()), 10000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  if (loading && !state) return <BoardSkeleton />
  if (error && !state) return <BoardError error={error} />

  const competition = state?.competition
  const currentProject = (state?.projects ?? []).find((p) => p.id === state?.currentProjectId) ?? null
  const currentRow = (state?.board ?? []).find((row) => row.projectId === state?.currentProjectId) ?? null
  const ranked = (state?.board ?? []).filter((row) => row.submittedCount > 0 && row.mean != null)
  const judgeCards = judgeCardsOf(state)
  const ruleId = competition?.ruleId
  const highLabel = ruleId === 'trimmed-mean' || ruleId === 'drop-high' ? '去掉最高分' : '最高分'
  const lowLabel = ruleId === 'trimmed-mean' ? '去掉最低分' : '最低分'

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1d4f9c_0%,#0c2460_38%,#071433_72%,#040c22_100%)]" />
      <div
        className="pointer-events-none absolute inset-x-[-10%] bottom-[-8%] h-[46%] opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(90,170,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(90,170,255,0.45) 1px, transparent 1px)',
          backgroundSize: '56px 32px',
          transform: 'perspective(520px) rotateX(58deg)',
          transformOrigin: 'center bottom',
        }}
      />

      <style>{REVEAL_CSS}</style>
      <header className="relative z-10 flex h-[108px] shrink-0 items-center justify-between gap-4 px-6">
        <img src={icbcLogo} alt="ICBC (Asia) 工銀亞洲" className="h-[68px] w-auto shrink-0" />
        <div className="min-w-0 flex-1 px-4 text-center">
          <h1
            className="truncate text-[34px] font-extrabold tracking-[0.14em] text-[#ffe7a3] xl:text-[46px]"
            style={{ textShadow: '0 0 22px rgba(255,206,70,0.75), 0 3px 0 rgba(90,40,0,0.35)' }}
          >
            {competition?.name || 'Athlon 评分系统'}
          </h1>
          <div className="mx-auto mt-2 h-[3px] w-[min(420px,70%)] bg-gradient-to-r from-transparent via-[#f6c445] to-transparent shadow-[0_0_16px_rgba(246,196,69,0.85)]" />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right font-mono text-[18px] tabular-nums text-white/80">{clock}</div>
          <button
            type="button"
            className="rounded-sm border border-white/30 px-3 py-1 text-[13px] text-white/85 hover:bg-white/10"
            onClick={toggleFullscreen}
          >
            全屏
          </button>
          <Link
            to="/"
            className="rounded-sm border border-white/30 px-3 py-1 text-[13px] text-white/85 hover:bg-white/10"
          >
            返回
          </Link>
        </div>
      </header>

      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-1 items-stretch gap-5 px-6 pb-5 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:grid-rows-1">
        <section
          className="flex max-h-full min-h-0 flex-col self-start overflow-hidden rounded-2xl border border-white/25 bg-[rgba(7,18,52,0.55)] px-4 pb-3 pt-4 backdrop-blur-[2px]"
          style={{
            boxShadow:
              '0 18px 42px rgba(0,0,0,0.38), 0 0 28px rgba(70,130,255,0.22), inset 0 1px 0 rgba(255,255,255,0.28)',
          }}
        >
          <h2
            className="shrink-0 pb-3 text-center text-[30px] font-bold tracking-[0.42em] text-[#f6c445]"
            style={{ textShadow: '0 2px 0 rgba(0,0,0,0.28), 0 0 16px rgba(246,196,69,0.55)' }}
          >
            排行榜
          </h2>
          <div className="grid shrink-0 grid-cols-[36px_56px_minmax(0,1fr)_64px] gap-2 border-b border-white/25 px-1 pb-2 text-[15px] text-white/90">
            <span>排行</span>
            <span>团队</span>
            <span>项目名称</span>
            <span className="text-right">得分</span>
          </div>
          {ranked.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-[16px] text-white/55">还没有已评分项目</div>
          ) : (
            <ol className="min-h-0 flex-1 overflow-hidden py-1">
              {ranked.map((row, index) => (
                <li
                  key={row.projectId}
                  className={`grid grid-cols-[36px_56px_minmax(0,1fr)_64px] items-center gap-2 overflow-hidden px-1 py-2 text-[17px] ${
                    row.projectId === state?.currentProjectId ? 'rounded-md bg-white/10' : ''
                  }`}
                >
                  <span className="font-medium text-white">{index + 1}</span>
                  <span className="truncate text-white">{row.team || '—'}</span>
                  <span className="min-w-0 whitespace-normal break-words leading-snug text-white">{row.projectName}</span>
                  <RevealNumber
                    value={row.mean}
                    className="block w-full text-right font-mono text-[18px] font-extrabold tabular-nums text-[#ffe14a]"
                    style={{ textShadow: '0 0 10px rgba(255,225,74,0.65), 0 2px 0 rgba(0,0,0,0.25)' }}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
          <div className="flex items-start justify-between gap-8 pl-6 pr-2 pt-2">
            <div className="min-w-0 pt-2">
              {currentProject ? (
                <>
                  <div className="truncate text-[22px]">
                    团队：<span className="font-semibold">{currentProject.team || '—'}</span>
                  </div>
                  <div className="mt-1 truncate text-[26px] font-semibold leading-snug">
                    项目名称：{currentProject.name}
                  </div>
                  <div className="mt-2 truncate text-[15px] text-white/75">
                    赛道：{currentProject.track || '—'}
                    <span className="mx-3 text-white/35">|</span>
                    导师：{currentProject.mentor || '—'}
                  </div>
                </>
              ) : (
                <div className="text-[22px] text-white/70">等待组委会指定当前项目</div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[26px] font-medium tracking-[0.18em]">得分</div>
              <RevealNumber
                value={currentRow?.mean}
                className="font-mono text-[84px] font-extrabold leading-none tabular-nums text-[#ffe14a] xl:text-[108px]"
                style={{ textShadow: '0 0 22px rgba(255,210,40,0.45), 0 4px 0 rgba(0,0,0,0.18)' }}
              />
            </div>
          </div>

          <div className="flex min-h-0 items-center justify-center gap-4 overflow-x-auto px-2">
            {judgeCards.length === 0 ? (
              <div className="text-[16px] text-white/55">尚未配置评委</div>
            ) : (
              judgeCards.map((card) => <JudgeCard key={card.judgeId} card={card} />)
            )}
          </div>

          <div className="mb-10 flex items-center justify-around px-8 pt-1 text-[22px]">
            <div>
              {highLabel}
              <RevealNumber
                value={currentRow?.highest}
                className="ml-3 font-mono text-[32px] font-extrabold tabular-nums text-[#ffe14a]"
                style={{ textShadow: '0 0 12px rgba(255,225,74,0.55)' }}
              />
            </div>
            <div>
              {lowLabel}
              <RevealNumber
                value={currentRow?.lowest}
                className="ml-3 font-mono text-[32px] font-extrabold tabular-nums text-[#ffe14a]"
                style={{ textShadow: '0 0 12px rgba(255,225,74,0.55)' }}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function judgeCardsOf(state) {
  if (Array.isArray(state?.currentScores) && state.currentScores.length > 0) {
    return state.currentScores
  }
  return (state?.judges ?? []).filter((judge) => judge.active !== false).map((judge) => ({
    judgeId: judge.id,
    name: judge.name,
    org: judge.org,
    avatar: judge.avatar,
    score: null,
  }))
}

function JudgeCard({ card }) {
  return (
    <div className="flex w-[118px] shrink-0 flex-col">
      <div
        className="overflow-hidden rounded-[6px] bg-[#e7eaef]"
        style={{ boxShadow: '0 12px 24px rgba(0,0,0,0.34), 0 2px 6px rgba(0,0,0,0.22)' }}
      >
        <div className="relative h-[132px] bg-[#d7dbe2]">
          {card.avatar ? (
            <img src={card.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 80 100" className="absolute inset-x-[16%] top-[8%] h-[78%] text-[#aeb6c0]" aria-hidden="true">
              <circle cx="40" cy="28" r="16" fill="currentColor" />
              <path d="M10 98c5-26 16-38 30-38s25 12 30 38" fill="currentColor" />
            </svg>
          )}
        </div>
        <div className="truncate bg-[#d5d9e0] px-1 py-1.5 text-center text-[15px] font-medium text-[#2c3138]">
          {card.name || '评委'}
        </div>
      </div>
      <RevealNumber
        value={card.score}
        className="mt-2.5 block w-full rounded-[6px] bg-white py-1.5 text-center font-mono text-[24px] font-extrabold tabular-nums text-[#f07a1a]"
        style={{ boxShadow: '0 8px 16px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.18)' }}
      />
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex h-dvh items-center justify-center bg-[#071433] text-[16px] text-white/70">
      正在连接现场数据…
    </div>
  )
}

function BoardError({ error }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-[#071433] text-white">
      <div className="text-[18px]">大屏暂时连不上服务</div>
      <div className="text-[14px] text-white/60">{error?.message || '请检查网络后刷新'}</div>
    </div>
  )
}

function useReveal(value) {
  const [token, setToken] = useState(0)
  const prev = useRef(undefined)

  useEffect(() => {
    if (value == null || prev.current === value) return
    prev.current = value
    setToken((n) => n + 1)
  }, [value])

  return token
}

function RevealNumber({ value, className = '', style }) {
  const token = useReveal(value)
  return (
    <span className={className} style={style}>
      <span key={token} className={token ? 'fv-reveal inline-block' : 'inline-block'}>
        {formatScore(value, 2, '0.00')}
      </span>
    </span>
  )
}

const REVEAL_CSS = `
@keyframes fv-reveal {
  0% { transform: scale(0.62); opacity: 0; filter: brightness(2.6); }
  38% { transform: scale(1.18); opacity: 1; filter: brightness(1.7); }
  100% { transform: scale(1); opacity: 1; filter: brightness(1); }
}
.fv-reveal { animation: fv-reveal 0.9s cubic-bezier(.16,.84,.32,1) both; }
`

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.()
  } else {
    document.documentElement.requestFullscreen?.()
  }
}
