import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, storage } from '../lib/api.js'

/**
 * 后台管理员登录页。
 *
 * 登录成功后把令牌写入 localStorage，并通过 `onSuccess` 通知外层重新拉取数据。
 */
export function AdminLogin({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await authApi.adminLogin(username.trim(), password)
      storage.setAdminToken(data.token)
      storage.setAdminProfile({
        username: data.username,
        displayName: data.displayName,
        usingDefaultPassword: data.usingDefaultPassword,
      })
      onSuccess?.()
    } catch (err) {
      setError(err.message || '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-140px)] place-items-center px-4 py-12">
      <div className="w-full max-w-[440px] rounded-lg border border-line bg-surface p-8 shadow-card">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-[7px] border border-ink font-mono text-[13px] font-bold">
            FV
          </span>
          <span className="text-base font-semibold">后台配置台</span>
        </div>

        <h2 className="text-[19px] font-semibold">验证管理员身份</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-muted">
          输入组委会管理员账号与密码，进入赛制配置与实时调度台。
        </p>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">账号</span>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="请输入账号"
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field-label">密码</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="请输入密码"
            />
          </label>

          <p className="min-h-[18px] text-[12.5px] text-danger-ink">{error}</p>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? '登录中…' : '登入配置台'}
          </button>
        </form>

        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
          首次部署的默认账号为 <span className="font-mono">admin</span>，密码在
          <span className="font-mono"> application.yml </span>
          的 <span className="font-mono">finvote.bootstrap-admin-password</span> 中配置（默认
          <span className="font-mono"> admin123</span>），登录后请立即修改。
        </p>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <Link to="/" className="btn btn-ghost btn-sm">
            ← 返回总览
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/board')}>
            打开总分大屏
          </button>
        </div>
      </div>
    </div>
  )
}
