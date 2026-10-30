// Troubleshotgun: products, their mail templates and the preview.
import { useState, type Dispatch, type SetStateAction } from 'react'
import { getTemplateTaskSections } from '../../lib/taskDraft'
import type { AppData, MailTemplate, TroubleshootgunFolder } from '../../lib/types'
import { highlightText } from '../../lib/utils'

export interface TroubleshootgunPanelProps {
  data: AppData
  openTemplatePreview: (template: MailTemplate, folderId?: string) => void
  selectedTroubleshootgunFolderId: string | null
  selectedTroubleshootgunTemplateId: string | null
  setSelectedTroubleshootgunFolderId: Dispatch<SetStateAction<string | null>>
  setSelectedTroubleshootgunTemplateId: Dispatch<SetStateAction<string | null>>
  troubleshootgunFolders: TroubleshootgunFolder[]
}

type TroubleshootgunStep = 'products' | 'templates' | 'preview'

// In the contextual panel, three successive steps: product, template,
// preview. It stays open after an import, to pick the next step.
export function TroubleshootgunPanel({
  data,
  openTemplatePreview,
  selectedTroubleshootgunFolderId,
  selectedTroubleshootgunTemplateId,
  setSelectedTroubleshootgunFolderId,
  setSelectedTroubleshootgunTemplateId,
  troubleshootgunFolders,
}: TroubleshootgunPanelProps) {
  const activeFolder = troubleshootgunFolders.find((folder) => folder.id === selectedTroubleshootgunFolderId)
  // Opens on the folder already chosen (the case's product, or the one used last).
  const [step, setStep] = useState<TroubleshootgunStep>(activeFolder ? 'templates' : 'products')
  const activeTemplate = activeFolder?.templates.find((template) => template.id === selectedTroubleshootgunTemplateId)
  const shownStep: TroubleshootgunStep =
    step === 'preview' && !activeTemplate ? (activeFolder ? 'templates' : 'products') : step === 'templates' && !activeFolder ? 'products' : step
  const taskLineCount = activeTemplate
    ? getTemplateTaskSections(activeTemplate, data.taskTemplates).filter((section) => section.trim()).length
    : 0

  return (
    <div className="troubleshootgun-steps">
      {shownStep === 'products' ? (
        <>
          <div className="troubleshootgun-browser__label">Produits</div>
          <div className="troubleshootgun-browser__list">
            {troubleshootgunFolders.length ? (
              troubleshootgunFolders.map((folder) => (
                <button
                  className={`troubleshootgun-browser__product${activeFolder?.id === folder.id ? ' is-active' : ''}`}
                  type="button"
                  key={folder.id}
                  onClick={() => {
                    setSelectedTroubleshootgunFolderId(folder.id)
                    setSelectedTroubleshootgunTemplateId(null)
                    setStep('templates')
                  }}
                >
                  <span>{folder.name}</span>
                  <small>{folder.templates.length}</small>
                </button>
              ))
            ) : (
              <div className="troubleshootgun-browser__empty">Configurez vos produits dans Paramètres › Troubleshotgun.</div>
            )}
          </div>
        </>
      ) : null}

      {shownStep === 'templates' && activeFolder ? (
        <>
          <button type="button" className="troubleshootgun-steps__back" onClick={() => setStep('products')}>
            ← Produits
          </button>
          <div className="troubleshootgun-browser__label">{activeFolder.name}</div>
          <div className="troubleshootgun-browser__list">
            {activeFolder.templates.length ? (
              activeFolder.templates.map((template) => (
                <button
                  className={`troubleshootgun-browser__template${activeTemplate?.id === template.id ? ' is-active' : ''}`}
                  type="button"
                  key={template.id}
                  onClick={() => {
                    setSelectedTroubleshootgunTemplateId(template.id)
                    setStep('preview')
                  }}
                >
                  <strong>{template.name}</strong>
                  <span>
                    {template.description?.trim() ||
                      template.content.split(/\r?\n/).find((line) => line.trim())?.trim() ||
                      'Aucune description renseignée.'}
                  </span>
                </button>
              ))
            ) : (
              <div className="troubleshootgun-browser__empty">Aucun template pour ce produit.</div>
            )}
          </div>
        </>
      ) : null}

      {shownStep === 'preview' && activeFolder && activeTemplate ? (
        <>
          <button type="button" className="troubleshootgun-steps__back" onClick={() => setStep('templates')}>
            ← {activeFolder.name}
          </button>
          <div className="troubleshootgun-browser__preview-content">
            <div className="troubleshootgun-browser__preview-head">
              <div>
                <h2>{activeTemplate.name}</h2>
                <span>{activeFolder.name}</span>
              </div>
              <span className="troubleshootgun-browser__language">{activeTemplate.language.toUpperCase()}</span>
            </div>
            <div
              className="troubleshootgun-browser__content"
              dangerouslySetInnerHTML={{ __html: highlightText(activeTemplate.content || 'Aucun contenu renseigné.') }}
            />
            {taskLineCount ? (
              <div className="troubleshootgun-browser__task-summary">
                Task liée : {taskLineCount} section{taskLineCount > 1 ? 's' : ''}
              </div>
            ) : null}
          </div>
          <div className="troubleshootgun-steps__actions">
            <button className="primary" type="button" onClick={() => openTemplatePreview(activeTemplate, activeFolder.id)}>
              Importer
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
