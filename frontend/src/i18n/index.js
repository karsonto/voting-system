import { useSyncExternalStore } from 'react'
import { en, zhHant } from './messages.js'

const TABLES = {
  'zh-Hant': zhHant,
  en,
}

let locale = 'zh-Hans'
let revision = 0
let hold = 0
const listeners = new Set()

export const LOCALE_OPTIONS = [
  { id: 'zh-Hans', label: '简体中文' },
  { id: 'zh-Hant', label: '繁體中文' },
  { id: 'en', label: 'English' },
]

export function normalizeLocale(value) {
  if (!value) return null
  const text = String(value).trim()
  if (text === 'zh-Hans' || text === 'zh-CN' || text === 'zh') return 'zh-Hans'
  if (text === 'zh-Hant' || text === 'zh-TW' || text === 'zh-HK') return 'zh-Hant'
  if (text === 'en' || text === 'en-US' || text === 'en-GB') return 'en'
  return null
}

export function getLocale() {
  return locale
}

export function setAppLocale(next) {
  const normalized = normalizeLocale(next)
  if (!normalized || normalized === locale) return
  revision += 1
  locale = normalized
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized
    document.title = translate(normalized, 'Athlon 评分系统')
  }
  listeners.forEach((listener) => listener())
}

/** 保存语言期间挡住轮询，避免还没写完的旧响应把刚选的语言盖回去。 */
export function holdServerLocale() {
  hold += 1
  let released = false
  return () => {
    if (released) return
    released = true
    hold -= 1
  }
}

/** 在发起请求前记下版本；请求返回时用来丢掉过期结果。 */
export function beginLocaleRead() {
  return { revision, held: hold > 0 }
}

/** 服务端没带语言时不覆盖，避免旧接口把已选语言冲掉。 */
export function applyServerLocale(value, ticket) {
  if (hold > 0) return
  if (ticket && (ticket.held || ticket.revision !== revision)) return
  const normalized = normalizeLocale(value)
  if (normalized) setAppLocale(normalized)
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function translate(current, key, vars) {
  const table = TABLES[current]
  let text = (table && table[key]) || key
  if (vars) {
    Object.keys(vars).forEach((name) => {
      const value = vars[name] == null ? '' : String(vars[name])
      text = text.split(`{${name}}`).join(value)
    })
  }
  return text
}

export function translateServerMessage(message) {
  if (!message || getLocale() === 'zh-Hans') return message
  const exact = translate(getLocale(), message)
  if (exact !== message) return exact

  const patterns = [
    [/^维度「(.+)」尚未打分$/, '维度「{name}」尚未打分', 'name'],
    [/^维度「(.+)」的得分需在 0–(\d+) 之间$/, '维度「{name}」的得分需在 0–{max} 之间', 'name', 'max'],
    [/^参赛项目最多 (\d+) 个$/, '参赛项目最多 {max} 个', 'max'],
    [/^评委最多 (\d+) 位$/, '评委最多 {max} 位', 'max'],
    [/^数量最多 (\d+)$/, '数量最多 {max}', 'max'],
    [/^当前版本仅支持「(.+)」$/, '当前版本仅支持「{name}」', 'name'],
    [/^请求失败（(\d+)）$/, '请求失败（{status}）', 'status'],
  ]
  for (const pattern of patterns) {
    const match = message.match(pattern[0])
    if (!match) continue
    const vars = {}
    for (let i = 2; i < pattern.length; i += 1) {
      vars[pattern[i]] = match[i - 1]
    }
    return translate(getLocale(), pattern[1], vars)
  }
  return message
}

export function useI18n() {
  const current = useSyncExternalStore(subscribe, getLocale, getLocale)
  return {
    locale: current,
    t: (key, vars) => translate(current, key, vars),
  }
}
