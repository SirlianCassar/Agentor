// Service worker: the only place that holds the pairing token and the only one
// that talks to the Agentor local bridge. Content scripts never see the token.

const AGENTOR_BRIDGE_SETTINGS_KEY = "agentorBridge";
const AGENTOR_BRIDGE_DEFAULT_PORT = 32100;
const AGENTOR_BRIDGE_TIMEOUT_MS = 4000;

async function readBridgeSettings() {
  const stored = (await chrome.storage.local.get(AGENTOR_BRIDGE_SETTINGS_KEY))[AGENTOR_BRIDGE_SETTINGS_KEY] || {};
  const port = Number(stored.port);
  return {
    enabled: stored.enabled === true,
    port: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : AGENTOR_BRIDGE_DEFAULT_PORT,
    token: typeof stored.token === "string" ? stored.token.trim() : ""
  };
}

async function callAgentor(path, init = {}) {
  const settings = await readBridgeSettings();
  if (!settings.enabled || !settings.token) throw new Error("bridge-off");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENTOR_BRIDGE_TIMEOUT_MS);
  try {
    const response = await fetch(`http://127.0.0.1:${settings.port}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.headers || {}),
        Accept: "application/json",
        Authorization: `Bearer ${settings.token}`
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// A case can only come from a CRM tab, a health check only from a page of the
// extension: a web page that guessed a message type gets nothing.
function isCrmTabSender(sender) {
  return (
    !!sender &&
    sender.id === chrome.runtime.id &&
    !!sender.tab &&
    typeof sender.url === "string" &&
    /^https:\/\/[^/]+\.crm4\.dynamics\.com\//.test(sender.url)
  );
}

function isExtensionPageSender(sender) {
  return (
    !!sender &&
    sender.id === chrome.runtime.id &&
    typeof sender.url === "string" &&
    sender.url.startsWith(chrome.runtime.getURL(""))
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "agentor-bridge-case") {
    if (!isCrmTabSender(sender)) {
      sendResponse({ ok: false });
      return;
    }
    callAgentor("/v1/case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message.message)
    }).then(
      (payload) => sendResponse({ ok: payload && payload.ok !== false, templates: payload && payload.templates }),
      () => sendResponse({ ok: false })
    );
    return true;
  }
  // Protocol 2: the page asks for the jobs it is able to run, and posts back
  // what it did. The queue lives in Agentor; nothing is kept here.
  if (message && message.type === "agentor-bridge-jobs") {
    if (!isCrmTabSender(sender)) {
      sendResponse({ ok: false, jobs: [] });
      return;
    }
    const abilities = Array.isArray(message.abilities)
      ? message.abilities.filter((kind) => typeof kind === "string").join(",")
      : "";
    callAgentor(`/v1/jobs?can=${encodeURIComponent(abilities)}`).then(
      (payload) => sendResponse({ ok: true, jobs: (payload && payload.jobs) || [] }),
      () => sendResponse({ ok: false, jobs: [] })
    );
    return true;
  }
  if (message && message.type === "agentor-bridge-job-result") {
    if (!isCrmTabSender(sender) || typeof message.id !== "string") {
      sendResponse({ ok: false });
      return;
    }
    callAgentor(`/v1/jobs/${encodeURIComponent(message.id)}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message.result)
    }).then(
      (payload) => sendResponse({ ok: payload && payload.ok !== false }),
      () => sendResponse({ ok: false })
    );
    return true;
  }
  if (message && message.type === "agentor-bridge-health") {
    if (!isExtensionPageSender(sender)) {
      sendResponse({ ok: false, error: "sender" });
      return;
    }
    callAgentor("/v1/health").then(
      (payload) => sendResponse({ ok: true, app: payload.app, version: payload.version, protocol: payload.protocol }),
      (error) => sendResponse({ ok: false, error: String(error && error.message || error) })
    );
    return true;
  }
  return false;
});
