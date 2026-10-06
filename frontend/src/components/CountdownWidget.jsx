import { useEffect, useState } from 'react'
import { pad2 } from '../lib/format.js'
import { useI18n } from '../i18n/index.js'

/**
 * 演讲倒计时：根据服务端下发的 competition.countdown_* 在本地 1s 滴答显示。
 * 归零停在 00:00 并提示「时间到」，不触发任何状态变化。
 * 只在设置了时长（countdownMinutes>0）或正在运行（countdownRunning）时渲染。
 */
export function CountdownWidget({ competition }) {
  const { t } = useI18n()
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
      className="fixed bottom-6 left-6 z-40 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-lift"
      role="timer"
      aria-live="polite"
    >
      {configured ? (
        <span className={`font-mono text-[26px] font-semibold leading-none tnum ${tone}`}>
          {mm}:{ss}
        </span>
      ) : (
        <span className="text-[12px] text-ink-muted">—:—</span>
      )}
      <span className={`text-[12px] ${tone}`}>{label}</span>
    </div>
  )
}
