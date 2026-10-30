// SKU and spare parts lookup.
import type { Dispatch, SetStateAction } from 'react'
import { UiIcon } from '../../components/UiIcon'
import type { LinkedProduct } from '../appShared'

export interface SparePartsPanelProps {
  activeDashboardSpareProduct: LinkedProduct | null
  activeDashboardSpareProductId: string | null
  dashboardSparePartQuery: string
  filteredProductsWithSpareParts: LinkedProduct[]
  handleCopySparePartSku: (id: string, sku: string) => Promise<void>
  setActiveDashboardSpareProductId: Dispatch<SetStateAction<string | null>>
  setDashboardSparePartQuery: Dispatch<SetStateAction<string>>
  sparePartCopiedId: string | null
  title: string
}

export function SparePartsPanel({
  activeDashboardSpareProduct,
  activeDashboardSpareProductId,
  dashboardSparePartQuery,
  filteredProductsWithSpareParts,
  handleCopySparePartSku,
  setActiveDashboardSpareProductId,
  setDashboardSparePartQuery,
  sparePartCopiedId,
  title,
}: SparePartsPanelProps) {
  return (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--catalog">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-version-browser dashboard-spare-parts-browser">
        <div className="dashboard-version-browser__list">
          <div className="dashboard-portal-search dashboard-sticky-search">
            <input
              className="input"
              value={dashboardSparePartQuery}
              onChange={(event) => setDashboardSparePartQuery(event.target.value)}
              placeholder="Rechercher un groupe ou un SKU..."
            />
          </div>
          {filteredProductsWithSpareParts.length ? (
            filteredProductsWithSpareParts.map((product) => (
              <button
                key={product.id}
                className={`dashboard-version-item${
                  activeDashboardSpareProductId === product.id ? ' is-active' : ''
                }`}
                type="button"
                onClick={() => setActiveDashboardSpareProductId(product.id)}
              >
                <span className="dashboard-version-item__name">{product.name}</span>
                <span className="dashboard-version-item__meta">
                  {product.spareParts.length} SKU{product.spareParts.length > 1 ? 's' : ''}
                </span>
              </button>
            ))
          ) : (
            <div className="dashboard-empty">Aucun SKU configuré.</div>
          )}
        </div>

        <div className="dashboard-version-detail dashboard-spare-parts-detail">
          {activeDashboardSpareProduct ? (
            <>
              <div className="dashboard-version-detail__header">
                <div>
                  <div className="dashboard-version-detail__title">
                    {activeDashboardSpareProduct.name}
                  </div>
                  <div className="dashboard-version-detail__badges">
                    <span className="dashboard-version-detail__badge">
                      {activeDashboardSpareProduct.spareParts.length} SKU
                      {activeDashboardSpareProduct.spareParts.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <GuideLed
                  available={activeDashboardSpareProduct.packingGuideAvailable}
                  label="Packing guide"
                />
              </div>
              <div className="dashboard-spare-parts__list">
                {activeDashboardSpareProduct.spareParts.length ? (
                  activeDashboardSpareProduct.spareParts.map((sparePart) => (
                    <article className="dashboard-spare-parts__item" key={sparePart.id}>
                      <div className="dashboard-spare-parts__main">
                        <div className="dashboard-spare-parts__name-row">
                          <span className="dashboard-spare-parts__name">{sparePart.name || 'Sans nom'}</span>
                          {sparePart.name.trim() ? (
                            <button
                              className={`dashboard-spare-parts__name-copy${
                                sparePartCopiedId === `${sparePart.id}:name` ? ' is-success' : ''
                              }`}
                              type="button"
                              onClick={() => void handleCopySparePartSku(`${sparePart.id}:name`, sparePart.name)}
                              aria-label={`Copier le nom ${sparePart.name}`}
                              title={sparePartCopiedId === `${sparePart.id}:name` ? 'Copié' : 'Copier le nom'}
                            >
                              <UiIcon name={sparePartCopiedId === `${sparePart.id}:name` ? 'check' : 'copy'} />
                            </button>
                          ) : null}
                        </div>
                        <div className="dashboard-spare-parts__sku-row">
                          <button
                            className={`dashboard-spare-parts__sku-bubble${
                              sparePartCopiedId === sparePart.id ? ' is-success' : ''
                            }`}
                            type="button"
                            onClick={() => void handleCopySparePartSku(sparePart.id, sparePart.sku)}
                            disabled={!sparePart.sku.trim()}
                            title="Cliquer pour copier"
                          >
                            {sparePart.sku || 'Non renseigné'}
                          </button>
                        </div>
                      </div>
                      <GuideLed available={sparePart.guideAvailable} label="Guide" />
                    </article>
                  ))
                ) : (
                  <div className="dashboard-empty">Aucun SKU dans ce groupe.</div>
                )}
              </div>
            </>
          ) : (
            <div className="dashboard-wip">
              <strong>SKU’s</strong>
              <span>Sélectionnez un groupe pour afficher ses références.</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

// Small LED: lit when the guide exists. The label stays short; the full
// state is in the tooltip and for screen readers.
function GuideLed({ available, label }: { available: boolean; label: string }) {
  const state = `${label} ${available ? 'disponible' : 'indisponible'}`
  return (
    <span
      className={`dashboard-spare-parts__led${available ? ' is-available' : ''}`}
      title={state}
      role="img"
      aria-label={state}
    >
      <span className="dashboard-spare-parts__led-dot" aria-hidden="true" />
      <span className="dashboard-spare-parts__led-label" aria-hidden="true">{label}</span>
    </span>
  )
}
