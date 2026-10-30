// Settings › Liens rapides.
import { quickLinks } from '../../lib/constants'

export interface QuickLinksSettingsProps {
  quickLinkUrls: Record<string, string>
  resetQuickLinkUrl: (id: string) => void
  updateQuickLinkUrl: (id: string, url: string) => void
}

export function QuickLinksSettings({
  quickLinkUrls,
  resetQuickLinkUrl,
  updateQuickLinkUrl,
}: QuickLinksSettingsProps) {
  return (
    <div className="modal__grid modal__grid--single">
      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title-group">
            <div className="list-card__title">Configuration</div>
          </div>
        </div>
        <div className="list-card__body">
          <div className="settings-block quick-link-editor-list">
            {quickLinks.map((link) => {
              const configuredUrl =
                typeof quickLinkUrls?.[link.id] === 'string'
                  ? quickLinkUrls[link.id]
                  : link.defaultUrl
              const isDefault = configuredUrl.trim() === link.defaultUrl

              return (
                <section className="quick-link-editor" key={link.id}>
                  <div className="quick-link-editor__head">
                    <div className="quick-link-editor__identity">
                      <img src={link.icon} alt="" width={22} height={22} />
                        <div>
                        <div className="quick-link-editor__title">{link.label}</div>
                        <div className="quick-link-editor__meta">Accès rapide</div>
                      </div>
                    </div>
                    <button
                      className="btn btn--ghost btn--small"
                      type="button"
                      disabled={isDefault}
                      onClick={() => resetQuickLinkUrl(link.id)}
                    >
                      Réinitialiser
                    </button>
                  </div>
                  <input
                    className="input"
                    value={configuredUrl}
                    placeholder={link.defaultUrl}
                    onChange={(event) =>
                      updateQuickLinkUrl(link.id, event.target.value)
                    }
                  />
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
