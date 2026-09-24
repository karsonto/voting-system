import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 以固定间隔轮询一个「版本号」函数，版本变化时触发 onChange。
 *
 * 这是本系统实现「实时同步」的核心：轮询的响应体极小（只有 version 与 updatedAt），
 * 只有版本真正变化时才去拉全量数据，因此 1.5 秒一次轮询的成本可以忽略。
 *
 * @param {Function} fetchVersion 返回 Promise<{ version: number }>
 * @param {Function} onChange     版本变化时调用
 * @param {object}   options      { interval, enabled }
 */
export function useVersionPolling(fetchVersion, onChange, options = {}) {
  const { interval = 1500, enabled = true } = options
  const lastVersionRef = useRef(null)
  const onChangeRef = useRef(onChange)

  // onChange 每次渲染都会变，用 ref 持有，避免重建定时器
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const check = useCallback(async () => {
    try {
      const data = await fetchVersion()
      if (!data) return
      const version = data.version
      if (lastVersionRef.current === null) {
        // 首次只记录基线，不触发刷新（调用方已在挂载时加载过一次）
        lastVersionRef.current = version
        return
      }
      if (version !== lastVersionRef.current) {
        lastVersionRef.current = version
        onChangeRef.current?.(version)
      }
    } catch {
      // 轮询失败静默处理：网络恢复后下一次轮询会自动补上
    }
  }, [fetchVersion])

  useEffect(() => {
    if (!enabled) return undefined
    check()
    const timer = window.setInterval(check, interval)
    return () => window.clearInterval(timer)
  }, [check, enabled, interval])

  /** 手动把当前版本记为新基线，用于写操作后避免自触发刷新。 */
  const resetBaseline = useCallback((version) => {
    if (version !== undefined && version !== null) {
      lastVersionRef.current = version
    }
  }, [])

  return { resetBaseline, refresh: check }
}

/**
 * 以固定间隔执行一个异步函数（不做版本比较，纯粹定时拉取）。
 * 评委端用它刷新「我被调度到哪个项目了」。
 */
export function useInterval(callback, delay) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return undefined
    const timer = window.setInterval(() => savedCallback.current?.(), delay)
    return () => window.clearInterval(timer)
  }, [delay])
}
