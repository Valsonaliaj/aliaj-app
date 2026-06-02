"use client";

import React, { useRef, useState } from "react";

type LineItem = {
  id: string;
  category: string;
  label: string;
  width: number;
  height: number;
  depth: number;
  qty: number;
  computed_price: number;
  shelves: number;
  drawers: number;
  rails: number;
  doors: number;
  lift_hanger: boolean;
  led_strips: number;
  transport_lift: boolean;
  with_installation: boolean;
  finish_exterior: string;
  finish_interior: string;
  color_exterior_code: string;
  color_interior_code: string;
  discount: number;
  tva_rate: number;
  notes: string;
};

type DevisRecord = {
  id: number;
  client_name: string;
  client_address: string;
  client_phone: string;
  client_email: string;
  items: LineItem[];
  notes: string;
  tva: number;
  global_discount: number;
  created_at: string;
};

function fmt(n: number) {
  return n.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function itemDescription(item: LineItem): string {
  const parts = [];
  if (item.doors > 0) parts.push(`${item.doors} porte${item.doors > 1 ? "s" : ""}`);
  if (item.shelves > 0) parts.push(`${item.shelves} étagère${item.shelves > 1 ? "s" : ""}`);
  if (item.drawers > 0) parts.push(`${item.drawers} tiroir${item.drawers > 1 ? "s" : ""}`);
  if (item.rails > 0) parts.push(`${item.rails} rail${item.rails > 1 ? "s" : ""} penderie`);
  if (item.lift_hanger) parts.push("lift hanger");
  if (item.led_strips > 0) parts.push(`${item.led_strips} strip${item.led_strips > 1 ? "s" : ""} LED`);
  if (item.transport_lift) parts.push("lift transport");
  if (item.with_installation) parts.push("pose incluse");
  if (item.finish_exterior !== "white") parts.push(`ext. ${item.finish_exterior === "color_plain" ? "couleur uni" : "couleur texture"}${item.color_exterior_code ? ` (${item.color_exterior_code})` : ""}`);
  if (item.finish_interior !== "white") parts.push(`int. ${item.finish_interior === "color_plain" ? "couleur uni" : "couleur texture"}${item.color_interior_code ? ` (${item.color_interior_code})` : ""}`);
  return parts.join(" · ");
}

const NAVY = "#1a3055";
const BLUE = "#0180ee";

export default function PrintDevis({ devis, onClose }: { devis: DevisRecord; onClose: () => void }) {
  const docRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const today = new Date();
  const validity = new Date(today);
  validity.setDate(validity.getDate() + 30);
  const fmtDate = (d: Date) => d.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const subtotal = (devis.items || []).reduce((s, item) => s + item.computed_price * item.qty, 0);
  const disc = subtotal * ((devis.global_discount || 0) / 100);
  const afterDiscount = subtotal - disc;
  const discountFactor = subtotal > 0 ? afterDiscount / subtotal : 1;

  const tvaGroups: Record<number, number> = {};
  (devis.items || []).forEach(item => {
    const rate = item.tva_rate ?? devis.tva ?? 21;
    tvaGroups[rate] = (tvaGroups[rate] || 0) + item.computed_price * item.qty;
  });

  const tvaDetails = Object.entries(tvaGroups).map(([rate, base]) => {
    const adjustedBase = base * discountFactor;
    return { rate: Number(rate), base: adjustedBase, amount: adjustedBase * (Number(rate) / 100) };
  });
  const totalTva = tvaDetails.reduce((s, t) => s + t.amount, 0);
  const totalTvac = afterDiscount + totalTva;

  const handlePrint = () => {
    const content = docRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=1200");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: white; }
        @page { margin: 0; size: A4; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const handleDownload = async () => {
    if (!docRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;

      if (imgH <= pageH) {
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, imgH);
      } else {
        // Multi-page support
        let yPos = 0;
        let remaining = imgH;
        let page = 0;
        while (remaining > 0) {
          if (page > 0) pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, -page * pageH, pageW, imgH);
          remaining -= pageH;
          yPos += pageH;
          page++;
        }
      }

      const clientSlug = devis.client_name.replace(/\s+/g, "_").toLowerCase();
      pdf.save(`offre_${clientSlug}_${fmtDate(today).replace(/\//g, "-")}.pdf`);
    } catch (e) {
      alert("Erreur lors de la génération du PDF.");
      console.error(e);
    }
    setDownloading(false);
  };

  const Document = () => (
    <div ref={docRef} style={{
      width: 794, minHeight: 1123,
      background: "white",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{ height: 5, background: NAVY }} />

      <div style={{ padding: "32px 48px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <svg viewBox="0 0 1830.68 1406.12" style={{ width: 72, height: 56 }}>
              <path d="M1000.81,788.35l-2.95-18.87c-6.49-40.69-56.61-90.23-116.18-116.77-19.46-8.26-52.49-22.41-79.02-34.79-67.82,113.23-124.43,222.92-154.51,293.09-8.85,20.64-18.87,11.79-14.74,1.18,36.56-86.1,72.54-158.64,156.28-300.17-11.2-4.72-20.64-9.44-25.36-11.79-17.69-8.85-13.56-38.33,56.02-39.51l16.51-26.54c113.23-186.94,228.81-268.91,245.33-267.15,16.51,1.77,25.36,12.38,21.82,30.08-2.95,17.69-31.85,129.15-60.15,270.68,7.67,1.77,16.51,4.13,25.36,8.85,12.38,7.08,41.28,15.92-25.36,7.08h-2.95c-20.05,106.15-23,136.82-27.72,199.92-.59,1.77,0,3.54-.59,5.31,5.9,38.33,4.72,43.64,4.13,51.31-.59,8.85-11.79,18.28-15.92,17.69-4.13-.59-8.26.59-6.49-5.31,1.77-6.49,4.13-39.51,6.49-64.28ZM796.18,601.41l14.15-23.59c-41.28,2.95-42.46,11.2-37.74,12.38l23.59,11.2ZM1004.35,749.43c3.54-37.74,7.08-72.54,24.77-167.48-63.69-6.49-149.79-5.9-201.69-4.72-6.49,10.03-12.38,20.05-18.28,30.08l76.66,36.56c73.13,34.79,106.15,71.36,118.53,105.56ZM1032.66,566.03c29.49-150.38,60.15-258.3,61.33-268.92,1.18-10.03,2.36-19.46-8.26-20.64-11.2-1.18-153.92,135.05-235.89,264.79l-12.38,19.46c70.77-.59,182.82,4.72,195.2,5.31Z" fill={NAVY}/>
              <path d="M1302.89,405.11c-23.58-56.74-57.45-105.66-100.47-149.44-43.08-43.84-96.03-78.87-151.94-102.94-57.96-24.95-117.18-37.95-180.64-37.95s-125.03,12.65-182.99,37.6c-55.91,24.07-106.1,58.5-149.18,102.35-43.02,43.78-75.26,96.09-98.84,152.83-10.87,26.15-20,52.42-26.06,79.85,10.25-29.04,21.01-56.71,32.45-82.52-28.8,79.22-36.01,140.34-33.35,193.18,3.94-82.58,20.81-150.84,49.24-206.29-33.62,82-44.24,152.02-39.52,214.04-.05-2.94-.08-5.88-.08-8.83,0-252.38,196.15-456.97,438.12-456.97,157.66,0,300.4,85,377.57,215.35,41.26,69.7,60.55,153.7,60.55,241.62-2.27,138.41-58.25,231.61-131.38,310.36,14.99-12.35,30.64-26.12,50-44.99-31.16,51.22-79.97,95.12-147.94,132.4,6.11-2.68,13.78-6.05,22.12-9.71-17.33,11.38-36.59,21.77-55.76,31.21,56.41-22.88,105.07-54.48,145.59-93.58,62.63-60.46,105.77-138.87,127.88-230.77,18.76-68.51,16.41-144.93-2.52-218.1-18.46-71.34-52.69-139.59-98.48-194.4,70.47,74.22,99.54,168.12,116.41,267.82-2.93-32.02-7.14-62.75-13.35-91.47,32.69,105.03,21.08,226.35-21.59,322.56-34.21,77.13-89.99,141.48-135,178-112.82,91.53-246.82,112.94-361.53,96.26,66.19,11.98,138.01,8.89,216.94-13.24-38.91,14.58-86.43,23.33-139.76,28.15,63.65,1.21,125.51-11.96,183.47-36.91,55.91-24.07,106.1-58.5,149.18-102.35,43.02-43.78,77.65-94.68,101.23-151.42,24.39-58.7,35.29-121.1,35.29-185.34s-11.25-127.67-35.65-186.37Z" fill={BLUE}/>
            </svg>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: NAVY }}>ALIAJ INTERIOR</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: NAVY, letterSpacing: "-0.02em" }}>Offre</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Date: {fmtDate(today)}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Valable jusqu'au: {fmtDate(validity)}</div>
          </div>
        </div>

        <div style={{ height: 1, background: "#e2e8f0", marginBottom: 24 }} />

        {/* Emetteur / Destinataire */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: BLUE, letterSpacing: "0.1em", marginBottom: 8 }}>ÉMETTEUR</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>ALIAJ INTERIOR BV</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
              Houtweg 54<br />1140 Evere — Belgique<br />BE 1001.572.510
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: BLUE, letterSpacing: "0.1em", marginBottom: 8 }}>DESTINATAIRE</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>{devis.client_name}</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
              {devis.client_address && <>{devis.client_address}<br /></>}
              {devis.client_phone && <>{devis.client_phone}<br /></>}
              {devis.client_email && <>{devis.client_email}</>}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "#e2e8f0", marginBottom: 24 }} />

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ background: NAVY }}>
              {["DESCRIPTION", "P.U.", "QTÉ", "EXCL.", "REMISE", "TVA", "INCL."].map((h, i) => (
                <th key={h} style={{
                  padding: "10px 10px", fontSize: 10, fontWeight: 700, color: "white",
                  letterSpacing: "0.08em", textAlign: i === 0 ? "left" : "right",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(devis.items || []).map((item, idx) => {
              const rate = item.tva_rate ?? devis.tva ?? 21;
              const excl = item.computed_price * item.qty;
              const discountAmt = excl * ((devis.global_discount || 0) / 100);
              const exclAfterDisc = excl - discountAmt;
              const inclAmt = exclAfterDisc * (1 + rate / 100);
              const desc = itemDescription(item);
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                  <td style={{ padding: "12px 10px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>
                      [{item.label.toUpperCase()}] L{item.width} × H{item.height} × P{item.depth} mm
                    </div>
                    {desc && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{desc}</div>}
                    {item.notes && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontStyle: "italic" }}>{item.notes}</div>}
                  </td>
                  <td style={{ padding: "12px 10px", fontSize: 12, textAlign: "right", color: NAVY }}>€ {fmt(item.computed_price)}</td>
                  <td style={{ padding: "12px 10px", fontSize: 12, textAlign: "right", color: NAVY }}>{item.qty}</td>
                  <td style={{ padding: "12px 10px", fontSize: 12, textAlign: "right", color: NAVY }}>€ {fmt(excl)}</td>
                  <td style={{ padding: "12px 10px", fontSize: 12, textAlign: "right", color: "#94a3b8" }}>
                    {devis.global_discount > 0 ? `${devis.global_discount}%` : "—"}
                  </td>
                  <td style={{ padding: "12px 10px", fontSize: 12, textAlign: "right", color: NAVY }}>{rate}%</td>
                  <td style={{ padding: "12px 10px", fontSize: 12, textAlign: "right", fontWeight: 700, color: NAVY }}>€ {fmt(inclAmt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
          <div style={{ minWidth: 280 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0", fontSize: 13, color: "#475569" }}>
              <span>Total excl. TVA</span>
              <span style={{ fontWeight: 600 }}>€ {fmt(afterDiscount)}</span>
            </div>
            <div style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, letterSpacing: "0.08em", marginBottom: 4 }}>DÉTAIL TVA</div>
              {tvaDetails.map(t => (
                <div key={t.rate} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", padding: "2px 0" }}>
                  <span>TVA {t.rate}% (€ {fmt(t.base)})</span>
                  <span>€ {fmt(t.amount)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", padding: "4px 0 0" }}>
                <span>Total TVA</span>
                <span style={{ fontWeight: 600 }}>€ {fmt(totalTva)}</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: NAVY, borderRadius: 6, marginTop: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "white", letterSpacing: "0.05em" }}>TOTAL INCL. TVA</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "white" }}>€ {fmt(totalTvac)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {devis.notes && (
          <div style={{ borderLeft: `3px solid ${BLUE}`, paddingLeft: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>{devis.notes}</div>
          </div>
        )}
        <div style={{ borderLeft: "3px solid #e2e8f0", paddingLeft: 12, marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Les conditions générales de vente sont en vigueur.</div>
        </div>

        {/* Signature */}
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: "right", marginBottom: 40 }}>
          <div style={{ display: "inline-block", borderTop: `1px solid ${NAVY}`, paddingTop: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, letterSpacing: "0.1em" }}>POUR APPROBATION</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: NAVY, padding: "20px 48px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        {[
          { title: "SOCIÉTÉ", lines: ["ALIAJ INTERIOR BV", "Houtweg 54, 1140 Evere", "TVA BE 1001.572.510"] },
          { title: "BANQUE", lines: ["BE08 7330 7739 4613", "BIC · KREDBEBB"] },
          { title: "CONTACT", lines: ["+32 (0)2 772 28 46", "contact@aliajinterior.be", "www.aliajinterior.be"] },
        ].map(col => (
          <div key={col.title}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", marginBottom: 6 }}>{col.title}</div>
            {col.lines.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>{l}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(15,23,42,0.75)",
      overflowY: "auto",
      padding: "20px 0",
    }}>
      {/* Action bar */}
      <div style={{
        maxWidth: 834, margin: "0 auto 14px",
        display: "flex", gap: 10, justifyContent: "flex-end",
        padding: "0 20px",
      }}>
        <button onClick={handleDownload} disabled={downloading} style={{
          background: "#1a3055", color: "white", border: "none",
          borderRadius: 10, padding: "10px 22px", fontWeight: 700, fontSize: 14,
          cursor: downloading ? "wait" : "pointer", opacity: downloading ? 0.7 : 1,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {downloading ? "⏳ Génération..." : "⬇ Télécharger PDF"}
        </button>
        <button onClick={handlePrint} style={{
          background: "white", color: "#1a3055", border: "1.5px solid #e2e8f0",
          borderRadius: 10, padding: "10px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          🖨️ Imprimer
        </button>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.15)", color: "white", border: "1.5px solid rgba(255,255,255,0.3)",
          borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>✕ Fermer</button>
      </div>

      {/* Document preview */}
      <div style={{ maxWidth: 834, margin: "0 auto", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
        <Document />
      </div>
    </div>
  );
}
