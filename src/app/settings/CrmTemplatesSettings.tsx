// Settings › Modèles du CRM: the harvested index, folded into families.
import { useMemo, useState } from 'react'
import type { CrmTemplateFamily } from '../../lib/crmTemplates'
import type { useCrmTemplates } from '../../hooks/useCrmTemplates'

export interface CrmTemplatesSettingsProps {
  templates: ReturnType<typeof useCrmTemplates>
  setToast: (message: string) => void
  // Asks for the index now, instead of waiting for the next case push.
  // Absent outside the installed app, where there is no bridge.
  onHarvest?: () => void
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR')
}

const variantSummary = (family: CrmTemplateFamily) => {
  const languages = [...new Set(family.variants.map((variant) => variant.language))].sort()
  const brands = [...new Set(family.variants.map((variant) => variant.brand))].sort()
  const zones = [...new Set(family.variants.flatMap((variant) => variant.zones))].sort()
  return { languages, brands, zones }
}

export function CrmTemplatesSettings({ templates, setToast, onHarvest }: CrmTemplatesSettingsProps) {
  const { available, state, index, clear } = templates
  const [filter, setFilter] = useState('')

  const families = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return index.families
    return index.families.filter((family) => family.label.toLowerCase().includes(needle))
  }, [filter, index.families])

  if (!available) {
    return (
      <div className="settings-page settings-page--narrow">
        <div className="empty-state">Les modèles du CRM ne sont disponibles que dans l’application installée.</div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="settings-page settings-page--narrow">
        <section className="list-card">
          <div className="list-card__header">
            <div className="list-card__title">Modèles du CRM</div>
          </div>
          <div className="list-card__body">
            <p className="settings-option__desc">
              Aucun index pour le moment. Agentor le demande à Agentor Bridge au prochain dossier ouvert dans le CRM :
              l’extension lit alors les titres des modèles de requête et les envoie ici. Seuls les titres sont gardés,
              jamais le contenu des mails.
            </p>
            {onHarvest ? (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                title="Demande les titres tout de suite à l’onglet CRM ouvert."
                onClick={onHarvest}
              >
                Moissonner maintenant
              </button>
            ) : null}
          </div>
        </section>
      </div>
    )
  }

  const total = state.entries.length

  return (
    <div className="settings-page settings-page--narrow">
      <section className="list-card">
        <div className="list-card__header">
          <div className="list-card__title">
            {total} modèles · {index.families.length} familles
          </div>
          <div className="list-card__header-actions">
            {onHarvest ? (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                title="Relit les titres tout de suite dans l’onglet CRM ouvert."
                onClick={onHarvest}
              >
                Moissonner
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--ghost btn--small"
              title="L’index est redemandé au prochain dossier ouvert dans le CRM."
              onClick={() => {
                void clear()
                setToast('Index oublié. Il sera remoissonné au prochain dossier.')
              }}
            >
              Oublier
            </button>
          </div>
        </div>
        <div className="list-card__body">
          <p className="settings-option__desc">
            Moissonné le {formatDate(state.fetchedAt)} sur {state.org || '—'}. Les titres seuls sont gardés ; les corps
            restent dans le CRM, qui les fusionne avec le dossier au moment de les utiliser.
          </p>
          <input
            className="text-input"
            type="search"
            value={filter}
            placeholder="Filtrer les familles"
            aria-label="Filtrer les familles"
            onChange={(event) => setFilter(event.target.value)}
          />
          <ul className="crm-templates">
            {families.map((family) => {
              const { languages, brands, zones } = variantSummary(family)
              return (
                <li key={family.key} className="crm-templates__row">
                  <div className="crm-templates__label">
                    {family.logistics ? <span className="crm-templates__badge">LOG</span> : null}
                    {family.label}
                  </div>
                  <div className="crm-templates__meta">
                    <span>{brands.join(' ')}</span>
                    <span>{languages.join(' ')}</span>
                    <span>{zones.length ? zones.join(' ') : '—'}</span>
                    <span className="crm-templates__count">{family.variants.length}</span>
                  </div>
                </li>
              )
            })}
            {!families.length ? <li className="crm-templates__row">Aucune famille ne correspond.</li> : null}
          </ul>
        </div>
      </section>

      {index.unclassified.length ? (
        <section className="list-card">
          <div className="list-card__header">
            <div className="list-card__title">{index.unclassified.length} non classés</div>
          </div>
          <div className="list-card__body">
            <p className="settings-option__desc">
              Ces titres ne suivent pas la convention « marque · langue · zone ». Ils restent listés, et choisissables à
              la main : rien n’est deviné à leur sujet.
            </p>
            <ul className="crm-templates">
              {index.unclassified.map((entry) => (
                <li key={entry.id} className="crm-templates__row">
                  <div className="crm-templates__label">{entry.title}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  )
}
