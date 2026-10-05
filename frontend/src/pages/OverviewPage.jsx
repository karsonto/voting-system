import { Link } from 'react-router-dom'
import { usePublicState } from '../hooks/usePublicState.js'
import { EmptyState, Kpi, Pill, ProgressRow } from '../components/ui.jsx'
import { pad2, percent } from '../lib/format.js'
import { useI18n } from '../i18n/index.js'

/**
 * 总览页：把三个操作入口、现场流程与当前赛事实况集中在一页。
 */
export function OverviewPage() {
  const { t } = useI18n()
  const { state, loading, error } = usePublicState({ interval: 2000 })

  if (loading && !state) return <PageSkeleton />
  if (error && !state) return <ErrorPanel error={error} />

  const competition = state?.competition
  const stats = state?.stats
  const dimensions = state?.dimensions ?? []
  const projects = state?.projects ?? []
  const judgeCount = state?.judges?.length ?? 0

  const open = competition?.open
  const weightSum = competition?.dimensionWeightSum ?? 0
  const board = state?.board ?? []

  const entries = [
    {
      index: t('01 / 后台'),
      title: t('后台配置台'),
      description: t('设定赛事信息与维度权重、维护项目与评委名单，并把任意评委实时调度到他正在评的项目。'),
      to: '/admin',
      pillTone: stats?.projectCount ? 'ok' : 'idle',
      pillText: stats?.projectCount ? t('已配置') : t('等待配置'),
      footLeft: t('{projects} 个项目 · {judges} 位评委', {
        projects: stats?.projectCount ?? 0,
        judges: judgeCount,
      }),
    },
    {
      index: t('02 / 评委'),
      title: t('评委评分端'),
      description: t('评委登入选定的姓名并输入 PIN，对当前项目按维度打分，系统实时折算加权总分。'),
      to: '/judge',
      pillTone: open ? 'info' : 'idle',
      pillText: open ? t('可登入') : t('通道关闭'),
      footLeft: t('{count} 份评分已提交', { count: stats?.scoreCount ?? 0 }),
      pillLive: open,
    },
    {
      index: t('03 / 大屏'),
      title: t('总分大屏'),
      description: t('投影到主会场，实时显示当前项目和已评分项目的排名。'),
      to: '/board',
      pillTone: stats?.coveredProjectCount ? 'ok' : 'idle',
      pillText: stats?.coveredProjectCount ? t('实时排名') : t('等待评分'),
      footLeft: stats?.coveredProjectCount
        ? t('{count} 个项目已有成绩', { count: stats.coveredProjectCount })
        : t('尚无有效评分'),
    },
  ]

  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-8 py-14 max-md:px-4">
          <p className="eyebrow">{t('ATHLON · 组委会工作台')}</p>
          <h1 className="mt-3.5 max-w-[22ch] text-[clamp(32px,4.2vw,50px)] font-semibold leading-[1.07] tracking-[-0.025em]">
            {t('三块屏幕，跑完一场演讲比赛的完整评分流程。')}
          </h1>
          <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-ink-muted">
            {t('后台配置赛制维度并实时调度评委正在评的项目；评委端按百分制多维度加权打分；总分大屏按计分规则实时生成已评分项目的排名。')}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/admin" className="btn btn-primary">
              {t('打开后台配置台')}
            </Link>
            <Link to="/board" className="btn btn-secondary">
              {t('预览总分大屏')}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Pill tone={open ? 'ok' : 'warn'} live={open}>
              {open ? t('评分开放中') : t('评分已关闭')}
            </Pill>
            <Pill tone="info">{competition?.stage || t('未设置环节')}</Pill>
            <Pill tone={weightSum === 100 ? 'idle' : 'danger'}>{t('维度权重合计 {weight}%', { weight: weightSum })}</Pill>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-8 py-12 max-md:px-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[clamp(20px,2.3vw,28px)]">{t('三个操作入口')}</h2>
          <span className="meta">{t('同一份赛事实时数据 · 跨页面自动同步')}</span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {entries.map((entry) => (
            <article
              key={entry.to}
              className="panel flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
                <span className="meta">{entry.index}</span>
                <Pill tone={entry.pillTone} live={entry.pillLive}>
                  {entry.pillText}
                </Pill>
              </div>
              <div className="flex-1 px-5 pb-4">
                <h3 className="text-[17px] font-semibold">{entry.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{entry.description}</p>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line bg-canvas/60 px-5 py-3.5">
                <span className="meta">{entry.footLeft}</span>
                <Link to={entry.to} className="btn btn-ghost btn-sm group">
                  {t('打开')}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-[1200px] px-8 py-12 max-md:px-4">
          <p className="eyebrow mb-4">RUN OF SHOW</p>
          <h2 className="mb-5 text-[clamp(20px,2.3vw,28px)]">{t('主持人视角的一轮流程')}</h2>

          <div className="grid overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-4">
            {[
              ['STEP 01', t('配置赛制'), t('录入项目与评委名单，确认百分制维度权重合计 100%。')],
              ['STEP 02', t('调度项目'), t('轮到某项目时，后台把评委批量切换到他正在评审的对象。')],
              ['STEP 03', t('评委打分'), t('评委端即时收到当前项目，逐维度打分并提交。')],
              ['STEP 04', t('大屏看分'), t('已评分项目按计分规则出现在大屏排行榜，分数随提交更新。')],
            ].map(([step, title, text]) => (
              <div
                key={step}
                className="border-b border-line px-5 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <span className="font-mono text-xs tracking-[0.06em] text-brand-600">{step}</span>
                <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-[1200px] px-8 py-12 max-md:px-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="panel overflow-hidden">
              <div className="panel-head">
                <span className="panel-title">{t('当前赛事实况')}</span>
                <span className="meta">rev {competition?.rev ?? 0}</span>
              </div>
              <div className="grid grid-cols-4 gap-px bg-line max-sm:grid-cols-2">
                <Kpi label={t('参赛项目')} value={stats?.projectCount ?? 0} sub={t('后台可设定')} />
                <Kpi label={t('评委人数')} value={judgeCount} sub={t('后台可设定')} />
                <Kpi label={t('已提交评分')} value={stats?.scoreCount ?? 0} sub={t('份评分单')} />
                <Kpi
                  label={t('已产生成绩')}
                  value={stats?.coveredProjectCount ?? 0}
                  unit={`/${stats?.projectCount ?? 0}`}
                  sub={t('项目有有效分')}
                />
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">{t('现行计分规则')}</span>
                <Link to="/admin" className="btn btn-ghost btn-sm group">
                  {t('修改')}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
              <div className="panel-body">
                <table className="w-full text-sm">
                  <tbody>
                    <RuleRow label={t('评分制式')} value={t(scaleLabelKey(competition?.scaleId)) || '—'} />
                    <RuleRow label={t('计分规则')} value={t(ruleLabelKey(competition?.ruleId)) || '—'} />
                    <RuleRow
                      label={t('有效评委计算')}
                      value={
                        judgeCount
                          ? t('评委数 {judges} → 采信 {count} 份', {
                              judges: judgeCount,
                              count: stats?.effectiveScoreCount ?? 0,
                            })
                          : t('尚无评委')
                      }
                    />
                    <RuleRow
                      label={t('维度权重合计')}
                      value={`${weightSum}%`}
                      highlight={weightSum !== 100}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="panel mt-5">
            <div className="panel-head">
              <span className="panel-title">{t('维度权重')}</span>
              <span className="meta">{t('加权折算为最终百分制得分')}</span>
            </div>
            <div className="panel-body">
              {dimensions.length === 0 ? (
                <EmptyState
                  title={t('还没有配置评分维度')}
                  description={t('到后台配置台添加维度并配平权重到 100%。')}
                  action={
                    <Link to="/admin" className="btn btn-secondary btn-sm mt-1">
                      {t('去配置')}
                    </Link>
                  }
                />
              ) : (
                dimensions.map((dimension) => (
                  <div
                    key={dimension.id}
                    className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    <span className="w-[170px] truncate text-sm" title={dimension.name}>
                      {dimension.name}
                    </span>
                    <span className="progress-track">
                      <i
                        className="progress-bar"
                        style={{ width: `${Math.min(100, Math.max(0, dimension.weight))}%` }}
                      />
                    </span>
                    <span className="w-[52px] text-right font-mono text-[13px] font-semibold tnum">
                      {dimension.weight}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel mt-5">
            <div className="panel-head">
              <span className="panel-title">{t('项目评分进度')}</span>
              <span className="meta">
                {t('大屏只显示已有评分的项目')}
              </span>
            </div>
            <div className="panel-body">
              {board.length === 0 ? (
                <EmptyState
                  title={t('还没有参赛项目')}
                  description={t('到后台配置台添加项目，或使用「应用规模」批量生成占位条目。')}
                  action={
                    <Link to="/admin" className="btn btn-secondary btn-sm mt-1">
                      {t('去添加')}
                    </Link>
                  }
                />
              ) : (
                board.map((row) => (
                  <div
                    key={row.projectId}
                    className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    <span className="w-7 font-mono text-xs text-ink-muted">
                      {pad2(row.rank || row.order)}
                    </span>
                    <span className="w-[280px] truncate text-[13.5px]" title={row.projectName}>
                      {row.projectName}
                    </span>
                    <span className="progress-track">
                      <i
                        className="progress-bar"
                        style={{ width: `${percent(row.submittedCount, row.judgeCount)}%` }}
                      />
                    </span>
                    <span className="meta w-[74px] text-right">
                      {t('{done}/{total} 已评', { done: row.submittedCount, total: row.judgeCount })}
                    </span>
                    <span className="w-[86px] text-right font-mono text-[13px] font-semibold tnum">
                      {row.mean != null ? t('{score} 分', { score: row.mean.toFixed(2) }) : t('未评分')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function scaleLabelKey(id) {
  if (id === 'weighted-10') return '十分制 · 多维度加权'
  if (id === 'rank') return '排名制'
  return '百分制 · 多维度加权'
}

function ruleLabelKey(id) {
  if (id === 'drop-high') return '去掉一个最高分'
  if (id === 'mean') return '全部评委取平均'
  return '去掉最高分与最低分'
}

function RuleRow({ label, value, highlight = false }) {
  return (
    <tr className="border-b border-line last:border-b-0">
      <th className="w-[38%] py-2.5 text-left font-mono text-xs font-normal text-ink-muted">{label}</th>
      <td className={`py-2.5 text-[13.5px] ${highlight ? 'font-semibold text-danger-ink' : ''}`}>{value}</td>
    </tr>
  )
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-8 py-14 max-md:px-4">
      <div className="h-3 w-40 animate-pulse rounded bg-ink/10" />
      <div className="mt-5 h-10 w-[520px] max-w-full animate-pulse rounded bg-ink/10" />
      <div className="mt-4 h-4 w-[620px] max-w-full animate-pulse rounded bg-ink/10" />
    </div>
  )
}

function ErrorPanel({ error }) {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-[1200px] px-8 py-14 max-md:px-4">
      <div className="panel border-danger-ink/30 p-6">
        <h2 className="text-lg font-semibold text-danger-ink">{t('无法加载赛事数据')}</h2>
        <p className="mt-2 text-[13.5px] text-ink-muted">
          {error?.message || t('请确认后端服务已启动（默认 http://localhost:8080）。')}
        </p>
      </div>
    </div>
  )
}
