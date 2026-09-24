import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi, onAuthChange, storage } from '../lib/api.js'
import { useVersionPolling } from '../lib/hooks.js'

/**
 * 后台状态。
 *
 * 后台同样按版本号轮询，好处有两点：
 * 1. 组委会能实时看到评委端的提交进度；
 * 2. 令牌失效时（401 会清掉本地令牌）自动回到登录页。
 */
export function useAdminState({ poll = true, interval = 2000 } = {}) {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const aliveRef = useRef(true)
  const [authEpoch, setAuthEpoch] = useState(0)

  const load = useCallback(async () => {
    if (!storage.getAdminToken()) {
      setLoading(false)
      setState(null)
      return
    }
    try {
      const data = await adminApi.state()
      if (!aliveRef.current) return
      setState(data)
      setError(null)
    } catch (err) {
      if (!aliveRef.current) return
      setError(err)
      if (err.status === 401) setState(null)
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => {
      aliveRef.current = false
    }
  }, [load, authEpoch])

  // 登录 / 退出后重新拉取
  useEffect(
    () =>
      onAuthChange((role) => {
        if (role === 'ADMIN') {
          setLoading(true)
          setAuthEpoch((n) => n + 1)
        }
      }),
    [],
  )

  const { resetBaseline } = useVersionPolling(
    async () => {
      if (!storage.getAdminToken()) return null
      const data = await adminApi.state()
      return { version: data?.version }
    },
    load,
    { enabled: poll, interval },
  )

  /**
   * 执行一次写操作并在成功后刷新。
   *
   * 写操作会让后端版本号 +1，这里把返回的新版本号直接记为轮询基线，
   * 避免紧接着的轮询又触发一次多余的全量刷新。
   */
  const mutate = useCallback(
    async (action) => {
      const result = await action()
      const nextVersion = result && typeof result.version === 'number' ? result.version : undefined
      await load()
      resetBaseline(nextVersion)
      return result
    },
    [load, resetBaseline],
  )

  return { state, loading, error, reload: load, mutate, resetBaseline }
}
