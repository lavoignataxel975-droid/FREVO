/**
 * Prépare les photos du site à partir des fichiers fournis dans ../Design (jamais modifiés) :
 * découpe chaque photo (la grande capture en contient six, les captures Instagram ont des
 * éléments d'interface à retirer), puis exporte en WebP à plusieurs largeurs dans public/img.
 *
 *   npm run images
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const design = path.resolve(root, '../../Design');
const out = path.resolve(root, '../public/img');

const BOARD = 'Pics FREVO 1.png';
// Coordonnées mesurées sur la grande capture (1920 × 5697) : bords des photos, 2 px de marge intérieure.
const photos = [
  { name: 'plate-red', file: BOARD, crop: { left: 0, top: 70, width: 1920, height: 820 } },          // assiette rouge sur velours
  { name: 'plate-green', file: BOARD, crop: { left: 34, top: 1439, width: 916, height: 1633 } },     // sauce verte, velours sombre
  { name: 'banquette', file: BOARD, crop: { left: 970, top: 1439, width: 916, height: 1633 } },      // banquette cuir et champagne
  { name: 'counter', file: BOARD, crop: { left: 34, top: 3092, width: 1852, height: 1233 } },        // comptoir et cuisine ouverte
  { name: 'chef', file: BOARD, crop: { left: 34, top: 4345, width: 916, height: 1318 } },            // portrait du chef
  { name: 'plate-amber', file: BOARD, crop: { left: 970, top: 4345, width: 916, height: 1318 } },    // sauce ambrée, velours orange
  // Captures Instagram : on retire la pastille de profil (et la barre en bas de la seconde)
  { name: 'asparagus', file: 'Capture d’écran 2026-10-04 à 15.31.30.png', crop: { left: 0, top: 0, width: 1801, height: 915 } },
  { name: 'gallery', file: 'Capture d’écran 2026-10-04 à 15.31.46.png', crop: { left: 0, top: 0, width: 1811, height: 1630 } },
  { name: 'brigade', file: 'Capture d’écran 2026-10-04 à 15.31.59.png', crop: { left: 0, top: 0, width: 1812, height: 1125 } },
];

const WIDTHS = [480, 800, 1200, 1600, 1920];

await mkdir(out, { recursive: true });
const manifest = {};

for (const p of photos) {
  const base = sharp(path.join(design, p.file)).extract(p.crop);
  const widths = WIDTHS.filter((w) => w < p.crop.width).concat(p.crop.width);
  for (const w of widths) {
    await base.clone().resize({ width: w }).webp({ quality: 76, effort: 5 }).toFile(path.join(out, `${p.name}-${w}.webp`));
  }
  manifest[p.name] = { width: p.crop.width, height: p.crop.height, widths };
  console.log(p.name, `${p.crop.width}×${p.crop.height}`, widths.join(' '));
}

await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
