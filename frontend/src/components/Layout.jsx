import { NavLink, Outlet, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: '总览', end: true },
  { to: '/admin', label: '后台配置台' },
  { to: '/judge', label: '评委评分端' },
]

/**
 * 通用布局：顶部导航 + 内容区。
 *
 * 大屏（/board）使用自己的全屏布局，不套用这里。
 */
export function Layout() {
  const location = useLocation()
  const isBoardLink = location.pathname === '/board'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-5 px-8 py-3.5 max-md:px-4">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] border border-ink font-mono text-[13px] font-bold">
              FV
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.01em]">FinVote · 评赛系统</span>
          </NavLink>

          <nav className="flex items-center gap-6 max-md:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `text-sm transition-colors ${isActive ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NavLink
              to="/board"
              className={`btn btn-sm ${isBoardLink ? 'btn-primary' : 'btn-secondary'}`}
            >
              总分大屏
            </NavLink>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-8 py-10 text-[13px] text-ink-muted max-md:px-4">
          <span>FinVote · 演讲评赛组委会</span>
          <span className="meta">Java 8 · Spring Boot 2.7 · React · Tailwind · SQLite</span>
        </div>
      </footer>
    </div>
  )
}
