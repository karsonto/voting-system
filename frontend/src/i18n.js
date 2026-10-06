import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'
import zhHK from './locales/zh-HK.json'

const STORAGE_KEY = 'finvote.lang'
const SUPPORTED = ['zh-CN', 'en', 'zh-HK']

function detectInitial() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED.includes(saved)) return saved
  } catch { /* ignore */ }
  return 'zh-CN'
}

i18next.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
    'zh-HK': { translation: zhHK },
  },
  lng: detectInitial(),
  fallbackLng: 'zh-CN',
  supportedLngs: SUPPORTED,
  interpolation: { escapeValue: false },
  returnNull: false,
})

/** 供后台语言切换器调用；切换后所有挂载组件自动重渲染。 */
export function setLanguage(lng) {
  if (!SUPPORTED.includes(lng)) return
  i18next.changeLanguage(lng)
  try {
    window.localStorage.setItem(STORAGE_KEY, lng)
    document.documentElement.lang = lng
  } catch { /* ignore */ }
}

export function getLanguage() {
  return i18next.language
}

export default i18next
