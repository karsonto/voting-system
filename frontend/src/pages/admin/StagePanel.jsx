import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pill } from '../../components/ui.jsx'
import { authApi } from '../../lib/api.js'

/**
 * 揭晓与导出：现场开关、CSV 导出、重置与改密码。
 */
export function StagePanel({
  competition,
  stats,
  usingDefaultPassword,
  onToggleOpen,
  onToggleReveal,
  onExport,
  onClearScores,
  onReset,
  busy,
  toast,
}) {
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [changing, setChanging] = useState(false)

  async function handleReset() {
    if (!confirmingReset) {
      setConfirmingReset(true)
      toast('再次点击以确认清空全部配置')
      return
    }
    setConfirmingReset(false)
    await onReset()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">现场开关</span>
          <div className="flex gap-2">
            <Pill tone={competition?.open ? 'ok' : 'warn'}>
              {competition?.open ? '评分通道开放' : '评分通道关闭'}
            </Pill>
            <Pill tone={competition?.revealed ? 'ok' : 'idle'}>
              {competition?.revealed ? '大屏已揭晓' : '大屏未揭晓'}
            </Pill>
          </div>
        </div>
        <div className="panel-body flex flex-col gap-4">
          <label className="switch">
            <input
              type="checkbox"
              className="sr-only"
              checked={!!competition?.open}
              disabled={busy}
              onChange={(e) => onToggleOpen(e.target.checked)}
            />
            <span className="switch-track" aria-hidden="true" />
            <span className="text-[13.5px]">
              <strong>评分通道</strong> — 关闭后评委端将暂停提交
            </span>
          </label>

          <label className="switch">
            <input
              type="checkbox"
              className="sr-only"
              checked={!!competition?.revealed}
              disabled={busy}
              onChange={(e) => onToggleReveal(e.target.checked)}
            />
            <span className="switch-track" aria-hidden="true" />
            <span className="text-[13.5px]">
              <strong>大屏揭晓</strong> — 开启后总分大屏显示具体分数与排名
            </span>
          </label>

          <p className="hint border-t border-line pt-3.5">
            未揭晓时后端不会下发任何分数，即使直接访问接口也拿不到结果，因此可以放心把大屏提前打开。
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">数据导出</span>
          <span className="meta">
            {stats?.scoreCount ?? 0} 份评分 · {stats?.projectCount ?? 0} 个项目
          </span>
        </div>
        <div className="panel-body flex flex-wrap items-center gap-2.5">
          <button type="button" className="btn btn-secondary" onClick={() => onExport('scores')} disabled={busy}>
            导出评分明细 CSV
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onExport('ranking')} disabled={busy}>
            导出项目排名 CSV
          </button>
          <Link to="/board" className="btn btn-ghost ml-auto group">
            前往总分大屏
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">管理员密码</span>
          {usingDefaultPassword && <Pill tone="danger">仍在使用默认密码</Pill>}
        </div>
        <div className="panel-body">
          {changing ? (
            <ChangePasswordForm onDone={() => setChanging(false)} toast={toast} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="hint max-w-[60ch]">
                为保护赛事数据，建议在开赛前把出厂密码修改为只有组委会知道的强密码。
              </p>
              <button type="button" className="btn btn-secondary" onClick={() => setChanging(true)}>
                修改密码
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-danger-ink/30 bg-danger-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold">清空评分与重置配置</h3>
            <p className="hint mt-1">
              「清空评分」只删除评分数据，保留项目、评委与维度；
              「重置配置」会把项目、评委、维度、评分全部清空，管理员账号不受影响。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClearScores}
              disabled={busy || !stats?.scoreCount}
            >
              清空评分
            </button>
            <button type="button" className="btn btn-danger" onClick={handleReset} disabled={busy}>
              {confirmingReset ? '确认重置配置？' : '重置配置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordForm({ onDone, toast }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (newPassword.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }
    setError('')
    setSaving(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      toast('密码已更新')
      onDone()
    } catch (err) {
      setError(err.message || '修改失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex max-w-[440px] flex-col gap-3.5" onSubmit={submit}>
      <label className="field">
        <span className="field-label">当前密码</span>
        <input
          className="input"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      <label className="field">
        <span className="field-label">新密码（至少 6 位）</span>
        <input
          className="input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label className="field">
        <span className="field-label">确认新密码</span>
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
          保存新密码
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={saving}>
          取消
        </button>
      </div>
    </form>
  )
}
