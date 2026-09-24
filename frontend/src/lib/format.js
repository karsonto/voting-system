/** 展示格式化工具。 */

/** 保留两位小数的字符串；null / undefined 显示为占位符。 */
export function formatScore(value, digits = 2, placeholder = '—') {
  if (value === null || value === undefined || Number.isNaN(value)) return placeholder
  return Number(value).toFixed(digits)
}

/** 一位小数，用于评分端的实时预览。 */
export function formatScore1(value, placeholder = '—') {
  return formatScore(value, 1, placeholder)
}

/** 两位补零，用于「01 / 06」这类序号。 */
export function pad2(value) {
  return String(value).padStart(2, '0')
}

/** 当前时间的 HH:mm。 */
export function currentClock(date = new Date()) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** 当前时间的 HH:mm:ss。 */
export function currentClockFull(date = new Date()) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

/** 时间戳 → 「2026-09-24 21:30:15」。 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '—'
  const d = new Date(timestamp)
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  )
}

/** 评委姓名首字，用于头像。 */
export function initial(name) {
  return (name || '—').slice(0, 1)
}

/** 把百分比限制在 0–100，用于进度条宽度。 */
export function clampPercent(value) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

/** 计算进度百分比，分母为 0 时返回 0。 */
export function percent(part, total) {
  if (!total) return 0
  return clampPercent(Math.round((part / total) * 100))
}

/** 拼接非空的文本片段。 */
export function joinText(...parts) {
  return parts.filter((p) => p !== null && p !== undefined && String(p).trim() !== '').join(' · ')
}

/** 把分数收敛到 0–max 的整数区间（后端按整数分存储）。 */
export function clampScore(value, max = 100) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(max, n))
}
