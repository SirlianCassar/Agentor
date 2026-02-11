const BADGE_CLEAR_MS = 1500

function showBadge(text, color) {
  chrome.action.setBadgeText({ text })
  chrome.action.setBadgeBackgroundColor({ color })
  if (text) {
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), BADGE_CLEAR_MS)
  }
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id) {
    showBadge('ERR', '#b91c1c')
    return
  }

  chrome.tabs.sendMessage(tab.id, { type: 'typefast:export' }, (response) => {
    if (chrome.runtime.lastError) {
      showBadge('ERR', '#b91c1c')
      return
    }
    if (response && response.ok) {
      showBadge('OK', '#15803d')
      return
    }
    showBadge('ERR', '#b91c1c')
  })
})
