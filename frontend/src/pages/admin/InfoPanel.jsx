import { useState } from 'react'
import { Pill } from '../../components/ui.jsx'

/**
 * 赛事基本信息：名称、当前环节，以及（可选的）批量规模调整。
 */
export function InfoPanel({ competition, stats, onSave, onApplyScale, busy, toast }) {
  const [name, setName] = useState(competition?.name ?? '')
  const [stage, setStage] = useState(competition?.stage ?? '')
  const [projectCount, setProjectCount] = useState(stats?.projectCount ?? 0)
  const [judgeCount, setJudgeCount] = useState(stats?.judgeCount ?? 0)

  const dirty = name !== (competition?.name ?? '') || stage !== (competition?.stage ?? '')

  async function handleSave() {
    if (!name.trim()) {
      toast('赛事名称不能为空')
      return
    }
    await onSave({ name: name.trim(), stage: stage.trim() })
    toast('赛事信息已保存')
  }

  async function handleScale() {
    await onApplyScale(Number(projectCount) || 0, Number(judgeCount) || 0)
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">赛事基本信息</span>
        {dirty ? <Pill tone="warn">有未保存的修改</Pill> : <Pill tone="idle">已同步</Pill>}
      </div>

      <div className="panel-body flex flex-col gap-4">
        <label className="field">
          <span className="field-label">赛事名称</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：2026 金融科技创新演讲大赛 · 总决赛"
          />
        </label>

        <label className="field">
          <span className="field-label">当前环节</span>
          <input
            className="input"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            placeholder="例如：决赛 · 第一轮"
          />
        </label>

        <button type="button" className="btn btn-primary self-start" onClick={handleSave} disabled={busy || !dirty}>
          保存赛事信息
        </button>

        <div className="border-t border-line pt-4">
          <div className="field-label mb-2">批量调整规模</div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              className="input input-num w-[84px] text-center"
              type="number"
              min="0"
              max="24"
              value={projectCount}
              onChange={(e) => setProjectCount(e.target.value)}
              aria-label="参赛项目数"
            />
            <span className="hint">个项目</span>
            <input
              className="input input-num w-[84px] text-center"
              type="number"
              min="0"
              max="24"
              value={judgeCount}
              onChange={(e) => setJudgeCount(e.target.value)}
              aria-label="评委人数"
            />
            <span className="hint">位评委</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm ml-auto"
              onClick={handleScale}
              disabled={busy}
            >
              应用规模
            </button>
          </div>
          <p className="hint mt-2">
            增加数量会追加占位条目，减少数量会删除末尾条目（含其评分）。单次最多 24 个 / 位。
          </p>
        </div>
      </div>
    </div>
  )
}
