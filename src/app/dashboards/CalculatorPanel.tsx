// Price calculator, top to bottom: one card per spare part (price, Standard
// and Express shipping, import fee), the extra fees added when needed, then
// the totals with and without VAT for each shipping option.
import type { ClipboardEvent } from 'react'
import { ButtonIcon, CopyIcon, DeleteIcon } from '../../components/AppIcons'
import {
  DASHBOARD_CALCULATOR_SHIPPING_OPTIONS,
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
  // Reads the clipboard and fills a part from a Cairm Portal copy.
  onPasteFromPortal: () => void
  // Text pasted into a part's field; true when it was a Portal copy and filled the part.
  onPasteTextIntoItem: (text: string, id: string) => boolean
}

const priceFields: Array<{ field: DashboardCalculatorPriceField; label: string; aria: string; placeholder: string }> = [
  { field: 'productPrice', label: 'Prix TTC', aria: 'Prix de la pièce', placeholder: '19,99' },
  { field: 'standardShipping', label: 'Standard', aria: 'Livraison standard', placeholder: '6,90' },
  { field: 'expressShipping', label: 'Express', aria: 'Livraison express', placeholder: '19,90' },
  { field: 'importFee', label: 'Import', aria: "Frais d'import", placeholder: '0,00' },
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
  onUpdateFee,
  onRemoveFee,
  onCopy,
  onPasteFromPortal,
  onPasteTextIntoItem,
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
  const resultRow = (
    label: string,
    copyLabel: string,
    ht: number,
    ttc: number,
    keys: [DashboardCalculatorCopyKey, DashboardCalculatorCopyKey],
    total = false,
  ) => (
    <div className={`calc-result${total ? ' calc-result--total' : ''}`}>
      <span className="calc-result__label">{label}</span>
      <span className="calc-result__cell">
        <small>HT</small>
        {amount(keys[0], ht, `${copyLabel} HT`)}
      </span>
      <span className="calc-result__cell">
        <small>TTC</small>
        {amount(keys[1], ttc, `${copyLabel} TTC`)}
      </span>
    </div>
  )
  const pasteIntoItem = (id: string) => (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text/plain')
    if (text.includes('\n') && onPasteTextIntoItem(text, id)) event.preventDefault()
  }

  return (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--calculator">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="calc">
        <div className="calc__scroll">
          <section className="calc__section" aria-label="Pièces">
            <div className="calc__section-head">
              <span className="calc__section-title">Pièces</span>
              <button
                className="btn btn--ghost btn--small btn--with-icon calc__paste"
                type="button"
                title="Remplir une pièce avec le prix copié dans Portal (bouton copier de Cairm)"
                onClick={onPasteFromPortal}
              >
                <ButtonIcon name="portal" />
                Coller depuis Portal
              </button>
            </div>
            {items.map((item, index) => {
              const quantity = getDashboardCalculatorQuantity(item.quantity)
              const name = item.partName.trim()
              const sku = item.sku.trim()
              return (
                <div className="calc-card" key={item.id}>
                  <div className="calc-card__head">
                    <span className="calc-card__index" title={name || undefined}>
                      <span className="calc-card__name">{name || `Pièce ${index + 1}`}</span>
                      {sku ? <small className="calc-card__sku">{sku}</small> : null}
                    </span>
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
                      title="Supprimer cette pièce"
                      aria-label={`Supprimer la pièce ${index + 1}`}
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                  <div className="calc-card__fields">
                    {priceFields.map(({ field, label, aria, placeholder }) => (
                      <label className="calc-field" key={field}>
                        <span className="calc-field__label">{label}</span>
                        <input
                          className="input calc-field__input"
                          value={item[field]}
                          onChange={(event) => onUpdateItem(item.id, field, event.target.value)}
                          onPaste={pasteIntoItem(item.id)}
                          placeholder={placeholder}
                          inputMode="decimal"
                          aria-label={`${aria} ligne ${index + 1}`}
                        />
                        <span className="calc-field__unit">€</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
            <button className="btn btn--ghost btn--small btn--with-icon calc__add" type="button" onClick={onAddItem}>
              <ButtonIcon name="add" />
              Ajouter une pièce
            </button>
          </section>

          {fees.length > 0 ? <section className="calc__section" aria-label="Frais">
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
          </section> : null}
        </div>

        <section className="calc__results" aria-label="Totaux">
          {resultRow('Pièces', 'pièces', totals.productsHt, totals.productsTtc, ['productsHt', 'productsTtc'])}
          {fees.length ? resultRow('Frais', 'frais', totals.feesHt, totals.feesTtc, ['feesHt', 'feesTtc']) : null}
          <div className="calc-options">
            {DASHBOARD_CALCULATOR_SHIPPING_OPTIONS.map(({ option, label }) => {
              const optionTotals = totals[option]
              const lower = label.toLowerCase()
              return (
                <div className={`calc-option calc-option--${option}`} key={option} aria-label={`Livraison ${lower}`}>
                  <div className="calc-option__title">
                    <span>
                      Livraison {lower}
                      {totals.hasImportFee ? <em> · import inclus</em> : null}
                    </span>
                    {optionTotals.incomplete ? (
                      <small className="calc-option__warning" title={`Une pièce n'a pas de prix de livraison ${lower}.`}>
                        Prix manquant
                      </small>
                    ) : null}
                  </div>
                  {resultRow(
                    'Livraison',
                    `livraison ${lower}`,
                    optionTotals.shippingHt,
                    optionTotals.shippingTtc,
                    [`${option}ShippingHt`, `${option}ShippingTtc`],
                  )}
                  {resultRow(
                    'Total',
                    `total ${lower}`,
                    optionTotals.totalHt,
                    optionTotals.totalTtc,
                    [`${option}TotalHt`, `${option}TotalTtc`],
                    true,
                  )}
                </div>
              )
            })}
          </div>
          <p className="calc__rule">
            Livraison : la plus chère en entier, les suivantes à moitié prix
            {totals.hasImportFee ? ", frais d'import inclus" : ''}.
          </p>
        </section>
      </div>
    </article>
  )
}
