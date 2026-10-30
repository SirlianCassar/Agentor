// Price calculator, top to bottom: one card per product, the extra fees added
// when needed, then the totals with and without VAT.
import { ButtonIcon, CopyIcon, DeleteIcon } from '../../components/AppIcons'
import {
  type DashboardCalculatorCopyKey,
  type DashboardCalculatorFee,
  type DashboardCalculatorItem,
  type DashboardCalculatorPriceField,
  type DashboardCalculatorTotals,
  getDashboardCalculatorQuantity,
} from '../../lib/calculator'
import { formatEuroAmount } from '../../lib/formatting'

export interface CalculatorPanelProps {
  title: string
  items: DashboardCalculatorItem[]
  fees: DashboardCalculatorFee[]
  totals: DashboardCalculatorTotals
  copiedKey: DashboardCalculatorCopyKey | null
  onAddItem: () => void
  onUpdateItem: (id: string, field: DashboardCalculatorPriceField, value: string) => void
  onAdjustQuantity: (id: string, delta: number) => void
  onRemoveItem: (id: string) => void
  onAddFee: (label?: string) => void
  onUpdateFee: (id: string, field: 'label' | 'amount', value: string) => void
  onRemoveFee: (id: string) => void
  onCopy: (key: DashboardCalculatorCopyKey, value: number) => Promise<void>
}

// Fees offered in one click; any other can be typed.
const feeSuggestions = ['Réparation', 'Frais de dossier', 'Retour']

const priceFields: Array<{ field: DashboardCalculatorPriceField; label: string; placeholder: string }> = [
  { field: 'productPrice', label: 'Prix TTC', placeholder: '119,99' },
  { field: 'shippingPrice', label: 'Livraison', placeholder: '14,99' },
  { field: 'importFee', label: 'Import', placeholder: '0,00' },
]

export function CalculatorPanel({
  title,
  items,
  fees,
  totals,
  copiedKey,
  onAddItem,
  onUpdateItem,
  onAdjustQuantity,
  onRemoveItem,
  onAddFee,
  onUpdateFee,
  onRemoveFee,
  onCopy,
}: CalculatorPanelProps) {
  const amount = (key: DashboardCalculatorCopyKey, value: number, label: string) => (
    <button
      type="button"
      className={`calc-amount${copiedKey === key ? ' is-copied' : ''}`}
      title={`Copier ${label}`}
      aria-label={`Copier ${label}`}
      onClick={() => void onCopy(key, value)}
    >
      <strong>{formatEuroAmount(value)}</strong>
      <CopyIcon />
    </button>
  )
  const resultRow = (label: string, ht: number, ttc: number, keys: [DashboardCalculatorCopyKey, DashboardCalculatorCopyKey], total = false) => (
    <div className={`calc-result${total ? ' calc-result--total' : ''}`}>
      <span className="calc-result__label">{label}</span>
      <span className="calc-result__cell">
        <small>HT</small>
        {amount(keys[0], ht, `${label.toLowerCase()} HT`)}
      </span>
      <span className="calc-result__cell">
        <small>TTC</small>
        {amount(keys[1], ttc, `${label.toLowerCase()} TTC`)}
      </span>
    </div>
  )

  return (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--calculator">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="calc">
        <div className="calc__scroll">
          <section className="calc__section" aria-label="Produits">
            <div className="calc__section-title">Produits</div>
            {items.map((item, index) => {
              const quantity = getDashboardCalculatorQuantity(item.quantity)
              return (
                <div className="calc-card" key={item.id}>
                  <div className="calc-card__head">
                    <span className="calc-card__index">Produit {index + 1}</span>
                    <div className="calc-card__quantity" aria-label={`Quantité ligne ${index + 1}`}>
                      <button
                        type="button"
                        title="Réduire la quantité"
                        aria-label={`Réduire la quantité ligne ${index + 1}`}
                        disabled={quantity <= 1}
                        onClick={() => onAdjustQuantity(item.id, -1)}
                      >
                        −
                      </button>
                      <span>×{quantity}</span>
                      <button
                        type="button"
                        title="Augmenter la quantité"
                        aria-label={`Augmenter la quantité ligne ${index + 1}`}
                        disabled={quantity >= 99}
                        onClick={() => onAdjustQuantity(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="calc-card__remove"
                      type="button"
                      title="Supprimer ce produit"
                      aria-label={`Supprimer le produit ${index + 1}`}
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                  {priceFields.map(({ field, label, placeholder }) => (
                    <label className="calc-field" key={field}>
                      <span className="calc-field__label">{label}</span>
                      <input
                        className="input calc-field__input"
                        value={item[field]}
                        onChange={(event) => onUpdateItem(item.id, field, event.target.value)}
                        placeholder={placeholder}
                        inputMode="decimal"
                        aria-label={`${field === 'importFee' ? "Frais d'import" : field === 'shippingPrice' ? 'Livraison' : 'Produit'} ligne ${index + 1}`}
                      />
                      <span className="calc-field__unit">€</span>
                    </label>
                  ))}
                </div>
              )
            })}
            <button className="btn btn--ghost btn--small btn--with-icon calc__add" type="button" onClick={onAddItem}>
              <ButtonIcon name="add" />
              Ajouter un produit
            </button>
          </section>

          <section className="calc__section" aria-label="Frais">
            <div className="calc__section-title">Frais</div>
            {fees.map((fee, index) => (
              <div className="calc-fee" key={fee.id}>
                <input
                  className="input calc-fee__label"
                  value={fee.label}
                  onChange={(event) => onUpdateFee(fee.id, 'label', event.target.value)}
                  placeholder="Nom des frais"
                  aria-label={`Nom des frais ${index + 1}`}
                />
                <input
                  className="input calc-fee__amount"
                  value={fee.amount}
                  onChange={(event) => onUpdateFee(fee.id, 'amount', event.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  aria-label={`Montant des frais ${index + 1}`}
                />
                <span className="calc-field__unit">€</span>
                <button
                  className="calc-card__remove"
                  type="button"
                  title="Retirer ces frais"
                  aria-label={`Retirer les frais ${index + 1}`}
                  onClick={() => onRemoveFee(fee.id)}
                >
                  <DeleteIcon />
                </button>
              </div>
            ))}
            <div className="calc__fee-actions">
              <button className="btn btn--ghost btn--small btn--with-icon calc__add" type="button" onClick={() => onAddFee()}>
                <ButtonIcon name="add" />
                Ajouter des frais
              </button>
              {feeSuggestions.map((label) => (
                <button key={label} type="button" className="calc__suggestion" onClick={() => onAddFee(label)}>
                  + {label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="calc__results" aria-label="Totaux">
          {resultRow('Produits', totals.productsHt, totals.productsTtc, ['productsHt', 'productsTtc'])}
          {resultRow('Livraison', totals.shippingHt, totals.shippingTtc, ['shippingHt', 'shippingTtc'])}
          {fees.length ? resultRow('Frais', totals.feesHt, totals.feesTtc, ['feesHt', 'feesTtc']) : null}
          {resultRow('Total', totals.totalHt, totals.totalTtc, ['totalHt', 'totalTtc'], true)}
          <p className="calc__rule">Livraison : la plus chère en entier, les suivantes à moitié prix.</p>
        </section>
      </div>
    </article>
  )
}
