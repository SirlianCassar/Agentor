// Price calculator with and without VAT.
import { ButtonIcon, CopyIcon, DeleteIcon } from '../../components/AppIcons'
import {
  type DashboardCalculatorCopyKey,
  type DashboardCalculatorItem,
  type DashboardCalculatorPriceField,
  getDashboardCalculatorQuantity,
} from '../../lib/calculator'
import { formatEuroAmount } from '../../lib/formatting'

export interface CalculatorPanelProps {
  addDashboardCalculatorItem: () => void
  adjustDashboardCalculatorQuantity: (id: string, delta: number) => void
  dashboardCalculatorCopiedKey: DashboardCalculatorCopyKey | null
  dashboardCalculatorItems: DashboardCalculatorItem[]
  dashboardGrandTotalHt: number
  dashboardGrandTotalTtc: number
  dashboardProductsTotalHt: number
  dashboardProductsTotalTtc: number
  dashboardShippingTotalHt: number
  dashboardShippingTotalTtc: number
  handleCopyDashboardAmount: (key: DashboardCalculatorCopyKey, value: number) => Promise<void>
  removeDashboardCalculatorItem: (id: string) => void
  title: string
  updateDashboardCalculatorItem: (id: string, field: DashboardCalculatorPriceField, value: string) => void
}

export function CalculatorPanel({
  addDashboardCalculatorItem,
  adjustDashboardCalculatorQuantity,
  dashboardCalculatorCopiedKey,
  dashboardCalculatorItems,
  dashboardGrandTotalHt,
  dashboardGrandTotalTtc,
  dashboardProductsTotalHt,
  dashboardProductsTotalTtc,
  dashboardShippingTotalHt,
  dashboardShippingTotalTtc,
  handleCopyDashboardAmount,
  removeDashboardCalculatorItem,
  title,
  updateDashboardCalculatorItem,
}: CalculatorPanelProps) {
  return (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--calculator">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-calculator">
        <div className="dashboard-calculator__scroll">
          <div className="dashboard-calculator__list">
            {dashboardCalculatorItems.map((item, index) => (
              <div className="dashboard-calculator__item" key={item.id}>
                <div className="dashboard-calculator__item-grid">
                  <span className="dashboard-calculator__item-index">{index + 1}</span>
                  <div
                    className="dashboard-calculator__quantity"
                    aria-label={`Quantité ligne ${index + 1}`}
                  >
                    <button
                      className="dashboard-calculator__quantity-btn"
                      type="button"
                      title="Réduire la quantité"
                      aria-label={`Réduire la quantité ligne ${index + 1}`}
                      onClick={() => adjustDashboardCalculatorQuantity(item.id, -1)}
                      disabled={getDashboardCalculatorQuantity(item.quantity) <= 1}
                    >
                      -
                    </button>
                    <span className="dashboard-calculator__quantity-value">
                      x{getDashboardCalculatorQuantity(item.quantity)}
                    </span>
                    <button
                      className="dashboard-calculator__quantity-btn"
                      type="button"
                      title="Augmenter la quantité"
                      aria-label={`Augmenter la quantité ligne ${index + 1}`}
                      onClick={() => adjustDashboardCalculatorQuantity(item.id, 1)}
                      disabled={getDashboardCalculatorQuantity(item.quantity) >= 99}
                    >
                      +
                    </button>
                  </div>
                  <label className="dashboard-calculator__field dashboard-calculator__field--inline">
                    <span className="dashboard-calculator__label">Produit</span>
                    <input
                      className="input"
                      value={item.productPrice}
                      onChange={(event) =>
                        updateDashboardCalculatorItem(item.id, 'productPrice', event.target.value)
                      }
                      placeholder="119,99"
                      inputMode="decimal"
                      aria-label={`Produit ligne ${index + 1}`}
                    />
                  </label>
                  <label className="dashboard-calculator__field dashboard-calculator__field--inline">
                    <span className="dashboard-calculator__label">Livraison</span>
                    <input
                      className="input"
                      value={item.shippingPrice}
                      onChange={(event) =>
                        updateDashboardCalculatorItem(item.id, 'shippingPrice', event.target.value)
                      }
                      placeholder="14,99"
                      inputMode="decimal"
                      aria-label={`Livraison ligne ${index + 1}`}
                    />
                  </label>
                  <label className="dashboard-calculator__field dashboard-calculator__field--inline">
                    <span className="dashboard-calculator__label">Import</span>
                    <input
                      className="input"
                      value={item.importFee}
                      onChange={(event) =>
                        updateDashboardCalculatorItem(item.id, 'importFee', event.target.value)
                      }
                      placeholder="0,00"
                      inputMode="decimal"
                      aria-label={`Frais d'import ligne ${index + 1}`}
                    />
                  </label>
                  <button
                    className="icon-btn-sm danger dashboard-calculator__remove"
                    type="button"
                    title="Supprimer cette ligne"
                    onClick={() => removeDashboardCalculatorItem(item.id)}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn btn--ghost btn--small btn--with-icon dashboard-calculator__add"
            type="button"
            onClick={addDashboardCalculatorItem}
          >
            <ButtonIcon name="add" />
            Ajouter une ligne
          </button>
        </div>

        <div className="dashboard-calculator__results">
          <div className="dashboard-calculator__result">
            <div className="dashboard-calculator__result-head">
              <span className="dashboard-calculator__result-label">Produits</span>
            </div>
            <div className="dashboard-calculator__result-values">
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ht">
                <span className="dashboard-calculator__result-sub-label">HT</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardProductsTotalHt)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'productsHt' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total produits HT"
                    aria-label="Copier le total produits HT"
                    onClick={() =>
                      void handleCopyDashboardAmount('productsHt', dashboardProductsTotalHt)
                    }
                  >
                    <CopyIcon />
                  </button>
                </div>
              </div>
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ttc">
                <span className="dashboard-calculator__result-sub-label">TTC</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardProductsTotalTtc)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'productsTtc' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total produits TTC"
                    aria-label="Copier le total produits TTC"
                    onClick={() =>
                      void handleCopyDashboardAmount('productsTtc', dashboardProductsTotalTtc)
                    }
                  >
                    <CopyIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-calculator__result">
            <div className="dashboard-calculator__result-head">
              <span className="dashboard-calculator__result-label">Livraison</span>
            </div>
            <div className="dashboard-calculator__result-values">
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ht">
                <span className="dashboard-calculator__result-sub-label">HT</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardShippingTotalHt)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'shippingHt' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total livraison HT"
                    aria-label="Copier le total livraison HT"
                    onClick={() =>
                      void handleCopyDashboardAmount('shippingHt', dashboardShippingTotalHt)
                    }
                  >
                    <CopyIcon />
                  </button>
                </div>
              </div>
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ttc">
                <span className="dashboard-calculator__result-sub-label">TTC</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardShippingTotalTtc)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'shippingTtc' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total livraison TTC"
                    aria-label="Copier le total livraison TTC"
                    onClick={() =>
                      void handleCopyDashboardAmount('shippingTtc', dashboardShippingTotalTtc)
                    }
                  >
                    <CopyIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-calculator__result dashboard-calculator__result--total">
            <div className="dashboard-calculator__result-head">
              <span className="dashboard-calculator__result-label">Total</span>
            </div>
            <div className="dashboard-calculator__result-values">
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ht">
                <span className="dashboard-calculator__result-sub-label">HT</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardGrandTotalHt)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'totalHt' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total HT"
                    aria-label="Copier le total HT"
                    onClick={() => void handleCopyDashboardAmount('totalHt', dashboardGrandTotalHt)}
                  >
                    <CopyIcon />
                  </button>
                </div>
              </div>
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ttc">
                <span className="dashboard-calculator__result-sub-label">TTC</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardGrandTotalTtc)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'totalTtc' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total TTC"
                    aria-label="Copier le total TTC"
                    onClick={() => void handleCopyDashboardAmount('totalTtc', dashboardGrandTotalTtc)}
                  >
                    <CopyIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
