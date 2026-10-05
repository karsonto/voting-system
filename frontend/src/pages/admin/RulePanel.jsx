import { Pill } from '../../components/ui.jsx'
import { useI18n } from '../../i18n/index.js'

const RULE_TEXT = {
  'trimmed-mean': {
    label: '去掉最高分与最低分',
    description: '评委数 ≥ 3 时，去掉一个最高分与一个最低分后取平均',
    note: '同一项目的评委数 ≥ 3 时去掉一个最高分与一个最低分',
  },
  'drop-high': {
    label: '去掉一个最高分',
    description: '去掉单个最高分后取平均，保留其余评委',
    note: '同一项目的评委数 ≥ 2 时去掉一个最高分',
  },
  mean: {
    label: '全部评委取平均',
    description: '不做极值处理，直接对全部有效评分取平均',
    note: '不做极值处理',
  },
}

/**
 * 计分规则：真正影响排行榜的合并算法，因此这里直接给出「当前有效份数」的实时换算。
 */
export function RulePanel({ competition, stats, onSelect, busy }) {
  const { t } = useI18n()
  const options = competition?.ruleOptions ?? []
  const textOf = (id, field, fallback) => t(RULE_TEXT[id]?.[field] || fallback || '')

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{t('计分规则')}</span>
        <span className="meta">{textOf(competition?.ruleId, 'description', competition?.ruleDescription) || '—'}</span>
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
                  {textOf(option.id, 'label', option.label)}
                  <span className="font-mono text-[13px] text-ink-muted">{active ? '✓' : ''}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{textOf(option.id, 'description', option.description)}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
          <Pill tone="info">{t('当前汇总')}</Pill>
          <span className="hint">
            {t('已提交 {count} 份评分，按「{rule}」实际采信 {effective} 份（{note}）。', {
              count: stats?.scoreCount ?? 0,
              rule: textOf(competition?.ruleId, 'label', competition?.ruleLabel) || '—',
              effective: stats?.effectiveScoreCount ?? 0,
              note: textOf(competition?.ruleId, 'note', '不做极值处理'),
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
