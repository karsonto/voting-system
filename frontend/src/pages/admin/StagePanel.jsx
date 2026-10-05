import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pill } from '../../components/ui.jsx'
import { authApi } from '../../lib/api.js'
import { useI18n } from '../../i18n/index.js'

/**
 * CSV 导出、重置与改密码。评分通道在「实时调度」中开关。
 */
export function StagePanel({
  stats,
  usingDefaultPassword,
  onExport,
  onClearScores,
  onReset,
  busy,
  toast,
}) {
  const { t } = useI18n()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [changing, setChanging] = useState(false)

  async function handleReset() {
    if (!confirmingReset) {
      setConfirmingReset(true)
      toast(t('再次点击以确认清空全部配置'))
      return
    }
    setConfirmingReset(false)
    await onReset()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">{t('数据导出')}</span>
          <span className="meta">
            {t('{scores} 份评分 · {projects} 个项目', {
              scores: stats?.scoreCount ?? 0,
              projects: stats?.projectCount ?? 0,
            })}
          </span>
        </div>
        <div className="panel-body flex flex-wrap items-center gap-2.5">
          <button type="button" className="btn btn-secondary" onClick={() => onExport('scores')} disabled={busy}>
            {t('导出评分明细 CSV')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onExport('ranking')} disabled={busy}>
            {t('导出项目排名 CSV')}
          </button>
          <Link to="/board" className="btn btn-ghost ml-auto group">
            {t('前往总分大屏')}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">{t('管理员密码')}</span>
          {usingDefaultPassword && <Pill tone="danger">{t('仍在使用默认密码')}</Pill>}
        </div>
        <div className="panel-body">
          {changing ? (
            <ChangePasswordForm onDone={() => setChanging(false)} toast={toast} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="hint max-w-[60ch]">
                {t('为保护赛事数据，建议在开赛前把出厂密码修改为只有组委会知道的强密码。')}
              </p>
              <button type="button" className="btn btn-secondary" onClick={() => setChanging(true)}>
                {t('修改密码')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-danger-ink/30 bg-danger-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold">{t('清空结果')}</h3>
            <p className="hint mt-1 max-w-[62ch]">
              {t('删除全部已提交评分，项目、评委、维度和当前调度都保留。大屏排名会清空，评委可以重新打分。')}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onClearScores}
            disabled={busy || !stats?.scoreCount}
          >
            {t('清空结果')}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-danger-ink/20 pt-4">
          <p className="hint">{t('重置配置会连项目、评委和维度一起删除，管理员账号不受影响。')}</p>
          <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={busy}>
            {confirmingReset ? t('确认重置配置？') : t('重置配置')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordForm({ onDone, toast }) {
  const { t } = useI18n()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (newPassword.length < 6) {
      setError(t('新密码至少 6 位'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('两次输入的新密码不一致'))
      return
    }
    setError('')
    setSaving(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      toast(t('密码已更新'))
      onDone()
    } catch (err) {
      setError(err.message || t('修改失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex max-w-[440px] flex-col gap-3.5" onSubmit={submit}>
      <label className="field">
        <span className="field-label">{t('当前密码')}</span>
        <input
          className="input"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      <label className="field">
        <span className="field-label">{t('新密码（至少 6 位）')}</span>
        <input
          className="input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label className="field">
        <span className="field-label">{t('确认新密码')}</span>
        <input
          className="input"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>

      {error && <p className="text-[12.5px] text-danger-ink">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {t('保存新密码')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={saving}>
          {t('取消')}
        </button>
      </div>
    </form>
  )
}
