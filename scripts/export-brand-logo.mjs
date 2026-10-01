import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSvg = join(root, "public/brand/crystal.svg");
const outDir = join(root, "public/brand/logo");

mkdirSync(outDir, { recursive: true });

const exports = [
  { name: "hero.png", width: 640, height: 640 },
  { name: "signet.png", width: 512, height: 512 },
  { name: "icon-192.png", width: 192, height: 192 },
  { name: "favicon-32.png", width: 32, height: 32 },
];

copyFileSync(sourceSvg, join(outDir, "signet.svg"));

function rasterizeSvg(width, height) {
  return sharp(sourceSvg, { density: 300 })
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .png({ compressionLevel: 9, force: true });
}

for (const item of exports) {
  await rasterizeSvg(item.width, item.height).toFile(join(outDir, item.name));
}

await rasterizeSvg(512, 512).toFile(join(root, "src/app/icon.png"));
await rasterizeSvg(180, 180).toFile(join(root, "src/app/apple-icon.png"));

writeFileSync(
  join(outDir, "manifest.json"),
  `${JSON.stringify(
    {
      source: "Picorn vector signet (Cry Console)",
      updatedAt: new Date().toISOString(),
      files: {
        "signet.svg": "Logo vetorial principal (hero auth, header, favicon SVG)",
        "signet.png": "Logo raster 512px, fundo transparente",
        "hero.png": "Logo raster 640px (alternativa ao SVG no hero)",
        "icon-192.png": "Ícone PWA / Apple touch",
        "favicon-32.png": "Favicon raster 32px",
      },
      regenerate:
        "pnpm brand:export-logo (PNG a partir do signet.svg; vetor gerado via Picorn)",
    },
    null,
    2,
  )}\n`,
);

console.log("Brand logo exported to public/brand/logo/");
