// Settings › Noms de produits: CRM name to the name used in mails.
import { ButtonIcon, DeleteIcon } from '../../components/AppIcons'
import type { CaseContext } from '../../context/caseContext'
import type { ProductAlias } from '../../context/productAliases'
import type { CaseContextState } from '../../hooks/useCaseContext'
import { createId } from '../../lib/utils'

export interface ProductAliasesSettingsProps {
  activeCase: CaseContext | null
  caseContextState: CaseContextState
  productAliases: ProductAlias[]
  updateProductAliases: (next: ProductAlias[]) => void
}

export function ProductAliasesSettings({
  activeCase,
  caseContextState,
  productAliases,
  updateProductAliases,
}: ProductAliasesSettingsProps) {
  return (
    <div className="settings-page settings-page--narrow">
      <section className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title">Correspondances ({productAliases.length})</div>
          <div className="settings-option__actions">
            {caseContextState.context?.fields.productName?.value &&
            !activeCase?.fields.productName?.aliasOf ? (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                title="Ajoute une ligne avec le nom du produit du dossier actif"
                onClick={() =>
                  updateProductAliases([
                    ...productAliases,
                    {
                      id: createId('product-alias'),
                      crm: caseContextState.context?.fields.productName?.value ?? '',
                      alias: '',
                    },
                  ])
                }
              >
                Produit du dossier actif
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--small btn--with-icon"
              onClick={() => updateProductAliases([...productAliases, { id: createId('product-alias'), crm: '', alias: '' }])}
            >
              <ButtonIcon name="add" />
              Ajouter
            </button>
          </div>
        </div>
        <div className="list-card__body">
          <p className="settings-page__intro">
            Le nom du CRM est reconnu même avec des majuscules ou des espaces différents. S’il n’y a pas
            de nom identique, la ligne dont le nom CRM est contenu dans le produit (la plus longue) est utilisée.
          </p>
          {productAliases.length ? (
            <table className="case-tags product-aliases">
              <thead>
                <tr>
                  <th>Nom dans le CRM</th>
                  <th>Nom dans les mails</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {productAliases.map((item: ProductAlias) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        className="input"
                        value={item.crm}
                        placeholder="Thrustmaster T598 Racing Wheel…"
                        aria-label="Nom dans le CRM"
                        onChange={(event) =>
                          updateProductAliases(
                            productAliases.map((other) =>
                              other.id === item.id ? { ...other, crm: event.target.value } : other,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={item.alias}
                        placeholder="T598"
                        aria-label="Nom dans les mails"
                        onChange={(event) =>
                          updateProductAliases(
                            productAliases.map((other) =>
                              other.id === item.id ? { ...other, alias: event.target.value } : other,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="icon-btn-sm danger"
                        type="button"
                        title="Supprimer"
                        onClick={() =>
                          updateProductAliases(productAliases.filter((other) => other.id !== item.id))
                        }
                      >
                        <DeleteIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">Aucune correspondance. Les noms du CRM sont utilisés tels quels.</div>
          )}
        </div>
      </section>
    </div>
  )
}
