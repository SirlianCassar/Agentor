// Packs the extension into dist/agentor-bridge/Agentor-Bridge-chromium-<tag>.zip,
// stamped with the version of the Agentor release it ships with. Writes the
// archive itself so the build needs no zip binary.
import { deflateRawSync } from "node:zlib";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = resolve(ROOT, "../../dist/agentor-bridge");
const EXCLUDED = new Set(["dist", "scripts", "README.md", ".DS_Store"]);

function parseArgs(argv) {
  let tag = "";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--tag") tag = String(argv[index + 1] || "");
  }
  if (!/^v?\d+\.\d+\.\d+$/.test(tag)) throw new Error("Usage: build-zip.mjs --tag vX.Y.Z");
  return { version: tag.replace(/^v/, "") };
}

function collect(directory, entries = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (EXCLUDED.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path, entries);
    else entries.push({ name: relative(ROOT, path).split("\\").join("/"), body: readFileSync(path) });
  }
  return entries;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Minimal ZIP: deflated entries, no directory records, no Zip64.
function zip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const deflated = deflateRawSync(entry.body, { level: 9 });
    const stored = deflated.length < entry.body.length;
    const data = stored ? deflated : entry.body;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(stored ? 8 : 0, 8);
    header.writeUInt32LE(crc32(entry.body), 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(entry.body.length, 22);
    header.writeUInt16LE(name.length, 26);
    locals.push(header, name, data);

    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(0x0800, 8);
    record.writeUInt16LE(stored ? 8 : 0, 10);
    record.writeUInt32LE(crc32(entry.body), 16);
    record.writeUInt32LE(data.length, 20);
    record.writeUInt32LE(entry.body.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const { version } = parseArgs(process.argv.slice(2));
const entries = collect(ROOT).map((entry) =>
  entry.name === "manifest.json"
    ? { name: entry.name, body: Buffer.from(`${JSON.stringify({ ...JSON.parse(entry.body.toString("utf8")), version }, null, 2)}\n`) }
    : entry
);

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const zipPath = join(DIST, `Agentor-Bridge-chromium-v${version}.zip`);
writeFileSync(zipPath, zip(entries));
console.log(zipPath);
