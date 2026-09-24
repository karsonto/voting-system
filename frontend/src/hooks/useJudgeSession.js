import { useCallback, useEffect, useRef, useState } from 'react'
import { judgeApi, storage } from '../lib/api.js'
import { useInterval } from '../lib/hooks.js'

/**
 * 评委端会话。
 *
 * 评委端需要感知「主持人把我切到别的项目了」，因此这里高频轮询轻量的
 * /api/judge/progress（只返回当前项目 ID 与提交数），只有检测到变化时才拉全量会话。
 */
export function useJudgeSession({ interval = 1500, enabled = true } = {}) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const aliveRef = useRef(true)
  const currentProjectRef = useRef(null)

  const load = useCallback(async () => {
    if (!storage.getJudgeToken()) {
      setLoading(false)
      setSession(null)
      return
    }
    try {
      const data = await judgeApi.session()
      if (!aliveRef.current) return
      setSession(data)
      currentProjectRef.current = data?.currentProject?.id ?? null
      setError(null)
    } catch (err) {
      if (!aliveRef.current) return
      setError(err)
      if (err.status === 401) setSession(null)
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

  /**
   * 高频检测「当前评审项目是否变了、评分通道是否变了、版本是否变了」。
   * 任一项变化就重新拉全量会话。
   */
  useInterval(async () => {
    if (!enabled || !storage.getJudgeToken()) return
    try {
      const progress = await judgeApi.progress()
      if (!aliveRef.current || !progress) return
      const changed =
        progress.currentProjectId !== currentProjectRef.current ||
        progress.version !== session?.version ||
        progress.open !== session?.competition?.open
      if (changed) await load()
    } catch {
      // 轮询失败静默处理
    }
  }, enabled ? interval : null)

  return { session, loading, error, reload: load }
}

/** 评委本地保留的表单草稿，避免被调度切换后正在打的分丢失。 */
export function useDraftStorage(judgeId) {
  const key = judgeId ? `finvote.judge.draft.${judgeId}` : null

  const read = useCallback(
    (projectId) => {
      if (!key || !projectId) return null
      try {
        const raw = window.localStorage.getItem(`${key}.${projectId}`)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    },
    [key],
  )

  const write = useCallback(
    (projectId, value) => {
      if (!key || !projectId) return
      try {
        window.localStorage.setItem(`${key}.${projectId}`, JSON.stringify(value))
      } catch {
        /* 忽略写入失败 */
      }
    },
    [key],
  )

  const clear = useCallback(
    (projectId) => {
      if (!key || !projectId) return
      try {
        window.localStorage.removeItem(`${key}.${projectId}`)
      } catch {
        /* 忽略 */
      }
    },
    [key],
  )

  return { read, write, clear }
}
