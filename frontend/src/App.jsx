import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { OverviewPage } from './pages/OverviewPage.jsx'
import { AdminPage } from './pages/AdminPage.jsx'
import { JudgePage } from './pages/JudgePage.jsx'
import { BoardPage } from './pages/BoardPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'

/**
 * 路由表。
 *
 * 路径与设计稿的三个入口一一对应：
 *   /         总览
 *   /admin    后台配置台
 *   /judge    评委评分端
 *   /board    总分大屏（独立全屏布局，不套 Layout）
 */
export default function App() {
  return (
    <Routes>
      <Route path="/board" element={<BoardPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/overview" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/judge" element={<JudgePage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
