import { useState } from 'react'
import { Pill } from '../../components/ui.jsx'
import { useI18n } from '../../i18n/index.js'
import { pad2 } from '../../lib/format.js'

/** 毫秒剩余 → MM:SS */
function fmtRemaining(endAt) {
  const ms = Math.max(0, endAt - Date.now())
  const total = Math.ceil(ms / 1000)
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

/** 分钟数 → MM:SS */
function fmtMinutes(m) {
  const total = Math.max(0, Math.round(Number(m) || 0) * 60)
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

/**
 * 赛事基本信息：名称、当前环节，以及（可选的）批量规模调整。
 */
export function InfoPanel({ competition, stats, onSave, onApplyScale, onCountdown, busy, toast }) {
  const { t } = useI18n()
  const [name, setName] = useState(competition?.name ?? '')
  const [stage, setStage] = useState(competition?.stage ?? '')
  const [projectCount, setProjectCount] = useState(stats?.projectCount ?? 0)
  const [judgeCount, setJudgeCount] = useState(stats?.judgeCount ?? 0)

  const countdownMinutes = competition?.countdownMinutes ?? 0
  const countdownRunning = !!competition?.countdownRunning
  const countdownEndAt = competition?.countdownEndAt ?? 0
  const [minutes, setMinutes] = useState(countdownMinutes)

  const minutesDirty = Number(minutes) !== countdownMinutes

  async function handleCountdownAction(action) {
    await onCountdown({ minutes: Number(minutes) || 0, action })
  }

  const dirty = name !== (competition?.name ?? '') || stage !== (competition?.stage ?? '')

  async function handleSave() {
    if (!name.trim()) {
      toast(t('赛事名称不能为空'))
      return
    }
    await onSave({ name: name.trim(), stage: stage.trim() })
    toast(t('赛事信息已保存'))
  }

  async function handleScale() {
    await onApplyScale(Number(projectCount) || 0, Number(judgeCount) || 0)
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{t('赛事基本信息')}</span>
        {dirty ? <Pill tone="warn">{t('有未保存的修改')}</Pill> : <Pill tone="idle">{t('已同步')}</Pill>}
      </div>

      <div className="panel-body flex flex-col gap-4">
        <label className="field">
          <span className="field-label">{t('赛事名称')}</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('例如：2026 金融科技创新演讲大赛 · 总决赛')}
          />
        </label>

        <label className="field">
          <span className="field-label">{t('当前环节')}</span>
          <input
            className="input"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            placeholder={t('例如：决赛 · 第一轮')}
          />
        </label>

        <button type="button" className="btn btn-primary self-start" onClick={handleSave} disabled={busy || !dirty}>
          {t('保存赛事信息')}
        </button>

        <div className="border-t border-line pt-4">
          <div className="field-label mb-2">{t('演讲倒计时')}</div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              className="input input-num w-[84px] text-center"
              type="number"
              min="0"
              max="180"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              aria-label={t('倒计时时长（分钟）')}
            />
            <span className="hint">{t('分钟')}</span>
            <button
              type="button"
              className="btn btn-primary btn-sm ml-auto"
              onClick={() => handleCountdownAction('start')}
              disabled={busy || Number(minutes) <= 0}
            >
              {t('开始倒计时')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleCountdownAction('pause')}
              disabled={busy || !countdownRunning}
            >
              {t('暂停')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleCountdownAction('reset')}
              disabled={busy}
            >
              {t('重置')}
            </button>
          </div>
          {countdownRunning ? (
            <p className="hint mt-2">
              {t('正在倒数中…')}{countdownEndAt > 0 ? ` · ${t('剩余 {time}', { time: fmtRemaining(countdownEndAt) })}` : ''}
            </p>
          ) : countdownMinutes > 0 ? (
            <p className="hint mt-2">
              {t('已暂停')} · {t('剩余 {time}', { time: fmtMinutes(countdownMinutes) })}
            </p>
          ) : (
            <p className="hint mt-2">{t('未设置倒计时')}</p>
          )}
          <p className="hint mt-1">
            {t('每场演讲限时 {minutes} 分钟，归零停在 00:00 并提示「时间到」，不会自动改变任何状态。', {
              minutes: countdownMinutes || minutes,
            })}
          </p>
        </div>

        <div className="border-t border-line pt-4">
          <div className="field-label mb-2">{t('批量调整规模')}</div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              className="input input-num w-[84px] text-center"
              type="number"
              min="0"
              max="24"
              value={projectCount}
              onChange={(e) => setProjectCount(e.target.value)}
              aria-label={t('参赛项目数')}
            />
            <span className="hint">{t('个项目')}</span>
            <input
              className="input input-num w-[84px] text-center"
              type="number"
              min="0"
              max="24"
              value={judgeCount}
              onChange={(e) => setJudgeCount(e.target.value)}
              aria-label={t('评委人数')}
            />
            <span className="hint">{t('位评委')}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm ml-auto"
              onClick={handleScale}
              disabled={busy}
            >
              {t('应用规模')}
            </button>
          </div>
          <p className="hint mt-2">
            {t('增加数量会追加占位条目，减少数量会删除末尾条目（含其评分）。单次最多 24 个 / 位。')}
          </p>
        </div>
      </div>
    </div>
  )
}
