import { useState } from 'react'
import { EmptyState, Pill, ProgressRow } from '../../components/ui.jsx'
import { pad2, percent } from '../../lib/format.js'
import { useI18n } from '../../i18n/index.js'

/**
 * 实时调度台：把评委切到某个项目，评委端与大屏会自动同步。
 *
 * 这是现场主持人用得最频繁的一块，因此批量操作放在最上面，
 * 单点调整（个别评委补评上一项）放在下面的表格里。
 */
export function DispatchPanel({
  competition,
  judges,
  projects,
  currentProjectId,
  judgesAligned,
  onToggleOpen,
  onDispatchAll,
  onDispatchOne,
  onNext,
  onClearScore,
  busy,
}) {
  const { t } = useI18n()
  const [targetProjectId, setTargetProjectId] = useState(
    currentProjectId ?? projects[0]?.id ?? '',
  )

  const currentProject = projects.find((p) => p.id === currentProjectId)

  return (
    <div className="flex flex-col gap-5">
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">{t('评分通道')}</span>
          <Pill tone={competition?.open ? 'ok' : 'warn'} live={!!competition?.open}>
            {competition?.open ? t('评分通道开放') : t('评分通道关闭')}
          </Pill>
        </div>
        <div className="panel-body flex flex-col gap-3">
          <label className="switch">
            <input
              type="checkbox"
              className="sr-only"
              checked={!!competition?.open}
              disabled={busy}
              onChange={(e) => onToggleOpen(e.target.checked)}
            />
            <span className="switch-track" aria-hidden="true" />
            <span className="text-[13.5px]">
              <strong>{t('开启评分')}</strong>
              {t(' — 打开后评委才能提交分数，关闭后暂停提交')}
            </span>
          </label>
          <p className="hint">{t('已提交的分数会保留。通道关闭时，评委端不能再提交或修改评分。')}</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">{t('实时调度')}</span>
          </div>
          <EmptyState
            title={t('还没有参赛项目')}
            description={t('先在「项目与评委」中录入项目，然后才能把评委调度过去。')}
          />
        </div>
      ) : (
        <>
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">{t('批量切换到项目')}</span>
          <Pill tone="info" live>
            {t('实时同步')}
          </Pill>
        </div>
        <div className="panel-body">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="select w-[300px] max-w-full"
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{t('— 选择项目 —')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || targetProjectId === ''}
              onClick={() => onDispatchAll(null, Number(targetProjectId))}
            >
              {t('全员切换到该项目')}
            </button>

            <button type="button" className="btn btn-secondary" onClick={onNext} disabled={busy}>
              {t('切到下一项')}
            </button>

            <button
              type="button"
              className="btn btn-secondary ml-auto"
              onClick={() => onDispatchAll(null, null)}
              disabled={busy}
            >
              {t('取消全部调度')}
            </button>
          </div>

          <p className="hint mt-3">
            {judgesAligned && currentProject
              ? t('当前全员统一评审：{name}', { name: currentProject.name })
              : currentProject
                ? t('评委分散在多个项目上（多数正在评「{name}」），可点击「全员切换到该项目」统一。', {
                    name: currentProject.name,
                  })
                : t('当前尚未分配评审项目。')}
          </p>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="panel-head">
          <span className="panel-title">{t('评委调度台')}</span>
          <span className="meta">
            {t('{assigned} / {total} 位评委已分配项目', {
              assigned: judges.filter((j) => j.currentProjectId).length,
              total: judges.length,
            })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-[42px]">#</th>
                <th className="w-[110px]">{t('评委')}</th>
                <th>{t('机构 / 职务')}</th>
                <th className="w-[280px]">{t('当前评审项目')}</th>
                <th className="w-[130px]">{t('该项目提交状态')}</th>
                <th className="w-[70px]" />
              </tr>
            </thead>
            <tbody>
              {judges.map((judge, index) => (
                <tr key={judge.id}>
                  <td className="font-mono text-xs text-ink-muted">{pad2(index + 1)}</td>
                  <td className="whitespace-nowrap font-semibold">{judge.name}</td>
                  <td className="text-ink-muted">{judge.org || '—'}</td>
                  <td>
                    <select
                      className="select py-1.5"
                      value={judge.currentProjectId ?? ''}
                      disabled={busy}
                      onChange={(e) =>
                        onDispatchOne(judge.id, e.target.value === '' ? null : Number(e.target.value))
                      }
                    >
                      <option value="">{t('— 取消分配 —')}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Pill tone={judge.submittedOnCurrent ? 'ok' : 'warn'}>
                      {judge.submittedOnCurrent ? t('已提交') : t('待评分')}
                    </Pill>
                  </td>
                  <td>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-ink-faint hover:text-danger-ink"
                        disabled={busy || !judge.currentProjectId || !judge.submittedOnCurrent}
                        title={
                          judge.submittedOnCurrent ? t('清空该评委对当前项目的评分') : t('该评委尚未提交此项评分')
                        }
                        onClick={() => onClearScore(judge)}
                      >
                        {t('清空')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {judges.length === 0 && (
          <EmptyState title={t('还没有评委')} description={t('先在「项目与评委」中添加评委名单。')} />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">{t('各项目完成度')}</span>
            <span className="meta">{t('已提交评委 / 总评委')}</span>
          </div>
          <div className="panel-body">
            {projects.map((project) => (
              <ProgressRow
                key={project.id}
                label={project.name}
                part={project.submittedCount}
                total={judges.length}
                barClass={project.id === currentProjectId ? '' : 'bg-ink-faint'}
              />
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">{t('调度说明')}</span>
          </div>
          <div className="panel-body flex flex-col gap-3">
            <p className="hint">{t('1. 演讲进行时把全员切到当前项目，评委端标题会立即变为该项目。')}</p>
            <p className="hint">{t('2. 若个别评委需要补评上一项目，可在上方表格单独修改他的「当前评审项目」。')}</p>
            <p className="hint">{t('3. 已提交的评分不会因切换而丢失，可按项目分别汇总。')}</p>
            <p className="hint">{t('4. 调度变化会在 1–2 秒内自动推送到评委端与总分大屏，现场无需手动刷新。')}</p>
            <p className="hint">{t('5. 评分通道开启后，评委才能提交评分。')}</p>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

/** 各项目已提交评分的可视化，供调度面板外部复用（例如总览页）。 */
export function ProjectProgress({ projects, judgeCount }) {
  return projects.map((project) => (
    <ProgressRow
      key={project.id}
      label={project.name}
      part={project.submittedCount}
      total={judgeCount}
      extra={percent(project.submittedCount, judgeCount)}
    />
  ))
}
