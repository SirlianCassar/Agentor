// Sanity checks on the extension: valid manifest, listed files present, every
// script parses, and the pairing token never leaves the service worker.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";

const ROOT = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(join(ROOT, file), "utf8");
const manifest = JSON.parse(read("manifest.json"));

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.name, "Agentor Bridge");
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);

// The identity carried over from Cairm +, so paired installations keep working.
const id = [...createHash("sha256").update(Buffer.from(manifest.key, "base64")).digest("hex").slice(0, 32)]
  .map((character) => String.fromCharCode(97 + parseInt(character, 16)))
  .join("");
assert.equal(id, "bchjjpoadifjmmofijgdfdladabgcpem");

for (const file of [manifest.background.service_worker, manifest.options_ui.page, manifest.action.default_popup]) {
  assert.ok(existsSync(join(ROOT, file)), file);
}
for (const icon of Object.values(manifest.icons)) assert.ok(existsSync(join(ROOT, icon)), icon);
for (const script of manifest.content_scripts) {
  for (const file of [...(script.js || []), ...(script.css || [])]) assert.ok(existsSync(join(ROOT, file)), file);
}

const walk = (path) => {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.name === "dist" || entry.name === "node_modules") continue;
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith(".js")) new vm.Script(readFileSync(file, "utf8"), { filename: file });
  }
};
walk(ROOT);

for (const file of manifest.content_scripts.flatMap((script) => script.js)) {
  const source = read(file);
  assert.ok(!source.includes("Bearer"), `${file} must not handle the pairing token`);
  // Only the service worker talks to Agentor: a page script that reached the
  // loopback itself would carry the token into the page.
  assert.ok(!source.includes("127.0.0.1"), `${file} must not call the local bridge directly`);
}
assert.ok(read("background.js").includes("Bearer"));

// Protocol 2: the three kinds Agentor queues are the three the runner answers.
const runner = read("content/job-runner.js");
for (const kind of ["template.harvest", "template.instantiate", "mail.compose"]) {
  assert.ok(runner.includes(`"${kind}"`), `job-runner.js must handle ${kind}`);
}
// Filling never submits: no form is sent on the agent's behalf.
const filler = read("content/form-fill.js");
assert.ok(!/\.submit\(|requestSubmit\(/.test(filler), "form-fill.js must never submit a form");

console.log(
  "Agentor Bridge OK: manifest, identity, listed files, JavaScript syntax, token isolation, job kinds and no form submit."
);
