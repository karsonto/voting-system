import { Pill } from '../../components/ui.jsx'
import { useI18n } from '../../i18n/index.js'

const SCALE_TEXT = {
  'weighted-100': {
    label: '百分制 · 多维度加权',
    description: '每个维度 0–100 分，按权重折算为最终得分',
  },
  'weighted-10': {
    label: '十分制 · 多维度加权',
    description: '每维度 0–10 分，再折算百分制',
  },
  rank: {
    label: '排名制',
    description: '评委对项目排序，按名次计分',
  },
}

/**
 * 评分制式：当前版本只实现了「百分制 · 多维度加权」，
 * 其余选项按设计稿的做法展示但不可选，点击时给出明确提示。
 */
export function ScalePanel({ competition, onSelect, busy, toast }) {
  const { t } = useI18n()
  const options = competition?.scaleOptions ?? []
  const labelOf = (id, fallback) => t(SCALE_TEXT[id]?.label || fallback || '')
  const descOf = (id, fallback) => t(SCALE_TEXT[id]?.description || fallback || '')

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{t('评分制式')}</span>
        <Pill tone="idle">{t('当前：{label}', { label: labelOf(competition?.scaleId, competition?.scaleLabel) || '—' })}</Pill>
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
                    toast(t('当前版本仅支持「{name}」', { name: labelOf('weighted-100') }))
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
                  {labelOf(option.id, option.label)}
                  <span className="font-mono text-[13px] text-ink-muted">{active ? '✓' : ''}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  {descOf(option.id, option.description)}
                  {!option.supported && t(' · 暂未开放')}
                </span>
              </button>
            )
          })}
        </div>
        <p className="hint mt-3">
          {t('本系统按「每个维度 0–{max} 分，按权重折算为 0–100 的最终得分」计算。', {
            max: competition?.maxPerDimension ?? 100,
          })}
        </p>
      </div>
    </div>
  )
}
