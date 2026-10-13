// ══════════════════════════════════════════════════════════════════
// Moteur de nettoyage / traduction des listes de débit Palette CAD.
// Reprend à l'identique les règles du script convert_cutlist.py :
//   1. on ne garde que les colonnes jusqu'à "Code-barres CNC 2"
//   2. traduction de "Nom de l'objet" via le glossaire
//   3. suppression des lignes dont la MATIÈRE est "Matériel par défaut"
//   4. suppression des lignes dont la largeur vaut 1 mm
//   5. arrondi des cotes à l'entier (x,50 vers le haut), écrit "N,00"
//   6. regroupement par matière, une ligne vide entre chaque
// Les codes-barres ne sont JAMAIS modifiés.
// ══════════════════════════════════════════════════════════════════

export const COL = {
  matiere: 0,
  longueur: 1,
  largeur: 2,
  nombre: 3,
  nom: 4,
  position: 5,
  cnc1: 6,
  cnc2: 7,
} as const;

export const DERNIERE_COLONNE = "Code-barres CNC 2";
export const COLONNE_NOM = "Nom de l'objet";

export type Ligne = string[];

export type TermeGlossaire = {
  cle: string;
  terme_source: string;
  terme_fr: string;
  garder_tel_quel: boolean;
};

export type Reglages = {
  materiau: string;
  veine: boolean;
  kerf_mm: number;
  rive_mm: number;
  panneau_long_mm: number | null;
  panneau_larg_mm: number | null;
  traduire: boolean;
};

export type Resultat = {
  entete: string[];
  groupes: { matiere: string; lignes: Ligne[] }[];
  nbPieces: number;
  supprimeesDefaut: number;
  supprimees1mm: number;
  arrondis: { nom: string; avant: string; apres: string }[];
  inconnus: { terme: string; nb: number }[];
};

/** Minuscules, sans accents, espaces réduits — même règle que normalise() en Python. */
export function normalise(valeur: string): string {
  return valeur
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** 531,33 → "531,00" ; 544,89 → "545,00" ; x,50 vers le haut. */
export function arrondi(texte: string): string {
  const v = parseFloat(texte.replace(",", "."));
  if (Number.isNaN(v)) return texte;
  return `${Math.floor(v + 0.5)},00`;
}

// ── Lecture / écriture cp1252 ─────────────────────────────────────
// Les exports Palette sont en cp1252 sans BOM. Le navigateur sait décoder
// windows-1252, mais ne sait pas l'encoder : la table ci-dessous couvre
// les 32 caractères de 0x80 à 0x9F qui ne suivent pas latin-1.
const CP1252_HAUT: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

export function decodeCp1252(buffer: ArrayBuffer): string {
  return new TextDecoder("windows-1252").decode(buffer);
}

export function encodeCp1252(texte: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(texte.length));
  for (let i = 0; i < texte.length; i++) {
    const code = texte.charCodeAt(i);
    if (code <= 0xff) out[i] = code;
    else out[i] = CP1252_HAUT[code] ?? 0x3f; // '?' si vraiment hors table
  }
  return out;
}

/** Découpe un CSV ';' sans guillemets (format des exports Palette). */
export function parseCsv(texte: string): Ligne[] {
  return texte
    .split(/\r?\n/)
    .map((l) => l.split(";"))
    .filter((cols) => cols.some((c) => c.trim() !== ""));
}

export function versCsv(entete: string[], groupes: Resultat["groupes"]): string {
  const lignes: string[] = [entete.join(";")];
  groupes.forEach((g, i) => {
    if (i > 0) lignes.push(new Array(entete.length).fill("").join(";"));
    g.lignes.forEach((l) => lignes.push(l.join(";")));
  });
  return lignes.join("\r\n") + "\r\n";
}

/**
 * Applique toutes les règles. `glossaire` est indexé par clé normalisée.
 * `matieresExclues` permet les demandes ponctuelles du type
 * « enlève l'agglo et le 00113 de ce bon-là ».
 */
export function convertir(
  brut: Ligne[],
  glossaire: Map<string, TermeGlossaire>,
  options: { traduire?: boolean; matieresExclues?: string[] } = {}
): Resultat {
  const traduire = options.traduire !== false;
  const exclues = (options.matieresExclues ?? []).map(normalise);

  const enteteBrut = brut[0];
  const iFin = enteteBrut.findIndex((c) => c.trim() === DERNIERE_COLONNE);
  if (iFin === -1) {
    throw new Error(`Colonne "${DERNIERE_COLONNE}" introuvable dans le fichier.`);
  }
  const coupe = iFin + 1;
  const entete = enteteBrut.slice(0, coupe);

  const groupes: Resultat["groupes"] = [];
  const index = new Map<string, Ligne[]>();
  const arrondis: Resultat["arrondis"] = [];
  const inconnus = new Map<string, number>();
  let supprimeesDefaut = 0;
  let supprimees1mm = 0;

  for (const brute of brut.slice(1)) {
    const ligne = brute.slice(0, coupe);
    const matiere = normalise(ligne[COL.matiere] ?? "");

    if (matiere === "materiel par defaut") {
      supprimeesDefaut++;
      continue;
    }
    if (exclues.some((m) => matiere.startsWith(m))) continue;

    const largeur = parseFloat((ligne[COL.largeur] ?? "").replace(",", "."));
    if (largeur === 1) {
      supprimees1mm++;
      continue;
    }

    const nomSource = ligne[COL.nom] ?? "";
    const cle = normalise(nomSource);
    if (cle) {
      const terme = glossaire.get(cle);
      if (terme) {
        if (traduire && !terme.garder_tel_quel) ligne[COL.nom] = terme.terme_fr;
      } else {
        inconnus.set(nomSource, (inconnus.get(nomSource) ?? 0) + 1);
      }
    }

    for (const c of [COL.longueur, COL.largeur] as const) {
      const avant = ligne[c];
      const apres = arrondi(avant);
      if (apres !== avant) {
        arrondis.push({ nom: ligne[COL.nom], avant, apres });
        ligne[c] = apres;
      }
    }

    const brute0 = ligne[COL.matiere];
    if (!index.has(brute0)) {
      const lignes: Ligne[] = [];
      index.set(brute0, lignes);
      groupes.push({ matiere: brute0, lignes });
    }
    index.get(brute0)!.push(ligne);
  }

  return {
    entete,
    groupes,
    nbPieces: groupes.reduce((n, g) => n + g.lignes.length, 0),
    supprimeesDefaut,
    supprimees1mm,
    arrondis,
    inconnus: [...inconnus.entries()]
      .map(([terme, nb]) => ({ terme, nb }))
      .sort((a, b) => a.terme.localeCompare(b.terme)),
  };
}

/** Référence par défaut : nom du fichier sans les suffixes Palette. */
export function referenceDepuisNom(nomFichier: string): string {
  return nomFichier
    .replace(/\.csv$/i, "")
    .replace(/_FR$/i, "")
    .replace(/_Panneau_de_bois$/i, "")
    .trim();
}
