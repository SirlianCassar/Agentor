// Values shared by the content scripts. Loaded first, in every frame.

const AGENTOR_BRIDGE_PROTOCOL = 1;
// Protocol 2: the jobs Agentor queues for the extension to run in the page.
const AGENTOR_BRIDGE_JOB_PROTOCOL = 2;
const AGENTOR_BRIDGE_SETTINGS_KEY = "agentorBridge";
// A visible page looks at its work every two seconds, a hidden one every
// fifteen: the same rhythm the open case is watched with.
const AGENTOR_BRIDGE_POLL_MS = 2000;
const AGENTOR_BRIDGE_BACKGROUND_POLL_MS = 15000;

function agentorBridgeActiveHref() {
  try {
    return String(window.location.href || "");
  } catch (_error) {
    return "";
  }
}

// Dynamics encodes its route in the query string, sometimes twice.
function agentorBridgeRouteHref() {
  let href = agentorBridgeActiveHref().toLowerCase();
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      const decoded = decodeURIComponent(href);
      if (decoded === href) break;
      href = decoded;
    } catch (_error) {
      break;
    }
  }
  return href;
}

function agentorBridgeRouteParam(name) {
  const match = agentorBridgeRouteHref().match(new RegExp(`(?:^|[?&#])${name}=([^&#]+)`, "i"));
  return match ? String(match[1] || "").split(/[/?]/, 1)[0].trim() : "";
}

// A case page: the record form of an incident, not a view, a dashboard or a
// dialog that merely carries the identifier.
function agentorBridgeIsCasePage() {
  const href = agentorBridgeRouteHref();
  if (!href.includes("main.aspx") || !href.includes("pagetype=entityrecord")) return false;
  return agentorBridgeRouteParam("etn") === "incident" || agentorBridgeRouteParam("entityname") === "incident";
}

// The mail form: the only page where a mail can be written.
function agentorBridgeIsMailFormPage() {
  const href = agentorBridgeRouteHref();
  if (!href.includes("main.aspx") || !href.includes("pagetype=entityrecord")) return false;
  return agentorBridgeRouteParam("etn") === "email" || agentorBridgeRouteParam("entityname") === "email";
}

function agentorBridgeCaseRecordId() {
  return agentorBridgeRouteParam("id").replace(/[{}]/g, "").trim().toLowerCase();
}

function agentorBridgeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Dataverse returns a lookup as _name_value plus an annotation holding its label.
function agentorBridgeLookupLabel(record, attribute) {
  return agentorBridgeText(record[`${attribute}@OData.Community.Display.V1.FormattedValue`]);
}

function agentorBridgeLookupId(record, attribute) {
  return agentorBridgeText(record[attribute]).replace(/[{}]/g, "").toLowerCase();
}

function agentorBridgeFormattedDate(record, attribute) {
  const formatted = agentorBridgeText(record[`${attribute}@OData.Community.Display.V1.FormattedValue`]);
  if (formatted) return formatted;
  const raw = agentorBridgeText(record[attribute]);
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString();
}
