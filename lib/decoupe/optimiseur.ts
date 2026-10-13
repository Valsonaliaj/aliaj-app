// ══════════════════════════════════════════════════════════════════
// Optimiseur de découpe — port fidèle de optimiseur.py (ALIAJ).
// Règles atelier, non négociables :
//   • trait de scie (kerf) entre deux pièces, réglable, 5 mm par défaut
//   • coupe de rive par chute : 0 si la chute est calibrée, 5 si ébréchée
//   • SENS DU FIL : la 1re dimension est toujours celle du fil, sur le bon
//     comme sur les chutes. Aucune rotation sur un panneau veiné.
//   • un panneau uni (ex. 0U147 CST) n'a pas de fil : rotation autorisée
//   • on découpe tout ce qui rentre ; le reste part en panneaux neufs
// ══════════════════════════════════════════════════════════════════

export type Piece = {
  L: number;        // dimension dans le sens du fil
  W: number;        // dimension en travers
  desc: string;     // REF GLOBAL (nom de la pièce)
  ref: string;      // REF PIECE (position)
  cnc1: string;
  cnc2: string;
  rot?: boolean;    // rotation autorisée pour cette pièce précise
};

export type DefPanneau = {
  id: number;
  w: number;        // dessiné à l'horizontale
  h: number;
  grain: "x" | "y"; // axe du fil
  trim: number;     // coupe de rive sur chacun des 4 bords
  uni: boolean;
  label: string;
  neuf?: boolean;
};

export type Place = Piece & { x: number; y: number; w: number; h: number; tourne: boolean };

export type Panneau = DefPanneau & { free: Rect[]; placed: Place[] };

type Rect = [number, number, number, number]; // x, y, largeur, hauteur

/** Construit les panneaux à partir des chutes notées (quantité, fil, travers). */
export function construireStock(
  chutes: { long_mm: number; larg_mm: number; quantite: number; rive_mm: number }[],
  uni: boolean,
  idOffset = 0
): DefPanneau[] {
  const out: DefPanneau[] = [];
  let n = idOffset;
  for (const c of chutes) {
    for (let i = 0; i < Math.max(1, c.quantite); i++) {
      n++;
      const fil = c.long_mm, trav = c.larg_mm;
      const horizontal = fil >= trav;
      out.push({
        id: n,
        w: horizontal ? fil : trav,
        h: horizontal ? trav : fil,
        grain: horizontal ? "x" : "y",
        trim: c.rive_mm ?? 0,
        uni,
        label: `${fil} x ${trav}`,
      });
    }
  }
  return out;
}

export function panneauNeuf(id: number, long: number, larg: number, uni: boolean): DefPanneau {
  const horizontal = long >= larg;
  return {
    id,
    w: horizontal ? long : larg,
    h: horizontal ? larg : long,
    grain: horizontal ? "x" : "y",
    trim: 0,
    uni,
    label: `NEUF ${long} x ${larg}`,
    neuf: true,
  };
}

const zoneUtile = (p: DefPanneau): Rect => [p.trim, p.trim, p.w - 2 * p.trim, p.h - 2 * p.trim];
const nouveau = (d: DefPanneau): Panneau => ({ ...d, free: [zoneUtile(d)], placed: [] });
const surfaceUtilisee = (p: Panneau) => p.placed.reduce((s, pl) => s + pl.w * pl.h, 0);

/** Encombrement dessiné d'une pièce L(fil) x W(travers) sur ce panneau. */
function empreinte(p: DefPanneau, L: number, W: number): [number, number] {
  return p.grain === "x" ? [L, W] : [W, L];
}

function empreintes(p: DefPanneau, L: number, W: number, rot?: boolean): [number, number, boolean][] {
  const droit: [number, number, boolean] = [...empreinte(p, L, W), false];
  if ((!p.uni && !rot) || L === W) return [droit];
  return [droit, [...empreinte(p, W, L), true]];
}

/** Meilleur rectangle libre : best short side fit. */
function essayerPlacer(p: Panneau, pw: number, ph: number): number | null {
  let best: number | null = null;
  let bestScore: [number, number] | null = null;
  p.free.forEach(([, , fw, fh], i) => {
    if (pw <= fw && ph <= fh) {
      const score: [number, number] = [Math.min(fw - pw, fh - ph), fw * fh];
      if (!bestScore || score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1])) {
        best = i;
        bestScore = score;
      }
    }
  });
  return best;
}

function poser(p: Panneau, idx: number, pw: number, ph: number, info: Piece & { tourne: boolean }, kerf: number) {
  const [x, y, fw, fh] = p.free.splice(idx, 1)[0];
  p.placed.push({ ...info, x, y, w: pw, h: ph });
  // guillotine : le trait de scie n'est réservé que s'il reste de la matière
  const droite: Rect = [x + pw + kerf, y, fw - pw - kerf, ph];
  const haut: Rect = [x, y + ph + kerf, fw, fh - ph - kerf];
  for (const r of [droite, haut]) if (r[2] > 0 && r[3] > 0) p.free.push(r);
}

const TRIS: ((p: Piece) => number[])[] = [
  (it) => [-it.L * it.W, -Math.max(it.L, it.W)],
  (it) => [-Math.max(it.L, it.W), -it.L * it.W],
  (it) => [-it.L, -it.W],
  (it) => [-it.W, -it.L],
];

const cmp = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

function packUneFois(
  items: Piece[],
  defs: DefPanneau[],
  tri: (p: Piece) => number[],
  consolider: boolean,
  kerf: number
): { panneaux: Panneau[]; restes: number[] } {
  const panneaux = defs.map(nouveau);
  const ordre = items.map((_, i) => i).sort((a, b) => cmp(tri(items[a]), tri(items[b])));
  const restes: number[] = [];

  for (const i of ordre) {
    const it = items[i];
    let best: { score: number[]; p: Panneau; idx: number; pw: number; ph: number; tourne: boolean } | null = null;
    for (const p of panneaux) {
      for (const [pw, ph, tourne] of empreintes(p, it.L, it.W, it.rot)) {
        const idx = essayerPlacer(p, pw, ph);
        if (idx === null) continue;
        const [, , fw, fh] = p.free[idx];
        const score = [
          consolider ? (p.placed.length ? 0 : 1) : 0,
          tourne ? 1 : 0,
          Math.min(fw - pw, fh - ph),
          fw * fh,
          p.w * p.h,
        ];
        if (!best || cmp(score, best.score) < 0) best = { score, p, idx, pw, ph, tourne };
      }
    }
    if (!best) { restes.push(i); continue; }
    poser(best.p, best.idx, best.pw, best.ph, { ...it, tourne: best.tourne }, kerf);
  }
  return { panneaux, restes };
}

/** Vide les chutes les moins remplies vers celles déjà entamées. */
function reloger(panneaux: Panneau[], kerf: number): number {
  let libérées = 0;
  let change = true;
  while (change) {
    change = false;
    const candidats = panneaux.filter((p) => p.placed.length).sort((a, b) => surfaceUtilisee(a) - surfaceUtilisee(b));
    for (const src of candidats) {
      const autres = panneaux.filter((p) => p !== src);
      const essai: Panneau[] = autres.map((p) => ({ ...p, free: p.free.map((r) => [...r] as Rect), placed: [...p.placed] }));
      let ok = true;
      for (const pl of src.placed) {
        let cible: { score: number[]; p: Panneau; idx: number; pw: number; ph: number; tourne: boolean } | null = null;
        for (const p of essai) {
          if (!p.placed.length) continue; // ne pas rouvrir une chute intacte
          for (const [pw, ph, tourne] of empreintes(p, pl.L, pl.W, pl.rot)) {
            const idx = essayerPlacer(p, pw, ph);
            if (idx === null) continue;
            const [, , fw, fh] = p.free[idx];
            const score = [tourne ? 1 : 0, Math.min(fw - pw, fh - ph), fw * fh];
            if (!cible || cmp(score, cible.score) < 0) cible = { score, p, idx, pw, ph, tourne };
          }
        }
        if (!cible) { ok = false; break; }
        poser(cible.p, cible.idx, cible.pw, cible.ph, { ...pl, tourne: cible.tourne }, kerf);
      }
      if (ok) {
        const parId = new Map(essai.map((p) => [p.id, p]));
        for (const p of panneaux) {
          if (p === src) { p.free = [zoneUtile(p)]; p.placed = []; }
          else { const t = parId.get(p.id)!; p.free = t.free; p.placed = t.placed; }
        }
        libérées++;
        change = true;
        break;
      }
    }
  }
  return libérées;
}

/** Essaie les 8 combinaisons et garde celle qui découpe le plus de surface. */
export function pack(items: Piece[], defs: DefPanneau[], kerf: number) {
  let best: { score: number[]; panneaux: Panneau[]; restes: number[] } | null = null;
  for (const tri of TRIS) {
    for (const cons of [false, true]) {
      const { panneaux, restes } = packUneFois(items, defs, tri, cons, kerf);
      reloger(panneaux, kerf);
      const score = [
        -panneaux.reduce((s, p) => s + surfaceUtilisee(p), 0),
        restes.length,
        panneaux.filter((p) => p.placed.length).length,
      ];
      if (!best || cmp(score, best.score) < 0) best = { score, panneaux, restes };
    }
  }
  return { panneaux: best!.panneaux, restes: best!.restes };
}

/**
 * Chutes d'abord, puis panneaux neufs pour ce qui reste.
 * Renvoie les panneaux entamés et les pièces qu'on n'a pas pu placer du tout
 * (pièce plus grande que le panneau neuf).
 */
export function optimiser(
  items: Piece[],
  chutes: { long_mm: number; larg_mm: number; quantite: number; rive_mm: number }[],
  opts: { kerf: number; uni: boolean; panneauLong: number; panneauLarg: number }
): { panneaux: Panneau[]; tous: Panneau[]; horsFormat: Piece[]; nbNeufs: number } {
  const { kerf, uni, panneauLong, panneauLarg } = opts;

  const surChutes = pack(items, construireStock(chutes, uni), kerf);
  let reste = surChutes.restes.map((i) => items[i]);
  const panneaux = surChutes.panneaux.filter((p) => p.placed.length);
  // `tous` garde aussi les chutes restees intactes : la synthese du plan en a besoin
  const tous = [...surChutes.panneaux];

  // les neufs se numerotent a la suite des chutes : sans chute on obtient
  // PANNEAU n°1, n°2... et jamais de doublon avec une CHUTE n°x
  let idNeuf = surChutes.panneaux.length;
  let nbNeufs = 0;
  const horsFormat: Piece[] = [];

  // un panneau neuf à la fois, tant qu'il reste des pièces plaçables
  while (reste.length) {
    const def = panneauNeuf(++idNeuf, panneauLong, panneauLarg, uni);
    const essai = pack(reste, [def], kerf);
    const posees = essai.panneaux[0];
    if (!posees.placed.length) {
      horsFormat.push(...reste); // rien ne rentre : pièces plus grandes que le panneau
      break;
    }
    panneaux.push(posees);
    tous.push(posees);
    nbNeufs++;
    reste = essai.restes.map((i) => reste[i]);
  }

  return { panneaux, tous, horsFormat, nbNeufs };
}
