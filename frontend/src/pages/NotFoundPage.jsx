import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-[560px] place-items-center px-4">
      <div className="text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-2xl font-semibold">页面不存在</h1>
        <p className="hint mt-2">请从下方入口重新进入系统。</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Link to="/" className="btn btn-primary">
            返回总览
          </Link>
          <Link to="/admin" className="btn btn-secondary">
            后台配置台
          </Link>
          <Link to="/judge" className="btn btn-secondary">
            评委评分端
          </Link>
          <Link to="/board" className="btn btn-secondary">
            总分大屏
          </Link>
        </div>
      </div>
    </div>
  )
}
