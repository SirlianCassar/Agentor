// Settings › Procédures: steps, variants, forward, copy modules and mailto.
import type { Dispatch, SetStateAction } from 'react'
import { AddIcon, ButtonIcon, CloseIcon, DeleteIcon, MoveIcon } from '../../components/AppIcons'
import { SortableList } from '../../components/SortableList'
import { createEmptyPortalCodeLine, type PortalCodeLineSet, type PortalCodeOptionalModule } from '../../lib/dashboardData'
import { buildProcedureMailtoHref } from '../../lib/mailto'
import { formatPortalForwardLabel } from '../../lib/procedure'
import { formatPortalTimelineTitle } from '../../lib/taskDraft'
import type { CustomerPortalCode, CustomerPortalCodeLine, ProcedureMailtoLink } from '../../lib/types'

export interface PortalCodeEditorProps {
  addCustomerPortalCodeLine: (procedureId: string, lineSet?: PortalCodeLineSet) => void
  customerPortalCodes: CustomerPortalCode[]
  handleRemovePortalProcedure: (procedureId: string) => void
  handleReorderPortalProcedures: (next: CustomerPortalCode[]) => void
  hideCustomerPortalCodeLineModule: (procedureId: string, codeLineId: string, module: PortalCodeOptionalModule, lineSet?: PortalCodeLineSet) => void
  normalizedProcedureMailtos: Required<ProcedureMailtoLink>[]
  portalProcedureEditorOpen: boolean
  portalProcedureVersionMode: 'main' | 'variant'
  portalVisibleLineModules: Record<string, Partial<Record<PortalCodeOptionalModule, boolean>>>
  removeCustomerPortalCodeLine: (procedureId: string, codeLineId: string, lineSet?: PortalCodeLineSet) => void
  selectedPortalProcedureId: string | null
  setPortalProcedureEditorOpen: Dispatch<SetStateAction<boolean>>
  setPortalProcedureVersionMode: Dispatch<SetStateAction<'main' | 'variant'>>
  setSelectedPortalProcedureId: Dispatch<SetStateAction<string | null>>
  showCustomerPortalCodeLineModule: (codeLineId: string, module: PortalCodeOptionalModule) => void
  updateCustomerPortalCodeLineItem: (procedureId: string, codeLineId: string, patch: Partial<CustomerPortalCodeLine>, lineSet?: PortalCodeLineSet) => void
  updateCustomerPortalCodeLineMailto: (procedureId: string, codeLineId: string, lineSet: PortalCodeLineSet, mailtoId: string) => void
  updateCustomerPortalProcedure: (id: string, patch: Partial<CustomerPortalCode>) => void
}

export function PortalCodeEditor({
  addCustomerPortalCodeLine,
  customerPortalCodes,
  handleRemovePortalProcedure,
  handleReorderPortalProcedures,
  hideCustomerPortalCodeLineModule,
  normalizedProcedureMailtos,
  portalProcedureEditorOpen,
  portalProcedureVersionMode,
  portalVisibleLineModules,
  removeCustomerPortalCodeLine,
  selectedPortalProcedureId,
  setPortalProcedureEditorOpen,
  setPortalProcedureVersionMode,
  setSelectedPortalProcedureId,
  showCustomerPortalCodeLineModule,
  updateCustomerPortalCodeLineItem,
  updateCustomerPortalCodeLineMailto,
  updateCustomerPortalProcedure,
}: PortalCodeEditorProps) {
  const selectedPortalProcedure =
    customerPortalCodes.find((entry) => entry.id === selectedPortalProcedureId) ??
    customerPortalCodes[0] ??
    null
  const resolvedSelectedPortalProcedureId = selectedPortalProcedure?.id ?? null
  const portalEditorUsesVariant = Boolean(
    selectedPortalProcedure?.hasVariant && portalProcedureVersionMode === 'variant',
  )
  const portalEditorLineSet: PortalCodeLineSet = portalEditorUsesVariant
    ? 'variantCodes'
    : 'codes'
  const portalEditorLines = selectedPortalProcedure
    ? portalEditorUsesVariant
      ? selectedPortalProcedure.variantCodes ?? []
      : selectedPortalProcedure.codes
    : []
  const portalMainVersionName = selectedPortalProcedure?.mainVersionName?.trim() || 'Version 1'
  const portalVariantVersionName =
    selectedPortalProcedure?.variantVersionName?.trim() || 'Alternative'
  const portalEditorVersionLabel = portalEditorUsesVariant
    ? portalVariantVersionName
    : portalMainVersionName

  return (
    <div className={`portal-code-editor${portalProcedureEditorOpen ? ' is-editing' : ''}`}>
      {customerPortalCodes.length ? (
        <div className="dashboard-product-editor portal-code-editor__layout">
          <div className="dashboard-product-editor__list">
            <SortableList
              items={customerPortalCodes}
              getId={(item) => item.id}
              onReorder={handleReorderPortalProcedures}
              renderItem={(item, handleProps) => {
                const procedureHasDraft = item.codes.some((entry) => Boolean(entry.showDraft))
                return (
                  <div
                    className={`list-item list-item--compact${
                      resolvedSelectedPortalProcedureId === item.id ? ' is-selected' : ''
                    }`}
                    key={item.id}
                    onClick={() => {
                      setSelectedPortalProcedureId(item.id)
                      setPortalProcedureVersionMode('main')
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
                      <div className="list-item__title">
                        {item.procedureName.trim() || 'Procédure sans nom'}
                      </div>
                      <div className="list-item__meta">
                        {item.codes.length} étape{item.codes.length > 1 ? 's' : ''} • Draft{' '}
                        {procedureHasDraft ? 'oui' : 'non'} • Forward{' '}
                        {item.showForward ? 'oui' : 'non'} • Toggle{' '}
                        {item.hasVariant ? 'oui' : 'non'}
                      </div>
                    </div>
                    <div className="list-item__actions">
                      <button
                        className="icon-btn-sm danger"
                        type="button"
                        title="Supprimer"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleRemovePortalProcedure(item.id)
                        }}
                      >
                          <DeleteIcon />
                      </button>
                    </div>
                  </div>
                )
              }}
            />
          </div>

          <div className="portal-code-editor__preview">
            {selectedPortalProcedure ? (
              <div className="portal-code-editor__preview-inner">
                <div className="portal-code-editor__preview-head">
                  <div>
                    <div className="portal-code-editor__preview-title">
                      {selectedPortalProcedure.procedureName.trim() || 'Procédure sans nom'}
                    </div>
                    <div className="list-item__meta">
                      {selectedPortalProcedure.codes.length} étape
                      {selectedPortalProcedure.codes.length > 1 ? 's' : ''} •{' '}
                      {formatPortalForwardLabel(selectedPortalProcedure, 'Forward non')}
                    </div>
                  </div>
                  <button
                    className="btn btn--ghost btn--small btn--with-icon"
                    type="button"
                    onClick={() => setPortalProcedureEditorOpen(true)}
                  >
                    <ButtonIcon name="edit" />
                    Modifier
                  </button>
                </div>
                <div className="portal-code-editor__preview-steps">
                  {selectedPortalProcedure.codes.map((line, index) => (
                    <article className="portal-code-editor__preview-step" key={line.id}>
                      <div className="portal-code-editor__preview-step-title">
                        {formatPortalTimelineTitle(line.title ?? '') ||
                          `Étape ${index + 1}`}
                      </div>
                      <div className="list-item__meta">
                        {line.showDraft ? 'Draft • ' : ''}
                        {line.quickLinkUrl?.trim() ? 'Lien rapide • ' : ''}
                        {line.quickCopyText?.trim() ? 'Texte à copier • ' : ''}
                        {line.quickMailtoTemplateId?.trim() || line.quickMailtoHref?.trim() ? 'Mailto • ' : ''}
                        {line.code.trim() ? `Code ${line.code.trim()}` : 'Aucun code'}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">Sélectionnez une procédure pour afficher l’aperçu.</div>
            )}
          </div>

          <div className="dashboard-product-editor__form">
            {selectedPortalProcedure ? (
              <div className="portal-code-editor__modal">
                <header className="portal-code-editor__modal-head">
                  <div className="portal-code-editor__title-field">
                    <span className="settings-label">Définition d'une procédure</span>
                    <input
                      className="input"
                      value={selectedPortalProcedure.procedureName}
                      placeholder="Titre de la procédure"
                      onChange={(event) =>
                        updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                          procedureName: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="portal-code-editor__variant-panel">
                    <div className="portal-code-editor__variant-head">
                      <div className="portal-code-editor__variant-copy">
                        <span>Variantes</span>
                        <small>
                          {selectedPortalProcedure.hasVariant
                            ? 'Deux jeux d’étapes peuvent être nommés et édités séparément.'
                            : 'Activez une variante pour gérer une seconde version de la procédure.'}
                        </small>
                      </div>
                      <button
                        type="button"
                        className={`portal-code-editor__switch${
                          selectedPortalProcedure.hasVariant ? ' is-on' : ''
                        }`}
                        onClick={() => {
                          const hasVariant = !selectedPortalProcedure.hasVariant
                          setPortalProcedureVersionMode(hasVariant ? 'variant' : 'main')
                          updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                            hasVariant,
                            variantCodes: hasVariant
                              ? selectedPortalProcedure.variantCodes?.length
                                ? selectedPortalProcedure.variantCodes
                                : [createEmptyPortalCodeLine()]
                              : selectedPortalProcedure.variantCodes ?? [],
                          })
                        }}
                        aria-pressed={Boolean(selectedPortalProcedure.hasVariant)}
                      >
                        <span className="portal-code-editor__switch-label">
                          {selectedPortalProcedure.hasVariant ? 'Activé' : 'Inactif'}
                        </span>
                        <span className="portal-code-editor__switch-track">
                          <span className="portal-code-editor__switch-thumb" />
                        </span>
                      </button>
                    </div>

                    {selectedPortalProcedure.hasVariant ? (
                      <>
                        <div className="portal-code-editor__version-names">
                          <label className="portal-code-editor__version-name-field">
                            <span>Version principale</span>
                            <input
                              className="input"
                              value={selectedPortalProcedure.mainVersionName ?? ''}
                              placeholder="Ex. Windows"
                              onChange={(event) =>
                                updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                                  mainVersionName: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="portal-code-editor__version-name-field">
                            <span>Variante</span>
                            <input
                              className="input"
                              value={selectedPortalProcedure.variantVersionName ?? ''}
                              placeholder="Ex. macOS"
                              onChange={(event) =>
                                updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                                  variantVersionName: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="portal-code-editor__version-tabs" role="tablist">
                          <button
                            className={`portal-code-editor__version-tab${
                              portalProcedureVersionMode === 'main' ? ' is-active' : ''
                            }`}
                            type="button"
                            onClick={() => setPortalProcedureVersionMode('main')}
                          >
                            {portalMainVersionName}
                          </button>
                          <button
                            className={`portal-code-editor__version-tab${
                              portalProcedureVersionMode === 'variant' ? ' is-active' : ''
                            }`}
                            type="button"
                            onClick={() => setPortalProcedureVersionMode('variant')}
                          >
                            {portalVariantVersionName}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="portal-code-editor__variant-empty">
                        Une seule version est utilisée pour le moment.
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btn--ghost btn--small"
                    type="button"
                    onClick={() => setPortalProcedureEditorOpen(false)}
                  >
                    Fermer
                  </button>
                </header>

                <section className="portal-code-editor__timeline-section">
                  <div className="portal-code-editor__section-head">
                    <div>
                      <div className="portal-code-editor__section-title">
                        {portalEditorVersionLabel}
                      </div>
                      <div className="list-item__meta">
                        {portalEditorUsesVariant
                          ? 'Étapes de la variante activée.'
                          : 'Étapes de la version par défaut.'}
                      </div>
                    </div>
                  </div>

                  <div className="portal-code-editor__timeline">
                    {portalEditorLines.map((codeLine, index) => {
                      const visibleModules = portalVisibleLineModules[codeLine.id] ?? {}
                      const codeVisible = Boolean(codeLine.code.trim()) || Boolean(visibleModules.code)
                      const quickLinkVisible =
                        Boolean(codeLine.quickLinkUrl?.trim()) || Boolean(visibleModules.quickLink)
                      const quickCopyVisible =
                        Boolean(codeLine.quickCopyText?.trim()) || Boolean(visibleModules.quickCopy)
                      const mailtoVisible =
                        Boolean(codeLine.quickMailtoTemplateId?.trim()) ||
                        Boolean(codeLine.quickMailtoHref?.trim()) || Boolean(visibleModules.mailto)
                      const selectedMailtoTemplate =
                        normalizedProcedureMailtos.find(
                          (link) => link.id === codeLine.quickMailtoTemplateId?.trim(),
                        ) ??
                        normalizedProcedureMailtos.find(
                          (link) =>
                            buildProcedureMailtoHref(link) ===
                            (codeLine.quickMailtoHref?.trim() ?? ''),
                        ) ??
                        null
                      const selectedMailtoId = selectedMailtoTemplate?.id ?? ''

                      return (
                        <article className="portal-code-editor__timeline-item" key={codeLine.id}>
                          <div className="portal-code-editor__timeline-marker">
                            <span>{index + 1}</span>
                          </div>
                          <div className="portal-code-editor__code-card">
                            <div className="portal-code-editor__step-head">
                              <div className="portal-code-editor__step-title-row">
                                <span className="list-item__meta">
                                  {formatPortalTimelineTitle(codeLine.title ?? '') ||
                                    `Étape ${index + 1}`}
                                </span>
                                {codeLine.showDraft ? (
                                  <span className="portal-code-editor__draft-pill">Draft</span>
                                ) : null}
                              </div>
                              {portalEditorLines.length > 1 ? (
                                <button
                                  className="icon-btn-sm danger"
                                  type="button"
                                  title="Supprimer cette étape"
                                  onClick={() =>
                                    removeCustomerPortalCodeLine(
                                      selectedPortalProcedure.id,
                                      codeLine.id,
                                      portalEditorLineSet,
                                    )
                                  }
                                >
                                  <DeleteIcon />
                                </button>
                              ) : null}
                            </div>

                            <input
                              className="input"
                              value={codeLine.title ?? ''}
                              placeholder={`Titre de l'étape ${index + 1}`}
                              onChange={(event) =>
                                updateCustomerPortalCodeLineItem(
                                  selectedPortalProcedure.id,
                                  codeLine.id,
                                  {
                                    title: event.target.value,
                                  },
                                  portalEditorLineSet,
                                )
                              }
                            />

                            <textarea
                              className="textarea portal-code-editor__note"
                              value={codeLine.infoNote ?? ''}
                              placeholder="Contenu de l'étape"
                              onChange={(event) =>
                                updateCustomerPortalCodeLineItem(
                                  selectedPortalProcedure.id,
                                  codeLine.id,
                                  {
                                    infoNote: event.target.value,
                                  },
                                  portalEditorLineSet,
                                )
                              }
                            />

                            <div className="portal-code-editor__step-tools">
                              <label className="portal-code-editor__draft-toggle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(codeLine.showDraft)}
                                  onChange={(event) =>
                                    updateCustomerPortalCodeLineItem(
                                      selectedPortalProcedure.id,
                                      codeLine.id,
                                      {
                                        showDraft: event.target.checked,
                                      },
                                      portalEditorLineSet,
                                    )
                                  }
                                />
                                <span>Draft</span>
                              </label>

                              <div className="portal-code-editor__add-modules" aria-label="Modules d'étape">
                                {!codeVisible ? (
                                  <button
                                    className="portal-code-editor__add-module"
                                    type="button"
                                    onClick={() => showCustomerPortalCodeLineModule(codeLine.id, 'code')}
                                  >
                                    <AddIcon />
                                    <span>Code</span>
                                  </button>
                                ) : null}
                                {!quickLinkVisible ? (
                                  <button
                                    className="portal-code-editor__add-module"
                                    type="button"
                                    onClick={() =>
                                      showCustomerPortalCodeLineModule(codeLine.id, 'quickLink')
                                    }
                                  >
                                    <AddIcon />
                                    <span>Lien</span>
                                  </button>
                                ) : null}
                                {!quickCopyVisible ? (
                                  <button
                                    className="portal-code-editor__add-module"
                                    type="button"
                                    onClick={() =>
                                      showCustomerPortalCodeLineModule(codeLine.id, 'quickCopy')
                                    }
                                  >
                                    <AddIcon />
                                    <span>Copie</span>
                                  </button>
                                ) : null}
                                {!mailtoVisible ? (
                                  <button
                                    className="portal-code-editor__add-module"
                                    type="button"
                                    onClick={() => showCustomerPortalCodeLineModule(codeLine.id, 'mailto')}
                                  >
                                    <AddIcon />
                                    <span>Mailto</span>
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <div className="portal-code-editor__modules">
                              {codeVisible ? (
                                <div className="portal-code-editor__module">
                                  <div className="portal-code-editor__module-head">
                                    <span>Code à copier</span>
                                    <button
                                      className="icon-btn-sm"
                                      type="button"
                                      title="Retirer le code"
                                      onClick={() =>
                                        hideCustomerPortalCodeLineModule(
                                          selectedPortalProcedure.id,
                                          codeLine.id,
                                          'code',
                                          portalEditorLineSet,
                                        )
                                      }
                                    >
                                      <CloseIcon />
                                    </button>
                                  </div>
                                  <input
                                    className="input"
                                    value={codeLine.code}
                                    placeholder={`Code portal ${index + 1}`}
                                    onChange={(event) =>
                                      updateCustomerPortalCodeLineItem(
                                        selectedPortalProcedure.id,
                                        codeLine.id,
                                        {
                                          code: event.target.value,
                                        },
                                        portalEditorLineSet,
                                      )
                                    }
                                  />
                                </div>
                              ) : null}

                              {quickLinkVisible ? (
                                <div className="portal-code-editor__module">
                                  <div className="portal-code-editor__module-head">
                                    <span>Lien rapide</span>
                                    <button
                                      className="icon-btn-sm"
                                      type="button"
                                      title="Retirer le lien"
                                      onClick={() =>
                                        hideCustomerPortalCodeLineModule(
                                          selectedPortalProcedure.id,
                                          codeLine.id,
                                          'quickLink',
                                          portalEditorLineSet,
                                        )
                                      }
                                    >
                                      <CloseIcon />
                                    </button>
                                  </div>
                                  <input
                                    className="input"
                                    value={codeLine.quickLinkUrl ?? ''}
                                    placeholder="https://..."
                                    onChange={(event) =>
                                      updateCustomerPortalCodeLineItem(
                                        selectedPortalProcedure.id,
                                        codeLine.id,
                                        {
                                          quickLinkUrl: event.target.value,
                                        },
                                        portalEditorLineSet,
                                      )
                                    }
                                  />
                                </div>
                              ) : null}

                              {quickCopyVisible ? (
                                <div className="portal-code-editor__module">
                                  <div className="portal-code-editor__module-head">
                                    <span>Texte de copie rapide</span>
                                    <button
                                      className="icon-btn-sm"
                                      type="button"
                                      title="Retirer le texte"
                                      onClick={() =>
                                        hideCustomerPortalCodeLineModule(
                                          selectedPortalProcedure.id,
                                          codeLine.id,
                                          'quickCopy',
                                          portalEditorLineSet,
                                        )
                                      }
                                    >
                                      <CloseIcon />
                                    </button>
                                  </div>
                                  <textarea
                                    className="textarea portal-code-editor__quick-copy"
                                    value={codeLine.quickCopyText ?? ''}
                                    placeholder="Texte à copier en un clic"
                                    onChange={(event) =>
                                      updateCustomerPortalCodeLineItem(
                                        selectedPortalProcedure.id,
                                        codeLine.id,
                                        {
                                          quickCopyText: event.target.value,
                                        },
                                        portalEditorLineSet,
                                      )
                                    }
                                  />
                                </div>
                              ) : null}

                              {mailtoVisible ? (
                                <div className="portal-code-editor__module">
                                  <div className="portal-code-editor__module-head">
                                    <span>Mailto rapide</span>
                                    <button
                                      className="icon-btn-sm"
                                      type="button"
                                      title="Retirer le mailto"
                                      onClick={() =>
                                        hideCustomerPortalCodeLineModule(
                                          selectedPortalProcedure.id,
                                          codeLine.id,
                                          'mailto',
                                          portalEditorLineSet,
                                        )
                                      }
                                    >
                                      <CloseIcon />
                                    </button>
                                  </div>
                                  <div className="portal-code-editor__mailto-grid">
                                    <select
                                      className="select select--compact"
                                      value={selectedMailtoId}
                                      onChange={(event) =>
                                        updateCustomerPortalCodeLineMailto(
                                          selectedPortalProcedure.id,
                                          codeLine.id,
                                          portalEditorLineSet,
                                          event.target.value,
                                        )
                                      }
                                    >
                                      <option value="">Choisir un template mailto...</option>
                                      {normalizedProcedureMailtos.map((link) => (
                                        <option key={link.id} value={link.id}>
                                          {link.label}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="portal-code-editor__mailto-preview">
                                      {selectedMailtoTemplate ? (
                                        <>
                                          <span>{selectedMailtoTemplate.to || 'Destinataire non renseigné'}</span>
                                          <strong>{selectedMailtoTemplate.subject || 'Titre non renseigné'}</strong>
                                        </>
                                      ) : (
                                        <span>Template défini dans Paramètres &gt; Templates mailto.</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>

                          </div>
                        </article>
                      )
                    })}

                    <div className="portal-code-editor__timeline-add">
                      <button title="Ajouter une étape"
                        className="portal-code-editor__add-step"
                        type="button"
                        onClick={() =>
                          addCustomerPortalCodeLine(
                            selectedPortalProcedure.id,
                            portalEditorLineSet,
                          )
                        }
                      >
                        <AddIcon />
                      </button>
                    </div>
                  </div>
                </section>

                <section className="portal-code-editor__forward-final">
                  <div className="portal-code-editor__switch-row">
                    <span>Forward final</span>
                    <button
                      type="button"
                      className={`portal-code-editor__switch${
                        selectedPortalProcedure.showForward ? ' is-on' : ''
                      }`}
                      onClick={() => {
                        const showForward = !selectedPortalProcedure.showForward
                        updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                          showForward,
                          forwardTarget: showForward
                            ? selectedPortalProcedure.forwardTarget ?? ''
                            : '',
                        })
                      }}
                      aria-pressed={Boolean(selectedPortalProcedure.showForward)}
                    >
                      <span className="portal-code-editor__switch-track">
                        <span className="portal-code-editor__switch-thumb" />
                      </span>
                    </button>
                  </div>
                  {selectedPortalProcedure.showForward ? (
                    <input
                      className="input"
                      value={selectedPortalProcedure.forwardTarget ?? ''}
                      placeholder="Cible du forward"
                      onChange={(event) =>
                        updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                          forwardTarget: event.target.value,
                        })
                      }
                    />
                  ) : null}
                </section>
              </div>
            ) : (
              <div className="empty-state">Sélectionnez une procédure Portal pour l'éditer.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">Aucune procédure configurée.</div>
      )}
    </div>
  )
}
