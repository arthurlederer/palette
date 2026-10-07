/**
 * Génère les déclinaisons du logo The Good Experience à partir du fichier source (brand/logo-tge.avif) :
 *   public/brand/logo-light.png  logo d'origine (texte blanc) pour fond sombre
 *   public/brand/logo-dark.png   texte noir, « g » rose conservé, pour fond clair
 *   icônes d'application (monogramme « g » sur fond noir)
 * Usage : node scripts/brand-assets.mjs brand/logo-tge.avif public/brand src/app
 */
import sharp from "sharp";
const [src, outDir, appDir] = process.argv.slice(2);
const INK = [17, 17, 17];
(async () => {
  const trimmed = await sharp(src).trim().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = trimmed.info;
  const px = trimmed.data;
  // Version sombre (pour fond clair) : le texte blanc devient noir, le « g » rose est conservé.
  const dark = Buffer.from(px);
  let gMaxX = 0;
  for (let i = 0; i < dark.length; i += 4) {
    const [r, g, a] = [dark[i], dark[i + 1], dark[i + 3]];
    if (a === 0) continue;
    const isPink = r - g > 60;
    if (isPink) { const x = (i / 4) % w; if (x > gMaxX) gMaxX = x; continue; }
    dark[i] = INK[0]; dark[i + 1] = INK[1]; dark[i + 2] = INK[2];
  }
  const raw = { raw: { width: w, height: h, channels: 4 } };
  const H = 160; // hauteur de sortie : nette en @2x jusqu'à 80 px affichés
  await sharp(px, raw).resize({ height: H }).png({ compressionLevel: 9, palette: true }).toFile(`${outDir}/logo-light.png`);
  await sharp(dark, raw).resize({ height: H }).png({ compressionLevel: 9, palette: true }).toFile(`${outDir}/logo-dark.png`);
  // Monogramme « g » pour les icônes
  const markW = gMaxX + 4;
  const mark = await sharp(px, raw).extract({ left: 0, top: 0, width: markW, height: h }).png().toBuffer();
  console.log("trimmed", w, h, "mark width", markW);
  for (const [size, file] of [[512, `${outDir}/icon-512.png`], [192, `${outDir}/icon-192.png`], [180, `${appDir}/apple-icon.png`], [64, `${appDir}/icon.png`]]) {
    const inner = Math.round(size * 0.62);
    const m = await sharp(mark).resize({ height: inner, width: inner, fit: "inside" }).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: "#111111" } })
      .composite([{ input: m, gravity: "center" }])
      .png()
      .toFile(file);
  }
})();
