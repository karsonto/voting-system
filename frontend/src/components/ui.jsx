/**
 * 状态徽标。设计稿里的 pill 有 ok / warn / danger / info / idle 五种语气。
 */
const TONES = {
  ok: 'pill-ok',
  warn: 'pill-warn',
  danger: 'pill-danger',
  info: 'pill-info',
  idle: 'pill-idle',
}

export function Pill({ tone = 'idle', live = false, children, className = '' }) {
  return (
    <span className={`pill ${TONES[tone] || TONES.idle} ${className}`}>
      {live && <span className="dot animate-pulse-soft" />}
      {children}
    </span>
  )
}

/** 空状态：表格与列表在没有数据时统一展示。 */
export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="text-[13.5px] font-medium text-ink">{title}</p>
      {description && <p className="hint max-w-[46ch]">{description}</p>}
      {action}
    </div>
  )
}

/** 横向进度条，右对齐显示 `part / total`。 */
export function ProgressRow({ label, part, total, barClass = '' }) {
  const pct = total ? Math.round((part / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
      <span className="w-[190px] truncate text-[13px]" title={label}>
        {label}
      </span>
      <span className="progress-track">
        <i className={`progress-bar ${barClass}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="meta w-[52px] text-right">
        {part}/{total}
      </span>
    </div>
  )
}

/** 指标卡。 */
export function Kpi({ label, value, unit, sub }) {
  return (
    <div className="bg-surface px-5 py-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-muted">{label}</div>
      <div className="mt-1.5 font-mono text-[28px] font-semibold leading-none tracking-[-0.03em] tnum">
        {value}
        {unit && <span className="ml-0.5 text-[14px] font-medium text-ink-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>}
    </div>
  )
}
