// Pairing settings. The token is kept in local extension storage only, never synced.
(() => {
  const SETTINGS_KEY = "agentorBridge";
  const form = document.getElementById("bridgeForm");
  const enabledInput = document.getElementById("bridgeEnabled");
  const tokenInput = document.getElementById("bridgeToken");
  const portInput = document.getElementById("bridgePort");
  const statusNode = document.getElementById("bridgeStatus");

  const errorMessages = {
    "bridge-off": "Renseigne le jeton et active l’envoi, puis enregistre.",
    "HTTP 401": "Le jeton ne correspond pas. Copie-le à nouveau depuis Agentor.",
    "HTTP 403": "Agentor refuse cette extension.",
    "HTTP 421": "Agentor écoute sur un autre port."
  };

  function showStatus(text, state) {
    statusNode.textContent = text;
    statusNode.dataset.state = state;
  }

  chrome.storage.local.get(SETTINGS_KEY, (stored) => {
    const saved = stored[SETTINGS_KEY] || {};
    enabledInput.checked = saved.enabled === true;
    tokenInput.value = saved.token || "";
    portInput.value = saved.port || 32100;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const port = Number(portInput.value);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      showStatus("Le port doit être un nombre entre 1024 et 65535.", "error");
      return;
    }
    const value = { enabled: enabledInput.checked, token: tokenInput.value.trim(), port };
    chrome.storage.local.set({ [SETTINGS_KEY]: value }, () => {
      showStatus(
        value.enabled ? "Enregistré. Le dossier ouvert sera envoyé à Agentor." : "Enregistré. L’envoi est désactivé.",
        "ok"
      );
    });
  });

  document.getElementById("bridgeTest").addEventListener("click", () => {
    showStatus("Test en cours…", "pending");
    chrome.runtime.sendMessage({ type: "agentor-bridge-health" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        showStatus("Test impossible.", "error");
        return;
      }
      if (response.ok) {
        chrome.storage.local.get(SETTINGS_KEY, (stored) => {
          const enabled = stored[SETTINGS_KEY] && stored[SETTINGS_KEY].enabled === true;
          showStatus(
            enabled
              ? `Connecté à Agentor ${response.version || ""}. Ouvre ou recharge un dossier dans le CRM.`
              : `Connecté à Agentor ${response.version || ""}, mais l’envoi est désactivé. Active « Envoyer le dossier ouvert » puis enregistre.`,
            enabled ? "ok" : "warning"
          );
        });
        return;
      }
      const error = String(response.error || "");
      showStatus(errorMessages[error] || `Agentor ne répond pas (${error || "erreur inconnue"}).`, "error");
    });
  });
})();
