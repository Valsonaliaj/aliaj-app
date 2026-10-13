// ══════════════════════════════════════════════════════════════════
// Remplit le modèle "BON DE COMMANDE" à partir du résultat de conversion.
// Le modèle est servi depuis /modele-bon-de-commande.xlsx : on le charge,
// on écrit les lignes, on renvoie un Blob téléchargeable.
// Colonnes : A matière | B long | C larg | D qté | E REF GLOBAL (nom)
//            F REF PIECE (position) | G CNC 1 | H CNC 2
// ══════════════════════════════════════════════════════════════════
import ExcelJS from "exceljs";
import { COL, type Resultat } from "./engine";

const PREMIERE_LIGNE = 13;
const DERNIERE_COL = 12; // A..L : la zone encadrée du modèle

function nombre(texte: string | undefined): number | null {
  const t = (texte ?? "").trim();
  if (!t) return null;
  const v = parseFloat(t.replace(",", "."));
  return Number.isNaN(v) ? null : v;
}

export async function construireBon(
  resultat: Resultat,
  reference: string,
  modeleUrl = "/modele-bon-de-commande.xlsx"
): Promise<Blob> {
  const reponse = await fetch(modeleUrl);
  if (!reponse.ok) throw new Error("Modèle de bon de commande introuvable.");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await reponse.arrayBuffer());

  const ws = wb.getWorksheet("Feuil1");
  if (!ws) throw new Error("Feuille 'Feuil1' absente du modèle.");

  // A3 : "PROJET:    <référence>" en gardant la mise en forme du modèle
  ws.getCell("A3").value = {
    richText: [
      { text: "PROJET:              " },
      {
        font: { bold: true, size: 14, color: { theme: 1 }, name: "Calibri", family: 2, scheme: "minor" },
        text: ` ${reference}`,
      },
    ],
  };

  // Style de référence : la première ligne de données du modèle
  const styleRef = Array.from({ length: DERNIERE_COL }, (_, i) =>
    ws.getCell(PREMIERE_LIGNE, i + 1).style
  );
  const appliquerStyle = (ligne: number) => {
    for (let c = 1; c <= DERNIERE_COL; c++) {
      const cell = ws.getCell(ligne, c);
      if (!cell.border || !cell.border.left) cell.style = { ...styleRef[c - 1] };
    }
  };

  let r = PREMIERE_LIGNE;
  resultat.groupes.forEach((groupe, i) => {
    if (i > 0) {
      appliquerStyle(r);
      r++; // ligne vide de séparation entre deux matières
    }
    for (const l of groupe.lignes) {
      appliquerStyle(r);
      ws.getCell(r, 1).value = l[COL.matiere] ?? "";
      ws.getCell(r, 2).value = nombre(l[COL.longueur]);
      ws.getCell(r, 3).value = nombre(l[COL.largeur]);
      ws.getCell(r, 4).value = nombre(l[COL.nombre]);
      ws.getCell(r, 5).value = l[COL.nom] ?? "";
      ws.getCell(r, 6).value = l[COL.position] ?? "";
      ws.getCell(r, 7).value = l[COL.cnc1] || null;
      ws.getCell(r, 8).value = l[COL.cnc2] || null;
      r++;
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function nomDuBon(reference: string): string {
  return `BON DE COMMANDE (N-Réf_${reference}).xlsx`;
}
