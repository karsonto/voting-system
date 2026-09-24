import { useEffect, useState } from 'react'

/**
 * 轻量 Toast：全局只需要一条消息，因此用「状态 + 自动消失」即可，
 * 无需引入 Context（本项目只有三个页面，且提示都来自用户主动操作）。
 */
export function useToast(duration = 2000) {
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(null), duration)
    return () => window.clearTimeout(timer)
  }, [message, duration])

  return { message, show: setMessage }
}

export function Toast({ message }) {
  return (
    <div className={`toast ${message ? 'toast-show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
