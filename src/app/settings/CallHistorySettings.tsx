// Settings › Historique d’appel.
import { formatHistoryTimestamp } from '../../lib/formatting'
import type { HistoryItem } from '../../lib/types'

export interface CallHistorySettingsProps {
  callHistoryCopiedId: string | null
  handleCopyHistoryCall: (id: string, content: string) => Promise<void>
  recentCallHistory: HistoryItem[]
}

export function CallHistorySettings({
  callHistoryCopiedId,
  handleCopyHistoryCall,
  recentCallHistory,
}: CallHistorySettingsProps) {
  return (
    <div className="modal__grid modal__grid--single">
      <div className="list-card list-card--form">
        <div className="list-card__body">
          <div className="settings-history-section">
            <div className="settings-row">
              <div className="settings-label">Appels sauvegardés</div>
              <div className="settings-value">
                {recentCallHistory.length} entrée{recentCallHistory.length > 1 ? 's' : ''}
              </div>
            </div>
            {recentCallHistory.length ? (
              <div className="settings-history-list">
                {recentCallHistory.map((item) => (
                  <article className="settings-history-item" key={item.id}>
                    <div className="settings-history-item__header">
                      <div className="settings-history-item__meta">
                        {formatHistoryTimestamp(item.createdAt)}
                      </div>
                      <button
                        className={`ghost dashboard-copy-btn settings-history-item__copy${
                          callHistoryCopiedId === item.id ? ' is-success' : ''
                        }`}
                        type="button"
                        onClick={() => void handleCopyHistoryCall(item.id, item.content)}
                      >
                        {callHistoryCopiedId === item.id ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                    <div className="settings-history-item__content">{item.content}</div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Aucun appel enregistré pour le moment.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
