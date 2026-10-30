// Settings › SKU’s and their guides.
import type { Dispatch, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon, MoveIcon } from '../../components/AppIcons'
import { SortableList } from '../../components/SortableList'
import type { ProductCatalogItem, SparePart } from '../../lib/types'

export interface SparePartsSettingsProps {
  addProductDraftSparePart: () => void
  getEmptyProductDraft: () => ProductCatalogItem
  getProductCatalogDraft: (product: ProductCatalogItem) => ProductCatalogItem
  handleReorderProductCatalog: (next: ProductCatalogItem[]) => void
  handleReorderProductDraftSpareParts: (next: SparePart[]) => void
  handleSaveProductCatalogItem: () => void
  isProductCatalogSelectionEmpty: boolean
  productDraft: ProductCatalogItem
  productsSorted: ProductCatalogItem[]
  removeProductDraftSparePart: (sparePartId: string) => void
  selectedProductCatalogId: string | null
  setProductDraft: Dispatch<SetStateAction<ProductCatalogItem>>
  setProductTagsDraftText: Dispatch<SetStateAction<string>>
  setSelectedProductCatalogId: Dispatch<SetStateAction<string | null>>
  updateProductDraftSparePart: (sparePartId: string, patch: Partial<SparePart>) => void
}

export function SparePartsSettings({
  addProductDraftSparePart,
  getEmptyProductDraft,
  getProductCatalogDraft,
  handleReorderProductCatalog,
  handleReorderProductDraftSpareParts,
  handleSaveProductCatalogItem,
  isProductCatalogSelectionEmpty,
  productDraft,
  productsSorted,
  removeProductDraftSparePart,
  selectedProductCatalogId,
  setProductDraft,
  setProductTagsDraftText,
  setSelectedProductCatalogId,
  updateProductDraftSparePart,
}: SparePartsSettingsProps) {
  return (
    <div className="modal__grid">
      <div className="list-card">
        <div className="list-card__header list-card__header--wrap">
          <div className="list-card__title-group">
            <div className="list-card__title">Groupes SKU</div>
          </div>
          <button
            className="btn btn--ghost btn--small btn--with-icon"
            type="button"
            onClick={() => {
              setProductDraft(getEmptyProductDraft())
              setProductTagsDraftText('')
              setSelectedProductCatalogId('new')
            }}
          >
            <ButtonIcon name="add" />
            Nouveau groupe
          </button>
        </div>
        <div className="list-card__body">
          {productsSorted.length ? (
            <SortableList
              items={productsSorted}
              getId={(item) => item.id}
              onReorder={handleReorderProductCatalog}
              renderItem={(product, handleProps) => (
                <div
                  key={product.id}
                  className={`list-item list-item--compact${
                    selectedProductCatalogId === product.id ? ' is-selected' : ''
                  }`}
                  onClick={() => {
                    setProductDraft(getProductCatalogDraft(product))
                    setProductTagsDraftText((product.tags ?? []).join(', '))
                    setSelectedProductCatalogId(product.id)
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
                    <div className="list-item__title">{product.name}</div>
                    <div className="list-item__meta">
                      {product.spareParts.length} SKU
                      {product.spareParts.length > 1 ? 's' : ''} • Guide{' '}
                      {product.packingGuideAvailable ? 'disponible' : 'indisponible'}
                    </div>
                  </div>
                </div>
              )}
            />
          ) : (
            <div className="empty-state">Aucun groupe SKU configuré.</div>
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
              className="btn btn--ghost btn--small"
              type="button"
              onClick={addProductDraftSparePart}
              disabled={isProductCatalogSelectionEmpty}
            >
              <ButtonIcon name="add" />
              Ajouter un SKU
            </button>
            <button
              className="btn btn--primary btn--small btn--with-icon"
              type="button"
              onClick={handleSaveProductCatalogItem}
              disabled={isProductCatalogSelectionEmpty}
            >
              <ButtonIcon name="save" />
              Sauver
            </button>
          </div>
        </div>
        <div className="list-card__body">
          {isProductCatalogSelectionEmpty ? (
            <div className="empty-state">
              Sélectionnez ou créez un groupe SKU.
            </div>
          ) : (
            <div className="spare-parts-editor">
              <input
                className="input"
                placeholder="Nom du groupe SKU"
                value={productDraft.name}
                onChange={(event) =>
                  setProductDraft((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
              <label className="portal-code-editor__check spare-parts-editor__product-guide">
                <input
                  type="checkbox"
                  checked={Boolean(productDraft.packingGuideAvailable)}
                  onChange={(event) =>
                    setProductDraft((prev) => ({
                      ...prev,
                      packingGuideAvailable: event.target.checked,
                    }))
                  }
                />
                <span>Guide disponible pour ce groupe</span>
              </label>
              {productDraft.spareParts.length ? (
                <SortableList
                  items={productDraft.spareParts}
                  getId={(item) => item.id}
                  onReorder={handleReorderProductDraftSpareParts}
                  renderItem={(sparePart, handleProps) => (
                    <article className="spare-parts-editor__item" key={sparePart.id}>
                      <div className="spare-parts-editor__head">
                        <button title="Déplacer"
                          className="drag-handle"
                          type="button"
                          {...handleProps.attributes}
                          {...handleProps.listeners}
                        >
                          <MoveIcon />
                        </button>
                      </div>
                      <div className="form__row two">
                        <input
                          className="input"
                          placeholder="Nom"
                          value={sparePart.name}
                          onChange={(event) =>
                            updateProductDraftSparePart(sparePart.id, {
                              name: event.target.value,
                            })
                          }
                        />
                        <input
                          className="input"
                          placeholder="SKU"
                          value={sparePart.sku}
                          onChange={(event) =>
                            updateProductDraftSparePart(sparePart.id, {
                              sku: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="spare-parts-editor__footer">
                        <label className="portal-code-editor__check">
                          <input
                            type="checkbox"
                            checked={sparePart.guideAvailable}
                            onChange={(event) =>
                              updateProductDraftSparePart(sparePart.id, {
                                guideAvailable: event.target.checked,
                              })
                            }
                          />
                          <span>Guide disponible</span>
                        </label>
                        <button
                          className="icon-btn-sm danger"
                          type="button"
                          title="Supprimer"
                          onClick={() => removeProductDraftSparePart(sparePart.id)}
                        >
                  <DeleteIcon />
                        </button>
                      </div>
                    </article>
                  )}
                />
              ) : (
                <div className="empty-state">
                  Aucun SKU dans ce groupe.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
