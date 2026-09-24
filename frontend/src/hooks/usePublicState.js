import { useCallback, useEffect, useRef, useState } from 'react'
import { publicApi } from '../lib/api.js'
import { useVersionPolling } from '../lib/hooks.js'

/**
 * 公开状态（总览页、登入页、大屏共用）。
 *
 * 首次挂载拉一次全量，之后只轮询版本号，版本变化才重新拉取。
 */
export function usePublicState({ poll = true, interval = 1500 } = {}) {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    try {
      const data = await publicApi.state()
      if (!aliveRef.current) return
      setState(data)
      setError(null)
    } catch (err) {
      if (!aliveRef.current) return
      setError(err)
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
  }, [load])

  const { resetBaseline } = useVersionPolling(publicApi.version, load, { enabled: poll, interval })

  return { state, loading, error, reload: load, resetBaseline }
}
