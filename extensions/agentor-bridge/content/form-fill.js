// Writing a value into a field of the page, whatever the page is.
//
// The mechanics are the ones already proven in Cairm on the Portal order form:
// find the field by the label next to it, write through the native setter so
// the framework sees the change, then fire `input` and `change`. React and
// Dynamics both ignore a plain `value =` assignment.
//
// Nothing here submits a form. Filling stops before the send button: the
// rereading stays human.

const AGENTOR_BRIDGE_FILL_TAGS = ["input", "textarea", "select"];

function agentorBridgeNormalizeLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Same-origin frames only. A cross-origin frame throws on access, and that is
// a boundary to respect rather than to work around.
function agentorBridgeDocuments(root) {
  const documents = [root];
  for (const frame of root.querySelectorAll("iframe, frame")) {
    try {
      const inner = frame.contentDocument;
      if (inner && inner.body) documents.push(...agentorBridgeDocuments(inner));
    } catch (_error) {
      // Another origin: left alone.
    }
  }
  return documents;
}

function agentorBridgeIsVisible(element) {
  if (element.disabled || element.readOnly) return false;
  const rects = element.getClientRects();
  return rects.length > 0 && rects[0].width > 0 && rects[0].height > 0;
}

function agentorBridgeLabelTexts(element) {
  const texts = [];
  const push = (value) => {
    const text = agentorBridgeNormalizeLabel(value);
    if (text) texts.push(text);
  };
  push(element.getAttribute("aria-label"));
  push(element.getAttribute("placeholder"));
  push(element.getAttribute("title"));
  push(element.getAttribute("name"));
  push(element.id);
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      const node = element.ownerDocument.getElementById(id);
      if (node) push(node.textContent);
    }
  }
  if (element.id) {
    for (const label of element.ownerDocument.querySelectorAll(`label[for="${CSS.escape(element.id)}"]`)) {
      push(label.textContent);
    }
  }
  const wrapping = element.closest("label");
  if (wrapping) push(wrapping.textContent);
  return texts;
}

/** Finds a field by its selector when one is given, else by its label. */
function agentorBridgeFindField(field, root = document) {
  for (const target of agentorBridgeDocuments(root)) {
    if (field.selector) {
      const found = target.querySelector(field.selector);
      if (found && agentorBridgeIsVisible(found)) return found;
      continue;
    }
    const patterns = (field.labels || []).map(agentorBridgeNormalizeLabel).filter(Boolean);
    if (!patterns.length) continue;
    const candidates = target.querySelectorAll(
      [...AGENTOR_BRIDGE_FILL_TAGS, "[contenteditable='true']"].join(",")
    );
    for (const element of candidates) {
      if (!agentorBridgeIsVisible(element)) continue;
      const texts = agentorBridgeLabelTexts(element);
      if (patterns.some((pattern) => texts.some((text) => text.includes(pattern)))) return element;
    }
  }
  return null;
}

// The native setter, taken off the prototype: the framework's own setter would
// swallow the write without telling its state.
function agentorBridgeNativeSetter(element) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  return Object.getOwnPropertyDescriptor(prototype, "value")?.set;
}

/* Markup that may be written into the page, and nothing else.

   The HTML of a mail body left the CRM, went through Agentor and comes back: it is no longer
   something this extension has read itself, so it is parsed and rebuilt from an allowed list
   rather than trusted. What a mail needs is text, emphasis, lists, tables and links; a script,
   a frame, an event handler or a `javascript:` link has no reason to be in a mail body and is
   dropped without being written. */
const AGENTOR_BRIDGE_HTML_TAGS = new Set([
  "a", "b", "blockquote", "br", "caption", "col", "colgroup", "div", "em", "h1", "h2", "h3",
  "h4", "h5", "h6", "hr", "i", "li", "ol", "p", "pre", "s", "small", "span", "strong", "sub",
  "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul"
]);
const AGENTOR_BRIDGE_HTML_ATTRS = new Set([
  "align", "colspan", "dir", "height", "rowspan", "span", "style", "title", "valign", "width"
]);
const AGENTOR_BRIDGE_SAFE_URL = /^(?:https?:|mailto:|tel:)/i;

function agentorBridgeSanitizeNode(node) {
  for (const child of Array.from(node.children)) {
    if (!AGENTOR_BRIDGE_HTML_TAGS.has(child.tagName.toLowerCase())) {
      // The element goes, its text stays: a mail must not lose a sentence to a wrapper.
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }
    for (const attribute of Array.from(child.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name === "href" || name === "src") {
        if (!AGENTOR_BRIDGE_SAFE_URL.test(attribute.value.trim())) child.removeAttribute(attribute.name);
        continue;
      }
      if (!AGENTOR_BRIDGE_HTML_ATTRS.has(name)) child.removeAttribute(attribute.name);
    }
    agentorBridgeSanitizeNode(child);
  }
}

/** The given HTML, rebuilt from what a mail body is allowed to hold. */
function agentorBridgeSanitizeHtml(html) {
  const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
  for (const node of parsed.querySelectorAll("script, style, iframe, frame, object, embed, link, meta, form, input, button")) {
    node.remove();
  }
  agentorBridgeSanitizeNode(parsed.body);
  return parsed.body.innerHTML;
}

/** Writes a value and tells the page about it. Returns false when it did not take. */
function agentorBridgeWriteField(element, value, html) {
  const text = String(value == null ? "" : value);
  try {
    element.focus({ preventScroll: true });
  } catch (_error) {
    // A field that refuses focus can still be written.
  }
  // Only a rich text field can hold markup; anywhere else the text is what is written.
  const writeHtml = Boolean(html) && element.isContentEditable;
  if (element.isContentEditable) {
    if (writeHtml) element.innerHTML = agentorBridgeSanitizeHtml(html);
    else element.textContent = text;
  } else {
    const setter = agentorBridgeNativeSetter(element);
    if (!setter) return false;
    setter.call(element, text);
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  const written = element.isContentEditable ? element.textContent : element.value;
  // The markup changes the spacing, so a rich write is checked on the words it left behind.
  if (writeHtml) {
    const words = (value) => String(value || "").replace(/\s+/g, " ").trim();
    return words(written).length > 0 && words(written) === words(text);
  }
  return String(written || "").trim() === text.trim();
}

/** Fills a list of fields. Says what was written and what was not found. */
function agentorBridgeFillFields(fields, root = document) {
  const applied = [];
  const missing = [];
  // The fields written with their own markup rather than as flat text.
  const formatted = [];
  for (const field of fields) {
    const element = agentorBridgeFindField(field, root);
    if (!element) {
      missing.push(field.name);
      continue;
    }
    const rich = Boolean(field.html) && element.isContentEditable;
    if (!agentorBridgeWriteField(element, field.value, field.html)) {
      // The markup did not take: the text alone is better than a half-written body.
      if (!rich || !agentorBridgeWriteField(element, field.value, null)) {
        missing.push(field.name);
        continue;
      }
      applied.push(field.name);
      continue;
    }
    applied.push(field.name);
    if (rich) formatted.push(field.name);
  }
  return { applied, missing, formatted };
}
