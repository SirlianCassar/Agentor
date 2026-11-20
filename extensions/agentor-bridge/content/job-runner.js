// Runs the jobs Agentor queues (protocol 2).
//
// Agentor holds no Dataverse token, so everything it needs from the CRM is a
// job it drops in its own queue and that this page comes to fetch. Nothing is
// pushed to the browser, and nothing is read from the CRM on a rhythm of our
// own: the page asks for work, runs it, and posts the answer back.
//
// Only the kinds this page can actually run are asked for, so a job never
// lands in a tab that would have to refuse it.

let agentorBridgeJobTimer = 0;
let agentorBridgeJobRunning = false;

/** What this page is able to do, decided by what it is showing. */
function agentorBridgeJobAbilities() {
  // Any CRM page can call the Web API with the session cookie.
  const abilities = ["template.harvest", "template.instantiate"];
  // Writing a mail needs the mail form itself.
  if (agentorBridgeIsMailFormPage()) abilities.push("mail.compose");
  return abilities;
}

async function agentorBridgeRunJob(job) {
  if (job.kind === "template.harvest") {
    const entries = await agentorBridgeReadTemplateIndex();
    if (!entries.length) return { ok: false, reason: "empty-index" };
    return {
      ok: true,
      data: { org: window.location.origin, fetchedAt: new Date().toISOString(), entries }
    };
  }

  if (job.kind === "template.instantiate") {
    const caseId = job.caseKey && agentorBridgeText(job.caseKey.id);
    if (!caseId) return { ok: false, reason: "no-case" };
    const merged = await agentorBridgeInstantiateTemplate(job.payload.templateId, caseId);
    if (!merged.body) return { ok: false, reason: "empty-template" };
    return {
      ok: true,
      data: { ...merged, ...(job.payload.familyKey ? { familyKey: job.payload.familyKey } : {}) }
    };
  }

  if (job.kind === "mail.compose") {
    const fields = [
      // The labels the Dynamics mail form uses, in the languages the agents
      // run it in. A field that is not found is reported, never guessed at.
      { name: "subject", value: job.payload.subject, labels: ["subject", "objet", "betreff", "asunto", "oggetto"] },
      {
        name: "body",
        value: job.payload.body,
        // The formatting of the template, when Agentor could keep it: written only in a rich
        // text body, sanitized first, and the flat text is the fallback.
        html: job.payload.bodyHtml || null,
        labels: ["message", "corps", "body", "cuerpo", "corpo"]
      }
    ].filter((field) => field.value);
    if (!fields.length) return { ok: false, reason: "nothing-to-write" };
    const outcome = agentorBridgeFillFields(fields);
    if (!outcome.applied.length) return { ok: false, reason: `field-not-found:${outcome.missing.join(",")}` };
    return { ok: true, data: { applied: outcome.applied, formatted: outcome.formatted } };
  }

  // A kind this version does not know: Agentor is newer than the extension.
  return { ok: false, reason: "unknown-kind" };
}

function agentorBridgePostJobResult(id, result) {
  chrome.runtime.sendMessage({
    type: "agentor-bridge-job-result",
    id,
    result: { protocol: AGENTOR_BRIDGE_JOB_PROTOCOL, ...result }
  });
}

async function agentorBridgeRunJobs() {
  if (!agentorBridgeEnabled || agentorBridgeJobRunning) return;
  agentorBridgeJobRunning = true;
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "agentor-bridge-jobs", abilities: agentorBridgeJobAbilities() },
        (value) => resolve(chrome.runtime.lastError ? null : value)
      );
    });
    const jobs = response && Array.isArray(response.jobs) ? response.jobs : [];
    for (const job of jobs) {
      let result;
      try {
        result = await agentorBridgeRunJob(job);
      } catch (error) {
        // A refusal is a normal answer: Agentor shows the reason to the agent
        // rather than leaving the action hanging until it times out.
        result = { ok: false, reason: String((error && error.message) || error).slice(0, 120) };
      }
      agentorBridgePostJobResult(job.id, result);
    }
  } finally {
    agentorBridgeJobRunning = false;
  }
}

function agentorBridgeScheduleJobs() {
  if (agentorBridgeJobTimer) window.clearTimeout(agentorBridgeJobTimer);
  agentorBridgeJobTimer = 0;
  if (!agentorBridgeEnabled) return;
  const delay = document.hidden ? AGENTOR_BRIDGE_BACKGROUND_POLL_MS : AGENTOR_BRIDGE_POLL_MS;
  agentorBridgeJobTimer = window.setTimeout(() => {
    void agentorBridgeRunJobs();
    agentorBridgeScheduleJobs();
  }, delay);
}

function agentorBridgeStartJobs() {
  // The enabled flag is kept by the case observer, loaded first; both scripts
  // share the page's isolated world.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[AGENTOR_BRIDGE_SETTINGS_KEY]) return;
    agentorBridgeScheduleJobs();
  });
  document.addEventListener("visibilitychange", agentorBridgeScheduleJobs);
  // The first tick also covers the settings being read by the observer.
  window.setTimeout(agentorBridgeScheduleJobs, AGENTOR_BRIDGE_POLL_MS);
}

agentorBridgeStartJobs();
