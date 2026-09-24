import { useState } from 'react'
import { EmptyState, Pill } from '../../components/ui.jsx'
import { pad2 } from '../../lib/format.js'

/**
 * 评委名单：维护姓名、机构、PIN，以及查看当前评审项目。
 */
export function JudgeTable({ judges, projects, onAdd, onUpdate, onDelete, onRandomPin, busy }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const projectName = (id) => projects.find((p) => p.id === id)?.name || '未分配'

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">评委名单</span>
        <div className="flex items-center gap-2">
          <span className="meta">{judges.length} 位评委</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(true)} disabled={busy}>
            添加评委
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-[42px]">#</th>
              <th className="w-[120px]">姓名</th>
              <th>机构 / 职务</th>
              <th className="w-[110px]">登入 PIN</th>
              <th className="w-[190px]">当前评审</th>
              <th className="w-[130px]">提交情况</th>
              <th className="w-[70px]" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <DraftRow
                onRandomPin={onRandomPin}
                onCancel={() => setAdding(false)}
                onConfirm={async (value) => {
                  await onAdd(value)
                  setAdding(false)
                }}
              />
            )}

            {judges.map((judge, index) =>
              editingId === judge.id ? (
                <DraftRow
                  key={judge.id}
                  initial={judge}
                  onRandomPin={onRandomPin}
                  onCancel={() => setEditingId(null)}
                  onConfirm={async (value) => {
                    await onUpdate(judge.id, value)
                    setEditingId(null)
                  }}
                />
              ) : (
                <tr key={judge.id}>
                  <td className="font-mono text-xs text-ink-muted">{pad2(index + 1)}</td>
                  <td className="font-medium">
                    {judge.name}
                    {!judge.active && (
                      <span className="ml-1.5">
                        <Pill tone="idle">已停用</Pill>
                      </span>
                    )}
                  </td>
                  <td className="text-ink-muted">{judge.org || '—'}</td>
                  <td className="font-mono tnum">{judge.pin}</td>
                  <td className="text-ink-muted">{projectName(judge.currentProjectId)}</td>
                  <td>
                    <Pill tone={judge.submittedOnCurrent ? 'ok' : 'warn'}>
                      {judge.submittedOnCurrent ? '当前项已提交' : '当前项待评分'}
                    </Pill>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingId(judge.id)}
                        disabled={busy}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-ink-faint hover:text-danger-ink"
                        onClick={() => onDelete(judge)}
                        disabled={busy}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {judges.length === 0 && !adding && (
        <EmptyState
          title="还没有评委"
          description="添加评委并为其分配 4 位 PIN，评委凭 PIN 登入评分端。"
          action={
            <button type="button" className="btn btn-secondary btn-sm mt-1" onClick={() => setAdding(true)}>
              添加第一位评委
            </button>
          }
        />
      )}
    </div>
  )
}

function DraftRow({ initial = { name: '', org: '', pin: '', active: true }, onRandomPin, onCancel, onConfirm }) {
  const [value, setValue] = useState({
    name: initial.name ?? '',
    org: initial.org ?? '',
    pin: initial.pin ?? '',
    active: initial.active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const pinValid = /^\d{4}$/.test(value.pin)

  async function confirm() {
    if (!value.name.trim()) {
      setLocalError('请输入姓名')
      return
    }
    if (!pinValid) {
      setLocalError('PIN 必须是 4 位数字')
      return
    }
    setLocalError('')
    setSaving(true)
    try {
      await onConfirm({
        name: value.name.trim(),
        org: value.org.trim(),
        pin: value.pin,
        active: value.active,
      })
    } finally {
      setSaving(false)
    }
  }

  async function fillRandomPin() {
    const data = await onRandomPin()
    if (data?.pin) setValue((v) => ({ ...v, pin: data.pin }))
  }

  return (
    <tr className="bg-brand-50/60">
      <td className="font-mono text-xs text-ink-muted">NEW</td>
      <td>
        <input
          className="input py-1.5"
          autoFocus
          value={value.name}
          placeholder="姓名"
          onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm()
            if (e.key === 'Escape') onCancel()
          }}
        />
      </td>
      <td>
        <input
          className="input py-1.5"
          value={value.org}
          placeholder="机构 / 职务"
          onChange={(e) => setValue((v) => ({ ...v, org: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm()
            if (e.key === 'Escape') onCancel()
          }}
        />
      </td>
      <td>
        <div className="flex items-center gap-1.5">
          <input
            className={`input input-num w-[68px] py-1.5 text-center ${
              value.pin && !pinValid ? 'border-danger-ink' : ''
            }`}
            value={value.pin}
            maxLength={4}
            placeholder="0000"
            onChange={(e) => setValue((v) => ({ ...v, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm()
              if (e.key === 'Escape') onCancel()
            }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={fillRandomPin} title="随机生成 PIN">
            ⟳
          </button>
        </div>
      </td>
      <td className="text-xs text-ink-muted">新增后默认排到第一个项目</td>
      <td className="text-xs text-danger-ink">{localError}</td>
      <td>
        <div className="flex justify-end gap-1">
          <button type="button" className="btn btn-primary btn-sm" onClick={confirm} disabled={saving}>
            保存
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
            取消
          </button>
        </div>
      </td>
    </tr>
  )
}
