// ══════════════════════════════════════════════════════════════════
// Petit calque "reportlab" au-dessus de jsPDF : même repère (origine en
// bas à gauche, unités en points) et mêmes primitives que les scripts
// Python de l'atelier, pour que le portage soit ligne à ligne.
// ══════════════════════════════════════════════════════════════════
import { jsPDF } from "jspdf";

export const mm = 72 / 25.4;

type Style = "normal" | "bold" | "italic";
const FONTS: Record<string, [string, Style]> = {
  Helvetica: ["helvetica", "normal"],
  "Helvetica-Bold": ["helvetica", "bold"],
  "Helvetica-Oblique": ["helvetica", "italic"],
};

/** Éclaircit / assombrit une couleur hex (équivalent de _shade). */
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v * f)))
  );
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export class RLCanvas {
  doc: jsPDF;
  PW: number;
  PH: number;
  private police = "Helvetica";
  private taille = 10;
  private remplissage = "#000000";
  private trait = "#000000";
  private epaisseur = 1;
  private tirets: number[] = [];
  private nouvellePage = false;

  constructor(orientation: "portrait" | "landscape") {
    // compress + precision : sans eux jsPDF ecrit des flux non compresses avec
    // 16 decimales par coordonnee -> PDF 15x trop gros, lent a ouvrir.
    this.doc = new jsPDF({ orientation, unit: "pt", format: "a4", compress: true, precision: 3 });
    this.PW = this.doc.internal.pageSize.getWidth();
    this.PH = this.doc.internal.pageSize.getHeight();
    this.doc.setLineJoin("miter");
  }

  /** y du repère reportlab (bas) vers celui de jsPDF (haut). */
  private Y(y: number) {
    return this.PH - y;
  }

  /** jsPDF écrit l'état graphique dans la page COURANTE : après un addPage il
   *  faut tout réappliquer, sinon la nouvelle page repart en noir. */
  private appliquer() {
    const [n, st] = FONTS[this.police] ?? FONTS.Helvetica;
    this.doc.setFont(n, st);
    this.doc.setFontSize(this.taille);
    this.doc.setFillColor(this.remplissage);
    this.doc.setTextColor(this.remplissage);
    this.doc.setDrawColor(this.trait);
    this.doc.setLineWidth(this.epaisseur);
    this.doc.setLineDashPattern(this.tirets, 0);
  }

  private p() {
    if (this.nouvellePage) {
      this.doc.addPage();
      this.nouvellePage = false;
      this.appliquer();
    }
  }

  setTitle(t: string) {
    this.doc.setProperties({ title: t });
  }

  setFont(f: string, s: number) {
    this.police = f;
    this.taille = s;
    // setFont/setFontSize n'écrivent rien dans le flux : on peut toujours les
    // appliquer, et c'est nécessaire pour mesurer un texte (stringWidth).
    const [n, st] = FONTS[f] ?? FONTS.Helvetica;
    this.doc.setFont(n, st);
    this.doc.setFontSize(s);
  }

  /** Comme reportlab : une seule couleur sert au remplissage ET au texte. */
  setFillColor(c: string) {
    this.remplissage = c;
    if (this.nouvellePage) return;
    this.doc.setFillColor(c);
    this.doc.setTextColor(c);
  }
  setStrokeColor(c: string) {
    this.trait = c;
    if (!this.nouvellePage) this.doc.setDrawColor(c);
  }
  setLineWidth(w: number) {
    this.epaisseur = w;
    if (!this.nouvellePage) this.doc.setLineWidth(w);
  }
  setDash(a: number, b: number) {
    this.tirets = [a, b];
    if (!this.nouvellePage) this.doc.setLineDashPattern(this.tirets, 0);
  }
  clearDash() {
    this.tirets = [];
    if (!this.nouvellePage) this.doc.setLineDashPattern([], 0);
  }

  rect(x: number, y: number, w: number, h: number, stroke = 1, fill = 0) {
    if (w <= 0 || h <= 0) return;
    this.p();
    this.doc.rect(x, this.Y(y + h), w, h, fill && stroke ? "FD" : fill ? "F" : "S");
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.p();
    this.doc.line(x1, this.Y(y1), x2, this.Y(y2));
  }

  drawString(x: number, y: number, t: string) {
    this.p();
    this.doc.text(t, x, this.Y(y));
  }
  drawRightString(x: number, y: number, t: string) {
    this.p();
    this.doc.text(t, x, this.Y(y), { align: "right" });
  }
  drawCentredString(x: number, y: number, t: string) {
    this.p();
    this.doc.text(t, x, this.Y(y), { align: "center" });
  }

  /** Texte vertical (rotate 90) centré sur (cx, cy), décalé de `yoff`. */
  drawCentredStringRot90(cx: number, cy: number, t: string, yoff = 0) {
    this.p();
    const w = this.doc.getTextWidth(t);
    this.doc.text(t, cx - yoff, this.Y(cy - w / 2), { angle: 90 });
  }

  stringWidth(t: string, f: string, s: number): number {
    const pf = this.police,
      ps = this.taille;
    this.setFont(f, s);
    const w = this.doc.getTextWidth(t);
    this.setFont(pf, ps);
    return w;
  }

  /** Filigrane : image centrée sur (cx, cy), transparence alpha. */
  image(data: string, cx: number, cy: number, w: number, h: number, alpha = 1) {
    this.p();
    type GS = { GState: new (o: object) => unknown; setGState: (g: unknown) => void };
    const d = this.doc as unknown as GS;
    this.doc.saveGraphicsState();
    d.setGState(new d.GState({ opacity: alpha }));
    this.doc.addImage(data, "PNG", cx - w / 2, this.Y(cy + h / 2), w, h, undefined, "FAST");
    this.doc.restoreGraphicsState();
  }

  showPage() {
    this.nouvellePage = true;
  }

  blob(): Blob {
    return this.doc.output("blob");
  }
}
