import i18next from 'i18next'

/**
 * 后端错误消息 → 三语。
 *
 * 后端统一用简体中文抛错，这里按「原文精确匹配」映射到 i18next 的
 * errors.* key；带动态内容的消息（如「参赛项目最多 N 个」）用正则提取变量。
 * 未命中时原样返回，保证信息不丢失。
 */

// [正则, i18next key, 捕获组 -> 插值键]
const PATTERN_RULES = [
  [/^参赛项目最多 (\d+) 个$/, 'errors.projectCountMax', (m) => ({ n: m[1] })],
  [/^评委最多 (\d+) 位$/, 'errors.judgeCountMax', (m) => ({ n: m[1] })],
  [/^数量最多 (\d+)$/, 'errors.qtyMax', (m) => ({ n: m[1] })],
  [/^维度「(.+?)」尚未打分$/, 'errors.dimensionNotScored', (m) => ({ name: m[1] })],
  [/^维度「(.+?)」的得分需在 0–(\d+) 之间$/, 'errors.dimensionRange', (m) => ({ name: m[1], max: m[2] })],
]

// 原文 -> i18next key 精确表
const EXACT = {
  '未登录': 'errors.notLoggedIn',
  '仅管理员可修改密码': 'errors.adminOnlyPassword',
  '当前账号无权访问该接口': 'errors.forbidden',
  '缺少访问令牌，请先登录': 'errors.missingToken',
  '访问令牌格式不正确': 'errors.badTokenFormat',
  '访问令牌签名校验失败': 'errors.badTokenSignature',
  '访问令牌内容不完整': 'errors.incompleteToken',
  '访问令牌内容不合法': 'errors.illegalToken',
  '登录已过期，请重新登录': 'errors.tokenExpired',
  '账号或密码不正确': 'errors.badCredentials',
  '账号不存在，请重新登录': 'errors.accountNotFound',
  '当前密码不正确': 'errors.wrongCurrentPassword',
  '新密码至少 6 位': 'errors.passwordTooShort',
  '赛事名称不能为空': 'errors.competitionNameRequired',
  '请选择头像图片': 'errors.avatarRequired',
  '头像不能超过 2MB': 'errors.avatarTooLarge',
  '请上传图片文件': 'errors.avatarMustBeImage',
  '头像保存失败': 'errors.avatarSaveFailed',
  '头像只支持 jpg、png、gif、webp': 'errors.avatarFormat',
  '没有可调度的评委': 'errors.noJudgesToDispatch',
  '赛事不存在': 'errors.competitionNotFound',
  '还没有参赛项目': 'errors.noProjects',
  '评分维度不存在': 'errors.dimensionNotFound',
  '参赛项目不存在': 'errors.projectNotFound',
  '评委不存在': 'errors.judgeNotFound',
  '数量不能为负数': 'errors.qtyNegative',
  '未找到该评委，请与组委会核对名单': 'errors.judgeNotOnRoster',
  '该评委账号已停用，请联系组委会': 'errors.judgeDisabled',
  'PIN 码不正确，请重新输入': 'errors.badPin',
  '评委账号已失效，请重新登录': 'errors.judgeTokenInvalid',
  '评分通道已关闭，暂时无法提交': 'errors.scoringClosed',
  '还没有配置评分维度，请联系组委会': 'errors.noDimensions',
}

export function tError(message) {
  if (!message) return ''
  const i18n = i18next

  for (const [pattern, key, argsFn] of PATTERN_RULES) {
    const m = message.match(pattern)
    if (m) return i18n.t(key, argsFn ? argsFn(m) : undefined)
  }

  const key = EXACT[message]
  if (key) return i18n.t(key)

  return message
}

/** 供 ApiError 使用：包装 message 字段。 */
export function localizeApiError(err) {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  return tError(raw)
}
