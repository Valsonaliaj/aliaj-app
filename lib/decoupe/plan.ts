// ══════════════════════════════════════════════════════════════════
// Plan de découpe PDF (A4 paysage) — portage fidèle de pdf_plan.py :
// page de synthèse, plans des panneaux, récapitulatif des pièces.
// Les cotes sont écrites le long des bords, la référence au centre ;
// quand la place manque, on sacrifie les cotes puis la désignation —
// jamais de texte qui déborde de la pièce.
// ══════════════════════════════════════════════════════════════════
import { RLCanvas, mm, shade } from "./rlcanvas";
import type { Panneau, Piece, Place } from "./optimiseur";

const MARGIN = 10 * mm;
const HEADER_H = 16 * mm;
const FOOTER_H = 8 * mm;

const COL_WASTE = "#f4f4f4";
const COL_PANEL = "#333333";
const COL_DIMPAN = "#c0392b"; // cotes hors-tout du panneau
const COL_DIM = "#444444";

// teintes pastel, une par désignation de pièce
const PALETTE = [
  "#cfe0d6", "#f2e6c8", "#ded6ec", "#f5d9d9", "#d2e0f2",
  "#e3eec9", "#f7dcc4", "#cfe8e8", "#eed3e8", "#e8e6cc",
  "#dcd9f0", "#f0d9c0", "#d9ecdc", "#f2dced", "#dce4ec",
  "#eae2d0",
];

const GRAIN_STEP = 1.15 * mm; // écart entre deux traits de veinage
const PAN_DIM_BOT = 8 * mm;   // bande sous le panneau pour la cote hors-tout
const PAN_DIM_RIGHT = 9 * mm; // bande à droite du panneau

const DIM_MAX = 9.0; // taille max des cotes écrites le long des bords
const DIM_MIN = 3.6;

const aire = (p: Panneau) => p.w * p.h;
const utilisee = (p: Panneau) => p.placed.reduce((s, pl) => s + pl.w * pl.h, 0);

export type OptionsPlan = {
  materiau: string;
  projet: string;
  horsFormat?: Piece[];
  stockDef?: [number, number, number][]; // (quantité, fil, travers)
  note?: string;
  sub?: string;
  foot?: string;
  unit?: string; // CHUTE ou PANNEAU
};

export function construirePlan(panneaux: Panneau[], o: OptionsPlan): Blob {
  const c = new RLCanvas("landscape");
  const PW = c.PW, PH = c.PH;
  const material = o.materiau;
  const projet = o.projet;
  const leftover = o.horsFormat ?? [];
  const stockDef = o.stockDef ?? [];
  const unit = o.unit ?? "CHUTE";
  const lab = unit.charAt(0) + unit.slice(1).toLowerCase();
  const couleurs = new Map<string, string>();

  c.setTitle(`Plan de decoupe ${material} - ${projet}`);
  let page = 1;

  const colorFor = (desc: string) => {
    if (!couleurs.has(desc)) couleurs.set(desc, PALETTE[couleurs.size % PALETTE.length]);
    return couleurs.get(desc)!;
  };

  // ── mesures de texte ──────────────────────────────────────────
  const fitFont = (
    lignes: string[],
    boxW: number,
    boxH: number,
    start = 8.4,
    mini = 3.4,
    font = "Helvetica-Bold"
  ): number | null => {
    let size = start;
    while (size >= mini) {
      const lead = size * 1.12;
      if (lignes.length * lead <= boxH - 1) {
        if (lignes.every((t) => c.stringWidth(t, font, size) <= boxW - 1.5)) return size;
      }
      size -= 0.2;
    }
    return null;
  };

  const dimSize = (txt: string, along: number, across: number): number | null => {
    let size = Math.min(DIM_MAX, across * 0.5);
    while (size >= DIM_MIN) {
      if (c.stringWidth(txt, "Helvetica", size) <= along - 2) return size;
      size -= 0.2;
    }
    return null;
  };

  const blockFit = (
    lignes: string[],
    w: number,
    h: number,
    start = 7.8,
    mini = 2.4
  ): [number | null, boolean] => {
    for (const rot of h > w * 1.25 ? [true, false] : [false, true]) {
      const [bw, bh] = rot ? [h, w] : [w, h];
      const size = fitFont(lignes, bw, bh, start, mini);
      if (size) return [size, rot];
    }
    return [null, false];
  };

  // ── étiquetage d'une pièce ────────────────────────────────────
  const labelPiece = (x: number, y: number, pw: number, ph: number, p: Place) => {
    const horiz = p.w, vert = p.h;
    const ref = p.ref || "-";
    const desc = p.desc || "-";
    const both = `${ref}  ${desc}`;
    // les cotes affichées sont celles du DESSIN, justes même si la pièce
    // a été tournée sur un panneau uni
    const txtH = String(Math.round(horiz));
    const txtV = String(Math.round(vert));

    const dimV = (size: number) => {
      c.setFont("Helvetica", size);
      c.setFillColor(COL_DIM);
      c.drawCentredStringRot90(x + 1.3 + size * 0.8, y + ph / 2, txtV);
    };
    const dimHBottom = (size: number) => {
      c.setFont("Helvetica", size);
      c.setFillColor(COL_DIM);
      c.drawCentredString(x + pw / 2, y + 1.3, txtH);
    };
    const dimHInline = (size: number, x0: number) => {
      c.setFont("Helvetica", size);
      c.setFillColor(COL_DIM);
      c.drawString(x0, y + ph / 2 - size * 0.36, txtH);
    };
    const block = (
      lignes: string[],
      x0: number,
      w: number,
      y0: number,
      h: number,
      size: number,
      rot: boolean
    ) => {
      const lead = size * 1.12;
      const cx = x0 + w / 2, cy = y0 + h / 2;
      c.setFont("Helvetica-Bold", size);
      c.setFillColor("#000000");
      const top = ((lignes.length - 1) * lead) / 2;
      for (let j = 0; j < lignes.length; j++) {
        const yoff = top - j * lead - size * 0.36;
        if (rot) c.drawCentredStringRot90(cx, cy, lignes[j], yoff);
        else c.drawCentredString(cx, cy + yoff, lignes[j]);
      }
    };

    const sv = dimSize(txtV, ph, pw);
    const lb = sv ? sv + 3.2 : 0;
    const sh = dimSize(txtH, pw - lb, ph);
    const bb = sh ? sh + 3.2 : 0;

    // 1. cotes aux deux bords, références au centre
    for (const lignes of [[ref, desc], [both], [ref]]) {
      const [size, rot] = blockFit(lignes, pw - lb, ph - bb);
      if (size) {
        if (sv) dimV(sv);
        if (sh) dimHBottom(sh);
        block(lignes, x + lb, pw - lb, y + bb, ph - bb, size, rot);
        return;
      }
    }
    // 2. pièce trop plate : tout sur une ligne, la cote passe à gauche
    if (sh) {
      const dw = c.stringWidth(txtH, "Helvetica", sh) + 3;
      const x0 = x + lb + dw, w0 = pw - lb - dw - 1.5;
      for (const lignes of [[both], [ref]]) {
        const [size, rot] = blockFit(lignes, w0, ph);
        if (size) {
          if (sv) dimV(sv);
          dimHInline(sh, x + lb + 1.5);
          block(lignes, x0, w0, y, ph, size, rot);
          return;
        }
      }
    }
    // 3. la référence prime : on abandonne la cote horizontale
    for (const lignes of [[both], [ref]]) {
      const [size, rot] = blockFit(lignes, pw - lb, ph);
      if (size) {
        if (sv) dimV(sv);
        block(lignes, x + lb, pw - lb, y, ph, size, rot);
        return;
      }
    }
    // 4. dernier recours : plus aucune cote, seulement la référence
    const [size, rot] = blockFit([ref], pw, ph, 7.8, 2.0);
    if (size) block([ref], x, pw, y, ph, size, rot);
  };

  // ── veinage ───────────────────────────────────────────────────
  const drawGrain = (
    x: number, y: number, w: number, h: number, grain: "x" | "y", col: string
  ) => {
    c.setStrokeColor(shade(col, 0.8));
    c.setLineWidth(0.25);
    if (grain === "x") {
      for (let k = GRAIN_STEP; k < h; k += GRAIN_STEP) c.line(x, y + k, x + w, y + k);
    } else {
      for (let k = GRAIN_STEP; k < w; k += GRAIN_STEP) c.line(x + k, y, x + k, y + h);
    }
  };

  // ── cotes hors-tout du panneau ────────────────────────────────
  const drawPanelDims = (ox: number, baseY: number, w: number, h: number, panel: Panneau) => {
    c.setStrokeColor(COL_DIMPAN);
    c.setFillColor(COL_DIMPAN);
    c.setLineWidth(0.5);

    const yb = baseY - 3.6 * mm; // cote du bas
    c.line(ox, yb, ox + w, yb);
    c.line(ox, yb - 1.1 * mm, ox, yb + 1.1 * mm);
    c.line(ox + w, yb - 1.1 * mm, ox + w, yb + 1.1 * mm);
    c.setFont("Helvetica-Bold", 8);
    c.drawCentredString(ox + w / 2, yb - 3.4 * mm, String(panel.w));

    const xr = ox + w + 3.6 * mm; // cote de droite
    c.line(xr, baseY, xr, baseY + h);
    c.line(xr - 1.1 * mm, baseY, xr + 1.1 * mm, baseY);
    c.line(xr - 1.1 * mm, baseY + h, xr + 1.1 * mm, baseY + h);
    c.drawCentredStringRot90(xr + 3.4 * mm, baseY + h / 2, String(panel.h));
  };

  // ── un panneau ────────────────────────────────────────────────
  const drawPanel = (panel: Panneau, ox: number, oy: number, scale: number, title: string) => {
    const w = panel.w * scale, h = panel.h * scale;
    const baseY = oy - 6 * mm - h;

    c.setFont("Helvetica-Bold", 8.5);
    c.setFillColor(COL_PANEL);
    c.drawString(ox, oy - 4 * mm, title);
    const tw = c.stringWidth(title, "Helvetica-Bold", 8.5);
    c.setFont("Helvetica-Bold", 6.5);
    if (!panel.uni) {
      c.setFillColor("#8a6d3b");
      c.drawRightString(
        Math.max(ox + w, ox + tw + 20 * mm),
        oy - 4 * mm,
        panel.grain === "x" ? "fil horizontal" : "fil vertical"
      );
    } else {
      c.setFillColor("#777777");
      c.drawRightString(Math.max(ox + w, ox + tw + 20 * mm), oy - 4 * mm, "couleur unie - sens libre");
    }

    // fond = partie non utilisée du panneau
    c.setFillColor(COL_WASTE);
    c.setStrokeColor(COL_PANEL);
    c.setLineWidth(1.1);
    c.rect(ox, baseY, w, h, 1, 1);

    // coupe de rive : limite de la zone exploitable
    if (panel.trim) {
      const t = panel.trim * scale;
      c.setStrokeColor(COL_DIMPAN);
      c.setLineWidth(0.5);
      c.setDash(2, 2);
      c.rect(ox + t, baseY + t, w - 2 * t, h - 2 * t, 1, 0);
      c.clearDash();
    }

    for (const p of panel.placed) {
      const pw = p.w * scale, ph = p.h * scale;
      // origine du panneau dessinée en HAUT à gauche : pièces calées en haut
      const x = ox + p.x * scale;
      const y = baseY + (panel.h - p.y - p.h) * scale;

      const col = colorFor(p.desc || "-");
      c.setFillColor(col);
      // pièce tournée : contour rouge, son fil part en travers du panneau
      c.setStrokeColor(p.tourne ? COL_DIMPAN : shade(col, 0.55));
      c.setLineWidth(p.tourne ? 1.4 : 0.6);
      c.rect(x, y, pw, ph, 1, 1);
      if (!panel.uni) {
        let axe = panel.grain;
        if (p.tourne) axe = axe === "x" ? "y" : "x";
        drawGrain(x, y, pw, ph, axe, col);
      }
      labelPiece(x, y, pw, ph, p);
    }

    drawPanelDims(ox, baseY, w, h, panel);
    return 6 * mm + h;
  };

  // ── bandeaux ──────────────────────────────────────────────────
  const header = () => {
    c.setFillColor("#1f4e79");
    c.rect(0, PH - HEADER_H, PW, HEADER_H, 0, 1);
    c.setFillColor("#ffffff");
    c.setFont("Helvetica-Bold", 13);
    c.drawString(MARGIN, PH - 7.2 * mm, `MATIERE : ${material}`);
    c.setFont("Helvetica", 9);
    c.drawString(
      MARGIN,
      PH - 12.5 * mm,
      o.sub ??
        `ALIAJ INTERIOR  -  PROJET ${projet}  -  optimisation sur chutes atelier` +
          `  -  trait de scie 5 mm  -  pas de coupe de rive  -  sens du fil respecte`
    );
    c.setFont("Helvetica-Bold", 10);
    c.drawRightString(PW - MARGIN, PH - 9 * mm, `page ${page}`);
  };

  const footer = (txt: string) => {
    c.setFillColor("#777777");
    c.setFont("Helvetica-Oblique", 7);
    c.drawString(MARGIN, 5 * mm, txt);
  };

  let used = panneaux.filter((p) => p.placed.length);
  const uni = panneaux.some((p) => p.uni);
  const totStock = panneaux.reduce((s, p) => s + aire(p), 0);
  const totUsed = panneaux.reduce((s, p) => s + utilisee(p), 0);
  const nPlaced = panneaux.reduce((s, p) => s + p.placed.length, 0);

  // ═══════════════ page de synthèse ═══════════════
  header();
  let y = PH - HEADER_H - 10 * mm;
  c.setFillColor("#000000");
  c.setFont("Helvetica-Bold", 14);
  c.drawString(MARGIN, y, "SYNTHESE");
  y -= 9 * mm;

  c.setFont("Helvetica-Bold", 10);
  c.drawString(MARGIN, y, `Pieces decoupees (${lab.toLowerCase()}s) :`);
  c.setFont("Helvetica", 10);
  c.drawString(MARGIN + 62 * mm, y, `${nPlaced}`);
  y -= 6 * mm;
  c.setFont("Helvetica-Bold", 10);
  c.setFillColor("#b00000");
  c.drawString(MARGIN, y, "Pieces restantes (autre Excel) :");
  c.setFont("Helvetica", 10);
  c.drawString(MARGIN + 62 * mm, y, `${leftover.length}`);
  c.setFillColor("#000000");
  y -= 10 * mm;

  c.setFont("Helvetica-Bold", 10);
  c.drawString(MARGIN, y, "Detail par reference meuble");
  y -= 5.5 * mm;
  c.setFont("Helvetica", 9);
  const done = new Map<string, number>();
  for (const p of panneaux) for (const pl of p.placed) done.set(pl.ref, (done.get(pl.ref) ?? 0) + 1);
  const todo = new Map<string, number>();
  for (const it of leftover) todo.set(it.ref, (todo.get(it.ref) ?? 0) + 1);
  for (const ref of [...new Set([...done.keys(), ...todo.keys()])].sort()) {
    c.drawString(
      MARGIN + 4 * mm,
      y,
      `${ref.padEnd(14)}  ${String(done.get(ref) ?? 0).padStart(3)} piece(s) decoupee(s)   -   ` +
        `${String(todo.get(ref) ?? 0).padStart(3)} restante(s)`
    );
    y -= 4.6 * mm;
  }
  y -= 6 * mm;

  c.setFont("Helvetica-Bold", 10);
  c.drawString(MARGIN, y, "Rendement");
  y -= 5.5 * mm;
  c.setFont("Helvetica", 9);
  c.drawString(MARGIN + 4 * mm, y, `${lab}s utilises : ${used.length} / ${panneaux.length}`);
  y -= 4.4 * mm;
  const totUtile = panneaux.reduce((s, p) => s + (p.w - 2 * p.trim) * (p.h - 2 * p.trim), 0);
  if (totUtile < totStock) {
    // coupe de rive : le brut n'est pas exploitable en entier
    c.drawString(
      MARGIN + 4 * mm, y,
      `Surface decoupee : ${(totUsed / 1e6).toFixed(3)} m2 sur ${(totUtile / 1e6).toFixed(3)}` +
        ` m2 exploitables (${((100 * totUsed) / totUtile).toFixed(1)} %)`
    );
    y -= 4.4 * mm;
    c.drawString(
      MARGIN + 4 * mm, y,
      `                   (${(totStock / 1e6).toFixed(3)} m2 bruts, ` +
        `${((totStock - totUtile) / 1e6).toFixed(3)} m2 perdus en coupe de rive)`
    );
  } else {
    c.drawString(
      MARGIN + 4 * mm, y,
      `Surface decoupee : ${(totUsed / 1e6).toFixed(3)} m2 sur ${(totStock / 1e6).toFixed(3)}` +
        ` m2 de ${lab.toLowerCase()}s (${((100 * totUsed) / totStock).toFixed(1)} %)`
    );
  }
  y -= 4.4 * mm;
  const intacts = new Map<string, number>();
  for (const p of panneaux) if (!p.placed.length) intacts.set(p.label, (intacts.get(p.label) ?? 0) + 1);
  const parts = [...intacts.entries()].map(([l, n]) => `${n} x ${l}`);
  if (!parts.length) parts.push("aucune");
  c.drawString(MARGIN + 4 * mm, y, `${lab}s intacts  :`);
  for (let i = 0; i < parts.length; i += 3) {
    c.drawString(MARGIN + 36 * mm, y, parts.slice(i, i + 3).join("   "));
    y -= 4.4 * mm;
  }

  // ── colonne de droite ──
  const cx = PW / 2 + 6 * mm;
  let cy = PH - HEADER_H - 19 * mm;
  c.setFont("Helvetica-Bold", 10);
  c.drawString(cx, cy, `${lab}s disponibles en stock`);
  cy -= 5.5 * mm;
  c.setFont("Helvetica", 9);
  for (const [qty, fil, trav] of stockDef) {
    c.drawString(cx + 4 * mm, cy, `${String(qty).padStart(2)} x   ${fil} x ${trav}`);
    cy -= 4.4 * mm;
  }
  cy -= 2 * mm;
  c.setFont("Helvetica-Oblique", 8);
  c.drawString(
    cx + 4 * mm, cy,
    uni ? "couleur unie : pas de sens de fil, pieces orientables librement" : "1re dimension = sens du fil"
  );

  // ── légende des couleurs ──
  cy -= 9 * mm;
  c.setFillColor("#000000");
  c.setFont("Helvetica-Bold", 10);
  c.drawString(cx, cy, "Couleur des pieces = designation");
  cy -= 6 * mm;
  const descs = [...new Set(panneaux.flatMap((p) => p.placed.map((pl) => pl.desc || "-")))].sort();
  descs.forEach((d, i) => {
    const bx = cx + 2 * mm + (i % 2) * 62 * mm;
    const by = cy - Math.floor(i / 2) * 5.2 * mm;
    const col = colorFor(d);
    c.setFillColor(col);
    c.setStrokeColor(shade(col, 0.55));
    c.setLineWidth(0.5);
    c.rect(bx, by - 0.8 * mm, 9 * mm, 3.4 * mm, 1, 1);
    if (!uni) drawGrain(bx, by - 0.8 * mm, 9 * mm, 3.4 * mm, "x", col);
    c.setFillColor("#000000");
    c.setFont("Helvetica", 8);
    c.drawString(bx + 11 * mm, by, d);
  });
  cy -= Math.floor((descs.length + 1) / 2) * 5.2 * mm + 5 * mm;
  c.setFillColor("#555555");
  c.setFont("Helvetica-Oblique", 8);
  c.drawString(
    cx, cy,
    uni
      ? "Panneau de couleur unie : aucune contrainte de sens, les pieces peuvent etre tournees."
      : "Les fines rayures dans chaque piece donnent le sens du fil."
  );
  c.drawString(cx, cy - 4 * mm, "Les cotes rouges autour du panneau sont ses dimensions hors-tout.");

  if (o.note) {
    c.setFillColor("#555555");
    c.setFont("Helvetica-Oblique", 8.5);
    c.drawString(MARGIN, 14 * mm, o.note);
  }
  footer(
    "Chaque piece porte au centre : reference meuble + designation. " +
      "Les cotes (mm) sont ecrites le long des bords de la piece."
  );
  c.showPage();
  page += 1;

  // ═══════════════ plans de découpe ═══════════════
  const availW = PW - 2 * MARGIN;
  const topStart = PH - HEADER_H - 4 * mm;
  const bottom = FOOTER_H + 4 * mm;
  const maxH = (topStart - bottom) / 3;
  // un grand panneau prend toute la largeur : le dessin, et donc les cotes,
  // restent lisibles même s'il n'en tient qu'un par page
  const maxHWide = topStart - bottom - 13 * mm - PAN_DIM_BOT;
  const FOOT =
    "Trait de scie 5 mm entre pieces. Aucune coupe sur les rives du panneau " +
    "(chutes deja calibrees). Zone grise = chute restante. " +
    "Le veinage dessine dans chaque piece donne le sens du fil.";

  const colW = (availW - 8 * mm) / 2;
  const echelle = (p: Panneau, aw: number, mh: number) => Math.min(aw / p.w, mh / p.h);
  used = [...used].sort((a, b) => b.w - a.w || b.h - a.h || a.id - b.id);
  const wide = used.filter((p) => p.w > 1100);
  const narrow = used.filter((p) => p.w <= 1100);

  type Case = [Panneau, number, number]; // panneau, échelle, x
  const rows: Case[][] = [];
  for (const p of wide) rows.push([[p, echelle(p, availW - PAN_DIM_RIGHT, maxHWide), MARGIN]]);
  for (let i = 0; i < narrow.length; i += 2) {
    const row: Case[] = [];
    narrow.slice(i, i + 2).forEach((p, k) => {
      row.push([p, echelle(p, colW - PAN_DIM_RIGHT, maxH), MARGIN + k * (colW + 8 * mm)]);
    });
    rows.push(row);
  }

  const besoin = (row: Case[]) =>
    6 * mm + Math.max(...row.map(([p, s]) => p.h * s)) + PAN_DIM_BOT + 5 * mm;

  // remplissage des pages en premier-ajustement
  const pages: Case[][][] = [];
  const pending = [...rows];
  while (pending.length) {
    let reste = topStart - bottom;
    const pageRows: Case[][] = [];
    let i = 0;
    while (i < pending.length) {
      const n = besoin(pending[i]);
      if (n <= reste || !pageRows.length) {
        pageRows.push(pending.splice(i, 1)[0]);
        reste -= n;
      } else i += 1;
    }
    pages.push(pageRows);
  }

  let premiere = true;
  for (const pageRows of pages) {
    if (!premiere) {
      c.showPage();
      page += 1;
    }
    premiere = false;
    header();
    footer(o.foot ?? FOOT);
    let yy = topStart;
    for (const row of pageRows) {
      for (const [panel, s, x] of row) {
        const title =
          `${panel.neuf ? "PANNEAU" : unit} n°${panel.id}   |  ${panel.placed.length} piece(s)` +
          `  |  utilise ${((100 * utilisee(panel)) / aire(panel)).toFixed(0)} %`;
        drawPanel(panel, x, yy, s, title);
      }
      yy -= besoin(row);
    }
  }
  c.showPage();
  page += 1;

  // ═══════════════ récapitulatif des pièces ═══════════════
  const rec: [number, string, string, number, number][] = [];
  for (const panel of used) for (const p of panel.placed) rec.push([panel.id, p.ref, p.desc, p.L, p.W]);
  rec.sort((a, b) => a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]) || a[0] - b[0]);

  const perPage = 40;
  for (let s = 0; s < rec.length; s += perPage * 2) {
    header();
    c.setFillColor("#000000");
    c.setFont("Helvetica-Bold", 12);
    c.drawString(MARGIN, PH - HEADER_H - 7 * mm, "RECAPITULATIF DES PIECES DECOUPEES");
    const chunk = rec.slice(s, s + perPage * 2);
    for (const [k, half] of [chunk.slice(0, perPage), chunk.slice(perPage)].entries()) {
      const x = MARGIN + k * (availW / 2 + 4 * mm);
      let yy = PH - HEADER_H - 14 * mm;
      c.setFont("Helvetica-Bold", 7.5);
      c.drawString(x, yy, unit);
      c.drawString(x + 16 * mm, yy, "REF");
      c.drawString(x + 36 * mm, yy, "DESIGNATION");
      c.drawString(x + 95 * mm, yy, "LONG x LARG");
      yy -= 1.5 * mm;
      c.setStrokeColor("#808080");
      c.setLineWidth(0.4);
      c.line(x, yy, x + availW / 2 - 6 * mm, yy);
      yy -= 3.6 * mm;
      c.setFont("Helvetica", 7.5);
      for (const [pid, ref, desc, L, W] of half) {
        c.drawString(x, yy, `n°${pid}`);
        c.drawString(x + 16 * mm, yy, ref.slice(0, 14));
        c.drawString(x + 36 * mm, yy, desc.slice(0, 34));
        c.drawString(x + 95 * mm, yy, `${L} x ${W}`);
        yy -= 3.9 * mm;
      }
    }
    footer("Recapitulatif - a cocher au fur et a mesure de la decoupe.");
    c.showPage();
    page += 1;
  }

  return c.blob();
}
