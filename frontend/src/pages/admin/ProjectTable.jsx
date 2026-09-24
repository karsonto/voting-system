import { useState } from 'react'
import { EmptyState, Pill } from '../../components/ui.jsx'
import { pad2, percent } from '../../lib/format.js'

/**
 * 项目名单：表格内直接编辑，失焦或回车即保存。
 */
export function ProjectTable({ projects, judgeCount, onAdd, onUpdate, onDelete, busy }) {
  const [draft, setDraft] = useState(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">参赛项目</span>
        <div className="flex items-center gap-2">
          <span className="meta">{projects.length} 个项目</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(true)} disabled={busy}>
            添加项目
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-[42px]">#</th>
              <th>项目名称</th>
              <th className="w-[200px]">团队</th>
              <th className="w-[170px]">赛道</th>
              <th className="w-[130px]">评分进度</th>
              <th className="w-[70px]" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <DraftRow
                placeholder={{ name: '项目名称', team: '团队', track: '赛道' }}
                onCancel={() => setAdding(false)}
                onConfirm={async (value) => {
                  await onAdd(value)
                  setAdding(false)
                }}
              />
            )}

            {projects.map((project, index) => (
              <ProjectRow
                key={project.id}
                project={project}
                index={index}
                judgeCount={judgeCount}
                busy={busy}
                onUpdate={onUpdate}
                onDelete={onDelete}
                draft={draft}
                setDraft={setDraft}
              />
            ))}
          </tbody>
        </table>
      </div>

      {projects.length === 0 && !adding && (
        <EmptyState
          title="还没有参赛项目"
          description="添加项目，或在「赛事基本信息」里用批量规模生成占位条目。"
          action={
            <button type="button" className="btn btn-secondary btn-sm mt-1" onClick={() => setAdding(true)}>
              添加第一个项目
            </button>
          }
        />
      )}
    </div>
  )
}

function ProjectRow({ project, index, judgeCount, busy, onUpdate, onDelete, draft, setDraft }) {
  const isEditing = draft?.type === 'project' && draft.id === project.id

  if (isEditing) {
    return (
      <DraftRow
        initial={{ name: project.name, team: project.team, track: project.track }}
        onCancel={() => setDraft(null)}
        onConfirm={async (value) => {
          await onUpdate(project.id, value)
          setDraft(null)
        }}
      />
    )
  }

  return (
    <tr>
      <td className="font-mono text-xs text-ink-muted">{pad2(index + 1)}</td>
      <td className="font-medium">{project.name}</td>
      <td className="text-ink-muted">{project.team || '—'}</td>
      <td className="text-ink-muted">{project.track || '—'}</td>
      <td>
        <div className="flex items-center gap-2">
          <span className="progress-track">
            <i className="progress-bar" style={{ width: `${percent(project.submittedCount, judgeCount)}%` }} />
          </span>
          <Pill tone={project.submittedCount > 0 ? 'ok' : 'idle'}>
            {project.submittedCount}/{judgeCount}
          </Pill>
        </div>
      </td>
      <td>
        <div className="flex justify-end gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDraft({ type: 'project', id: project.id })}
            disabled={busy}
          >
            编辑
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm text-ink-faint hover:text-danger-ink"
            onClick={() => onDelete(project)}
            disabled={busy}
          >
            删除
          </button>
        </div>
      </td>
    </tr>
  )
}

/** 新增 / 编辑共用的行内表单。 */
function DraftRow({ initial = { name: '', team: '', track: '' }, placeholder = {}, onCancel, onConfirm }) {
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function confirm() {
    if (!value.name.trim()) return
    setSaving(true)
    try {
      await onConfirm({ name: value.name.trim(), team: value.team.trim(), track: value.track.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="bg-brand-50/60">
      <td className="font-mono text-xs text-ink-muted">NEW</td>
      <td>
        <input
          className="input py-1.5"
          autoFocus
          value={value.name}
          placeholder={placeholder.name || '项目名称'}
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
          value={value.team}
          placeholder={placeholder.team || '团队'}
          onChange={(e) => setValue((v) => ({ ...v, team: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm()
            if (e.key === 'Escape') onCancel()
          }}
        />
      </td>
      <td>
        <input
          className="input py-1.5"
          value={value.track}
          placeholder={placeholder.track || '赛道'}
          onChange={(e) => setValue((v) => ({ ...v, track: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm()
            if (e.key === 'Escape') onCancel()
          }}
        />
      </td>
      <td className="text-xs text-ink-muted">—</td>
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
