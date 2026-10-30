// Centre column: Troubleshotgun and call buttons, quick links, mail editor,
// dashboard launcher.
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import { DeleteIcon } from '../../components/AppIcons'
import { TextEditor, type TextEditorHandle } from '../../components/TextEditor'
import { UiIcon } from '../../components/UiIcon'
import type { AppData, InsertMode } from '../../lib/types'
import { dashboardWindowOptions } from '../appShared'

export interface MailWorkspaceProps {
  clearArmed: boolean
  data: AppData
  emailClearPulse: boolean
  emailCopied: boolean
  emailCopyPulse: boolean
  emailEditorRef: RefObject<TextEditorHandle>
  emailTags: number
  handleClearEmail: () => void
  handleCopyEmail: () => Promise<void>
  mailInsertMode: InsertMode
  mailInsertModeLabel: 'À la ligne' | 'Au curseur'
  openCallModal: () => void
  openLink: (url: string) => void
  openTroubleshootgun: () => void
  renderDashboardWindowButton: (option: (typeof dashboardWindowOptions)[number]) => JSX.Element
  resolvedQuickLinks: { url: string; id: string; label: string; icon: string; defaultUrl: string; }[]
  setEmailClearPulse: Dispatch<SetStateAction<boolean>>
  setEmailCopyPulse: Dispatch<SetStateAction<boolean>>
  triggerPulse: (setPulse: (value: boolean) => void) => void
  updateEmailDraft: (next: string, cursor?: number) => void
  // Search over the mail and Troubleshotgun templates.
  search?: ReactNode
}

export function MailWorkspace({
  clearArmed,
  data,
  emailClearPulse,
  emailCopied,
  emailCopyPulse,
  emailEditorRef,
  emailTags,
  handleClearEmail,
  handleCopyEmail,
  mailInsertMode,
  mailInsertModeLabel,
  openCallModal,
  openLink,
  openTroubleshootgun,
  renderDashboardWindowButton,
  resolvedQuickLinks,
  setEmailClearPulse,
  setEmailCopyPulse,
  triggerPulse,
  updateEmailDraft,
  search,
}: MailWorkspaceProps) {
  return (
    <main className="workspace">
      <header className="workspace-head">
        <p className="workspace-title">
          <UiIcon name="mail" className="workspace-title__icon" />
          <span>Compose</span>
        </p>
        <div className="workspace-head__actions">
          <div className="template-controls">
            {search}
            <div className="troubleshootgun-menu-wrap">
              <button
                className="btn btn--ghost troubleshootgun-menu-btn"
                type="button"
                onClick={openTroubleshootgun}
                title="Troubleshotgun — templates par produit"
                aria-label="Ouvrir Troubleshotgun"
              >
                <UiIcon name="target" />
                <span>Troubleshotgun</span>
              </button>
            </div>
            <button
              className="btn btn--ghost call-trigger-btn"
              type="button"
              title="Appel téléphonique"
              aria-label="Appel téléphonique"
              onClick={openCallModal}
            >
              <UiIcon name="phone" className="call-trigger-btn__icon" />
            </button>
          </div>
          <div className="quick-links-inline">
            {resolvedQuickLinks.map((link) => (
              <button
                key={link.id}
                className="quick-link"
                title={link.label}
                aria-label={link.label}
                onClick={() => openLink(link.url)}
              >
                <img src={link.icon} alt={link.label} width={22} height={22} />
                <span className="quick-link-label">{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="workspace-content">
        <section className="composer">
          <TextEditor
            ref={emailEditorRef}
            value={data.emailDraft}
            onChange={(value) => updateEmailDraft(value)}
            placeholder="Rédigez votre email..."
            className={`editor--email editor--email--${mailInsertMode}`}
          />
          <div className="composer-actions">
            <div className="composer-actions__left">
              <nav className="window-launcher" aria-label="Dashboards">
                {dashboardWindowOptions.map((option) => renderDashboardWindowButton(option))}
              </nav>
            </div>
            <div className="actions">
              <span
                className={`composer-insert-mode composer-insert-mode--${mailInsertMode}`}
                title="Clic droit dans l’éditeur mail pour changer le mode d’insertion"
              >
                {mailInsertModeLabel}
              </span>
              <button
                className={`primary copy-btn${emailCopied ? ' is-success' : ''}${
                  emailCopyPulse ? ' btn-pulse' : ''
                }${emailTags ? ' has-tag-warning' : ''}`}
                onClick={() => {
                  triggerPulse(setEmailCopyPulse)
                  void handleCopyEmail()
                }}
                onAnimationEnd={() => setEmailCopyPulse(false)}
              >
                {emailCopied ? 'Copié !' : 'Copy Email'}
              </button>
              <button
                className={`ghost clear-btn${clearArmed ? ' confirm' : ''}${
                  emailClearPulse ? ' btn-pulse' : ''
                }`}
                type="button"
                onClick={() => {
                  triggerPulse(setEmailClearPulse)
                  handleClearEmail()
                }}
                onAnimationEnd={() => setEmailClearPulse(false)}
                title={clearArmed ? 'Confirmer' : 'Clear'}
                aria-label={clearArmed ? 'Confirmer' : 'Clear'}
              >
                <DeleteIcon />
                <span>{clearArmed ? 'Confirmer' : 'Clear'}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
