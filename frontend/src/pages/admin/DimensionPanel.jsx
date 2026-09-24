import { useEffect, useState } from 'react'
import { Pill } from '../../components/ui.jsx'

/**
 * 评分维度与权重。
 *
 * 权重合计不等于 100% 时给出醒目提示，但仍允许保存：赛前配置常见「边配边调」，
 * 不应因为暂时不配平就阻塞操作。折算时以实际权重之和为分母做归一化，
 * 最终得分依然是 0–100 制。
 */
export function DimensionPanel({ dimensions, onAdd, onUpdate, onDelete, busy }) {
  const sum = dimensions.reduce((acc, d) => acc + (Number(d.weight) || 0), 0)
  const balanced = sum === 100

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">评分维度与权重</span>
        <Pill tone={balanced ? 'idle' : 'danger'}>合计 {sum}%</Pill>
      </div>

      <div className="panel-body">
        <div className="flex items-center gap-2.5 border-b border-line pb-2 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-muted">
          <span className="flex-1">维度名称</span>
          <span className="w-[110px]">权重（%）</span>
          <span className="w-[38px]" />
        </div>

        {dimensions.length === 0 && (
          <p className="hint py-6 text-center">还没有维度，点击下方「添加维度」开始配置。</p>
        )}

        {dimensions.map((dimension) => (
          <DimensionRow
            key={dimension.id}
            dimension={dimension}
            busy={busy}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onAdd} disabled={busy}>
            添加维度
          </button>
          <span className={`hint ${balanced ? '' : 'text-danger-ink'}`}>
            {balanced
              ? '权重已配平至 100%，可以开始评分。'
              : `权重合计 ${sum}%，需要配平到 100%（当前${sum > 100 ? '超出' : '还差'} ${Math.abs(100 - sum)}%）。`}
          </span>
        </div>
      </div>
    </div>
  )
}

function DimensionRow({ dimension, onUpdate, onDelete, busy }) {
  const [name, setName] = useState(dimension.name)
  const [weight, setWeight] = useState(String(dimension.weight))

  // 服务端数据变化（例如别处改了权重）时同步回本地输入框
  useEffect(() => {
    setName(dimension.name)
    setWeight(String(dimension.weight))
  }, [dimension.name, dimension.weight])

  const parsedWeight = Math.max(0, Math.min(100, Math.round(Number(weight) || 0)))
  const dirty = name.trim() !== dimension.name || parsedWeight !== dimension.weight

  function commit() {
    const trimmed = name.trim()
    if (!trimmed) {
      // 名称不允许为空，回退到服务端值
      setName(dimension.name)
      setWeight(String(dimension.weight))
      return
    }
    if (trimmed === dimension.name && parsedWeight === dimension.weight) {
      setWeight(String(dimension.weight))
      return
    }
    onUpdate(dimension.id, { name: trimmed, weight: parsedWeight })
  }

  return (
    <div className="flex items-center gap-2.5 border-b border-line py-2 last:border-b-0">
      <div className="flex-1">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label="维度名称"
        />
      </div>

      <input
        className="input input-num w-[110px] text-center"
        type="number"
        min="0"
        max="100"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="权重"
      />

      <button
        type="button"
        className="btn btn-ghost btn-sm w-[38px] text-ink-faint hover:text-danger-ink"
        onClick={() => onDelete(dimension.id)}
        disabled={busy}
        title="删除该维度"
        aria-label={`删除维度 ${dimension.name}`}
      >
        ✕
      </button>

      {dirty && <span className="w-full text-[11.5px] text-warn-ink">有未保存的修改，回车即保存</span>}
    </div>
  )
}
