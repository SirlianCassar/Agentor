// Settings › News shown in the dashboard.
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon, MoveIcon } from '../../components/AppIcons'
import { SortableList } from '../../components/SortableList'
import { formatDashboardNewsDate } from '../../lib/formatting'
import { getDashboardNewsIssues, type SettingsValidationScope } from '../../lib/settingsValidation'
import type { DashboardNewsItem } from '../../lib/types'

export interface NewsSettingsProps {
  clearSettingsValidationTouched: (scope: SettingsValidationScope) => void
  dashboardNewsContentRef: RefObject<HTMLTextAreaElement>
  dashboardNewsDraft: DashboardNewsItem
  dashboardNewsDraftIssues: string[]
  dashboardNewsSorted: DashboardNewsItem[]
  getEmptyDashboardNewsDraft: () => DashboardNewsItem
  handleDeleteDashboardNews: (item: DashboardNewsItem) => void
  handleReorderDashboardNews: (next: DashboardNewsItem[]) => void
  handleSaveDashboardNews: () => void
  insertDashboardNewsColorTag: (colorId: '1' | '2' | '3') => void
  isDashboardNewsSelectionEmpty: boolean
  renderIssueBadge: (issues: string[]) => JSX.Element | null
  renderValidationIssues: (scope: SettingsValidationScope, issues: string[]) => JSX.Element | null
  selectedDashboardNewsId: string | null
  setDashboardNewsDraft: Dispatch<SetStateAction<DashboardNewsItem>>
  setSelectedDashboardNewsId: Dispatch<SetStateAction<string | null>>
}

export function NewsSettings({
  clearSettingsValidationTouched,
  dashboardNewsContentRef,
  dashboardNewsDraft,
  dashboardNewsDraftIssues,
  dashboardNewsSorted,
  getEmptyDashboardNewsDraft,
  handleDeleteDashboardNews,
  handleReorderDashboardNews,
  handleSaveDashboardNews,
  insertDashboardNewsColorTag,
  isDashboardNewsSelectionEmpty,
  renderIssueBadge,
  renderValidationIssues,
  selectedDashboardNewsId,
  setDashboardNewsDraft,
  setSelectedDashboardNewsId,
}: NewsSettingsProps) {
  return (
    <div className="modal__grid">
      <div className="list-card">
        <div className="list-card__header list-card__header--wrap">
          <div className="list-card__title-group">
            <div className="list-card__title">Liste</div>
          </div>
        </div>
        <div className="list-card__body">
          {dashboardNewsSorted.length ? (
            <SortableList
              items={dashboardNewsSorted}
              getId={(item) => item.id}
              onReorder={handleReorderDashboardNews}
              renderItem={(item, handleProps) => {
                const issues = getDashboardNewsIssues(item)
                return (
                  <div
                    key={item.id}
                    className={`list-item list-item--compact${
                      selectedDashboardNewsId === item.id ? ' is-selected' : ''
                    }${issues.length ? ' is-incomplete' : ''}`}
                    onClick={() => {
                      clearSettingsValidationTouched('dashboardNews')
                      setDashboardNewsDraft({ ...item })
                      setSelectedDashboardNewsId(item.id)
                    }}
                  >
                    <button title="Déplacer"
                      className="drag-handle"
                      type="button"
                      {...handleProps.attributes}
                      {...handleProps.listeners}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <MoveIcon />
                    </button>
                    <div className="list-item__content">
                      <div className="list-item__title">{item.title || 'Sans titre'}</div>
                      <div className="list-item__meta">
                        {formatDashboardNewsDate(item.date)}
                      </div>
                      {renderIssueBadge(issues)}
                    </div>
                    <div className="list-item__actions">
                      <button
                        className="icon-btn-sm danger"
                        type="button"
                        title="Supprimer"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteDashboardNews(item)
                        }}
                      >
                  <DeleteIcon />
                      </button>
                    </div>
                  </div>
                )
              }}
            />
          ) : (
            <div className="empty-state">Aucune news configurée.</div>
          )}
        </div>
      </div>

      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title-group">
            <div className="list-card__title">Détails</div>
          </div>
          <div className="list-card__tools">
            <button
              className="btn btn--ghost btn--small btn--with-icon"
              type="button"
              onClick={() => {
                clearSettingsValidationTouched('dashboardNews')
                setDashboardNewsDraft(getEmptyDashboardNewsDraft())
                setSelectedDashboardNewsId('new')
              }}
            >
              <ButtonIcon name="add" />
              Nouveau
            </button>
            <button
              className="btn btn--primary btn--small btn--with-icon"
              type="button"
              onClick={handleSaveDashboardNews}
            >
              <ButtonIcon name="save" />
              Sauver
            </button>
          </div>
        </div>
        <div className="list-card__body">
          {isDashboardNewsSelectionEmpty ? (
            <div className="empty-state">
              Sélectionnez une news ou créez-en une avec Nouveau.
            </div>
          ) : (
            <div className="form">
              {renderValidationIssues('dashboardNews', dashboardNewsDraftIssues)}
              <input
                className="input"
                type="date"
                value={dashboardNewsDraft.date}
                onChange={(event) =>
                  setDashboardNewsDraft((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
              <input
                className="input"
                placeholder="Titre de l'actualité"
                value={dashboardNewsDraft.title}
                onChange={(event) =>
                  setDashboardNewsDraft((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
              <div className="news-color-toolbar" aria-label="Couleurs news">
                {(['1', '2', '3'] as const).map((colorId) => (
                  <button
                    key={colorId}
                    className={`token-btn news-color-btn news-color-btn--${colorId}`}
                    type="button"
                    title={`Insérer couleur ${colorId}`}
                    onClick={() => insertDashboardNewsColorTag(colorId)}
                  >
                    {colorId}
                  </button>
                ))}
              </div>
              <textarea
                ref={dashboardNewsContentRef}
                className="textarea textarea--tall textarea--dashboard-news"
                placeholder="Contenu. Couleurs disponibles : (1*TEXTE*1), (2*TEXTE*2), (3*TEXTE*3)."
                value={dashboardNewsDraft.content}
                onChange={(event) =>
                  setDashboardNewsDraft((prev) => ({
                    ...prev,
                    content: event.target.value,
                  }))
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
