"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import PrintDevis from "./PrintDevis";

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = { id: number; project_number: string; client_name: string };

type ProductCategory = "angle" | "armoire" | "cuisine" | "dressing" | "tv" | "bibliotheque" | "salle_de_bain" | "bureau" | "buanderie";

type FinishType = "white" | "color_plain" | "color_texture";

type LineItem = {
  id: string;
  category: ProductCategory;
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
  finish_exterior: FinishType;
  finish_interior: FinishType;
  color_exterior_code: string;
  color_interior_code: string;
  discount: number;
  tva_rate: number;
  notes: string;
};

type DevisForm = {
  client_name: string;
  client_address: string;
  client_phone: string;
  client_email: string;
  project_id: string;
  notes: string;
  tva: number;
  global_discount: number;
};

type DevisRecord = {
  id: number;
  devis_number: string;
  client_name: string;
  client_address: string;
  client_phone: string;
  client_email: string;
  project_id: number | null;
  items: LineItem[];
  notes: string;
  tva: number;
  global_discount: number;
  created_at: string;
};

// ─── Pricing Engine ───────────────────────────────────────────────────────────

const PRICING = {
  angle: { carcass_base: 667.69, ref_width: 100, ref_height: 250, ref_depth: 60 },
  armoire: { carcass_base: 450, ref_width: 100, ref_height: 220, ref_depth: 58 },
  cuisine: { carcass_base: 800, ref_width: 120, ref_height: 220, ref_depth: 60 },
  dressing: { carcass_base: 550, ref_width: 120, ref_height: 220, ref_depth: 58 },
  tv: { carcass_base: 300, ref_width: 160, ref_height: 50, ref_depth: 45 },
  bibliotheque: { carcass_base: 350, ref_width: 100, ref_height: 200, ref_depth: 35 },
  salle_de_bain: { carcass_base: 400, ref_width: 100, ref_height: 80, ref_depth: 50 },
  bureau: { carcass_base: 380, ref_width: 140, ref_height: 75, ref_depth: 70 },
  buanderie: { carcass_base: 420, ref_width: 120, ref_height: 200, ref_depth: 55 },
};

const UNIT = {
  shelf: 35,
  drawer: 130,
  rail: 29,
  door: 120,
  lift_hanger: 145,
  led_strip: 220,
  transport_lift: 75,
  installation_per_ml: 200,
  finish_color_plain_per_m2: 60,
  finish_color_texture_per_m2: 80,
};

function scaleCarcass(category: ProductCategory, w: number, h: number, d: number): number {
  const ref = PRICING[category];
  const refVolume = ref.ref_width * ref.ref_height * ref.ref_depth;
  const newVolume = w * h * d;
  return ref.carcass_base * (newVolume / refVolume);
}

function surfaceM2(w: number, h: number, d: number): number {
  return ((w * h) + (2 * d * h) + (w * d)) / 10000;
}

function computePrice(item: Omit<LineItem, "computed_price" | "id" | "label">): number {
  const carcass = scaleCarcass(item.category, item.width, item.height, item.depth);
  const extSurface = surfaceM2(item.width, item.height, item.depth);
  const intSurface = (item.width * item.height) / 10000;

  let finishExtCost = 0;
  if (item.finish_exterior === "color_plain") finishExtCost = extSurface * UNIT.finish_color_plain_per_m2;
  else if (item.finish_exterior === "color_texture") finishExtCost = extSurface * UNIT.finish_color_texture_per_m2;

  let finishIntCost = 0;
  if (item.finish_interior === "color_plain") finishIntCost = intSurface * UNIT.finish_color_plain_per_m2;
  else if (item.finish_interior === "color_texture") finishIntCost = intSurface * UNIT.finish_color_texture_per_m2;

  const subtotal = carcass
    + item.shelves * UNIT.shelf
    + item.drawers * UNIT.drawer
    + item.rails * UNIT.rail
    + item.doors * UNIT.door
    + (item.lift_hanger ? UNIT.lift_hanger : 0)
    + item.led_strips * UNIT.led_strip
    + (item.transport_lift ? UNIT.transport_lift : 0)
    + (item.with_installation ? (item.width / 100) * UNIT.installation_per_ml : 0)
    + finishExtCost + finishIntCost;

  return Math.round(subtotal * (1 - item.discount / 100) * 100) / 100;
}

// ─── Product definitions ──────────────────────────────────────────────────────

const PRODUCTS: { id: ProductCategory; label: string; ready: boolean }[] = [
  { id: "angle", label: "Armoire sous pente", ready: true },
  { id: "armoire", label: "Armoire", ready: false },
  { id: "cuisine", label: "Cuisine", ready: false },
  { id: "dressing", label: "Dressing", ready: false },
  { id: "tv", label: "Meuble TV", ready: false },
  { id: "bibliotheque", label: "Bibliothèque", ready: false },
  { id: "salle_de_bain", label: "Salle de bain", ready: false },
  { id: "bureau", label: "Bureau", ready: false },
  { id: "buanderie", label: "Buanderie", ready: false },
];

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function SvgAngle({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <path d="M4 4 H38 V38 H68 V68 H4 Z" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="21" y1="4" x2="21" y2="38" stroke="#BFDBFE" strokeWidth="1"/>
      <line x1="4" y1="21" x2="38" y2="21" stroke="#BFDBFE" strokeWidth="1"/>
      <line x1="53" y1="38" x2="53" y2="68" stroke="#BFDBFE" strokeWidth="1"/>
      <line x1="38" y1="53" x2="68" y2="53" stroke="#BFDBFE" strokeWidth="1"/>
      <circle cx="21" cy="28" r="2" fill="#3B82F6"/>
      <circle cx="53" cy="58" r="2" fill="#3B82F6"/>
    </svg>
  );
}

function SvgArmoire({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <rect x="6" y="4" width="60" height="64" rx="3" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/>
      <line x1="36" y1="4" x2="36" y2="68" stroke="#BFDBFE" strokeWidth="1.5"/>
      <line x1="6" y1="24" x2="36" y2="24" stroke="#BFDBFE" strokeWidth="1"/>
      <line x1="6" y1="44" x2="36" y2="44" stroke="#BFDBFE" strokeWidth="1"/>
      <rect x="38" y="48" width="26" height="8" rx="1" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1"/>
      <rect x="38" y="58" width="26" height="8" rx="1" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1"/>
      <circle cx="23" cy="38" r="2" fill="#3B82F6"/>
      <circle cx="49" cy="28" r="2" fill="#3B82F6"/>
    </svg>
  );
}

function SvgCuisine({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <rect x="4" y="36" width="64" height="26" rx="2" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/>
      <line x1="26" y1="36" x2="26" y2="62" stroke="#BFDBFE" strokeWidth="1.5"/>
      <line x1="48" y1="36" x2="48" y2="62" stroke="#BFDBFE" strokeWidth="1.5"/>
      <rect x="2" y="32" width="68" height="5" rx="1" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1"/>
      <rect x="4" y="8" width="40" height="20" rx="2" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/>
      <line x1="24" y1="8" x2="24" y2="28" stroke="#BFDBFE" strokeWidth="1.5"/>
      <rect x="12" y="43" width="6" height="2" rx="1" fill="#3B82F6"/>
      <rect x="34" y="43" width="6" height="2" rx="1" fill="#3B82F6"/>
      <rect x="56" y="43" width="6" height="2" rx="1" fill="#3B82F6"/>
      <ellipse cx="58" cy="18" rx="8" ry="5" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1"/>
    </svg>
  );
}

function SvgDressing({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <rect x="4" y="4" width="64" height="64" rx="2" fill="#F0FDF4" stroke="#22C55E" strokeWidth="1.5"/>
      <rect x="4" y="4" width="20" height="64" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1"/>
      <rect x="48" y="4" width="20" height="64" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1"/>
      <line x1="4" y1="26" x2="24" y2="26" stroke="#86EFAC" strokeWidth="1"/>
      <line x1="4" y1="44" x2="24" y2="44" stroke="#86EFAC" strokeWidth="1"/>
      <line x1="48" y1="26" x2="68" y2="26" stroke="#86EFAC" strokeWidth="1"/>
      <line x1="48" y1="44" x2="68" y2="44" stroke="#86EFAC" strokeWidth="1"/>
      <line x1="24" y1="16" x2="48" y2="16" stroke="#16A34A" strokeWidth="2"/>
      <path d="M30 16 L30 11 Q33 8 36 11 L36 16" stroke="#16A34A" strokeWidth="1" fill="none"/>
      <rect x="28" y="52" width="16" height="7" rx="1" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1"/>
    </svg>
  );
}

function SvgTV({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <rect x="4" y="22" width="64" height="38" rx="3" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/>
      <rect x="8" y="26" width="36" height="30" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1"/>
      <rect x="10" y="28" width="32" height="26" rx="1" fill="#1E40AF"/>
      <line x1="46" y1="34" x2="62" y2="34" stroke="#BFDBFE" strokeWidth="1"/>
      <line x1="46" y1="44" x2="62" y2="44" stroke="#BFDBFE" strokeWidth="1"/>
      <line x1="46" y1="54" x2="62" y2="54" stroke="#BFDBFE" strokeWidth="1"/>
      <rect x="4" y="58" width="64" height="4" rx="1" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1"/>
      <rect x="8" y="20" width="36" height="3" rx="1" fill="#FDE68A" opacity="0.9"/>
    </svg>
  );
}

function SvgBiblio({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <rect x="6" y="4" width="60" height="64" rx="3" fill="#FFF7ED" stroke="#F97316" strokeWidth="1.5"/>
      <line x1="6" y1="20" x2="66" y2="20" stroke="#FED7AA" strokeWidth="1.5"/>
      <line x1="6" y1="36" x2="66" y2="36" stroke="#FED7AA" strokeWidth="1.5"/>
      <line x1="6" y1="52" x2="66" y2="52" stroke="#FED7AA" strokeWidth="1.5"/>
      <rect x="10" y="8" width="6" height="12" rx="1" fill="#F87171"/>
      <rect x="17" y="9" width="5" height="11" rx="1" fill="#60A5FA"/>
      <rect x="23" y="8" width="7" height="12" rx="1" fill="#34D399"/>
      <rect x="31" y="9" width="4" height="11" rx="1" fill="#FBBF24"/>
      <rect x="10" y="24" width="5" height="12" rx="1" fill="#A78BFA"/>
      <rect x="16" y="24" width="7" height="12" rx="1" fill="#F472B6"/>
      <rect x="36" y="4" width="1.5" height="64" fill="#FED7AA"/>
    </svg>
  );
}

function SvgSDB({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <rect x="6" y="30" width="60" height="32" rx="3" fill="#F0F9FF" stroke="#0EA5E9" strokeWidth="1.5"/>
      <ellipse cx="36" cy="30" rx="16" ry="5" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="1.5"/>
      <ellipse cx="36" cy="30" rx="12" ry="3.5" fill="#BAE6FD" stroke="#38BDF8" strokeWidth="1"/>
      <rect x="34" y="22" width="4" height="6" rx="1" fill="#0EA5E9"/>
      <rect x="30" y="22" width="12" height="2" rx="1" fill="#0EA5E9"/>
      <rect x="10" y="42" width="22" height="8" rx="1" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="1"/>
      <rect x="40" y="42" width="22" height="8" rx="1" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="1"/>
      <rect x="12" y="6" width="48" height="20" rx="2" fill="#BAE6FD" stroke="#0EA5E9" strokeWidth="1.5"/>
      <rect x="14" y="8" width="44" height="16" rx="1" fill="#E0F9FF" opacity="0.8"/>
    </svg>
  );
}

function SvgBureau({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <rect x="4" y="30" width="64" height="6" rx="2" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="1.5"/>
      <rect x="4" y="36" width="20" height="28" rx="2" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/>
      <rect x="6" y="40" width="16" height="6" rx="1" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1"/>
      <rect x="6" y="48" width="16" height="6" rx="1" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1"/>
      <rect x="6" y="56" width="16" height="6" rx="1" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1"/>
      <rect x="50" y="36" width="6" height="28" rx="2" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/>
      <rect x="4" y="6" width="64" height="10" rx="2" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/>
      <rect x="4" y="18" width="64" height="10" rx="2" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/>
    </svg>
  );
}

function SvgBuanderie({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      {/* Cabinet shell */}
      <rect x="4" y="8" width="64" height="56" rx="3" fill="#F0F9FF" stroke="#0EA5E9" strokeWidth="1.5"/>
      {/* Washing machine door circle */}
      <circle cx="28" cy="36" r="16" fill="#BAE6FD" stroke="#0EA5E9" strokeWidth="1.5"/>
      <circle cx="28" cy="36" r="11" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1"/>
      <circle cx="28" cy="36" r="6" fill="#F0F9FF" stroke="#7DD3FC" strokeWidth="1"/>
      {/* Control panel top */}
      <rect x="6" y="10" width="60" height="10" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1"/>
      <circle cx="14" cy="15" r="2.5" fill="#0EA5E9"/>
      <circle cx="22" cy="15" r="2.5" fill="#38BDF8"/>
      <rect x="30" y="12" width="30" height="6" rx="2" fill="#BAE6FD" stroke="#7DD3FC" strokeWidth="1"/>
      {/* Right cabinet panel */}
      <rect x="46" y="22" width="20" height="40" rx="2" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="1"/>
      <line x1="46" y1="42" x2="66" y2="42" stroke="#BAE6FD" strokeWidth="1"/>
      <rect x="48" y="24" width="6" height="2" rx="1" fill="#0EA5E9" opacity="0.6"/>
    </svg>
  );
}

function ProductSvgFallback({ category, size }: { category: ProductCategory; size: number }) {
  switch (category) {
    case "angle": return <SvgAngle size={size} />;
    case "armoire": return <SvgArmoire size={size} />;
    case "cuisine": return <SvgCuisine size={size} />;
    case "dressing": return <SvgDressing size={size} />;
    case "tv": return <SvgTV size={size} />;
    case "bibliotheque": return <SvgBiblio size={size} />;
    case "salle_de_bain": return <SvgSDB size={size} />;
    case "bureau": return <SvgBureau size={size} />;
    case "buanderie": return <SvgBuanderie size={size} />;
  }
}

function ProductSvg({ category, size = 72 }: { category: ProductCategory; size?: number }) {
  const [imgError, setImgError] = useState(false);
  if (!imgError) {
    return (
      <img
        src={`/products/${category}.jpg`}
        alt={category}
        onError={() => setImgError(true)}
        style={{ width: size, height: size, objectFit: "cover", borderRadius: 8 }}
      />
    );
  }
  return <ProductSvgFallback category={category} size={size} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function fmt(n: number) {
  return n.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function defaultItem(category: ProductCategory): Omit<LineItem, "id" | "label" | "computed_price"> {
  const dims: Record<ProductCategory, [number, number, number]> = {
    angle: [100, 250, 60],
    armoire: [100, 220, 58],
    cuisine: [300, 220, 60],
    dressing: [200, 220, 58],
    tv: [160, 50, 45],
    bibliotheque: [100, 200, 35],
    salle_de_bain: [100, 80, 50],
    bureau: [140, 75, 70],
    buanderie: [120, 200, 55],
  };
  const [w, h, d] = dims[category];
  return {
    category, width: w, height: h, depth: d, qty: 1,
    shelves: 4, drawers: 0, rails: 0, doors: 2,
    lift_hanger: false, led_strips: 0, transport_lift: false,
    with_installation: false,
    finish_exterior: "white", finish_interior: "white",
    color_exterior_code: "", color_interior_code: "",
    discount: 0, tva_rate: 21, notes: "",
  };
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  blue: "#1E3A8A",
  blue_light: "#3B82F6",
  blue_pale: "#EFF6FF",
  blue_border: "#BFDBFE",
  text: "#0F172A",
  text_mid: "#334155",
  text_light: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  green: "#16A34A",
  green_pale: "#F0FDF4",
  red: "#DC2626",
  red_pale: "#FEF2F2",
  orange: "#EA580C",
};

const s = {
  card: {
    background: C.white,
    borderRadius: 16,
    border: `1px solid ${C.border}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    padding: 24,
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    fontSize: 14,
    fontWeight: 500,
    outline: "none",
    boxSizing: "border-box" as const,
    background: C.white,
    color: C.text,
  } as React.CSSProperties,
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: C.text_light,
    marginBottom: 5,
    display: "block",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  } as React.CSSProperties,
  btnPrimary: {
    background: C.blue,
    color: C.white,
    border: "none",
    borderRadius: 10,
    padding: "11px 22px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    letterSpacing: "0.01em",
  } as React.CSSProperties,
  btnOutline: {
    background: "transparent",
    color: C.blue,
    border: `1.5px solid ${C.blue_border}`,
    borderRadius: 10,
    padding: "11px 22px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  } as React.CSSProperties,
  btnDanger: {
    background: C.red_pale,
    color: C.red,
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  } as React.CSSProperties,
};

// ─── Stepper input ────────────────────────────────────────────────────────────

function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden", width: "fit-content" }}>
      <button onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 34, height: 36, background: C.bg, border: "none", cursor: "pointer", fontSize: 18, color: C.text_mid, fontWeight: 700 }}>−</button>
      <span style={{ minWidth: 36, textAlign: "center", fontSize: 15, fontWeight: 700, color: C.text, padding: "0 4px" }}>{value}</span>
      <button onClick={() => onChange(value + 1)}
        style={{ width: 34, height: 36, background: C.bg, border: "none", cursor: "pointer", fontSize: 18, color: C.text_mid, fontWeight: 700 }}>+</button>
    </div>
  );
}

// ─── Price breakdown ──────────────────────────────────────────────────────────

function PriceBreakdown({ item }: { item: LineItem }) {
  const carcass = scaleCarcass(item.category, item.width, item.height, item.depth);
  const extSurface = surfaceM2(item.width, item.height, item.depth);
  const intSurface = (item.width * item.height) / 10000;
  const rows = [
    { label: "Caisson de base", value: carcass },
    item.doors > 0 && { label: `Portes (${item.doors}×)`, value: item.doors * UNIT.door },
    item.shelves > 0 && { label: `Étagères (${item.shelves}×)`, value: item.shelves * UNIT.shelf },
    item.drawers > 0 && { label: `Tiroirs (${item.drawers}×)`, value: item.drawers * UNIT.drawer },
    item.rails > 0 && { label: `Rails penderie (${item.rails}×)`, value: item.rails * UNIT.rail },
    item.lift_hanger && { label: "Lift hanger", value: UNIT.lift_hanger },
    item.led_strips > 0 && { label: `LED (${item.led_strips}×)`, value: item.led_strips * UNIT.led_strip },
    item.transport_lift && { label: "Lift transport", value: UNIT.transport_lift },
    item.with_installation && { label: `Pose (${(item.width / 100).toFixed(2)}m)`, value: (item.width / 100) * UNIT.installation_per_ml },
    item.finish_exterior === "color_plain" && { label: "Finition ext. (uni)", value: extSurface * UNIT.finish_color_plain_per_m2 },
    item.finish_exterior === "color_texture" && { label: "Finition ext. (texture)", value: extSurface * UNIT.finish_color_texture_per_m2 },
    item.finish_interior === "color_plain" && { label: "Finition int. (uni)", value: intSurface * UNIT.finish_color_plain_per_m2 },
    item.finish_interior === "color_texture" && { label: "Finition int. (texture)", value: intSurface * UNIT.finish_color_texture_per_m2 },
  ].filter(Boolean) as { label: string; value: number }[];

  const subtotal = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div style={{ fontSize: 12, color: C.text_mid }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "2px 0", borderBottom: `1px solid ${C.border}` }}>
          <span>{r.label}</span>
          <span style={{ fontWeight: 700 }}>{fmt(r.value)}</span>
        </div>
      ))}
      {item.discount > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0", color: C.green, fontWeight: 700 }}>
          <span>Remise {item.discount}%</span>
          <span>−{fmt(subtotal * item.discount / 100)}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0", fontWeight: 900, color: C.blue, fontSize: 13, marginTop: 2 }}>
        <span>Total HTVA</span>
        <span>{fmt(item.computed_price)}</span>
      </div>
    </div>
  );
}

// ─── Address autocomplete ─────────────────────────────────────────────────────

type NominatimResult = {
  place_id: number;
  address: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
};

function formatAddress(a: NominatimResult["address"]): string {
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.municipality || "";
  const parts = [street, a.postcode && city ? `${a.postcode} ${city}` : city].filter(Boolean);
  return parts.join(", ");
}

function AddressInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (v: string) => {
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.length < 4) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=be&limit=6&q=${encodeURIComponent(v)}`,
          { headers: { "Accept-Language": "fr" } }
        );
        const data: NominatimResult[] = await res.json();
        // Filter to only results that have a road (actual addresses)
        const filtered = data.filter(r => r.address?.road);
        setSuggestions(filtered);
        setOpen(filtered.length > 0);
      } catch { /* ignore */ }
    }, 350);
  };

  const pick = (result: NominatimResult) => {
    onChange(formatAddress(result.address));
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rue, ville (Belgique)"
        style={s.input}
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: C.white, border: `1.5px solid ${C.blue_border}`,
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          overflow: "hidden", marginTop: 4,
        }}>
          {suggestions.map(r => (
            <div key={r.place_id}
              onMouseDown={() => pick(r)}
              style={{
                padding: "10px 14px", fontSize: 13, color: C.text_mid, cursor: "pointer",
                borderBottom: `1px solid ${C.border}`,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.blue_pale)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontWeight: 600, color: C.text }}>{[r.address.road, r.address.house_number].filter(Boolean).join(" ")}</span>
              {(r.address.postcode || r.address.city || r.address.town) && (
                <span style={{ color: C.text_light }}>{" — "}{[r.address.postcode, r.address.city || r.address.town || r.address.village].filter(Boolean).join(" ")}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Configurator modal ───────────────────────────────────────────────────────

function ConfiguratorModal({
  category, existing, onSave, onClose,
}: {
  category: ProductCategory;
  existing?: LineItem;
  onSave: (item: LineItem) => void;
  onClose: () => void;
}) {
  const productLabel = PRODUCTS.find(p => p.id === category)!.label;
  const def = existing || { ...defaultItem(category), id: uid(), label: productLabel, computed_price: 0 };

  const [w, setW] = useState(def.width);
  const [h, setH] = useState(def.height);
  const [d, setD] = useState(def.depth);
  const [shelves, setShelves] = useState(def.shelves);
  const [drawers, setDrawers] = useState(def.drawers);
  const [rails, setRails] = useState(def.rails);
  const [doors, setDoors] = useState(def.doors);
  const [liftHanger, setLiftHanger] = useState(def.lift_hanger);
  const [ledStrips, setLedStrips] = useState(def.led_strips);
  const [transportLift, setTransportLift] = useState(def.transport_lift);
  const [withInstallation, setWithInstallation] = useState(def.with_installation);
  const [finishExt, setFinishExt] = useState<FinishType>(def.finish_exterior);
  const [finishInt, setFinishInt] = useState<FinishType>(def.finish_interior);
  const [colorExtCode, setColorExtCode] = useState(def.color_exterior_code);
  const [colorIntCode, setColorIntCode] = useState(def.color_interior_code);
  const [discount, setDiscount] = useState(def.discount);
  const [tvaRate, setTvaRate] = useState(def.tva_rate ?? 21);
  const [notes, setNotes] = useState(def.notes);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  const draft: Omit<LineItem, "computed_price"> = {
    id: def.id, label: productLabel, category,
    width: w, height: h, depth: d, qty: 1,
    shelves, drawers, rails, doors,
    lift_hanger: liftHanger, led_strips: ledStrips,
    transport_lift: transportLift, with_installation: withInstallation,
    finish_exterior: finishExt, finish_interior: finishInt,
    color_exterior_code: colorExtCode, color_interior_code: colorIntCode,
    discount, tva_rate: tvaRate, notes,
  };
  const price = computePrice(draft);

  const handleSave = () => {
    onSave({ ...draft, computed_price: price });
    onClose();
  };

  const FinishSelector = ({ value, onChange, colorCode, onColorCode, label }: {
    value: FinishType; onChange: (v: FinishType) => void;
    colorCode: string; onColorCode: (v: string) => void; label: string;
  }) => (
    <div>
      <label style={s.label}>{label}</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {([
          { val: "white", text: "Blanc standard" },
          { val: "color_plain", text: "Couleur uni (+60€/m²)" },
          { val: "color_texture", text: "Couleur texture (+80€/m²)" },
        ] as { val: FinishType; text: string }[]).map(opt => (
          <button key={opt.val} onClick={() => onChange(opt.val)}
            style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: value === opt.val ? C.blue : C.bg,
              color: value === opt.val ? C.white : C.text_mid,
              border: value === opt.val ? `1.5px solid ${C.blue}` : `1.5px solid ${C.border}`,
            }}>
            {opt.text}
          </button>
        ))}
      </div>
      {value !== "white" && (
        <input value={colorCode} onChange={e => onColorCode(e.target.value)}
          placeholder="Code couleur (ex: RAL 9010)"
          style={{ ...s.input, marginTop: 8, maxWidth: 260 }} />
      )}
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: C.white, borderRadius: 20, width: "100%", maxWidth: 580,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 14,
          position: "sticky", top: 0, background: C.white, zIndex: 1,
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: C.blue_pale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ProductSvg category={category} size={40} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{productLabel}</div>
            <div style={{ fontSize: 13, color: C.text_light }}>Configurez le meuble</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.blue }}>{fmt(price)}</div>
            <div style={{ fontSize: 12, color: C.text_light }}>HTVA</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.text_light, marginLeft: 8 }}>×</button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Dimensions */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Dimensions (cm)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Largeur", val: w, set: setW },
                { label: "Hauteur", val: h, set: setH },
                { label: "Profondeur", val: d, set: setD },
              ].map((dim, i) => (
                <div key={dim.label}>
                  <label style={s.label}>{dim.label}</label>
                  <input ref={i === 0 ? firstRef : undefined} type="number" value={dim.val}
                    onChange={e => dim.set(Number(e.target.value))} style={s.input} />
                </div>
              ))}
            </div>
          </div>

          {/* Interior */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Intérieur</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Portes", val: doors, set: setDoors },
                { label: "Étagères", val: shelves, set: setShelves },
                { label: "Tiroirs", val: drawers, set: setDrawers },
                { label: "Rails penderie", val: rails, set: setRails },
                { label: "Strips LED", val: ledStrips, set: setLedStrips },
              ].map(item => (
                <div key={item.label}>
                  <label style={s.label}>{item.label}</label>
                  <Stepper value={item.val} onChange={item.set} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              {[
                { label: "Lift hanger (+145€)", val: liftHanger, set: setLiftHanger },
                { label: "Lift transport (+75€)", val: transportLift, set: setTransportLift },
              ].map(opt => (
                <button key={opt.label} onClick={() => opt.set(!opt.val)}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: opt.val ? C.blue_pale : C.bg,
                    color: opt.val ? C.blue : C.text_mid,
                    border: opt.val ? `1.5px solid ${C.blue_border}` : `1.5px solid ${C.border}`,
                  }}>
                  {opt.val ? "✓ " : ""}{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Installation */}
          <div>
            <label style={s.label}>Pose — 200€/ml (calculé sur la largeur)</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ val: false, text: "Sans pose" }, { val: true, text: `Avec pose (+${fmt((w / 100) * UNIT.installation_per_ml)})` }].map(opt => (
                <button key={String(opt.val)} onClick={() => setWithInstallation(opt.val)}
                  style={{
                    padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    background: withInstallation === opt.val ? C.blue : C.bg,
                    color: withInstallation === opt.val ? C.white : C.text_mid,
                    border: withInstallation === opt.val ? `1.5px solid ${C.blue}` : `1.5px solid ${C.border}`,
                  }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

          {/* TVA rate */}
          <div>
            <label style={s.label}>Taux TVA pour ce meuble</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[6, 21].map(rate => (
                <button key={rate} onClick={() => setTvaRate(rate)}
                  style={{
                    padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    background: tvaRate === rate ? C.blue : C.bg,
                    color: tvaRate === rate ? C.white : C.text_mid,
                    border: tvaRate === rate ? `1.5px solid ${C.blue}` : `1.5px solid ${C.border}`,
                  }}>
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Finish */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FinishSelector label="Finition extérieure" value={finishExt} onChange={setFinishExt} colorCode={colorExtCode} onColorCode={setColorExtCode} />
            <FinishSelector label="Finition intérieure" value={finishInt} onChange={setFinishInt} colorCode={colorIntCode} onColorCode={setColorIntCode} />
          </div>

          {/* Discount */}
          <div>
            <label style={s.label}>Remise sur ce meuble (%)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="number" value={discount} min={0} max={100}
                onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                style={{ ...s.input, maxWidth: 100 }} />
              {discount > 0 && <span style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>−{fmt(computePrice({ ...draft, discount: 0 }) * discount / 100)}</span>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={s.label}>Notes / finition / précisions</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Couleur, matière, particularités..."
              style={{ ...s.input, minHeight: 72, resize: "vertical" }} />
          </div>

          {/* Breakdown */}
          <div style={{ background: C.bg, borderRadius: 12, padding: 14 }}>
            <button onClick={() => setShowBreakdown(!showBreakdown)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.blue, padding: 0, marginBottom: showBreakdown ? 10 : 0 }}>
              {showBreakdown ? "▼" : "▶"} Détail du prix
            </button>
            {showBreakdown && <PriceBreakdown item={{ ...draft, computed_price: price }} />}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px", borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 10, alignItems: "center",
          position: "sticky", bottom: 0, background: C.white,
        }}>
          <button onClick={handleSave} style={s.btnPrimary}>
            {existing ? "Mettre à jour" : "Ajouter au devis"}
          </button>
          <button onClick={onClose} style={s.btnOutline}>Annuler</button>
          <div style={{ marginLeft: "auto", fontSize: 20, fontWeight: 900, color: C.blue }}>{fmt(price)} <span style={{ fontSize: 12, color: C.text_light, fontWeight: 600 }}>HTVA</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── Main DevisPage ───────────────────────────────────────────────────────────

export default function DevisPage({ supabase, projects }: { supabase: SupabaseClient; projects: Project[] }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [devisList, setDevisList] = useState<DevisRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedDevis, setSelectedDevis] = useState<DevisRecord | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [editingDevisId, setEditingDevisId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<DevisForm>({
    client_name: "", client_address: "", client_phone: "", client_email: "",
    project_id: "", notes: "", tva: 21, global_discount: 0,
  });
  const [items, setItems] = useState<LineItem[]>([]);
  const [configuringCategory, setConfiguringCategory] = useState<ProductCategory | null>(null);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [saving, setSaving] = useState(false);
  const clientNameRef = useRef<HTMLInputElement>(null);

  const fetchDevis = async () => {
    setLoadingList(true);
    const { data } = await supabase.from("devis").select("*").order("created_at", { ascending: false });
    setDevisList((data as DevisRecord[]) || []);
    setLoadingList(false);
  };

  useEffect(() => { fetchDevis(); }, []);
  useEffect(() => { if (view === "create") setTimeout(() => clientNameRef.current?.focus(), 50); }, [view]);

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const editItem = (item: LineItem) => { setEditingItem(item); setConfiguringCategory(item.category); };

  const openCreate = () => {
    setEditingDevisId(null);
    setForm({ client_name: "", client_address: "", client_phone: "", client_email: "", project_id: "", notes: "", tva: 21, global_discount: 0 });
    setItems([]);
    setView("create");
  };

  const openEdit = (d: DevisRecord) => {
    setEditingDevisId(d.id);
    setForm({
      client_name: d.client_name,
      client_address: d.client_address || "",
      client_phone: d.client_phone || "",
      client_email: d.client_email || "",
      project_id: d.project_id ? String(d.project_id) : "",
      notes: d.notes || "",
      tva: d.tva,
      global_discount: d.global_discount || 0,
    });
    setItems(d.items || []);
    setView("create");
  };

  const deleteDevis = async (id: number) => {
    setDeleting(true);
    await supabase.from("devis").delete().eq("id", id);
    setDeleting(false);
    setDeleteConfirmId(null);
    if (view === "detail") setView("list");
    await fetchDevis();
  };

  const subtotalHtva = items.reduce((s, i) => s + i.computed_price * i.qty, 0);
  const globalDiscountAmt = subtotalHtva * (form.global_discount / 100);
  const afterDiscount = subtotalHtva - globalDiscountAmt;
  const tvaAmt = afterDiscount * (form.tva / 100);
  const totalTvac = afterDiscount + tvaAmt;

  const saveDevis = async () => {
    if (!form.client_name.trim()) { alert("Merci d'indiquer le nom du client."); return; }
    if (items.length === 0) { alert("Ajoutez au moins un meuble."); return; }
    setSaving(true);
    const payload = {
      client_name: form.client_name,
      client_address: form.client_address,
      client_phone: form.client_phone,
      client_email: form.client_email,
      project_id: form.project_id ? Number(form.project_id) : null,
      items, notes: form.notes, tva: form.tva, global_discount: form.global_discount,
    };
    let error;
    if (editingDevisId) {
      ({ error } = await supabase.from("devis").update(payload).eq("id", editingDevisId));
    } else {
      ({ error } = await supabase.from("devis").insert(payload));
    }
    setSaving(false);
    if (error) { alert("Erreur: " + error.message); return; }
    setEditingDevisId(null);
    setForm({ client_name: "", client_address: "", client_phone: "", client_email: "", project_id: "", notes: "", tva: 21, global_discount: 0 });
    setItems([]);
    await fetchDevis();
    setView("list");
  };

  // ── Delete confirm modal ──
  const DeleteConfirmModal = () => {
    const d = devisList.find(x => x.id === deleteConfirmId);
    if (!d) return null;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: C.white, borderRadius: 20, padding: 32, maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>Supprimer ce devis ?</div>
          <div style={{ fontSize: 14, color: C.text_light, marginBottom: 24 }}>
            Le devis de <strong>{d.client_name}</strong> sera définitivement supprimé.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => deleteDevis(d.id)} disabled={deleting}
              style={{ background: C.red, color: "white", border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: deleting ? 0.7 : 1 }}>
              {deleting ? "Suppression..." : "Supprimer"}
            </button>
            <button onClick={() => setDeleteConfirmId(null)} style={s.btnOutline}>Annuler</button>
          </div>
        </div>
      </div>
    );
  };

  // ── List ──
  if (view === "list") {
    const filtered = devisList.filter(d =>
      d.client_name.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <div style={{ margin: "-24px", minHeight: "100vh", background: "#f0f4f8" }}>
        <style>{`#devis-search::placeholder { color: rgba(255,255,255,0.45); }`}</style>
        {deleteConfirmId && <DeleteConfirmModal />}

        {/* Hero header */}
        <div style={{
          background: "linear-gradient(135deg, #0f2447 0%, #1a3a6e 60%, #1e4d8c 100%)",
          padding: "36px 40px 32px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ position: "absolute", bottom: -60, right: 80, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, position: "relative" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>
                ALIAJ INTERIOR BV
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "white", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                Offres & Devis
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                {devisList.length} offre{devisList.length !== 1 ? "s" : ""} au total
              </div>
            </div>
            <button onClick={openCreate} style={{
              background: "white", color: "#0f2447",
              border: "none", borderRadius: 12, padding: "13px 24px",
              fontWeight: 800, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nouvelle offre
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", maxWidth: 480 }}>
            <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.5 }}>🔍</div>
            <input
              id="devis-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client..."
              style={{
                width: "100%", padding: "13px 16px 13px 46px",
                borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.12)",
                color: "white", fontSize: 14, fontWeight: 500,
                outline: "none", boxSizing: "border-box",
                backdropFilter: "blur(10px)",
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 40px 60px" }}>
          {loadingList ? (
            <div style={{ textAlign: "center", padding: 80, color: "#64748b" }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>◌</div>
              <div style={{ fontWeight: 600 }}>Chargement...</div>
            </div>
          ) : devisList.length === 0 ? (
            <div style={{
              background: "white", borderRadius: 20, padding: "70px 40px",
              textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 52, marginBottom: 16, filter: "grayscale(0.3)" }}>📋</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Aucune offre pour l'instant</div>
              <div style={{ color: "#94a3b8", marginBottom: 28, fontSize: 14 }}>Créez votre première offre pour un client</div>
              <button onClick={openCreate} style={{
                background: "#0f2447", color: "white", border: "none",
                borderRadius: 12, padding: "13px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>+ Créer une offre</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#334155" }}>Aucun résultat pour "{search}"</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {filtered.map(d => {
                const sub = (d.items || []).reduce((acc: number, i: LineItem) => acc + i.computed_price * i.qty, 0);
                const disc = sub * ((d.global_discount || 0) / 100);
                const tot = (sub - disc) * (1 + d.tva / 100);
                const htva = sub - disc;
                const categories = [...new Set((d.items || []).map((i: LineItem) => i.label))];
                const initials = d.client_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                const colors = ["#1e3a8a","#1e40af","#1d4ed8","#2563eb","#0369a1","#0c4a6e","#164e63","#134e4a"];
                const avatarColor = colors[d.id % colors.length];
                return (
                  <div key={d.id} style={{
                    background: "white", borderRadius: 18,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    overflow: "hidden", cursor: "pointer",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(15,36,71,0.14)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                    onClick={() => { setSelectedDevis(d); setView("detail"); }}>

                    {/* Card top stripe */}
                    <div style={{ height: 4, background: `linear-gradient(90deg, ${avatarColor}, #3b82f6)` }} />

                    <div style={{ padding: "20px 22px" }}>
                      {/* Client row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                        <div style={{
                          width: 50, height: 50, borderRadius: 14,
                          background: `linear-gradient(135deg, ${avatarColor}, #3b82f6)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 17, fontWeight: 900, color: "white", flexShrink: 0,
                          letterSpacing: "0.02em",
                        }}>{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.client_name}</div>
                          {d.client_address && (
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              📍 {d.client_address}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product tags */}
                      {categories.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                          {categories.slice(0, 3).map((cat, i) => (
                            <span key={i} style={{
                              fontSize: 11, fontWeight: 700,
                              background: "#f1f5f9", color: "#475569",
                              borderRadius: 8, padding: "3px 10px",
                            }}>{cat}</span>
                          ))}
                          {categories.length > 3 && (
                            <span style={{ fontSize: 11, color: "#94a3b8", padding: "3px 0" }}>+{categories.length - 3} autres</span>
                          )}
                        </div>
                      )}

                      {/* Divider */}
                      <div style={{ height: 1, background: "#f1f5f9", marginBottom: 14 }} />

                      {/* Footer row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: "#0f2447" }}>{fmt(tot)}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                            HTVA {fmt(htva)} · {(d.items || []).length} meuble{(d.items || []).length > 1 ? "s" : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            {new Date(d.created_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                          <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEdit(d)} style={{
                              background: "#f1f5f9", color: "#475569", border: "none",
                              borderRadius: 8, padding: "5px 10px", fontSize: 13, cursor: "pointer", fontWeight: 700,
                            }} title="Modifier">✏️</button>
                            <button onClick={() => setDeleteConfirmId(d.id)} style={{
                              background: "#fef2f2", color: "#dc2626", border: "none",
                              borderRadius: 8, padding: "5px 10px", fontSize: 13, cursor: "pointer", fontWeight: 700,
                            }} title="Supprimer">🗑️</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Detail ──
  if (view === "detail" && selectedDevis) {
    const sub = (selectedDevis.items || []).reduce((acc: number, i: LineItem) => acc + i.computed_price * i.qty, 0);
    const disc = sub * ((selectedDevis.global_discount || 0) / 100);
    const after = sub - disc;
    const tvaAmt2 = after * (selectedDevis.tva / 100);
    const tot = after + tvaAmt2;

    return (
      <div style={{ margin: "-24px", minHeight: "100vh", background: "#f0f4f8" }}>
        {showPrint && <PrintDevis devis={selectedDevis} onClose={() => setShowPrint(false)} />}
        {deleteConfirmId && <DeleteConfirmModal />}

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #0f2447 0%, #1a3a6e 60%, #1e4d8c 100%)",
          padding: "28px 40px 32px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <button onClick={() => setView("list")} style={{
                background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
              }}>← Retour</button>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>Offre client</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>{selectedDevis.client_name}</div>
              {selectedDevis.client_address && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>📍 {selectedDevis.client_address}</div>}
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                Créé le {new Date(selectedDevis.created_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Total TVAC</div>
              <div style={{ fontSize: 38, fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>{fmt(tot)}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>HTVA {fmt(after)}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => openEdit(selectedDevis)} style={{
                  background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>✏️ Modifier</button>
                <button onClick={() => setDeleteConfirmId(selectedDevis.id)} style={{
                  background: "rgba(220,38,38,0.2)", color: "#fca5a5", border: "1px solid rgba(220,38,38,0.3)",
                  borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>🗑️ Supprimer</button>
                <button onClick={() => setShowPrint(true)} style={{
                  background: "white", color: "#0f2447", border: "none",
                  borderRadius: 10, padding: "9px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer",
                }}>📄 Générer PDF</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "28px 40px 60px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Contact info */}
            {(selectedDevis.client_phone || selectedDevis.client_email) && (
              <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Contact</div>
                <div style={{ display: "flex", gap: 20 }}>
                  {selectedDevis.client_phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📞</div>
                      <div>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Téléphone</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{selectedDevis.client_phone}</div>
                      </div>
                    </div>
                  )}
                  {selectedDevis.client_email && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✉️</div>
                      <div>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Email</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{selectedDevis.client_email}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items */}
            <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
                Meubles · {(selectedDevis.items || []).length} article{(selectedDevis.items || []).length > 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(selectedDevis.items || []).map((item: LineItem, idx: number) => {
                  const itemTotal = item.computed_price * item.qty;
                  const tvaRate = item.tva_rate ?? selectedDevis.tva ?? 21;
                  return (
                    <div key={item.id} style={{
                      display: "flex", gap: 14, padding: "16px", borderRadius: 14,
                      background: idx % 2 === 0 ? "#f8fafc" : "white",
                      border: "1px solid #f1f5f9",
                    }}>
                      <div style={{ width: 64, height: 64, borderRadius: 12, background: "white", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        <ProductSvg category={item.category} size={50} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                          L{item.width} × H{item.height} × P{item.depth} cm
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          {item.doors > 0 && <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{item.doors} portes</span>}
                          {item.shelves > 0 && <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{item.shelves} étagères</span>}
                          {item.drawers > 0 && <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{item.drawers} tiroirs</span>}
                          {item.rails > 0 && <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{item.rails} rails</span>}
                          {item.with_installation && <span style={{ fontSize: 11, background: "#f0fdf4", color: "#16a34a", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>avec pose</span>}
                          {item.led_strips > 0 && <span style={{ fontSize: 11, background: "#fefce8", color: "#ca8a04", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>LED</span>}
                        </div>
                        {item.finish_exterior !== "white" && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Ext: {item.finish_exterior === "color_plain" ? "couleur uni" : "couleur texture"}{item.color_exterior_code ? ` · ${item.color_exterior_code}` : ""}</div>}
                        {item.notes && <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 3 }}>{item.notes}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: "#0f2447" }}>{fmt(itemTotal)}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>TVA {tvaRate}%</div>
                        {item.discount > 0 && <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, marginTop: 2 }}>−{item.discount}%</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDevis.notes && (
              <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Notes</div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{selectedDevis.notes}</div>
              </div>
            )}
          </div>

          {/* Right column — totals */}
          <div style={{ background: "white", borderRadius: 16, padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", position: "sticky", top: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Récapitulatif</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b" }}>
                <span>Sous-total HTVA</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{fmt(sub)}</span>
              </div>
              {disc > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
                  <span>Remise {selectedDevis.global_discount}%</span><span>−{fmt(disc)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b" }}>
                <span>TVA {selectedDevis.tva}%</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{fmt(tvaAmt2)}</span>
              </div>
            </div>
            <div style={{ height: 1, background: "#e2e8f0", margin: "16px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>Total TVAC</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#0f2447" }}>{fmt(tot)}</span>
            </div>
            <div style={{ height: 1, background: "#e2e8f0", margin: "16px 0" }} />
            <button onClick={() => setShowPrint(true)} style={{
              width: "100%", background: "linear-gradient(135deg, #0f2447, #1e4d8c)",
              color: "white", border: "none", borderRadius: 12,
              padding: "14px", fontWeight: 800, fontSize: 14, cursor: "pointer",
              letterSpacing: "0.02em",
            }}>📄 Générer l'offre PDF</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create / Edit ──
  return (
    <div style={{ margin: "-24px", minHeight: "100vh", background: "#f0f4f8" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f2447 0%, #1a3a6e 60%, #1e4d8c 100%)",
        padding: "28px 40px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <button onClick={() => setView("list")} style={{
          background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
        }}>← Retour</button>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>
          {editingDevisId ? "Modification d'offre" : "Nouvelle offre"}
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "white" }}>
          {editingDevisId ? (form.client_name || "Modifier le devis") : "Créer une offre client"}
        </div>
      </div>

      <div style={{ padding: "28px 40px 80px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
        {/* Left — form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Step 1 — Client */}
          <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0f2447", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>1</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Informations client</div>
            </div>
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={s.label}>Nom client *</label>
                  <input ref={clientNameRef} value={form.client_name}
                    onChange={e => setForm({ ...form, client_name: e.target.value })}
                    placeholder="Dupont Jean" style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Adresse</label>
                  <AddressInput value={form.client_address} onChange={v => setForm({ ...form, client_address: v })} />
                </div>
                <div>
                  <label style={s.label}>Téléphone</label>
                  <input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })}
                    placeholder="+32 ..." style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Email</label>
                  <input value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })}
                    placeholder="email@..." style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Projet lié</label>
                  <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} style={s.input}>
                    <option value="">— Aucun —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_number} — {p.client_name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 — Products */}
          <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0f2447", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>2</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Ajouter des meubles</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Cliquez sur un meuble pour le configurer</div>
              </div>
            </div>
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
                {PRODUCTS.map(p => (
                  <button key={p.id} onClick={() => { setEditingItem(null); setConfiguringCategory(p.id); }}
                    style={{
                      background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: 16,
                      padding: "16px 8px", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      position: "relative", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#1e3a8a"; e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.transform = "translateY(0)"; }}>
                    {!p.ready && (
                      <span style={{ position: "absolute", top: 6, right: 6, fontSize: 8, fontWeight: 800, background: "#ea580c", color: "white", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.05em" }}>BIENTÔT</span>
                    )}
                    <div style={{ width: 68, height: 68, borderRadius: 12, background: "white", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <ProductSvg category={p.id} size={56} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#334155", textAlign: "center", lineHeight: 1.3 }}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 — Items added */}
          {items.length > 0 && (
            <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#16a34a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>✓</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Meubles ajoutés · {items.length}</div>
              </div>
              <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((item, idx) => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 14,
                    background: idx % 2 === 0 ? "#f8fafc" : "white",
                    border: "1px solid #f1f5f9",
                  }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: "white", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      <ProductSvg category={item.category} size={44} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                        {item.width}×{item.height}×{item.depth} cm
                        {item.doors > 0 ? ` · ${item.doors} portes` : ""}
                        {item.shelves > 0 ? ` · ${item.shelves} ét.` : ""}
                        {item.drawers > 0 ? ` · ${item.drawers} tiroirs` : ""}
                        {item.with_installation ? " · avec pose" : ""}
                        {` · TVA ${item.tva_rate}%`}
                      </div>
                      {item.discount > 0 && <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>Remise {item.discount}%</div>}
                      {item.notes && <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>{item.notes}</div>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#0f2447" }}>{fmt(item.computed_price)}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => editItem(item)} style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✏️</button>
                        <button onClick={() => removeItem(item.id)} style={{ background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Notes */}
          <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0f2447", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>3</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Notes générales</div>
            </div>
            <div style={{ padding: "22px 24px" }}>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Conditions, délais, remarques particulières..."
                style={{ ...s.input, minHeight: 90, resize: "vertical" }} />
            </div>
          </div>
        </div>

        {/* Right column — live summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 24 }}>
          {/* Totals card */}
          <div style={{ background: "white", borderRadius: 18, padding: "22px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Récapitulatif</div>

            {items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#cbd5e1" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🛋️</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Aucun meuble ajouté</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{item.label}</span>
                      <span style={{ fontWeight: 700, color: "#0f172a", flexShrink: 0 }}>{fmt(item.computed_price)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: "#f1f5f9", marginBottom: 12 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b" }}>
                    <span>Sous-total HTVA</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{fmt(subtotalHtva)}</span>
                  </div>
                  {globalDiscountAmt > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
                      <span>Remise {form.global_discount}%</span><span>−{fmt(globalDiscountAmt)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b" }}>
                    <span>TVA {form.tva}%</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{fmt(tvaAmt)}</span>
                  </div>
                </div>
                <div style={{ height: 1, background: "#f1f5f9", margin: "14px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Total TVAC</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#0f2447" }}>{fmt(totalTvac)}</span>
                </div>
              </>
            )}
          </div>

          {/* TVA + remise */}
          <div style={{ background: "white", borderRadius: 18, padding: "20px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Paramètres</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={s.label}>TVA globale (%)</label>
                <input type="number" value={form.tva} onChange={e => setForm({ ...form, tva: Number(e.target.value) })}
                  style={{ ...s.input, maxWidth: "100%" }} />
              </div>
              <div>
                <label style={s.label}>Remise globale (%)</label>
                <input type="number" value={form.global_discount} min={0} max={100}
                  onChange={e => setForm({ ...form, global_discount: Math.min(100, Math.max(0, Number(e.target.value))) })}
                  style={{ ...s.input, maxWidth: "100%" }} />
              </div>
            </div>
          </div>

          {/* Save button */}
          <button onClick={saveDevis} disabled={saving} style={{
            width: "100%", background: saving ? "#94a3b8" : "linear-gradient(135deg, #0f2447, #1e4d8c)",
            color: "white", border: "none", borderRadius: 14,
            padding: "16px", fontWeight: 800, fontSize: 15, cursor: saving ? "wait" : "pointer",
            boxShadow: "0 4px 20px rgba(15,36,71,0.3)",
            letterSpacing: "0.02em",
          }}>
            {saving ? "Enregistrement..." : editingDevisId ? "✓ Mettre à jour" : "✓ Enregistrer l'offre"}
          </button>
          <button onClick={() => setView("list")} style={{
            width: "100%", background: "transparent", color: "#64748b",
            border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "12px",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Annuler</button>
        </div>
      </div>

      {configuringCategory && (
        <ConfiguratorModal
          category={configuringCategory}
          existing={editingItem || undefined}
          onSave={item => {
            if (editingItem) {
              setItems(prev => prev.map(i => i.id === item.id ? item : i));
            } else {
              setItems(prev => [...prev, item]);
            }
          }}
          onClose={() => { setConfiguringCategory(null); setEditingItem(null); }}
        />
      )}
    </div>
  );
}
