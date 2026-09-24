/**
 * 统一的 API 客户端。
 *
 * 说明：本系统只有一个前端和一个后端，令牌以 X-Auth-Token 请求头传递，
 * 因此这里不做复杂的拦截器分层，保持一个薄封装即可。
 */

const ADMIN_TOKEN_KEY = 'finvote.admin.token'
const ADMIN_PROFILE_KEY = 'finvote.admin.profile'
const JUDGE_TOKEN_KEY = 'finvote.judge.token'
const JUDGE_PROFILE_KEY = 'finvote.judge.profile'

/** 令牌变化时通知订阅者（例如令牌失效需要跳回登录页）。 */
const listeners = new Set()

export function onAuthChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emitAuthChange(role) {
  listeners.forEach((listener) => listener(role))
}

export const storage = {
  getAdminToken: () => safeGet(ADMIN_TOKEN_KEY),
  setAdminToken: (token) => safeSet(ADMIN_TOKEN_KEY, token),
  getAdminProfile: () => safeGetJson(ADMIN_PROFILE_KEY),
  setAdminProfile: (profile) => safeSetJson(ADMIN_PROFILE_KEY, profile),

  getJudgeToken: () => safeGet(JUDGE_TOKEN_KEY),
  setJudgeToken: (token) => safeSet(JUDGE_TOKEN_KEY, token),
  getJudgeProfile: () => safeGetJson(JUDGE_PROFILE_KEY),
  setJudgeProfile: (profile) => safeSetJson(JUDGE_PROFILE_KEY, profile),

  clearAdmin() {
    safeRemove(ADMIN_TOKEN_KEY)
    safeRemove(ADMIN_PROFILE_KEY)
    emitAuthChange('ADMIN')
  },

  clearJudge() {
    safeRemove(JUDGE_TOKEN_KEY)
    safeRemove(JUDGE_PROFILE_KEY)
    emitAuthChange('JUDGE')
  },
}

function safeGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* 隐私模式下写入失败，忽略即可 */
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* 忽略 */
  }
}

function safeGetJson(key) {
  const raw = safeGet(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function safeSetJson(key, value) {
  safeSet(key, JSON.stringify(value))
}

/** 业务错误：把后端返回的 message 与 HTTP 状态一起抛出，便于调用方分别处理。 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  get isUnauthorized() {
    return this.status === 401
  }
}

/**
 * 发起请求。
 *
 * @param {string} path    以 /api 开头的路径
 * @param {object} options { method, body, role: 'ADMIN' | 'JUDGE' | null, signal }
 */
async function request(path, options = {}) {
  const { method = 'GET', body, role = null, signal, raw = false } = options
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (role === 'ADMIN') {
    const token = storage.getAdminToken()
    if (token) headers['X-Auth-Token'] = token
  } else if (role === 'JUDGE') {
    const token = storage.getJudgeToken()
    if (token) headers['X-Auth-Token'] = token
  }

  let response
  try {
    response = await fetch(path, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('无法连接到服务器，请确认后端已启动', 0)
  }

  if (response.status === 401) {
    // 令牌失效：清掉本地令牌，让页面回到登录态
    if (role === 'ADMIN') storage.clearAdmin()
    if (role === 'JUDGE') storage.clearJudge()
    const message = await readErrorMessage(response)
    throw new ApiError(message || '登录已过期，请重新登录', 401)
  }

  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new ApiError(message || `请求失败（${response.status}）`, response.status)
  }

  if (raw) {
    return response
  }

  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function readErrorMessage(response) {
  try {
    const text = await response.text()
    if (!text) return null
    const data = JSON.parse(text)
    return data.message || null
  } catch {
    return null
  }
}

/** 公开接口（无需令牌）。 */
export const publicApi = {
  version: (signal) => request('/api/public/version', { signal }),
  state: (signal) => request('/api/public/state', { signal }),
  judges: (signal) => request('/api/public/judges', { signal }),
  projects: (signal) => request('/api/public/projects', { signal }),
  context: (signal) => request('/api/auth/context', { signal }),
}

/** 登录与身份接口。 */
export const authApi = {
  adminLogin: (username, password) =>
    request('/api/auth/admin/login', { method: 'POST', body: { username, password } }),
  judgeLogin: (judgeId, pin) =>
    request('/api/auth/judge/login', { method: 'POST', body: { judgeId, pin } }),
  me: (role) => request('/api/auth/me', { role }),
  logout: (role) => request('/api/auth/logout', { method: 'POST', role }),
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/admin/password', {
      method: 'POST',
      role: 'ADMIN',
      body: { currentPassword, newPassword },
    }),
}

/** 后台接口。 */
export const adminApi = {
  state: (signal) => request('/api/admin/state', { role: 'ADMIN', signal }),

  updateCompetition: (payload) =>
    request('/api/admin/competition', { method: 'PUT', role: 'ADMIN', body: payload }),

  updateSwitches: (payload) =>
    request('/api/admin/switches', { method: 'PUT', role: 'ADMIN', body: payload }),

  addDimension: (payload) => request('/api/admin/dimensions', { method: 'POST', role: 'ADMIN', body: payload }),
  updateDimension: (id, payload) =>
    request(`/api/admin/dimensions/${id}`, { method: 'PUT', role: 'ADMIN', body: payload }),
  deleteDimension: (id) => request(`/api/admin/dimensions/${id}`, { method: 'DELETE', role: 'ADMIN' }),

  addProject: (payload) => request('/api/admin/projects', { method: 'POST', role: 'ADMIN', body: payload }),
  updateProject: (id, payload) =>
    request(`/api/admin/projects/${id}`, { method: 'PUT', role: 'ADMIN', body: payload }),
  deleteProject: (id) => request(`/api/admin/projects/${id}`, { method: 'DELETE', role: 'ADMIN' }),

  addJudge: (payload) => request('/api/admin/judges', { method: 'POST', role: 'ADMIN', body: payload }),
  updateJudge: (id, payload) => request(`/api/admin/judges/${id}`, { method: 'PUT', role: 'ADMIN', body: payload }),
  deleteJudge: (id) => request(`/api/admin/judges/${id}`, { method: 'DELETE', role: 'ADMIN' }),
  randomPin: () => request('/api/admin/judges/random-pin', { role: 'ADMIN' }),

  dispatch: (judgeIds, projectId) =>
    request('/api/admin/dispatch', { method: 'POST', role: 'ADMIN', body: { judgeIds, projectId } }),
  dispatchNext: () => request('/api/admin/dispatch/next', { method: 'POST', role: 'ADMIN' }),

  clearScore: (judgeId, projectId) =>
    request(`/api/admin/scores/${judgeId}/${projectId}`, { method: 'DELETE', role: 'ADMIN' }),
  clearAllScores: () => request('/api/admin/scores', { method: 'DELETE', role: 'ADMIN' }),

  applyScale: (projectCount, judgeCount) =>
    request('/api/admin/scale', { method: 'POST', role: 'ADMIN', body: { projectCount, judgeCount } }),

  reset: () => request('/api/admin/reset', { method: 'POST', role: 'ADMIN' }),
}

/** 评委接口。 */
export const judgeApi = {
  session: (signal) => request('/api/judge/session', { role: 'JUDGE', signal }),
  progress: (signal) => request('/api/judge/progress', { role: 'JUDGE', signal }),
  submit: (projectId, values, comment) =>
    request('/api/judge/scores', { method: 'POST', role: 'JUDGE', body: { projectId, values, comment } }),
}

/**
 * 下载 CSV 导出文件。
 *
 * 浏览器无法为 fetch 请求附加自定义头后直接下载，因此这里先取回文本再构造 Blob。
 */
export async function downloadExport(kind) {
  const path = kind === 'ranking' ? '/api/admin/export/ranking.csv' : '/api/admin/export/scores.csv'
  const response = await request(path, { role: 'ADMIN', raw: true })
  const blob = await response.blob()

  const filename =
    kind === 'ranking' ? 'FinVote_项目排名.csv' : 'FinVote_评分明细.csv'
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url)
    anchor.remove()
  }, 150)
}
