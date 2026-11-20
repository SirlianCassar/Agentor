// Reads the case straight from the Dataverse Web API with the session cookie.
// No dependency on any other extension running on the page.

const AGENTOR_BRIDGE_API = "/api/data/v9.2";
const AGENTOR_BRIDGE_FETCH_TIMEOUT_MS = 15000;

const AGENTOR_BRIDGE_INCIDENT_SELECT = [
  "ticketnumber",
  "title",
  "createdon",
  "statecode",
  "_isa_pays_value",
  "_productid_value",
  "_isa_produit_contact_value",
  "_primarycontactid_value",
  "_customerid_value"
].join(",");

async function agentorBridgeFetchJson(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENTOR_BRIDGE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${window.location.origin}${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        ...(body === undefined ? {} : { "Content-Type": "application/json; charset=utf-8" }),
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// The merged body comes back as the HTML of a Dynamics mail, while Agentor
// works in plain text with <TAG> markers — mixing the two would break both the
// tags and the line-by-line choice in the preview. So the text is taken here,
// where a parser is at hand, and the layout is kept as line breaks.
//
// DOMParser is used rather than innerHTML: nothing from the CRM is ever run.
function agentorBridgeHtmlToText(html) {
  const text = String(html || "");
  if (!/<[a-z!/]/i.test(text)) return text.trim();
  const parsed = new DOMParser().parseFromString(text, "text/html");
  for (const node of parsed.querySelectorAll("style, script")) node.remove();
  for (const node of parsed.querySelectorAll("br")) node.replaceWith(parsed.createTextNode("\n"));
  for (const node of parsed.querySelectorAll("p, div, tr, li, h1, h2, h3, h4, h5, h6, table")) {
    node.appendChild(parsed.createTextNode("\n"));
  }
  return (parsed.body.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Asks the CRM to merge a template with a case. The server does the merge, so
// the fields ({!contact:firstname;} and the rest) are never reimplemented here.
// Nothing is written: the mail it returns is not saved in the timeline.
async function agentorBridgeInstantiateTemplate(templateId, caseId) {
  const payload = await agentorBridgeFetchJson(`${AGENTOR_BRIDGE_API}/InstantiateTemplate`, {
    TemplateId: templateId,
    ObjectType: "incident",
    ObjectId: caseId
  });
  const record = Array.isArray(payload.value) ? payload.value[0] : null;
  if (!record) throw new Error("empty-template");
  return {
    subject: agentorBridgeText(record.subject),
    body: agentorBridgeHtmlToText(record.description)
  };
}

/* The two blocks Agentor pastes whole, written exactly as the Cairm quick-copy buttons write
   them: the agent has been pasting that layout into mails for months, and a second layout
   for the same data would be read as a different source. Both are built here, where the
   records are, rather than in Agentor, which only ever stores the finished text.

     Recipient : Jean Dupont        SN : 1234567890
     Address :                      DoP : 02/09/2026
     ───────────────────
     12 rue des Lilas
     69003 - Lyon
     France
     ───────────────────
     Phone : 0612345678
     Email : jean@example.com */
const AGENTOR_BRIDGE_COPY_RULE = "───────────────────";
// What the CRM leaves in an empty second address line.
const AGENTOR_BRIDGE_EMPTY_ADDRESS_LINE = /^(?:-{3}|address\s*1\s*:?\s*street\s*2)$/i;

function agentorBridgeCustomerBlock(contact) {
  if (!contact) return undefined;
  const lines = [`Recipient : ${contact.recipientName}`, "Address :", AGENTOR_BRIDGE_COPY_RULE];
  const push = (value) => {
    const text = agentorBridgeText(value);
    if (text && !AGENTOR_BRIDGE_EMPTY_ADDRESS_LINE.test(text)) lines.push(text);
  };
  push(contact.street);
  push(contact.details);
  if (contact.postalCode || contact.city) {
    lines.push([contact.postalCode, contact.city].filter(Boolean).join(" - "));
  }
  push(contact.state);
  push(contact.country);
  lines.push(AGENTOR_BRIDGE_COPY_RULE, `Phone : ${contact.phone}`, `Email : ${contact.email}`);
  return lines.join("\n");
}

function agentorBridgeProductBlock(product) {
  if (!product) return undefined;
  return [`SN : ${product.serialNumber}`, `DoP : ${product.purchaseDate}`].join("\n");
}

// The customer of the case: the address, the phone and the mail the quick-copy block is made
// of. The state and the country of a Thrustmaster contact live on columns of their own; an
// organisation without them keeps the standard ones, so they are read apart.
const AGENTOR_BRIDGE_CONTACT_SELECT = [
  "firstname",
  "lastname",
  "fullname",
  "address1_line1",
  "address1_line2",
  "address1_postalcode",
  "address1_city",
  "address1_stateorprovince",
  "address1_country",
  "mobilephone",
  "telephone1",
  "emailaddress1"
].join(",");

async function agentorBridgeReadContact(contactId) {
  if (!contactId) return null;
  const record = await agentorBridgeFetchJson(
    `${AGENTOR_BRIDGE_API}/contacts(${encodeURIComponent(contactId)})?$select=${AGENTOR_BRIDGE_CONTACT_SELECT}`
  );
  const custom = await agentorBridgeFetchJson(
    `${AGENTOR_BRIDGE_API}/contacts(${encodeURIComponent(contactId)})?$select=isa_etat,_isa_pays_value`
  ).catch(() => ({}));
  const name = [agentorBridgeText(record.firstname), agentorBridgeText(record.lastname)].filter(Boolean).join(" ");
  return {
    recipientName: name || agentorBridgeText(record.fullname),
    street: agentorBridgeText(record.address1_line1),
    details: agentorBridgeText(record.address1_line2),
    postalCode: agentorBridgeText(record.address1_postalcode),
    city: agentorBridgeText(record.address1_city),
    state: agentorBridgeText(custom.isa_etat) || agentorBridgeText(record.address1_stateorprovince),
    country: agentorBridgeLookupLabel(custom, "_isa_pays_value") || agentorBridgeText(record.address1_country),
    phone: agentorBridgeText(record.mobilephone) || agentorBridgeText(record.telephone1),
    email: agentorBridgeText(record.emailaddress1)
  };
}

// The product record holds the serial number and the purchase date; it is
// optional, a case can exist before the product is linked.
async function agentorBridgeReadProductContact(productContactId) {
  if (!productContactId) return null;
  const record = await agentorBridgeFetchJson(
    `${AGENTOR_BRIDGE_API}/isa_produit_contacts(${encodeURIComponent(productContactId)})?$select=isa_numero_serie,isa_date_acquisition`
  );
  return {
    serialNumber: agentorBridgeText(record.isa_numero_serie),
    purchaseDate: agentorBridgeFormattedDate(record, "isa_date_acquisition")
  };
}

// The language lives on its own lookup, read apart: an organisation without
// that column must not lose the whole case over it.
async function agentorBridgeReadCaseLanguage(caseId) {
  const record = await agentorBridgeFetchJson(
    `${AGENTOR_BRIDGE_API}/incidents(${encodeURIComponent(caseId)})?$select=_isa_langue_value`
  );
  return agentorBridgeLookupLabel(record, "_isa_langue_value");
}

async function agentorBridgeReadLastTask(caseId) {
  const filter = encodeURIComponent(`_regardingobjectid_value eq ${caseId}`);
  const payload = await agentorBridgeFetchJson(
    `${AGENTOR_BRIDGE_API}/tasks?$select=subject,description,createdon&$filter=${filter}&$orderby=createdon desc&$top=1`
  );
  const record = Array.isArray(payload.value) ? payload.value[0] : null;
  const subject = record ? agentorBridgeText(record.subject) : "";
  if (!subject) return null;
  return {
    subject,
    description: agentorBridgeText(record.description).slice(0, 2000),
    createdOn: agentorBridgeText(record.createdon),
    fetchedAt: new Date().toISOString()
  };
}

// The index of the case e-mail templates: titles only, paginated. Agentor asks
// for it when it has none or when its own copy has aged.
async function agentorBridgeReadTemplateIndex() {
  const entries = [];
  let path =
    `${AGENTOR_BRIDGE_API}/templates` +
    "?$select=templateid,title,languagecode,modifiedon" +
    "&$filter=templatetypecode eq 'incident'" +
    "&$orderby=title asc";
  const seen = new Set();
  while (path && entries.length <= 5000) {
    if (seen.has(path)) break;
    seen.add(path);
    const payload = await agentorBridgeFetchJson(path);
    for (const record of Array.isArray(payload.value) ? payload.value : []) {
      const id = agentorBridgeText(record.templateid);
      const title = agentorBridgeText(record.title);
      if (!id || !title) continue;
      entries.push({
        id,
        title,
        languageCode: Number(record.languagecode),
        modifiedOn: agentorBridgeText(record.modifiedon) || undefined
      });
    }
    const next = agentorBridgeText(payload["@odata.nextLink"]);
    path = next ? next.replace(window.location.origin, "") : "";
  }
  return entries;
}

// Returns null when the case cannot be read, so the caller keeps the previous
// state instead of sending empty values.
async function agentorBridgeReadCase(caseId) {
  const record = await agentorBridgeFetchJson(
    `${AGENTOR_BRIDGE_API}/incidents(${encodeURIComponent(caseId)})?$select=${AGENTOR_BRIDGE_INCIDENT_SELECT}`
  );
  const customerIsAccount =
    agentorBridgeText(record["_customerid_value@Microsoft.Dynamics.CRM.lookuplogicalname"]).toLowerCase() === "account";
  const product = await agentorBridgeReadProductContact(agentorBridgeLookupId(record, "_isa_produit_contact_value"))
    .catch(() => null);
  const contact = await agentorBridgeReadContact(agentorBridgeLookupId(record, "_primarycontactid_value"))
    .catch(() => null);
  const language = await agentorBridgeReadCaseLanguage(caseId).catch(() => undefined);
  const state = Number(record.statecode);
  return {
    caseId,
    caseState: Number.isFinite(state) ? state : null,
    caseNumber: agentorBridgeText(record.ticketnumber),
    caseTitle: agentorBridgeText(record.title),
    caseCreatedOn: agentorBridgeFormattedDate(record, "createdon"),
    productName: agentorBridgeLookupLabel(record, "_productid_value"),
    customerName:
      agentorBridgeLookupLabel(record, "_primarycontactid_value") ||
      (customerIsAccount ? "" : agentorBridgeLookupLabel(record, "_customerid_value")),
    country: agentorBridgeLookupLabel(record, "_isa_pays_value"),
    customerLanguage: language,
    // Undefined, not empty: the product is unreadable, its values are left out.
    serialNumber: product ? product.serialNumber : undefined,
    purchaseDate: product ? product.purchaseDate : undefined,
    productFull: agentorBridgeProductBlock(product),
    customerFull: agentorBridgeCustomerBlock(contact)
  };
}
