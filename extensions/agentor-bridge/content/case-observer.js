// Watches the open case and sends it to Agentor through the service worker.

// Resend unchanged data this often so an Agentor restart recovers on its own.
const AGENTOR_BRIDGE_REFRESH_MS = 15000;

let agentorBridgeEnabled = false;
let agentorBridgeTimer = 0;
let agentorBridgeReading = false;
let agentorBridgeLastSignature = "";
let agentorBridgeLastSentAt = 0;
let agentorBridgeLastCaseId = "";
let agentorBridgeTask = { caseId: "", loading: false, value: undefined };

function agentorBridgeObservations(data, fetchedAt) {
  const observations = [];
  const add = (key, value) => {
    if (value === undefined) return;
    observations.push({ key, value: agentorBridgeText(value) || null, source: "crm", fetchedAt });
  };
  add("caseNumber", data.caseNumber);
  add("caseTitle", data.caseTitle);
  add("caseCreatedOn", data.caseCreatedOn);
  add("productName", data.productName);
  add("productFull", data.productFull);
  add("customerName", data.customerName);
  add("customerFull", data.customerFull);
  add("country", data.country);
  add("customerLanguage", data.customerLanguage);
  add("serialNumber", data.serialNumber);
  add("purchaseDate", data.purchaseDate);
  return observations;
}

function agentorBridgeMessage(data, task, fetchedAt) {
  const message = {
    protocol: AGENTOR_BRIDGE_PROTOCOL,
    type: "case.observed",
    caseKey: { id: data.caseId, number: data.caseNumber || undefined },
    observations: agentorBridgeObservations(data, fetchedAt)
  };
  if (task !== undefined) message.lastTask = task;
  return message;
}

function agentorBridgeRefreshTask(caseId) {
  if (agentorBridgeTask.caseId === caseId && (agentorBridgeTask.loading || agentorBridgeTask.value !== undefined)) return;
  agentorBridgeTask = { caseId, loading: true, value: undefined };
  agentorBridgeReadLastTask(caseId).then(
    (task) => {
      if (agentorBridgeTask.caseId === caseId) agentorBridgeTask = { caseId, loading: false, value: task };
    },
    () => {
      // Unreadable timeline: the case is still sent, without its last task.
      if (agentorBridgeTask.caseId === caseId) agentorBridgeTask = { caseId, loading: false, value: undefined };
    }
  );
}

function agentorBridgeSend(message, signature) {
  // Marked as sent first; a failure clears the mark so the next poll retries.
  agentorBridgeLastSignature = signature;
  agentorBridgeLastSentAt = Date.now();
  chrome.runtime.sendMessage({ type: "agentor-bridge-case", message }, (response) => {
    if ((chrome.runtime.lastError || !response || !response.ok) && agentorBridgeLastSignature === signature) {
      agentorBridgeLastSignature = "";
    }
  });
}

function agentorBridgeForget() {
  agentorBridgeLastSignature = "";
  agentorBridgeLastSentAt = 0;
  agentorBridgeTask = { caseId: "", loading: false, value: undefined };
}

async function agentorBridgePushCase() {
  if (!agentorBridgeEnabled || agentorBridgeReading || !agentorBridgeIsCasePage()) return;
  const caseId = agentorBridgeCaseRecordId();
  if (!caseId) return;
  if (caseId !== agentorBridgeLastCaseId) {
    agentorBridgeLastCaseId = caseId;
    agentorBridgeForget();
  }
  agentorBridgeReading = true;
  let data = null;
  try {
    data = await agentorBridgeReadCase(caseId);
  } catch (_error) {
    // Unreadable case: nothing is sent, the next poll tries again.
  } finally {
    agentorBridgeReading = false;
  }
  if (!data) return;
  // A resolved or cancelled case is finished work: Agentor keeps the case
  // the agent is actually working on.
  if (Number.isFinite(data.caseState) && data.caseState !== 0) return;
  agentorBridgeRefreshTask(caseId);
  const task = agentorBridgeTask.caseId === caseId ? agentorBridgeTask.value : undefined;
  const signature = JSON.stringify(agentorBridgeMessage(data, task && { ...task, fetchedAt: "" }, ""));
  if (signature === agentorBridgeLastSignature && Date.now() - agentorBridgeLastSentAt < AGENTOR_BRIDGE_REFRESH_MS) return;
  agentorBridgeSend(agentorBridgeMessage(data, task, new Date().toISOString()), signature);
}

function agentorBridgeSchedule() {
  if (agentorBridgeTimer) window.clearTimeout(agentorBridgeTimer);
  agentorBridgeTimer = 0;
  if (!agentorBridgeEnabled) return;
  const delay = document.hidden ? AGENTOR_BRIDGE_BACKGROUND_POLL_MS : AGENTOR_BRIDGE_POLL_MS;
  agentorBridgeTimer = window.setTimeout(() => {
    agentorBridgePushCase();
    agentorBridgeSchedule();
  }, delay);
}

function agentorBridgeApplySettings(settings) {
  const value = settings && typeof settings === "object" ? settings : {};
  const enabled = value.enabled === true && Number.isInteger(value.port) && !!value.token;
  if (enabled === agentorBridgeEnabled) return;
  agentorBridgeEnabled = enabled;
  agentorBridgeForget();
  agentorBridgeSchedule();
}

function agentorBridgeStart() {
  chrome.storage.local.get(AGENTOR_BRIDGE_SETTINGS_KEY, (stored) => {
    if (chrome.runtime.lastError) return;
    agentorBridgeApplySettings(stored[AGENTOR_BRIDGE_SETTINGS_KEY]);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[AGENTOR_BRIDGE_SETTINGS_KEY]) return;
    agentorBridgeApplySettings(changes[AGENTOR_BRIDGE_SETTINGS_KEY].newValue);
  });
  document.addEventListener("visibilitychange", agentorBridgeSchedule);
}

agentorBridgeStart();
