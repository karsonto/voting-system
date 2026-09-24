import { Pill } from '../../components/ui.jsx'

/**
 * 评分制式：当前版本只实现了「百分制 · 多维度加权」，
 * 其余选项按设计稿的做法展示但不可选，点击时给出明确提示。
 */
export function ScalePanel({ competition, onSelect, busy, toast }) {
  const options = competition?.scaleOptions ?? []

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">评分制式</span>
        <Pill tone="idle">当前：{competition?.scaleLabel || '—'}</Pill>
      </div>
      <div className="panel-body">
        <div className="grid gap-2.5 sm:grid-cols-3">
          {options.map((option) => {
            const active = option.id === competition?.scaleId
            return (
              <button
                key={option.id}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!option.supported) {
                    toast(`当前版本仅支持「${competition?.scaleLabel || '百分制 · 多维度加权'}」`)
                    return
                  }
                  if (!active) onSelect(option.id)
                }}
                className={`rounded border px-3.5 py-3 text-left transition ${
                  active
                    ? 'border-ink bg-ink/[0.03]'
                    : option.supported
                      ? 'border-line bg-surface hover:border-ink-faint'
                      : 'border-line bg-surface opacity-55'
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-[13.5px] font-semibold">
                  {option.label}
                  <span className="font-mono text-[13px] text-ink-muted">{active ? '✓' : ''}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  {option.description}
                  {!option.supported && ' · 暂未开放'}
                </span>
              </button>
            )
          })}
        </div>
        <p className="hint mt-3">
          本系统按「每个维度 0–{competition?.maxPerDimension ?? 100} 分，按权重折算为 0–100 的最终得分」计算。
        </p>
      </div>
    </div>
  )
}
