// Shows whether Agentor answers, and opens the settings page.
(() => {
  const statusNode = document.getElementById("popupStatus");

  const show = (text, state) => {
    statusNode.textContent = text;
    statusNode.dataset.state = state;
  };

  chrome.runtime.sendMessage({ type: "agentor-bridge-health" }, (response) => {
    if (chrome.runtime.lastError || !response) return show("État indisponible.", "error");
    if (response.ok) return show(`Connecté à Agentor ${response.version || ""}.`, "ok");
    if (response.error === "bridge-off") return show("Connexion non configurée.", "warning");
    show("Agentor ne répond pas.", "error");
  });

  document.getElementById("popupOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
})();
