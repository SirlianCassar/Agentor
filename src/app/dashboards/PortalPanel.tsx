// Procedures: step by step portal procedures.
import type { Dispatch, SetStateAction } from 'react'
import { CopyIcon } from '../../components/AppIcons'
import { UiIcon } from '../../components/UiIcon'
import { buildProcedureMailtoHref } from '../../lib/mailto'
import { formatPortalForwardLabel, shouldShowPortalForwardIndicator } from '../../lib/procedure'
import { openExternal } from '../../lib/storage'
import type { CustomerPortalCode, ProcedureMailtoLink } from '../../lib/types'
import { formatProcedureText } from '../../lib/utils'

export interface PortalPanelProps {
  activeDashboardPortalProcedure: CustomerPortalCode | null
  activeDashboardPortalProcedureId: string | null
  dashboardPortalProcedures: CustomerPortalCode[]
  dashboardProcedureVariant: 'complete' | 'light'
  handleCopyPortalCode: (id: string, code: string) => Promise<void>
  handleCopyPortalQuickText: (id: string, text: string) => Promise<void>
  normalizedProcedureMailtos: Required<ProcedureMailtoLink>[]
  portalCopiedId: string | null
  portalQuickCopiedId: string | null
  setActiveDashboardPortalProcedureId: Dispatch<SetStateAction<string | null>>
  setDashboardProcedureVariant: Dispatch<SetStateAction<'complete' | 'light'>>
  title: string
}

export function PortalPanel({
  activeDashboardPortalProcedure,
  activeDashboardPortalProcedureId,
  dashboardPortalProcedures,
  dashboardProcedureVariant,
  handleCopyPortalCode,
  handleCopyPortalQuickText,
  normalizedProcedureMailtos,
  portalCopiedId,
  portalQuickCopiedId,
  setActiveDashboardPortalProcedureId,
  setDashboardProcedureVariant,
  title,
}: PortalPanelProps) {
  const activePortalProcedureName =
    activeDashboardPortalProcedure?.procedureName.trim() || 'Procédure sans nom'
  const activePortalForwardLabel = activeDashboardPortalProcedure
    ? formatPortalForwardLabel(activeDashboardPortalProcedure)
    : 'Forward'
  const showPortalForwardIndicator = activeDashboardPortalProcedure
    ? shouldShowPortalForwardIndicator(activeDashboardPortalProcedure)
    : false
  const hasPortalProcedureVariant = Boolean(
    activeDashboardPortalProcedure?.hasVariant &&
      (activeDashboardPortalProcedure.variantCodes ?? []).length,
  )
  const isLightProcedureVariant =
    hasPortalProcedureVariant && dashboardProcedureVariant === 'light'
  const activePortalMainVersionName =
    activeDashboardPortalProcedure?.mainVersionName?.trim() || 'Principal'
  const activePortalVariantVersionName =
    activeDashboardPortalProcedure?.variantVersionName?.trim() || 'Variante'
  const visiblePortalSteps = isLightProcedureVariant
    ? activeDashboardPortalProcedure?.variantCodes ?? []
    : activeDashboardPortalProcedure?.codes ?? []

  return (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--portal">
      <div className="workspace-dashboard__panel-title">{title}</div>

      <div className="dashboard-version-browser dashboard-portal-browser">
        <div className="dashboard-version-browser__list">
          {dashboardPortalProcedures.length ? (
            dashboardPortalProcedures.map((procedure) => {
              const procedureName = procedure.procedureName.trim() || 'Procédure sans nom'
              const procedureHasDraft = procedure.codes.some((entry) => Boolean(entry.showDraft))
              const procedureForwardLabel = formatPortalForwardLabel(procedure, 'Forward non')
              const procedureHasVariant = Boolean(
                procedure.hasVariant && (procedure.variantCodes ?? []).length,
              )

              return (
                <button
                  key={procedure.id}
                  className={`dashboard-version-item${
                    activeDashboardPortalProcedureId === procedure.id ? ' is-active' : ''
                  }`}
                  type="button"
                  onClick={() => setActiveDashboardPortalProcedureId(procedure.id)}
                >
                  <span className="dashboard-version-item__name">{procedureName}</span>
                  <span className="dashboard-version-item__meta">
                    Draft {procedureHasDraft ? 'oui' : 'non'} -{' '}
                    {procedureHasVariant ? 'Toggle oui' : 'Toggle non'} -{' '}
                    {procedureForwardLabel}
                  </span>
                </button>
              )
            })
          ) : (
            <div className="dashboard-empty">Aucune procédure configurée dans Paramètres.</div>
          )}
        </div>

        <div className="dashboard-version-detail dashboard-portal-detail">
            {activeDashboardPortalProcedure ? (
              <>
              <div className="dashboard-portal-procedure-header">
                <div className="dashboard-portal-procedure-header__top">
                  <div className="dashboard-portal-procedure-title">
                    {activePortalProcedureName}
                  </div>
                  {hasPortalProcedureVariant ? (
                    <div className="dashboard-portal-procedure-header__tools">
                      <div className="dashboard-portal-procedure-variant">
                        <button
                          type="button"
                          className={`dashboard-portal-procedure-switch${
                            isLightProcedureVariant ? ' is-on' : ''
                          }`}
                          onClick={() =>
                            setDashboardProcedureVariant(
                              isLightProcedureVariant ? 'complete' : 'light',
                            )
                          }
                          aria-pressed={isLightProcedureVariant}
                          aria-label="Basculer la variante de procédure"
                        >
                          <span className="dashboard-portal-procedure-switch__track">
                            <span className="dashboard-portal-procedure-switch__thumb" />
                          </span>
                        </button>
                        <div className="dashboard-portal-procedure-variant__label">
                          Mode{' '}
                          {isLightProcedureVariant
                            ? activePortalVariantVersionName
                            : activePortalMainVersionName}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {showPortalForwardIndicator ? (
                  <div className="dashboard-portal-procedure-indicators dashboard-portal-procedure-indicators--full">
                    <div
                      className={`dashboard-portal-indicator${
                        activeDashboardPortalProcedure.showForward ? ' is-active' : ''
                      }`}
                    >
                      <div className="dashboard-portal-indicator__label">
                        {activePortalForwardLabel}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="dashboard-version-detail__section">
                <div className="dashboard-portal-steps">
                  {visiblePortalSteps.map((entry, index) => {
                    const lineTitle = entry.title?.trim() || `Étape ${index + 1}`
                    const code = entry.code.trim()
                    const stepText = entry.infoNote?.trim() ?? ''
                    const quickLinkUrl = entry.quickLinkUrl?.trim() ?? ''
                    const quickCopyText = entry.quickCopyText?.trim() ?? ''
                    const quickMailtoTemplate =
                      normalizedProcedureMailtos.find(
                        (link) => link.id === entry.quickMailtoTemplateId?.trim(),
                      ) ??
                      normalizedProcedureMailtos.find(
                        (link) => buildProcedureMailtoHref(link) === (entry.quickMailtoHref?.trim() ?? ''),
                      ) ??
                      null
                    const quickMailtoHref = quickMailtoTemplate
                      ? buildProcedureMailtoHref(quickMailtoTemplate)
                      : entry.quickMailtoHref?.trim() ?? ''
                    const quickMailtoLabel =
                      quickMailtoTemplate?.label.trim() || entry.quickMailtoLabel?.trim() || 'Mailto'

                    return (
                      <article className="dashboard-portal-step" key={entry.id}>
                        <div className="dashboard-portal-step__main">
                          <div className="dashboard-portal-step__header">
                            <span className="dashboard-portal-step__index">{index + 1}</span>
                            <div className="dashboard-portal-step__heading">
                              <div className="dashboard-portal-step__title">{lineTitle}</div>
                              {entry.showDraft ? (
                                <span className="dashboard-portal-step__draft">DRAFT</span>
                              ) : null}
                              {quickLinkUrl ? (
                                <button
                                  className="dashboard-portal-step__link-btn"
                                  type="button"
                                  onClick={() => void openExternal(quickLinkUrl)}
                                  aria-label={`Ouvrir l'accès rapide pour ${lineTitle}`}
                                  title="Accès rapide"
                                >
                                  <UiIcon name="link" className="dashboard-portal-step__link-icon" />
                                </button>
                              ) : null}
                            </div>
                            <div className="dashboard-portal-step__actions-inline">
                              {quickMailtoHref ? (
                                <button
                                  className="dashboard-portal-step__link-btn dashboard-portal-step__link-btn--mailto"
                                  type="button"
                                  onClick={() => void openExternal(quickMailtoHref)}
                                  aria-label={`Ouvrir le mailto ${quickMailtoLabel}`}
                                  title={quickMailtoLabel}
                                >
                                  <UiIcon name="mail" />
                                </button>
                              ) : null}
                              {code ? (
                                <>
                                  <span
                                    className={`dashboard-portal-step__code-inline${
                                      portalCopiedId === entry.id ? ' is-success' : ''
                                    }`}
                                  >
                                    {code}
                                  </span>
                                  <button
                                    className={`icon-btn-sm dashboard-copy-icon dashboard-copy-icon--portal${
                                      portalCopiedId === entry.id ? ' is-success' : ''
                                    }`}
                                    type="button"
                                    onClick={() => void handleCopyPortalCode(entry.id, entry.code)}
                                    title="Copier le code portal"
                                    aria-label={`Copier le code portal ${code}`}
                                  >
                                    <CopyIcon />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div
                            className="dashboard-portal-step__content"
                            dangerouslySetInnerHTML={{
                              __html: formatProcedureText(stepText || 'Aucun texte renseigné.'),
                            }}
                          />
                        </div>
                        {quickCopyText && !isLightProcedureVariant ? (
                          <div className="dashboard-portal-step__template">
                            <div className="dashboard-portal-step__template-text">
                              {quickCopyText}
                            </div>
                            <button
                              className={`dashboard-portal-step__template-copy${
                                portalQuickCopiedId === entry.id ? ' is-success' : ''
                              }`}
                              type="button"
                              onClick={() =>
                                void handleCopyPortalQuickText(entry.id, quickCopyText)
                              }
                            >
                              {portalQuickCopiedId === entry.id ? 'Copié' : 'Copier'}
                            </button>
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                  {showPortalForwardIndicator ? (
                    <div className="dashboard-portal-forward-final">
                      <span>{activePortalForwardLabel}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="dashboard-wip">
              <strong>Portal procédures</strong>
              <span>Sélectionnez une procédure pour afficher ses étapes.</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
