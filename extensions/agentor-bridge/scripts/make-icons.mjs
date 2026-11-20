// Generates the extension icons: a blue disc crossed by a light bar (the link
// between the CRM and Agentor). Run after changing the shape or the colours.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const OUT_DIR = resolve(import.meta.dirname, "../assets/icons");
const SIZES = [16, 32, 48, 128];
const DISC = [47, 111, 208];
const BAR = [240, 244, 250];

function pixel(size, x, y) {
  const center = (size - 1) / 2;
  const dx = x - center;
  const dy = y - center;
  const radius = size / 2 - Math.max(1, size / 16);
  const distance = Math.hypot(dx, dy);
  if (distance > radius) return [0, 0, 0, 0];
  const edge = Math.min(1, radius - distance);
  const barHalf = Math.max(1, size / 10);
  const pillarHalf = Math.max(1, size / 14);
  const pillarGap = size / 4;
  const onBar = Math.abs(dy) <= barHalf / 2;
  const onPillar = Math.abs(dy) <= barHalf * 1.8 && Math.abs(Math.abs(dx) - pillarGap) <= pillarHalf / 2;
  const colour = onBar || onPillar ? BAR : DISC;
  return [...colour, Math.round(255 * edge)];
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crcTable = chunk.table || (chunk.table = buildCrcTable());
  let crc = 0xffffffff;
  for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(size, x, y);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
      offset += 4;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = resolve(OUT_DIR, `bridge-${size}.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, png(size));
  console.log(`- ${file}`);
}
