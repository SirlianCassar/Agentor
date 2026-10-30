// News list of the dashboard.
import type { MouseEvent } from 'react'
import { formatDashboardNewsDate } from '../../lib/formatting'
import type { DashboardNewsItem } from '../../lib/types'
import { formatDashboardNewsText } from '../../lib/utils'

export interface NewsBlockProps {
  dashboardNewsSorted: DashboardNewsItem[]
  handleProcedureLinkClick: (event: MouseEvent<HTMLElement>) => void
}

export function NewsBlock({
  dashboardNewsSorted,
  handleProcedureLinkClick,
}: NewsBlockProps) {
  return (
    <div className="dashboard-news-notes__panel dashboard-news-notes__panel--news">
      <div className="dashboard-news-list dashboard-news-list--stacked">
        {dashboardNewsSorted.length ? (
          dashboardNewsSorted.map((item) => (
            <article className="dashboard-news-item" key={item.id}>
              <div className="dashboard-news-item__date">{formatDashboardNewsDate(item.date)}</div>
              <div className="dashboard-news-item__title">{item.title || 'Sans titre'}</div>
              <div
                className="dashboard-news-item__content"
                onClick={handleProcedureLinkClick}
                dangerouslySetInnerHTML={{
                  __html: formatDashboardNewsText(item.content.trim() || 'Aucun contenu.'),
                }}
              />
            </article>
          ))
        ) : (
          <div className="dashboard-empty">Aucune news configurée.</div>
        )}
      </div>
    </div>
  )
}
