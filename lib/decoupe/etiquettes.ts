// ══════════════════════════════════════════════════════════════════
// Planches d'étiquettes AVERY L7173 (A4, 10 x 99,1 x 57 mm) avec les
// DataMatrix des codes CNC. Portage fidèle de etiquettes.py : les
// symboles sont dessinés en VECTORIEL (pas d'image) pour rester nets à
// l'impression laser et garder un PDF léger.
// ══════════════════════════════════════════════════════════════════
import { RLCanvas, mm } from "./rlcanvas";
import type { Panneau, Place } from "./optimiseur";

const LBL_W = 99.1 * mm;
const LBL_H = 57.0 * mm;
const COLS = 2;
const ROWS = 5;
const MARG_X = 4.65 * mm;
const MARG_Y = 6.0 * mm;
const GAP_X = 2.5 * mm;
const GAP_Y = 0;
const PAD = 3.2 * mm;

// Réglage validé par l'atelier (variante C de la planche d'essai) :
// gris 16 %, 30 mm de large. À garder pour toutes les étiquettes.
const LOGO_W = 30 * mm;
const LOGO_ALPHA = 0.16;
const LOGO_SRC = "/filigrane-aliaj.png";

export type PieceEtiquette = Place & {
  panel: number;
  panel_label: string;
  unit: string;
  mat?: string;
};

// ── DataMatrix ────────────────────────────────────────────────────
const _CACHE = new Map<string, number[][]>();

/** Matrice ECC200 complète (motif de repérage + données + zone de silence),
 *  1 = module noir. On relit le rendu de bwip-js à 1 pixel par module. */
async function dmMatrix(texte: string): Promise<number[][]> {
  const cache = _CACHE.get(texte);
  if (cache) return cache;
  const bwip = (await import("bwip-js/browser")).default;
  const canvas = document.createElement("canvas");
  bwip.toCanvas(canvas, {
    bcid: "datamatrix",
    text: texte,
    scale: 1,
    padding: 2,
    includetext: false,
    backgroundcolor: "FFFFFF",
  });
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  const d = ctx.getImageData(0, 0, w, h).data;
  const m: number[][] = [];
  for (let r = 0; r < h; r++) {
    const ligne: number[] = [];
    for (let c = 0; c < w; c++) {
      const i = (r * w + c) * 4;
      ligne.push(d[i + 3] > 64 && (d[i] + d[i + 1] + d[i + 2]) / 3 < 128 ? 1 : 0);
    }
    m.push(ligne);
  }
  _CACHE.set(texte, m);
  return m;
}

/** Dessine le symbole dans un carré de côté `size`, coin bas-gauche (x, y). */
function drawDataMatrix(c: RLCanvas, m: number[][], x: number, y: number, size: number) {
  const n = m.length;
  const step = size / n;
  c.setFillColor("#ffffff");
  c.rect(x, y, size, size, 0, 1); // fond + zone de silence
  c.setFillColor("#000000");
  for (let r = 0; r < n; r++) {
    const yy = y + (n - 1 - r) * step; // ligne 0 = haut du symbole
    const row = m[r];
    let debut: number | null = null;
    for (let col = 0; col <= n; col++) {
      const on = col < n && row[col] === 1;
      if (on && debut === null) debut = col;
      else if (!on && debut !== null) {
        c.rect(x + debut * step, yy, (col - debut) * step, step, 0, 1);
        debut = null;
      }
    }
  }
}

// ── filigrane ─────────────────────────────────────────────────────
type Logo = { data: string; ratio: number } | null;

async function chargerLogo(): Promise<Logo> {
  try {
    const r = await fetch(LOGO_SRC);
    if (!r.ok) return null;
    const blob = await r.blob();
    const data = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.readAsDataURL(blob);
    });
    const ratio = await new Promise<number>((res) => {
      const img = new Image();
      img.onload = () => res(img.naturalHeight / img.naturalWidth);
      img.onerror = () => res(1);
      img.src = data;
    });
    return { data, ratio };
  } catch {
    return null; // logo absent : étiquettes sans filigrane
  }
}

// ── étiquette ─────────────────────────────────────────────────────
function shrink(c: RLCanvas, txt: string, font: string, size: number, maxw: number, mini = 4.5) {
  let s = size;
  while (s > mini && c.stringWidth(txt, font, s) > maxw) s -= 0.2;
  return s;
}

async function drawLabel(
  c: RLCanvas,
  x: number,
  y: number,
  it: PieceEtiquette,
  idx: number,
  total: number,
  material: string,
  uni: boolean,
  logo: Logo
) {
  const left = x + PAD;
  const top = y + LBL_H - PAD;
  const textW = 50 * mm;

  // filigrane en premier : tout le reste se dessine par-dessus
  if (logo) {
    c.image(logo.data, x + LBL_W / 2, y + LBL_H / 2, LOGO_W, LOGO_W * logo.ratio, LOGO_ALPHA);
  }

  // ── bandeau haut ──
  c.setFillColor("#666666");
  c.setFont("Helvetica", 7);
  c.drawString(left, top - 5, it.mat || material);
  c.setFont("Helvetica-Bold", 7);
  // pas de n° de panneau sur l'etiquette : l'atelier ne s'en sert pas,
  // il est sur le plan de decoupe. Seul le rang reste.
  c.drawRightString(x + LBL_W - PAD, top - 5, `${idx}/${total}`);
  c.setStrokeColor("#bbbbbb");
  c.setLineWidth(0.4);
  c.line(left, top - 8, x + LBL_W - PAD, top - 8);

  // ── bloc texte ──
  let yy = top - 9 * mm;
  const ref = it.ref || "-";
  c.setFillColor("#000000");
  c.setFont("Helvetica-Bold", shrink(c, ref, "Helvetica-Bold", 19, textW));
  c.drawString(left, yy, ref);

  yy -= 7.5 * mm;
  const desc = it.desc || "-";
  c.setFont("Helvetica-Bold", shrink(c, desc, "Helvetica-Bold", 13, textW));
  c.drawString(left, yy, desc);

  yy -= 7 * mm;
  c.setFont("Helvetica", 12);
  c.drawString(left, yy, `${it.L} x ${it.W} mm`);
  yy -= 4.6 * mm;
  if (!uni) {
    c.setFillColor("#b00000");
    if (it.tourne) {
      c.setFont("Helvetica-Bold", 7.5);
      c.drawString(left, yy, `PIECE TOURNEE - fil sur les ${it.W} mm`);
    } else {
      c.setFont("Helvetica", 7.5);
      c.drawString(left, yy, `sens du fil : ${it.L} mm`);
    }
  }

  // ── DataMatrix ──
  const codes = [it.cnc1, it.cnc2].filter(Boolean) as string[];
  const zx = x + LBL_W - PAD;
  const zy = y + PAD + 3.5 * mm;
  if (codes.length === 2) {
    const size = 19 * mm;
    const inverse = [...codes].reverse();
    for (let k = 0; k < inverse.length; k++) {
      const bx = zx - (k + 1) * size - k * 2.5 * mm;
      drawDataMatrix(c, await dmMatrix(inverse[k]), bx, zy, size);
      c.setFillColor("#444444");
      c.setFont("Helvetica-Bold", 6.5);
      c.drawCentredString(bx + size / 2, zy + size + 1.5, `CNC ${2 - k}`);
    }
  } else if (codes.length === 1) {
    const size = 25 * mm;
    const bx = zx - size;
    drawDataMatrix(c, await dmMatrix(codes[0]), bx, zy, size);
    c.setFillColor("#444444");
    c.setFont("Helvetica-Bold", 6.5);
    c.drawCentredString(bx + size / 2, zy + size + 1.5, "CNC 1");
  } else {
    c.setFillColor("#999999");
    c.setFont("Helvetica-Oblique", 8);
    c.drawRightString(zx, zy + 12 * mm, "pas de fichier CNC");
  }

  // ── noms de fichiers en pied d'étiquette ──
  c.setFillColor("#777777");
  let fy = y + PAD - 0.6 * mm;
  for (const code of [...codes].reverse()) {
    c.setFont("Helvetica", shrink(c, code, "Helvetica", 5.6, LBL_W - 2 * PAD, 3.6));
    c.drawRightString(x + LBL_W - PAD, fy, code);
    fy += 2.6 * mm;
  }
}

export async function construireEtiquettes(
  pieces: PieceEtiquette[],
  material: string,
  projet: string,
  options: { uni?: boolean; cutmarks?: boolean } = {}
): Promise<Blob> {
  const c = new RLCanvas("portrait");
  c.setTitle(`Etiquettes ${material} - ${projet}`);
  const logo = await chargerLogo();
  const total = pieces.length;
  const parPage = COLS * ROWS;

  for (let i = 0; i < pieces.length; i++) {
    const slot = i % parPage;
    if (slot === 0 && i) c.showPage();
    const col = slot % COLS;
    const row = Math.floor(slot / COLS);
    const x = MARG_X + col * (LBL_W + GAP_X);
    const y = c.PH - MARG_Y - (row + 1) * LBL_H - row * GAP_Y;
    if (options.cutmarks) {
      c.setStrokeColor("#dddddd");
      c.setLineWidth(0.3);
      c.rect(x, y, LBL_W, LBL_H, 1, 0);
    }
    await drawLabel(c, x, y, pieces[i], i + 1, total, material, options.uni ?? false, logo);
  }
  return c.blob();
}

/** Pièces dans l'ordre du plan de découpe : même ordre de panneaux, puis
 *  lecture haut-gauche → bas-droite à l'intérieur de chaque panneau. */
export function piecesOrdonnees(panneaux: Panneau[]): PieceEtiquette[] {
  const used = panneaux
    .filter((p) => p.placed.length)
    .sort((a, b) => b.w - a.w || b.h - a.h || a.id - b.id);
  const out: PieceEtiquette[] = [];
  for (const panel of used) {
    const triees = [...panel.placed].sort(
      (q, r) => panel.h - q.y - q.h - (panel.h - r.y - r.h) || q.x - r.x
    );
    for (const pl of triees) {
      out.push({
        ...pl,
        panel: panel.id,
        panel_label: panel.label,
        unit: panel.neuf ? "PANNEAU" : "CHUTE",
      });
    }
  }
  return out;
}
