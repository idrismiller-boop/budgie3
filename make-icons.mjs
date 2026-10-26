// One-off icon generator. Not needed to build the app: the PNGs are already in /public.
// To regenerate: `npm i --no-save sharp && node scripts/make-icons.mjs`
import sharp from "sharp";
import fs from "fs";

const BG = "#10352F";
// scale s shrinks the artwork towards the centre (maskable icons need a safe zone)
const art = (s = 1) => `
  <g transform="translate(256 256) scale(${s}) translate(-256 -256)">
    <defs><clipPath id="c"><rect x="84" y="206" width="344" height="92" rx="46"/></clipPath></defs>
    <g clip-path="url(#c)">
      <rect x="84" y="206" width="110" height="92" fill="#8FA9EE"/>
      <rect x="200" y="206" width="70" height="92" fill="#F2C14E"/>
      <rect x="276" y="206" width="56" height="92" fill="#9DABB5"/>
      <rect x="338" y="206" width="90" height="92" fill="#59D6B1"/>
    </g>
    <line x1="302" y1="170" x2="302" y2="334" stroke="#fff" stroke-width="6" stroke-dasharray="10 8" stroke-linecap="round"/>
    <rect x="84" y="352" width="344" height="30" rx="15" fill="#ffffff" fill-opacity="0.18"/>
    <rect x="84" y="352" width="214" height="30" rx="15" fill="#59D6B1"/>
    <g fill="#ffffff" fill-opacity="0.5"><circle cx="110" cy="150" r="7"/><circle cx="150" cy="150" r="7"/><circle cx="190" cy="150" r="7"/></g>
  </g>`;
const svg = (full, s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" ${full ? "" : 'rx="112" '}fill="${BG}"/>${art(s)}</svg>`;

const out = "public/";
fs.writeFileSync(out + "favicon.svg", svg(false, 1));
const png = (name, size, markup) => sharp(Buffer.from(markup)).resize(size, size).png().toFile(out + name);
await png("icon-192.png", 192, svg(false, 1));
await png("icon-512.png", 512, svg(false, 1));
await png("icon-maskable-512.png", 512, svg(true, 0.78)); // full-bleed + safe zone
await png("apple-touch-icon.png", 180, svg(true, 0.9));   // iOS rounds the corners itself
console.log("icons written");
