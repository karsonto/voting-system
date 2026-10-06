import { useEffect, useRef, useState } from 'react'
import { pad2 } from '../lib/format.js'
import { useI18n } from '../i18n/index.js'

/**
 * 演讲倒计时：根据服务端下发的 competition.countdown_* 在本地 1s 滴答显示。
 * 归零停在 00:00 并提示「时间到」，不触发任何状态变化。
 * 只在设置了时长（countdownMinutes>0）或正在运行（countdownRunning）时渲染。
 */
const POSITION_KEY = 'finvote.countdownWidgetPos'

function readSavedPos() {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    const pos = raw ? JSON.parse(raw) : null
    if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) return pos
  } catch {
    /* ignore */
  }
  return null
}

export function CountdownWidget({ competition, dark, className }) {
  const cls = className ? `${className} z-40 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lift` : ''
  const shellClass = dark
    ? `fixed ${cls} border border-white/30 bg-[rgba(7,18,52,0.6)] backdrop-blur-[2px]`
    : `fixed ${cls} border border-line bg-surface`
  const { t } = useI18n()
  const ref = useRef(null)
  const dragRef = useRef(null)
  const [pos, setPos] = useState(readSavedPos)

  function startDrag(e) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragRef.current = { offX: e.clientX - rect.left, offY: e.clientY - rect.top }
    el.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function onDrag(e) {
    const d = dragRef.current
    const el = ref.current
    if (!d || !el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const left = Math.min(Math.max(e.clientX - d.offX, 4), window.innerWidth - w - 4)
    const top = Math.min(Math.max(e.clientY - d.offY, 4), window.innerHeight - h - 4)
    setPos({ left, top })
  }

  function endDrag() {
    dragRef.current = null
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    try {
      localStorage.setItem(
        POSITION_KEY,
        JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }),
      )
    } catch {
      /* ignore */
    }
  }

  const posStyle =
    pos !== null
      ? { left: pos.left, top: pos.top, bottom: 'auto', right: 'auto' }
      : undefined
  const minutes = competition?.countdownMinutes ?? 0
  const running = !!competition?.countdownRunning
  const endAt = competition?.countdownEndAt ?? 0

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const configured = minutes > 0

  const remainingMs = running ? Math.max(0, endAt - now) : (minutes * 60 * 1000)
  const totalSec = Math.ceil(remainingMs / 1000)
  const mm = pad2(Math.floor(totalSec / 60))
  const ss = pad2(totalSec % 60)
  const timeUp = running && remainingMs <= 0
  const paused = !running && minutes > 0

  const tone = timeUp ? 'text-danger-ink' : running ? 'text-brand-600' : 'text-ink-muted'

  let label
  if (timeUp) label = t('时间到')
  else if (paused) label = t('已暂停')
  else if (running) label = t('正在倒数中…')
  else if (configured) label = t('未开始')
  else label = t('未设置')

  return (
    <div
      ref={ref}
      className={shellClass || 'fixed bottom-6 left-6 z-40 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-lift'}
      style={posStyle ? { ...posStyle, cursor: 'grab', touchAction: 'none' } : { cursor: 'grab', touchAction: 'none' }}
      onPointerDown={startDrag}
      onPointerMove={onDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="timer"
      aria-live="polite"
    >
      {configured ? (
        <span
          className={`font-mono text-[26px] font-semibold leading-none tnum ${
            dark
              ? timeUp
                ? 'text-[#ff8a8a]'
                : running
                  ? 'text-[#ffe14a]'
                  : 'text-white/70'
              : tone
          }`}
          style={dark && (running || timeUp) ? { textShadow: '0 0 14px rgba(255,225,74,0.5)' } : undefined}
        >
          {mm}:{ss}
        </span>
      ) : (
        <span className={`text-[12px] ${dark ? 'text-white/50' : 'text-ink-muted'}`}>—:—</span>
      )}
      <span className={`text-[12px] ${dark ? (timeUp ? 'text-[#ff8a8a]' : 'text-white/75') : tone}`}>{label}</span>
    </div>
  )
}
