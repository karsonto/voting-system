import { useState } from 'react'
import { EmptyState, Pill } from '../../components/ui.jsx'
import { pad2 } from '../../lib/format.js'
import { useI18n } from '../../i18n/index.js'

/**
 * 评委名单：维护姓名、机构、PIN，以及查看当前评审项目。
 */
export function JudgeTable({ judges, projects, onAdd, onUpdate, onDelete, onUploadAvatar, onRandomPin, busy }) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const projectName = (id) => projects.find((p) => p.id === id)?.name || t('未分配')

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{t('评委')}</span>
        <div className="flex items-center gap-2">
          <span className="meta">{t('{count} 位评委', { count: judges.length })}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(true)} disabled={busy}>
            {t('添加评委')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-[42px]">#</th>
              <th className="w-[88px]">{t('头像')}</th>
              <th className="w-[120px]">{t('姓名')}</th>
              <th>{t('机构 / 职务')}</th>
              <th className="w-[110px]">{t('登入 PIN')}</th>
              <th className="w-[190px]">{t('当前评审')}</th>
              <th className="w-[130px]">{t('提交情况')}</th>
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
                  <td>
                    <AvatarCell judge={judge} busy={busy} onUpload={onUploadAvatar} />
                  </td>
                  <td className="font-medium">
                    {judge.name}
                    {!judge.active && (
                      <span className="ml-1.5">
                        <Pill tone="idle">{t('已停用')}</Pill>
                      </span>
                    )}
                  </td>
                  <td className="text-ink-muted">{judge.org || '—'}</td>
                  <td className="font-mono tnum">{judge.pin}</td>
                  <td className="text-ink-muted">{projectName(judge.currentProjectId)}</td>
                  <td>
                    <Pill tone={judge.submittedOnCurrent ? 'ok' : 'warn'}>
                      {judge.submittedOnCurrent ? t('当前项已提交') : t('当前项待评分')}
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
                        {t('编辑')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-ink-faint hover:text-danger-ink"
                        onClick={() => onDelete(judge)}
                        disabled={busy}
                      >
                        {t('删除')}
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
          title={t('还没有评委')}
          description={t('添加评委并为其分配 4 位 PIN，评委凭 PIN 登入评分端。')}
          action={
            <button type="button" className="btn btn-secondary btn-sm mt-1" onClick={() => setAdding(true)}>
              {t('添加第一位评委')}
            </button>
          }
        />
      )}
    </div>
  )
}

function AvatarCell({ judge, busy, onUpload }) {
  const { t } = useI18n()
  return (
    <label className={`inline-flex items-center gap-2 ${busy ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
      {judge.avatar ? (
        <img src={judge.avatar} alt="" className="h-10 w-10 rounded-md object-cover ring-1 ring-line" />
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-md bg-canvas text-[11px] text-ink-muted ring-1 ring-line">
          {t('上传')}
        </span>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onUpload?.(judge.id, file)
        }}
      />
    </label>
  )
}

function DraftRow({ initial = { name: '', org: '', pin: '', active: true }, onRandomPin, onCancel, onConfirm }) {
  const { t } = useI18n()
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
      setLocalError(t('请输入姓名'))
      return
    }
    if (!pinValid) {
      setLocalError(t('PIN 必须是 4 位数字'))
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
      <td className="text-xs text-ink-muted">{t('保存后可上传')}</td>
      <td>
        <input
          className="input py-1.5"
          autoFocus
          value={value.name}
          placeholder={t('姓名')}
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
          placeholder={t('机构 / 职务')}
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
          <button type="button" className="btn btn-ghost btn-sm" onClick={fillRandomPin} title={t('随机生成 PIN')}>
            ⟳
          </button>
        </div>
      </td>
      <td className="text-xs text-ink-muted">{t('新增后默认排到第一个项目')}</td>
      <td className="text-xs text-danger-ink">{localError}</td>
      <td>
        <div className="flex justify-end gap-1">
          <button type="button" className="btn btn-primary btn-sm" onClick={confirm} disabled={saving}>
            {t('保存')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
            {t('取消')}
          </button>
        </div>
      </td>
    </tr>
  )
}
