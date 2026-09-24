import { Pill } from '../../components/ui.jsx'

/**
 * 计分规则：真正影响排行榜的合并算法，因此这里直接给出「当前有效份数」的实时换算。
 */
export function RulePanel({ competition, stats, onSelect, busy }) {
  const options = competition?.ruleOptions ?? []

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">计分规则</span>
        <span className="meta">{competition?.ruleDescription || '—'}</span>
      </div>
      <div className="panel-body">
        <div className="grid gap-2.5 sm:grid-cols-3">
          {options.map((option) => {
            const active = option.id === competition?.ruleId
            return (
              <button
                key={option.id}
                type="button"
                disabled={busy}
                onClick={() => !active && onSelect(option.id)}
                className={`rounded border px-3.5 py-3 text-left transition ${
                  active ? 'border-ink bg-ink/[0.03]' : 'border-line bg-surface hover:border-ink-faint'
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-[13.5px] font-semibold">
                  {option.label}
                  <span className="font-mono text-[13px] text-ink-muted">{active ? '✓' : ''}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{option.description}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
          <Pill tone="info">当前汇总</Pill>
          <span className="hint">
            已提交 {stats?.scoreCount ?? 0} 份评分，按「{competition?.ruleLabel || '—'}」实际采信{' '}
            {stats?.effectiveScoreCount ?? 0} 份（
            {competition?.ruleId === 'trimmed-mean'
              ? '同一项目的评委数 ≥ 3 时去掉一个最高分与一个最低分'
              : competition?.ruleId === 'drop-high'
                ? '同一项目的评委数 ≥ 2 时去掉一个最高分'
                : '不做极值处理'}
            ）。
          </span>
        </div>
      </div>
    </div>
  )
}
