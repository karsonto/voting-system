import { LOCALE_OPTIONS, useI18n } from '../../i18n/index.js'

/**
 * 全系统语言。后台改这一处，总览、评委端和大屏一起跟着变。
 */
export function LanguagePanel({ locale, onChange, busy }) {
  const { t } = useI18n()

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{t('界面语言')}</span>
      </div>
      <div className="panel-body flex flex-col gap-3">
        <p className="hint">{t('切换后，总览、后台、评委端和总分大屏都会使用这一语言。')}</p>
        <div className="flex flex-wrap gap-2">
          {LOCALE_OPTIONS.map((option) => {
            const active = option.id === (locale || 'zh-Hans')
            return (
              <button
                key={option.id}
                type="button"
                disabled={busy}
                onClick={() => !active && onChange(option.id)}
                className={`rounded border px-4 py-2 text-[13.5px] font-semibold transition ${
                  active ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink-faint'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
