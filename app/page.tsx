"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import DevisPage from "./devis/DevisPage";

type TabType = "projects" | "calendar" | "tasks" | "purchases" | "devis";
type CalendarViewMode = "day" | "week" | "month";
type ProjectSortOption =
  | "fabrication_desc"
  | "installation_asc"
  | "client_asc"
  | "project_number_asc"
  | "status_asc";

type UserRole = "bureau" | "atelier";

type Project = {
  id: number;
  project_number: string;
  client_name: string;
  project_type: string;
  address: string | null;
  status: string;
  priority: string | null;
  validation_date: string | null;
  fabrication_date: string | null;
  installation_date: string | null;
  completed_at: string | null;
  notes: string | null;
};

type ProjectFile = {
  id: number;
  project_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_category: string;
  created_at: string;
};

type ProjectHistory = {
  id: number;
  project_id: number;
  action: string;
  details: string | null;
  created_at: string;
};

type ProjectForm = {
  project_number: string;
  client_name: string;
  project_type: string;
  address: string;
  status: string;
  priority: string;
  validation_date: string;
  fabrication_date: string;
  installation_date: string;
  notes: string;
};

type CalendarEventRow = {
  id: number;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  client_name: string | null;
  address: string | null;
  project_id: number | null;
  created_at: string;
};

type UnifiedCalendarEvent = {
  id: string;
  source: "manual" | "project" | "holiday";
  source_id: number | null;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  client_name: string | null;
  address: string | null;
  project_id: number | null;
  project_number: string | null;
};

type CalendarForm = {
  id?: number;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string;
  end_time: string;
  notes: string;
  client_name: string;
  address: string;
  project_id: string;
};

type Task = {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
  created_at: string;
  completed_at: string | null;
};

type TaskForm = {
  title: string;
  description: string;
  due_date: string;
};

type PurchaseItem = {
  id: number;
  project_id: number;
  project_name: string;
  project_number: string;
  item_type: string;
  description: string;
  quantity: number;
  purchase_url: string | null;
  product_key: string | null;
  requested_by: string;
  is_read: boolean;
  is_completed: boolean;
  created_at: string;
  completed_at: string | null;
};

type PurchaseForm = {
  project_id: string;
  item_type: string;
  description: string;
};

const BRAND_BLUE = "#1e3a8a";
const TEXT_DARK = "#0f172a";
const TEXT_MEDIUM = "#334155";
const TEXT_LIGHT = "#64748b";
const BORDER = "#cbd5e1";
const BG_SOFT = "#f8fafc";
const BG_COMPLETED = "#f5f5f5";
const BORDER_COMPLETED = "#d6d6d6";
const FILTER_CLEAR_BG = "#fee2e2";
const FILTER_CLEAR_COLOR = "#991b1b";
const WEEKEND_BG = "#fff5f5";

const STATUS_OPTIONS = [
  "Devis envoyé",
  "Validé",
  "Prise de mesure",
  "En préparation",
  "En fabrication",
  "Prêt pour pose",
  "En pose",
  "Terminé",
  "SAV",
];

const CALENDAR_EVENT_TYPES = [
  "Mesurage",
  "Rendez-vous client",
  "Pose",
  "SAV",
  "Autre",
];

const PURCHASE_TYPES = [
  "Panneau",
  "Charniers",
  "Chants",
  "Vis",
  "Profil Alu",
  "Accessoires electronique",
  "Autres",
];

type CatalogProduct = {
  key: string;
  label: string;
  image: string;
  url: string;
  category: string;
  color: string;
};

const PRODUCT_CATALOG: CatalogProduct[] = [
  // --- Charnières (lecot.be) ---
  { key: "charnieres_sensys_8645i", label: "Charnière SENSYS 8645I", image: "/catalog/charnieres_sensys_8645i.png", url: "https://www.lecot.be/fr-be/hettich/198901-charniere-a-boitier-hettich-sensys-8645i", category: "Charnières", color: "#e2e8f0" },
  { key: "plaque_vis_excentrique", label: "Plaque Montage VIS Excentrique", image: "/catalog/plaque_vis_excentrique.png", url: "https://www.lecot.be/fr-be/hettich/1287519-plaque-de-montage-hettich-sensys-vis-excentrique", category: "Fixations", color: "#f1f5f9" },
  { key: "charnieres_intermat_9904", label: "Charnière INTERMAT 9904", image: "/catalog/charnieres_intermat_9904.png", url: "https://www.lecot.be/fr-be/hettich/1287563-charniere-a-boitier-hettich-intermat-9904", category: "Charnières", color: "#e2e8f0" },
  { key: "plaque_montage_lineaire", label: "Plaque Montage Linéaire VIS D1.5", image: "/catalog/plaque_montage_lineaire.png", url: "https://www.lecot.be/fr-be/hettich/plaque-montage-lineaire-avec-reglage-en-hauteur-vis-d1-5-ue1-50-9117341", category: "Fixations", color: "#f1f5f9" },
  { key: "cache_decoratif_b", label: "Cache Décoratif B INTERMAT 9904", image: "/catalog/cache_decoratif_b.png", url: "https://www.lecot.be/fr-be/hettich/cache-decoratif-b-hettich-intermat-9904-perfekt-5204", category: "Accessoires", color: "#fafafa" },
  { key: "push_broche_percer", label: "Push to Open Broche à Percer", image: "/catalog/push_broche_percer.png", url: "https://www.lecot.be/fr-be/hettich/3092675-push-to-open-hettich-broche-a-percer", category: "Push to Open", color: "#f8f8f8" },
  { key: "push_broche_strong_percer", label: "Push to Open Broche Strong Percer", image: "/catalog/push_broche_strong_percer.png", url: "https://www.lecot.be/fr-be/hettich/3092683-push-to-open-hettich-broche-strong-a-percer", category: "Push to Open", color: "#f8f8f8" },
  { key: "charnieres_et582", label: "Charnière Spéciale ET 582", image: "/catalog/charnieres_et582.png", url: "https://www.lecot.be/fr-be/hettich/128765-charniere-hettich-sensys-et-582", category: "Charnières", color: "#e2e8f0" },
  { key: "push_broche_visser", label: "Push to Open Broche Strong Visser", image: "/catalog/push_broche_visser.png", url: "https://www.lecot.be/fr-be/hettich/3092725-push-to-open-hettich-broche-strong-a-visser", category: "Push to Open", color: "#f8f8f8" },
  { key: "charnieres_sensys_8657i", label: "Charnière SENSYS 8657I", image: "/catalog/charnieres_sensys_8657i.png", url: "https://www.lecot.be/fr-be/hettich/as0016436-charniere-a-boitier-hettich-sensys-8657i", category: "Charnières", color: "#e2e8f0" },
  // --- Accessoires meuble (bermabru.be) ---
  { key: "mc_line_dolphin", label: "MC Line Dolphin (meuble angle)", image: "/catalog/mc_line_dolphin.png", url: "https://www.bermabru.be/fr_BE/p/mc-line-dolphin-40cm-gauche-anthracite-avec-double-amortisseur/38944/", category: "Rangement", color: "#1e293b" },
  { key: "eight_prise_gunmetal", label: "Eight Prise Gunmetal + USB", image: "/catalog/eight_prise_gunmetal.png", url: "https://www.bermabru.be/fr_BE/p/eight-prise-en-v-1-prise-usb-gunmetal/17171/", category: "Électronique", color: "#64748b" },
  { key: "eight_prise_noir", label: "Eight Prise Noir + USB", image: "/catalog/eight_prise_noir.png", url: "https://www.bermabru.be/fr_BE/p/eight-prise-en-v-1-prise-usb-noir/47997/", category: "Électronique", color: "#0f172a" },
  // --- Supports tube penderie (bermabru.be) ---
  { key: "support_tube_sl781", label: "Support Tube SL781 Ovale Nickelé", image: "/catalog/support_tube_sl781.png", url: "https://www.bermabru.be/fr_BE/p/support-tube-sl781-oval-m6x25-nickele/244/", category: "Penderie", color: "#e2e8f0" },
  { key: "vis_tube_oval_noir", label: "Vis Support Tube Ovale Noir", image: "/catalog/vis_tube_oval_noir.png", url: "https://www.bermabru.be/fr_BE/p/vis-pour-support-tube-oval-noir/230/", category: "Penderie", color: "#334155" },
  { key: "support_tube_oval_noir", label: "Support Tube Ovale Noir", image: "/catalog/support_tube_oval_noir.png", url: "https://www.bermabru.be/fr_BE/p/support-tube-oval-noir/18312/", category: "Penderie", color: "#1e293b" },
  { key: "vis_m6_penderie", label: "Vis M6 Support Tube Penderie", image: "/catalog/vis_m6_penderie.png", url: "https://www.bermabru.be/fr_BE/p/vis-pour-support-tube-penderie-m6a30mm/30619/", category: "Visserie", color: "#cbd5e1" },
  // --- Clips korrekt (bermabru.be) ---
  { key: "contreplaque_korrekt", label: "Contreplaque Clips Korrekt (fraiser)", image: "/catalog/contreplaque_korrekt.png", url: "https://www.bermabru.be/fr_BE/p/contreplaque-pr-clips-korrekt-a-fraiser/18728/", category: "Fixations", color: "#f1f5f9" },
  { key: "clips_korrekt", label: "Clips Contre-plaque Korrekt (fraiser)", image: "/catalog/clips_korrekt.png", url: "https://www.bermabru.be/fr_BE/p/clips-pr-contre-plaque-pr-korrekt-a-fraiser/12821/", category: "Fixations", color: "#f1f5f9" },
  // --- Compas & poignées (bermabru.be) ---
  { key: "compas_relevage", label: "Compas Relevage Berma-lift Duo", image: "/catalog/compas_relevage.png", url: "https://www.bermabru.be/fr_BE/p/compas-de-relevage-berma-lift-duo-nickele/5443/", category: "Charnières", color: "#e2e8f0" },
  { key: "poignee_ona_laiton", label: "Poignée ONA Laiton Brossé (256mm)", image: "/catalog/poignee_ona_laiton.png", url: "https://www.bermabru.be/fr_BE/p/poignee-ona-ba256-l50-aluminium-brose-fonce-laison/17036/", category: "Poignées", color: "#fde68a" },
  { key: "poignee_ona_inox", label: "Poignée ONA Aspect Inox (256mm)", image: "/catalog/poignee_ona_inox.png", url: "https://www.bermabru.be/fr_BE/p/poignees-ona-ba256-l50-aluminium-look-inox/57385/", category: "Poignées", color: "#cbd5e1" },
  { key: "poignee_ona_noir", label: "Poignée ONA Noir Brossé (256mm)", image: "/catalog/poignee_ona_noir.png", url: "https://www.bermabru.be/fr_BE/p/poignees-ona-ba256-l50-aluminium-brose-noir/18832/", category: "Poignées", color: "#1e293b" },
  // --- Profils sans poignées (bermabru.be) ---
  { key: "profil_yaren_noir", label: "Profil YAREN Noir Mat (5000mm)", image: "/catalog/profil_yaren_noir.png", url: "https://www.bermabru.be/fr_BE/p/profil-poignee-yaren-en-v-noir-pour-strip-decor-5000mm/3046/", category: "Profils", color: "#1e293b" },
  { key: "plaque_fixation_profil", label: "Plaque Fixation Profil Poignée", image: "/catalog/plaque_fixation_profil.png", url: "https://www.bermabru.be/fr_BE/p/plaque-de-fixation-pour-profil-poignee/16978/", category: "Fixations", color: "#f1f5f9" },
  { key: "profil_list_l", label: "Profil LIST-L Noir Mat (5000mm)", image: "/catalog/profil_list_l.png", url: "https://www.bermabru.be/fr_BE/p/pyn098-poignee-en-l-alu-noir-mat-r9005-5000mm/41670/", category: "Profils", color: "#1e293b" },
  // --- Profils supplémentaires ---
  { key: "profil_l_bronze", label: "Profil L Bronze (5000mm)", image: "https://www.bermabru.be/static/uploads/pictures/small/99b34881-6936-4d98-a1a6-3ac2ab4c0743.png", url: "https://www.bermabru.be/fr_BE/p/profil-poignee-en-l-bronze-5000mm/25813/", category: "Profils", color: "#92400e" },
  { key: "profil_l_blanc", label: "Profil L Blanc Mat (5000mm)", image: "https://static.bermabru.be/uploads/pictures/large/e7a46c37-c663-493c-82f5-aed9646061a5.png", url: "https://www.bermabru.be/fr_BE/p/profil-poignee-en-l-5000mm-blanc-r9016-mat/41666/", category: "Profils", color: "#f8fafc" },
  { key: "profil_l_inox", label: "Profil L Inox Look (5000mm)", image: "https://www.bermabru.be/static/uploads/pictures/small/c90cbb55-6b1b-4d6e-8f7b-f411baecc6e2.png", url: "https://www.bermabru.be/fr_BE/p/profil-poignee-en-l-alu-inox-look-5000mm/25078/", category: "Profils", color: "#e2e8f0" },
  { key: "profil_l_anodise", label: "Profil L Alu Anodisé (5000mm)", image: "https://www.bermabru.be/static/uploads/pictures/large/d007e6d0-d211-4391-ba1a-f26ac34a239e.png", url: "https://www.bermabru.be/fr_BE/p/profil-poignee-en-l-alu-anodise-5000mm/4635/", category: "Profils", color: "#cbd5e1" },
  // --- Socle & pieds ---
  { key: "plaque_fix_nehl_noir", label: "Plaque Fixation Nehl 5000 Noir", image: "https://www.bermabru.be/static/uploads/pictures/large/e4245b7a-4c7d-4f55-a899-f894e3afaaf4.png", url: "https://www.bermabru.be/fr_BE/p/plaque-de-fix-5000-noir-a-enfoncer-250/12794/", category: "Socle", color: "#1e293b" },
  { key: "pied_socle_80", label: "Pied Socle Noir H80mm", image: "https://www.bermabru.be/static/uploads/pictures/small/7a7d3979-6f13-4280-9120-bd3a2dede4cc.png", url: "https://www.bermabru.be/fr_BE/p/pied-pour-socle-5000-noir-h-80mm-200/12782/", category: "Socle", color: "#334155" },
  { key: "pied_socle_150", label: "Pied Socle Noir H150mm", image: "https://www.bermabru.be/static/uploads/pictures/small/7329-0150.png", url: "https://www.bermabru.be/fr_BE/p/pied-pour-socle-5000-noir-h-150mm-150/4917/", category: "Socle", color: "#334155" },
  // --- Ventilation & conduit ---
  { key: "conduit_alu", label: "Conduit Alu Laminé 3 Couches Ø125", image: "https://www.bermabru.be/static/uploads/pictures/large/740db5e4-0a76-45d4-a476-b5c420d1d5b0.png", url: "https://www.bermabru.be/fr_BE/p/conduit-alu-lamine-3-couches-m0-d-125-l-10m/30357/", category: "Ventilation", color: "#e2e8f0" },
  { key: "aeration_blanc", label: "Aération Socle 458x75 Blanc", image: "https://www.bermabru.be/static/uploads/pictures/large/523d8154-9df6-4a70-a970-3d81a9554d45.png", url: "https://www.bermabru.be/fr_BE/p/aeration-soccle-458-x-75-blanc/30399/", category: "Ventilation", color: "#f8fafc" },
  { key: "aeration_gris", label: "Aération Socle 458x75 Gris", image: "https://www.bermabru.be/static/uploads/pictures/large/7dd1baa7-5581-4808-aaa2-287b8439ce9e.png", url: "https://www.bermabru.be/fr_BE/p/aeration-soccle-458-x-75-gris/41584/", category: "Ventilation", color: "#94a3b8" },
  { key: "aeration_noir", label: "Aération Socle 458x75 Noir", image: "https://www.bermabru.be/static/uploads/pictures/large/a2cf3bad-ca8d-468a-b55a-e973516d3988.png", url: "https://www.bermabru.be/fr_BE/p/aeration-soccle-458-x-75-noir/41580/", category: "Ventilation", color: "#1e293b" },
  // --- Embouts profils ---
  { key: "embout_c_noir", label: "Embout Modèle C Noir", image: "https://www.bermabru.be/static/uploads/pictures/small/2b487e56-a777-423d-8812-16974d636553.png", url: "https://www.bermabru.be/fr_BE/p/embout-modele-c-noir/39194/", category: "Profils", color: "#1e293b" },
  { key: "embout_l_droite", label: "Embout Droite Modèle L Noir", image: "https://www.bermabru.be/static/uploads/pictures/small/a3d25885-7e5f-4a54-8e9c-3953a12720ad.png", url: "https://www.bermabru.be/fr_BE/p/embout-droite-modele-l-noir/23624/", category: "Profils", color: "#1e293b" },
  { key: "embout_l_gauche", label: "Embout Gauche Modèle L Noir", image: "https://www.bermabru.be/static/uploads/pictures/large/a3d25885-7e5f-4a54-8e9c-3953a12720ad.png", url: "https://www.bermabru.be/fr_BE/p/embout-gauche-modele-l-noir/25081/", category: "Profils", color: "#1e293b" },
  { key: "crochet_alu_noir", label: "Crochet Alu Double Rainure Noir", image: "https://www.bermabru.be/static/uploads/pictures/small/4542-2111.png", url: "https://www.bermabru.be/fr_BE/p/crochet-alu-rainure-double-noir-mat/30627/", category: "Penderie", color: "#1e293b" },
  // --- Poignées ONA BA32 ---
  { key: "poignee_ona_ba32_laiton", label: "Poignée ONA BA32 Laiton (32mm)", image: "https://www.bermabru.be/static/uploads/pictures/small/Viefe_0372032L29_ONA_P1_02.png", url: "https://www.bermabru.be/fr_BE/p/poignee-ona-ba32-l50-aluminium-brosse-fonce-laiton/18936/", category: "Poignées", color: "#fde68a" },
  { key: "poignee_ona_ba32_noir", label: "Poignée ONA BA32 Noir (32mm)", image: "https://www.bermabru.be/static/uploads/pictures/small/Viefe_0372032L30_ONA_P1_02.png", url: "https://www.bermabru.be/fr_BE/p/poignee-ona-ba32-l50-aluminium-brosse-noir/25036/", category: "Poignées", color: "#1e293b" },
  { key: "poignee_ona_ba32_gris", label: "Poignée ONA BA32 Gris (32mm)", image: "https://www.bermabru.be/static/uploads/pictures/small/Viefe_0372032L31_ONA_P1.png", url: "https://www.bermabru.be/fr_BE/p/poignee-ona-ba32-l50-aluminium-brosse-gris/18833/", category: "Poignées", color: "#94a3b8" },
  { key: "poignee_ona_ba32_blanc", label: "Poignée ONA BA32 Blanc (32mm)", image: "https://www.bermabru.be/static/uploads/pictures/small/Viefe_0372032LM1_ONA_P1_02.png", url: "https://www.bermabru.be/fr_BE/p/poignee-ona-ba32-l50-aluminium-mat-blanc/18834/", category: "Poignées", color: "#f8fafc" },
  { key: "poignee_ona_ba32_inox", label: "Poignée ONA BA32 Inox (32mm)", image: "https://www.bermabru.be/static/uploads/pictures/small/Viefe_0372032L27_ONA_P1_02.png", url: "https://www.bermabru.be/fr_BE/p/poignee-ona-ba32-l50-aluminium-look-inox/23572/", category: "Poignées", color: "#e2e8f0" },
  // --- Penderie & élévateurs ---
  { key: "tube_penderie_oval", label: "Tube Penderie Ovale 30x14 (5000mm)", image: "https://www.bermabru.be/static/uploads/pictures/small/4101-3600.png", url: "https://www.bermabru.be/fr_BE/p/tubes-de-penderies-ovale-30x14-5000mm-alu-mat/18306/", category: "Penderie", color: "#cbd5e1" },
  { key: "elevateur_super_gris", label: "Élévateur Super 12-18kg Gris", image: "https://www.bermabru.be/static/uploads/pictures/small/75955513-dcb5-49fe-b684-874b2e4501fd.png", url: "https://www.bermabru.be/fr_BE/p/elevateur-super-12-18-kg-830-1170mm-gris/29411/", category: "Penderie", color: "#94a3b8" },
  { key: "elevateur_lift_noir", label: "Élévateur Lift 12kg Noir", image: "https://www.bermabru.be/static/uploads/pictures/large/6fdc2cfc-ffd5-4fb8-a5bb-91bbd7e4b19f.png", url: "https://www.bermabru.be/fr_BE/p/elevateur-lift-noir-890-1210mm-12kg/28169/", category: "Penderie", color: "#1e293b" },
  // --- Divers ---
  { key: "tape_alu", label: "Tape Alu 50mm x45m", image: "https://www.bermabru.be/static/uploads/pictures/large/38761760-8fe6-4edc-a36f-5a3e606e2b2d.png", url: "https://www.bermabru.be/fr_BE/p/tape-alu-50mm-x45m/25969/", category: "Divers", color: "#e2e8f0" },
  { key: "poubelle_hailo", label: "Poubelle Hailo Easy-Cargo 30/19L", image: "https://www.bermabru.be/static/uploads/pictures/small/e8ab79b1-b36b-45fb-b3b6-4b3ea6d30548.png", url: "https://www.bermabru.be/fr_BE/p/poubelle-hailo-easy-cargo-30-19l-gris/2967/", category: "Divers", color: "#f1f5f9" },
];

const BELGIUM_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "Jour de l'An" },
  { date: "2026-04-06", name: "Lundi de Pâques" },
  { date: "2026-05-01", name: "Fête du Travail" },
  { date: "2026-05-14", name: "Ascension" },
  { date: "2026-05-25", name: "Lundi de Pentecôte" },
  { date: "2026-07-21", name: "Fête nationale" },
  { date: "2026-08-15", name: "Assomption" },
  { date: "2026-11-01", name: "Toussaint" },
  { date: "2026-11-11", name: "Armistice" },
  { date: "2026-12-25", name: "Noël" },
];

const emptyForm: ProjectForm = {
  project_number: "",
  client_name: "",
  project_type: "",
  address: "",
  status: "Validé",
  priority: "Moyenne",
  validation_date: "",
  fabrication_date: "",
  installation_date: "",
  notes: "",
};

const emptyCalendarForm: CalendarForm = {
  id: undefined,
  title: "",
  event_type: "Rendez-vous client",
  event_date: "",
  start_time: "",
  end_time: "",
  notes: "",
  client_name: "",
  address: "",
  project_id: "",
};

const emptyTaskForm: TaskForm = {
  title: "",
  description: "",
  due_date: "",
};

const emptyPurchaseForm: PurchaseForm = {
  project_id: "",
  item_type: "Panneau",
  description: "",
};

function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(date: string | null | undefined) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function sortableDateValue(date: string | null | undefined) {
  if (!date) return 0;
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function toDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeekSunday(date: Date) {
  return addDays(startOfWeekMonday(date), 6);
}

function startOfMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfWeekMonday(first);
}

function endOfMonthGrid(date: Date) {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return endOfWeekSunday(last);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("fr-BE", {
    month: "long",
    year: "numeric",
  });
}

function weekRangeLabel(date: Date) {
  const start = startOfWeekMonday(date);
  const end = endOfWeekSunday(date);
  return `${formatDate(toDateOnly(start))} - ${formatDate(toDateOnly(end))}`;
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case "Devis envoyé":
      return { bg: "#f1f5f9", color: "#334155" };
    case "Validé":
      return { bg: "#dbeafe", color: "#1d4ed8" };
    case "Prise de mesure":
      return { bg: "#ede9fe", color: "#6d28d9" };
    case "En préparation":
      return { bg: "#fef3c7", color: "#b45309" };
    case "En fabrication":
      return { bg: "#ffedd5", color: "#c2410c" };
    case "Prêt pour pose":
      return { bg: "#cffafe", color: "#0f766e" };
    case "En pose":
      return { bg: "#e0e7ff", color: "#4338ca" };
    case "Terminé":
      return { bg: "#ececec", color: "#5f5f5f" };
    case "SAV":
      return { bg: "#fee2e2", color: "#b91c1c" };
    default:
      return { bg: "#f1f5f9", color: "#334155" };
  }
}

function getEventTypeStyle(type: string) {
  switch (type) {
    case "Pose":
      return { bg: "#dbeafe", color: "#1d4ed8" };
    case "Mesurage":
      return { bg: "#ede9fe", color: "#6d28d9" };
    case "Rendez-vous client":
      return { bg: "#dcfce7", color: "#15803d" };
    case "SAV":
      return { bg: "#fee2e2", color: "#b91c1c" };
    case "Jour férié":
      return { bg: "#fef3c7", color: "#92400e" };
    default:
      return { bg: "#f1f5f9", color: "#334155" };
  }
}

function getCalendarMainText(event: UnifiedCalendarEvent) {
  if (event.source === "holiday") return event.title;
  if (event.client_name && event.client_name.trim()) return event.client_name;
  return event.title;
}

function getCalendarSubText(event: UnifiedCalendarEvent) {
  if (event.source === "holiday") return "Belgique";
  if (event.project_number && event.project_number.trim()) return event.project_number;
  if (event.client_name && event.title !== event.client_name) return event.title;
  return event.event_type;
}

function getNextProjectNumber(projects: Project[]) {
  const START_NUMBER = 24;
  const YEAR = 2026;

  const usedNumbers = new Set(
    projects
      .map((project) => {
        const match = project.project_number.match(/^2026-(\d+)$/);
        return match ? Number(match[1]) : null;
      })
      .filter((value): value is number => value !== null)
  );

  let nextNumber = START_NUMBER;

  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1;
  }

  return `${YEAR}-${nextNumber}`;
}

function StatusBadge({ status }: { status: string }) {
  const c = getStatusColor(status);
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: "7px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        display: "inline-block",
      }}
    >
      {status}
    </span>
  );
}

function StatCard({
  title,
  value,
  big = false,
  accent,
}: {
  title: string;
  value: number;
  big?: boolean;
  accent?: string;
}) {
  return (
    <div style={{
      background: "white",
      borderRadius: 20,
      padding: "28px 32px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      gridColumn: big ? "span 2" : undefined,
      borderTop: `4px solid ${accent || "#1e3a8a"}`,
    }}>
      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{title}</div>
      <div style={{ fontSize: big ? 56 : 44, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function getPublicFileUrl(path: string) {
  const { data } = supabase.storage.from("project-files").getPublicUrl(path);
  return data.publicUrl;
}

function isImageFile(file: ProjectFile) {
  return (
    file.file_type.includes("image") ||
    /\.(png|jpg|jpeg|webp|gif)$/i.test(file.file_name)
  );
}

function isPdfFile(file: ProjectFile) {
  return file.file_type.includes("pdf") || /\.pdf$/i.test(file.file_name);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("projects");

  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [history, setHistory] = useState<ProjectHistory[]>([]);
  const [manualCalendarEvents, setManualCalendarEvents] = useState<
    CalendarEventRow[]
  >([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [role, setRole] = useState<UserRole>("bureau");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectSort, setProjectSort] =
    useState<ProjectSortOption>("fabrication_desc");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

  const [category, setCategory] = useState("pdf");
  const [message, setMessage] = useState("");

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [savingProject, setSavingProject] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);

  const [calendarViewMode, setCalendarViewMode] =
    useState<CalendarViewMode>("month");
  const [calendarCursorDate, setCalendarCursorDate] = useState<Date>(
    new Date()
  );
  const [showCalendarEventForm, setShowCalendarEventForm] = useState(false);
  const [calendarForm, setCalendarForm] = useState<CalendarForm>(
    emptyCalendarForm
  );
  const [savingCalendarEvent, setSavingCalendarEvent] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] =
    useState<UnifiedCalendarEvent | null>(null);
  const [showCalendarEventDetails, setShowCalendarEventDetails] =
    useState(false);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [savingTask, setSavingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const projectFormRef = useRef<HTMLDivElement>(null);
  const taskFormRef = useRef<HTMLDivElement>(null);
  const projectClientInputRef = useRef<HTMLInputElement>(null);
  const taskTitleInputRef = useRef<HTMLInputElement>(null);

  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(emptyPurchaseForm);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseItem | null>(null);
  const [showCompletedPurchases, setShowCompletedPurchases] = useState(false);
  const [showAtelierCatalog, setShowAtelierCatalog] = useState(false);
  const [atelierSelectedProduct, setAtelierSelectedProduct] = useState<CatalogProduct | null>(null);
  const [atelierQuantity, setAtelierQuantity] = useState(1);
  const [atelierProjectId, setAtelierProjectId] = useState("");
  const [atelierNote, setAtelierNote] = useState("");
  const [savingAtelierOrder, setSavingAtelierOrder] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const savedRole = sessionStorage.getItem("aliaj-role");
    if (savedRole === "bureau" || savedRole === "atelier") {
      setRole(savedRole);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogin = () => {
    if (pin === "101176") {
      setRole("bureau");
      setIsAuthenticated(true);
      setPinError("");
      sessionStorage.setItem("aliaj-role", "bureau");
    } else if (pin === "1011") {
      setRole("atelier");
      setIsAuthenticated(true);
      setPinError("");
      sessionStorage.setItem("aliaj-role", "atelier");
    } else {
      setPinError("Code incorrect");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("aliaj-role");
    setIsAuthenticated(false);
    setPin("");
    setPinError("");
    setRole("bureau");
    setActiveTab("projects");
  };

  const sanitizeFileName = (fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf(".");
    const baseName =
      lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
    const extension =
      lastDotIndex > 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";

    const normalized = baseName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._ -]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .trim();

    const safeBase = normalized || "file";

    return `${safeBase}${extension}`;
  };

  const getContentType = (file: File) => {
    if (file.type && file.type.trim() !== "") return file.type;

    const lower = file.name.toLowerCase();

    if (lower.endsWith(".pdf")) return "application/pdf";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";

    return "application/octet-stream";
  };

  const addHistory = async (
    projectId: number,
    action: string,
    details?: string
  ) => {
    const { error } = await supabase.from("project_history").insert({
      project_id: projectId,
      action,
      details: details || null,
    });

    if (error) {
      console.error("Erreur historique :", error.message);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);

    const { data, error } = await supabase.from("projects").select("*");

    if (error) {
      console.error(error.message);
      alert("Erreur lors du chargement des projets.");
    } else {
      setProjects((data || []) as Project[]);
    }

    setLoading(false);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }

    setTasks((data || []) as Task[]);
  };

  const fetchPurchases = async () => {
    const { data, error } = await supabase
      .from("project_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }

    setPurchases((data || []) as PurchaseItem[]);
  };

  const fetchFiles = async (projectId: number) => {
    const { data, error } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      setMessage("Erreur lors du chargement des fichiers.");
      return;
    }

    const rows = (data || []) as ProjectFile[];
    setFiles(rows);

    const visibleRows =
      role === "atelier"
        ? rows.filter((file) => file.file_category !== "other")
        : rows;

    setSelectedFile(visibleRows[0] || null);
  };

  const fetchHistory = async (projectId: number) => {
    const { data, error } = await supabase
      .from("project_history")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }

    setHistory((data || []) as ProjectHistory[]);
  };

  const fetchManualCalendarEvents = async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setManualCalendarEvents((data || []) as CalendarEventRow[]);
  };

  useEffect(() => {
    fetchProjects();
    fetchManualCalendarEvents();
    fetchTasks();
    fetchPurchases();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchFiles(selectedProject.id);
      fetchHistory(selectedProject.id);
    } else {
      setFiles([]);
      setSelectedFile(null);
      setHistory([]);
    }
  }, [selectedProject, role]);

  useEffect(() => {
    if (role === "atelier" && (activeTab === "tasks" || activeTab === "devis")) {
      setActiveTab("projects");
    }
  }, [role, activeTab]);

  useEffect(() => {
    if (role === "atelier" && selectedFile?.file_category === "other") {
      const firstVisible = files.find((file) => file.file_category !== "other") || null;
      setSelectedFile(firstVisible);
    }
  }, [role, selectedFile, files]);

useEffect(() => {
  const refreshData = async () => {
    if (
      showProjectForm ||
      showCalendarEventForm ||
      showTaskForm ||
      showPurchaseForm ||
      savingProject ||
      savingCalendarEvent ||
      savingTask ||
      savingPurchase
    ) {
      return;
    }

    const { data: projectsData } = await supabase.from("projects").select("*");
    const { data: calendarData } = await supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_completed", false)
      .order("created_at", { ascending: false });
    const { data: purchasesData } = await supabase
      .from("project_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (projectsData) setProjects(projectsData as Project[]);
    if (calendarData) setManualCalendarEvents(calendarData as CalendarEventRow[]);
    if (tasksData) setTasks(tasksData as Task[]);
    if (purchasesData) setPurchases(purchasesData as PurchaseItem[]);
  };

  const interval = window.setInterval(refreshData, 60000);

  return () => window.clearInterval(interval);
}, [
  showProjectForm,
  showCalendarEventForm,
  showTaskForm,
  showPurchaseForm,
  savingProject,
  savingCalendarEvent,
  savingTask,
  savingPurchase,
]);

  const sortedProjects = useMemo(() => {
    const rows = [...projects];

    rows.sort((a, b) => {
      switch (projectSort) {
        case "installation_asc":
          return (
            sortableDateValue(a.installation_date) -
            sortableDateValue(b.installation_date)
          );

        case "client_asc":
          return a.client_name.localeCompare(b.client_name, "fr", {
            sensitivity: "base",
          });

        case "project_number_asc":
          return a.project_number.localeCompare(b.project_number, "fr", {
            sensitivity: "base",
          });

        case "status_asc":
          return a.status.localeCompare(b.status, "fr", {
            sensitivity: "base",
          });

        case "fabrication_desc":
        default:
          return (
            sortableDateValue(b.fabrication_date) -
            sortableDateValue(a.fabrication_date)
          );
      }
    });

    return rows;
  }, [projects, projectSort]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sortedProjects.filter((p) => {
      const fabrication = formatDate(p.fabrication_date).toLowerCase();

      const matchesSearch =
        !q ||
        p.project_number.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        p.project_type.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q) ||
        fabrication.includes(q);

      const matchesStatus = !statusFilter || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sortedProjects, search, statusFilter]);

  const activeProjects = useMemo(() => {
    return filteredProjects.filter((p) => p.status !== "Terminé");
  }, [filteredProjects]);

  const completedProjects = useMemo(() => {
    return filteredProjects.filter((p) => p.status === "Terminé");
  }, [filteredProjects]);

  const fabricationCount = useMemo(() => {
    return projects.filter((p) => p.status === "En fabrication").length;
  }, [projects]);

  const readyInstallCount = useMemo(() => {
    return projects.filter((p) => p.status === "Prêt pour pose").length;
  }, [projects]);

  const completedByYear = useMemo(() => {
    const map: Record<string, number> = {
      "2026": 0,
      "2027": 0,
    };

    projects.forEach((p) => {
      if (p.status === "Terminé" && p.completed_at) {
        const year = new Date(p.completed_at).getFullYear().toString();
        map[year] = (map[year] || 0) + 1;
      }
    });

    return Object.entries(map).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [projects]);

  const accessibleFiles = useMemo(() => {
    return role === "atelier"
      ? files.filter((f) => f.file_category !== "other")
      : files;
  }, [files, role]);

  const fileGroups = useMemo(() => {
    return {
      pdf: accessibleFiles.filter((f) => f.file_category === "pdf"),
      image: accessibleFiles.filter((f) => f.file_category === "image"),
      technique: accessibleFiles.filter((f) => f.file_category === "technique"),
      other: accessibleFiles.filter((f) => f.file_category === "other"),
    };
  }, [accessibleFiles]);

  const imageFiles = useMemo(() => {
    return fileGroups.image.filter(isImageFile);
  }, [fileGroups.image]);

  const selectedImageIndex = useMemo(() => {
    if (!selectedFile) return -1;
    return imageFiles.findIndex((f) => f.id === selectedFile.id);
  }, [imageFiles, selectedFile]);

  const autoPoseEvents = useMemo<UnifiedCalendarEvent[]>(() => {
    return projects
      .filter((p) => p.installation_date)
      .map((p) => ({
        id: `project-${p.id}`,
        source: "project" as const,
        source_id: p.id,
        title: `Pose - ${p.project_number}`,
        event_type: "Pose",
        event_date: p.installation_date as string,
        start_time: null,
        end_time: null,
        notes: p.notes || null,
        client_name: p.client_name,
        address: p.address,
        project_id: p.id,
        project_number: p.project_number,
      }));
  }, [projects]);

  const manualEvents = useMemo<UnifiedCalendarEvent[]>(() => {
    return manualCalendarEvents.map((e) => {
      const linkedProject = projects.find((p) => p.id === e.project_id);

      return {
        id: `manual-${e.id}`,
        source: "manual" as const,
        source_id: e.id,
        title: e.title,
        event_type: e.event_type,
        event_date: e.event_date,
        start_time: e.start_time,
        end_time: e.end_time,
        notes: e.notes,
        client_name: e.client_name,
        address: e.address,
        project_id: e.project_id,
        project_number: linkedProject?.project_number || null,
      };
    });
  }, [manualCalendarEvents, projects]);

  const holidayEvents = useMemo<UnifiedCalendarEvent[]>(() => {
    return BELGIUM_HOLIDAYS_2026.map((holiday) => ({
      id: `holiday-${holiday.date}`,
      source: "holiday" as const,
      source_id: null,
      title: holiday.name,
      event_type: "Jour férié",
      event_date: holiday.date,
      start_time: null,
      end_time: null,
      notes: "Jour férié légal en Belgique",
      client_name: null,
      address: null,
      project_id: null,
      project_number: null,
    }));
  }, []);

  const allCalendarEvents = useMemo<UnifiedCalendarEvent[]>(() => {
    return [...holidayEvents, ...manualEvents, ...autoPoseEvents].sort((a, b) => {
      const dateCmp =
        sortableDateValue(a.event_date) - sortableDateValue(b.event_date);
      if (dateCmp !== 0) return dateCmp;

      if (a.source === "holiday" && b.source !== "holiday") return -1;
      if (a.source !== "holiday" && b.source === "holiday") return 1;

      return (a.start_time || "").localeCompare(b.start_time || "");
    });
  }, [holidayEvents, manualEvents, autoPoseEvents]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, UnifiedCalendarEvent[]>();
    for (const event of allCalendarEvents) {
      const arr = map.get(event.event_date) || [];
      arr.push(event);
      map.set(event.event_date, arr);
    }
    return map;
  }, [allCalendarEvents]);

  const activePurchases = useMemo(() => {
    return purchases.filter((item) => !item.is_completed);
  }, [purchases]);

  const completedPurchases = useMemo(() => {
    return purchases.filter((item) => item.is_completed);
  }, [purchases]);

  const unreadPurchaseCount = useMemo(() => {
    return purchases.filter((item) => item.requested_by === "atelier" && !item.is_read && !item.is_completed).length;
  }, [purchases]);

  const setProjectStatus = async (project: Project, newStatus: string) => {
    const oldStatus = project.status;

    const updateData: any = {
      status: newStatus,
    };

    if (newStatus === "Terminé") {
      updateData.completed_at = new Date().toISOString().split("T")[0];
    } else {
      updateData.completed_at = null;
    }

    const { error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", project.id);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de la mise à jour du projet.");
      return;
    }

    await addHistory(project.id, "Statut modifié", `${oldStatus} → ${newStatus}`);
    await fetchProjects();
    await fetchHistory(project.id);
  };

  const toggleCompleted = async (project: Project) => {
    const newStatus =
      project.status === "Terminé" ? "En fabrication" : "Terminé";
    await setProjectStatus(project, newStatus);
  };

  const openCreateProject = () => {
    setEditingProjectId(null);
    setForm({
      ...emptyForm,
      project_number: getNextProjectNumber(projects),
    });
    setShowProjectForm(true);
    setTimeout(() => {
      projectFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      projectClientInputRef.current?.focus();
    }, 50);
  };

  const openEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setForm({
      project_number: project.project_number || "",
      client_name: project.client_name || "",
      project_type: project.project_type || "",
      address: project.address || "",
      status: project.status || "Validé",
      priority: project.priority || "Moyenne",
      validation_date: project.validation_date || "",
      fabrication_date: project.fabrication_date || "",
      installation_date: project.installation_date || "",
      notes: project.notes || "",
    });
    setShowProjectForm(true);
    setTimeout(() => {
      projectFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      projectClientInputRef.current?.focus();
    }, 50);
  };

  const saveProject = async () => {
    if (!form.client_name.trim() || !form.project_type.trim()) {
      alert("Merci de remplir au minimum : client et type.");
      return;
    }

    setSavingProject(true);

    let projectNumber = form.project_number.trim();

    if (!editingProjectId) {
      const existingNumbers = new Set(projects.map((p) => p.project_number));

      if (!projectNumber || existingNumbers.has(projectNumber)) {
        projectNumber = getNextProjectNumber(projects);
      }
    }

    const payload: any = {
      project_number: projectNumber,
      client_name: form.client_name.trim(),
      project_type: form.project_type.trim(),
      address: form.address.trim() || null,
      status: form.status,
      priority: form.priority || null,
      validation_date: form.validation_date || null,
      fabrication_date: form.fabrication_date || null,
      installation_date: form.installation_date || null,
      notes: form.notes.trim() || null,
    };

    if (form.status === "Terminé") {
      payload.completed_at = new Date().toISOString().split("T")[0];
    }

    let error = null;
    let projectIdForHistory: number | null = null;

    if (editingProjectId) {
      const result = await supabase
        .from("projects")
        .update(payload)
        .eq("id", editingProjectId)
        .select();

      error = result.error;
      projectIdForHistory = editingProjectId;
    } else {
      const result = await supabase.from("projects").insert(payload).select();
      error = result.error;
      if (result.data && result.data[0]) {
        projectIdForHistory = result.data[0].id;
      }
    }

    setSavingProject(false);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de l'enregistrement du projet.");
      return;
    }

    if (projectIdForHistory) {
      await addHistory(
        projectIdForHistory,
        editingProjectId ? "Projet modifié" : "Projet créé",
        `${projectNumber} - ${form.client_name}`
      );
    }

    setShowProjectForm(false);
    setEditingProjectId(null);
    setForm(emptyForm);
    await fetchProjects();
  };

  const deleteProject = async (project: Project) => {
    const ok = window.confirm(
      `Supprimer le projet ${project.project_number} - ${project.client_name} ?`
    );
    if (!ok) return;

    await addHistory(
      project.id,
      "Projet supprimé",
      `${project.project_number} - ${project.client_name}`
    );

    const { error } = await supabase.from("projects").delete().eq("id", project.id);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de la suppression du projet.");
      return;
    }

    if (selectedProject?.id === project.id) {
      setSelectedProject(null);
      setFiles([]);
      setSelectedFile(null);
      setHistory([]);
    }

    await fetchProjects();
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) {
      alert("Merci de remplir le titre de la tâche.");
      return;
    }

    setSavingTask(true);

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      due_date: taskForm.due_date || null,
      is_completed: false,
    };

    const { error } = await supabase.from("tasks").insert(payload);

    setSavingTask(false);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de l'enregistrement de la tâche.");
      return;
    }

    setTaskForm(emptyTaskForm);
    setShowTaskForm(false);
    await fetchTasks();
  };

  const completeTask = async (task: Task) => {
    const ok = window.confirm(
      `Confirmer que la tâche "${task.title}" est terminée ?`
    );
    if (!ok) return;

    const { error } = await supabase
      .from("tasks")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de la validation de la tâche.");
      return;
    }

    if (selectedTask?.id === task.id) {
      setSelectedTask(null);
    }

    await fetchTasks();
  };

  const savePurchase = async () => {
    if (!purchaseForm.project_id || !purchaseForm.description.trim()) {
      alert("Merci de choisir un projet et de remplir ce qu'il faut acheter.");
      return;
    }

    const project = projects.find((p) => String(p.id) === purchaseForm.project_id);
    if (!project) {
      alert("Projet introuvable.");
      return;
    }

    setSavingPurchase(true);

    const payload = {
      project_id: project.id,
      project_name: project.client_name,
      project_number: project.project_number,
      item_type: purchaseForm.item_type,
      description: purchaseForm.description.trim(),
      is_completed: false,
    };

    const { error } = await supabase.from("project_purchases").insert(payload);

    setSavingPurchase(false);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de l'enregistrement de l'achat projet.");
      return;
    }

    setPurchaseForm(emptyPurchaseForm);
    setShowPurchaseForm(false);
    await fetchPurchases();
  };

  const saveAtelierOrder = async () => {
    if (!atelierSelectedProduct) {
      alert("Merci de choisir un produit.");
      return;
    }
    const project = atelierProjectId ? projects.find((p) => String(p.id) === atelierProjectId) : null;

    setSavingAtelierOrder(true);
    const payload = {
      project_id: project?.id ?? null,
      project_name: project?.client_name ?? "Général",
      project_number: project?.project_number ?? "-",
      item_type: atelierSelectedProduct.category,
      description: atelierNote.trim() || atelierSelectedProduct.label,
      quantity: atelierQuantity,
      purchase_url: atelierSelectedProduct.url || null,
      product_key: atelierSelectedProduct.key,
      requested_by: "atelier",
      is_read: false,
      is_completed: false,
    };
    const { error } = await supabase.from("project_purchases").insert(payload);
    setSavingAtelierOrder(false);
    if (error) { alert("Erreur lors de l'envoi de la demande."); return; }
    setAtelierSelectedProduct(null);
    setAtelierQuantity(1);
    setAtelierProjectId("");
    setAtelierNote("");
    await fetchPurchases();
    alert("Demande envoyée au bureau !");
  };

  const markPurchaseRead = async (item: PurchaseItem) => {
    if (item.is_read) return;
    await supabase.from("project_purchases").update({ is_read: true }).eq("id", item.id);
    setPurchases((prev) => prev.map((p) => p.id === item.id ? { ...p, is_read: true } : p));
  };

  const markAllPurchasesRead = async () => {
    const unread = purchases.filter((p) => p.requested_by === "atelier" && !p.is_read);
    if (unread.length === 0) return;
    await supabase.from("project_purchases").update({ is_read: true }).in("id", unread.map((p) => p.id));
    setPurchases((prev) => prev.map((p) => ({ ...p, is_read: true })));
  };

  const updatePurchase = async () => {
    if (!selectedPurchase) return;

    if (!selectedPurchase.description.trim()) {
      alert("Merci de remplir la description.");
      return;
    }

    const { error } = await supabase
      .from("project_purchases")
      .update({
        item_type: selectedPurchase.item_type,
        description: selectedPurchase.description.trim(),
      })
      .eq("id", selectedPurchase.id);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de la modification.");
      return;
    }

    await fetchPurchases();
    alert("Achat projet modifié.");
  };

  const togglePurchaseCompleted = async (item: PurchaseItem) => {
    const { error } = await supabase
      .from("project_purchases")
      .update({
        is_completed: !item.is_completed,
        completed_at: item.is_completed ? null : new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de la mise à jour.");
      return;
    }

    if (selectedPurchase?.id === item.id) {
      setSelectedPurchase({
        ...selectedPurchase,
        is_completed: !item.is_completed,
        completed_at: item.is_completed ? null : new Date().toISOString(),
      });
    }

    await fetchPurchases();
  };

  const deletePurchase = async (item: PurchaseItem) => {
    const ok = window.confirm(
      `Supprimer cet achat projet pour ${item.project_name} ?`
    );
    if (!ok) return;

    const { error } = await supabase
      .from("project_purchases")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de la suppression.");
      return;
    }

    if (selectedPurchase?.id === item.id) {
      setSelectedPurchase(null);
    }

    await fetchPurchases();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || !selectedProject) return;

    setMessage("");
    setUploading(true);

    try {
      let successCount = 0;
      let errors: string[] = [];

      for (const file of Array.from(selectedFiles)) {
        const safeName = sanitizeFileName(file.name);
        const folderName = sanitizeFileName(selectedProject.project_number);
        const uniquePrefix = `${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        const filePath = `${folderName}/${uniquePrefix}_${safeName}`;
        const contentType = getContentType(file);

        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(filePath, file, {
            upsert: false,
            contentType,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError.message);
          errors.push(`${file.name}: ${uploadError.message}`);
          continue;
        }

        const { error: insertError } = await supabase.from("project_files").insert({
          project_id: selectedProject.id,
          file_name: file.name,
          file_path: filePath,
          file_type: contentType,
          file_category: category,
        });

        if (insertError) {
          console.error("DB insert error:", insertError.message);
          errors.push(`${file.name}: ${insertError.message}`);
          continue;
        }

        await addHistory(
          selectedProject.id,
          "Fichier ajouté",
          `${file.name} (${category})`
        );

        successCount += 1;
      }

      if (successCount > 0) {
        setMessage(`${successCount} fichier(s) ajouté(s) avec succès.`);
        await fetchFiles(selectedProject.id);
        await fetchHistory(selectedProject.id);
      }

      if (errors.length > 0) {
        setMessage(
          successCount > 0
            ? `${successCount} fichier(s) ajouté(s). Erreurs : ${errors.join(" | ")}`
            : `Erreur upload : ${errors.join(" | ")}`
        );
      }

      e.target.value = "";
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (file: ProjectFile) => {
    const ok = window.confirm(`Supprimer le fichier "${file.file_name}" ?`);
    if (!ok) return;

    const { error: storageError } = await supabase.storage
      .from("project-files")
      .remove([file.file_path]);

    if (storageError) {
      console.error(storageError.message);
      alert("Erreur lors de la suppression du fichier dans le storage.");
      return;
    }

    const { error: dbError } = await supabase
      .from("project_files")
      .delete()
      .eq("id", file.id);

    if (dbError) {
      console.error(dbError.message);
      alert("Erreur lors de la suppression du fichier en base.");
      return;
    }

    if (selectedProject) {
      await addHistory(selectedProject.id, "Fichier supprimé", file.file_name);
      await fetchFiles(selectedProject.id);
      await fetchHistory(selectedProject.id);
    }

    setSelectedFile(null);
  };

  const handleDownload = async (file: ProjectFile) => {
    try {
      const url = getPublicFileUrl(file.file_path);
      const response = await fetch(url);

      if (!response.ok) {
        alert("Erreur lors du téléchargement du fichier.");
        return;
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      alert("Erreur lors du téléchargement du fichier.");
    }
  };

  const showPrevImage = () => {
    if (selectedImageIndex <= 0) return;
    setSelectedFile(imageFiles[selectedImageIndex - 1]);
  };

  const showNextImage = () => {
    if (selectedImageIndex < 0 || selectedImageIndex >= imageFiles.length - 1)
      return;
    setSelectedFile(imageFiles[selectedImageIndex + 1]);
  };

  const openCalendarEventForm = (date?: string) => {
    setCalendarForm({
      ...emptyCalendarForm,
      event_date: date || toDateOnly(new Date()),
      project_id: selectedProject ? String(selectedProject.id) : "",
      client_name: selectedProject?.client_name || "",
      address: selectedProject?.address || "",
      title:
        selectedProject && selectedProject.project_number
          ? `Pose - ${selectedProject.project_number}`
          : "",
    });
    setShowCalendarEventForm(true);
  };

  const openCalendarEventDetails = (event: UnifiedCalendarEvent) => {
    setSelectedCalendarEvent(event);
    setShowCalendarEventDetails(true);
  };

  const editManualCalendarEvent = (event: UnifiedCalendarEvent) => {
    if (event.source !== "manual" || !event.source_id) return;

    setCalendarForm({
      id: event.source_id,
      title: event.title,
      event_type: event.event_type,
      event_date: event.event_date,
      start_time: event.start_time || "",
      end_time: event.end_time || "",
      notes: event.notes || "",
      client_name: event.client_name || "",
      address: event.address || "",
      project_id: event.project_id ? String(event.project_id) : "",
    });

    setShowCalendarEventDetails(false);
    setShowCalendarEventForm(true);
  };

  const handleCalendarProjectChange = (projectIdValue: string) => {
    const linkedProject = projects.find((p) => String(p.id) === projectIdValue);

    setCalendarForm((prev) => ({
      ...prev,
      project_id: projectIdValue,
      client_name: linkedProject?.client_name || "",
      address: linkedProject?.address || "",
      title:
        linkedProject && !prev.title.trim()
          ? `${prev.event_type} - ${linkedProject.project_number}`
          : prev.title,
    }));
  };

  const saveCalendarEvent = async () => {
    if (!calendarForm.title.trim() || !calendarForm.event_date) {
      alert("Merci de remplir au minimum le titre et la date.");
      return;
    }

    setSavingCalendarEvent(true);

    const payload = {
      title: calendarForm.title.trim(),
      event_type: calendarForm.event_type,
      event_date: calendarForm.event_date,
      start_time: calendarForm.start_time || null,
      end_time: calendarForm.end_time || null,
      notes: calendarForm.notes.trim() || null,
      client_name: calendarForm.client_name.trim() || null,
      address: calendarForm.address.trim() || null,
      project_id: calendarForm.project_id ? Number(calendarForm.project_id) : null,
    };

    let error = null;

    if (calendarForm.id) {
      const result = await supabase
        .from("calendar_events")
        .update(payload)
        .eq("id", calendarForm.id);

      error = result.error;
    } else {
      const result = await supabase.from("calendar_events").insert(payload);
      error = result.error;
    }

    setSavingCalendarEvent(false);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de l'enregistrement de l'événement.");
      return;
    }

    setShowCalendarEventForm(false);
    setCalendarForm(emptyCalendarForm);
    await fetchManualCalendarEvents();
  };

  const deleteManualCalendarEvent = async (event: UnifiedCalendarEvent) => {
    if (event.source !== "manual" || !event.source_id) return;

    const ok = window.confirm(`Supprimer l'événement "${event.title}" ?`);
    if (!ok) return;

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", event.source_id);

    if (error) {
      console.error(error.message);
      alert("Erreur lors de la suppression de l'événement.");
      return;
    }

    await fetchManualCalendarEvents();
  };

  const openLinkedProjectFromEvent = (event: UnifiedCalendarEvent) => {
    if (!event.project_id) return;

    const project = projects.find((p) => p.id === event.project_id);
    if (!project) return;

    setSelectedProject(project);
    setActiveTab("projects");
    setShowCalendarEventDetails(false);
  };

  const goCalendarPrev = () => {
    if (calendarViewMode === "day") {
      setCalendarCursorDate(addDays(calendarCursorDate, -1));
    } else if (calendarViewMode === "week") {
      setCalendarCursorDate(addDays(calendarCursorDate, -7));
    } else {
      setCalendarCursorDate(
        new Date(
          calendarCursorDate.getFullYear(),
          calendarCursorDate.getMonth() - 1,
          1
        )
      );
    }
  };

  const goCalendarNext = () => {
    if (calendarViewMode === "day") {
      setCalendarCursorDate(addDays(calendarCursorDate, 1));
    } else if (calendarViewMode === "week") {
      setCalendarCursorDate(addDays(calendarCursorDate, 7));
    } else {
      setCalendarCursorDate(
        new Date(
          calendarCursorDate.getFullYear(),
          calendarCursorDate.getMonth() + 1,
          1
        )
      );
    }
  };

  const goCalendarToday = () => {
    setCalendarCursorDate(new Date());
  };
  const renderProjectCard = (project: Project) => {
    const isCompleted = project.status === "Terminé";
    const isSelected = selectedProject?.id === project.id;

    return (
      <button key={project.id} onClick={() => setSelectedProject(project)} style={{
        width: "100%", textAlign: "left",
        background: isCompleted ? "#f8fafc" : "white",
        borderRadius: 20,
        padding: isMobile ? 18 : 24,
        boxShadow: isSelected ? "0 6px 24px rgba(15,36,71,0.18)" : "0 2px 10px rgba(0,0,0,0.06)",
        border: isSelected ? `2px solid #1e3a8a` : `1px solid #e8edf5`,
        cursor: "pointer",
        transition: "box-shadow 0.15s, transform 0.15s",
      }}
        onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,36,71,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
        onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}}
      >
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: "#0f172a", lineHeight: 1.05, letterSpacing: "-0.01em" }}>
              {project.project_number}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#475569", marginTop: 6 }}>
              {project.client_name}
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        {/* Info row */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 12 }}>
          <InfoCell label="Type" value={project.project_type} />
          <InfoCell label="Adresse" value={project.address || "—"} />
          <InfoCell label="Fabrication" value={formatDate(project.fabrication_date)} />
          <InfoCell label="Pose" value={formatDate(project.installation_date)} />
          <InfoCell label="Priorité" value={project.priority || "—"} />
        </div>

        {project.notes && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Notes atelier</div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{project.notes}</div>
          </div>
        )}
      </button>
    );
  };

  const renderFileButton = (file: ProjectFile) => {
    const url = getPublicFileUrl(file.file_path);

    return (
      <div
        key={file.id}
        style={{
          border:
            selectedFile?.id === file.id
              ? `2px solid ${BRAND_BLUE}`
              : "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 12,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 800, color: TEXT_DARK }}>{file.file_name}</div>
        <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 4 }}>
          Ajouté le {formatDate(file.created_at)}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button onClick={() => setSelectedFile(file)} style={lightButtonSmall}>
            Aperçu
          </button>

          <a href={url} target="_blank" rel="noreferrer" style={openLinkStyle}>
            Ouvrir
          </a>

          <button onClick={() => handleDownload(file)} style={blueButtonSmall}>
            Télécharger
          </button>

          <button onClick={() => deleteFile(file)} style={redButtonSmall}>
            Supprimer
          </button>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    if (!selectedFile) {
      return (
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 24,
            border: "1px solid #e2e8f0",
            color: TEXT_LIGHT,
          }}
        >
          Aucun fichier sélectionné.
        </div>
      );
    }

    if (role === "atelier" && selectedFile.file_category === "other") {
      return (
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 24,
            border: "1px solid #e2e8f0",
            color: TEXT_LIGHT,
          }}
        >
          Accès réservé au bureau.
        </div>
      );
    }

    const url = getPublicFileUrl(selectedFile.file_path);
    const image = isImageFile(selectedFile);
    const pdf = isPdfFile(selectedFile);

    return (
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 20,
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: TEXT_DARK,
            marginBottom: 12,
          }}
        >
          Aperçu fichier
        </div>

        <div style={{ fontWeight: 800, marginBottom: 8, color: TEXT_DARK }}>
          {selectedFile.file_name}
        </div>

        {image ? (
          <>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={showPrevImage}
                disabled={selectedImageIndex <= 0}
                style={{
                  ...outlineButton,
                  opacity: selectedImageIndex <= 0 ? 0.5 : 1,
                }}
              >
                Précédent
              </button>

              <button
                onClick={showNextImage}
                disabled={
                  selectedImageIndex < 0 || selectedImageIndex >= imageFiles.length - 1
                }
                style={{
                  ...outlineButton,
                  opacity:
                    selectedImageIndex < 0 || selectedImageIndex >= imageFiles.length - 1
                      ? 0.5
                      : 1,
                }}
              >
                Suivant
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: TEXT_LIGHT,
                  fontWeight: 700,
                }}
              >
                {selectedImageIndex >= 0
                  ? `${selectedImageIndex + 1} / ${imageFiles.length}`
                  : "-"}
              </div>
            </div>

            <img
              src={url}
              alt={selectedFile.file_name}
              style={{
                width: "100%",
                maxHeight: isMobile ? 360 : 560,
                objectFit: "contain",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                background: BG_SOFT,
              }}
            />
          </>
        ) : pdf ? (
          <iframe
            src={url}
            title={selectedFile.file_name}
            style={{
              width: "100%",
              height: isMobile ? 420 : 650,
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              background: "white",
            }}
          />
        ) : (
          <div style={{ color: TEXT_LIGHT }}>
            Aperçu non disponible pour ce format. Utilise Ouvrir ou Télécharger.
          </div>
        )}
      </div>
    );
  };

  const renderHistoryToggleBlock = () => (
    <div
      style={{
        background: "white",
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: showHistory ? 16 : 0,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: TEXT_DARK,
          }}
        >
          Historique projet
        </div>

        <button
          onClick={() => setShowHistory((prev) => !prev)}
          style={lightButton}
        >
          {showHistory ? "Masquer" : "Afficher"}
        </button>
      </div>

      {showHistory && (
        <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 6 }}>
          <HistoryBlock history={history} />
        </div>
      )}
    </div>
  );

  const renderCalendarHeaderLabel = () => {
    if (calendarViewMode === "day") return dayLabel(calendarCursorDate);
    if (calendarViewMode === "week") return weekRangeLabel(calendarCursorDate);
    return monthLabel(calendarCursorDate);
  };

  const renderMonthView = () => {
    const start = startOfMonthGrid(calendarCursorDate);
    const end = endOfMonthGrid(calendarCursorDate);

    const days: Date[] = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }

    return (
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: isMobile ? 10 : 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          overflowX: isMobile ? "auto" : "visible",
        }}
      >
        <div
          style={{
            minWidth: isMobile ? 760 : "auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, idx) => (
              <div
                key={d}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: idx >= 5 ? WEEKEND_BG : BG_SOFT,
                  color: TEXT_DARK,
                  fontWeight: 900,
                  textAlign: "center",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {days.map((day) => {
              const dateKey = toDateOnly(day);
              const dayEvents = eventsByDate.get(dateKey) || [];
              const inCurrentMonth = day.getMonth() === calendarCursorDate.getMonth();
              const weekend = isWeekend(day);
              const today = isSameDay(day, new Date());

              return (
                <div
                  key={dateKey}
                  onClick={() => openCalendarEventForm(dateKey)}
                  style={{
                    minHeight: 138,
                    borderRadius: 16,
                    border: today ? `2px solid ${BRAND_BLUE}` : "1px solid #e2e8f0",
                    background: weekend ? WEEKEND_BG : "white",
                    padding: 10,
                    textAlign: "left",
                    cursor: "pointer",
                    opacity: inCurrentMonth ? 1 : 0.5,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      color: TEXT_DARK,
                      marginBottom: 8,
                    }}
                  >
                    {String(day.getDate()).padStart(2, "0")}
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    {dayEvents.slice(0, 3).map((event) => {
                      const c = getEventTypeStyle(event.event_type);
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openCalendarEventDetails(event);
                          }}
                          style={{
                            background: c.bg,
                            color: c.color,
                            borderRadius: 10,
                            padding: "7px 8px",
                            fontWeight: 800,
                            overflow: "hidden",
                            cursor: "pointer",
                          }}
                          title={event.title}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              lineHeight: 1.2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {event.start_time ? `${event.start_time.slice(0, 5)} · ` : ""}
                            {getCalendarMainText(event)}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              lineHeight: 1.2,
                              marginTop: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              opacity: 0.95,
                            }}
                          >
                            {getCalendarSubText(event)}
                          </div>
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 700 }}>
                        + {dayEvents.length - 3} autre(s)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeekMonday(calendarCursorDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(7, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {days.map((day) => {
          const dateKey = toDateOnly(day);
          const dayEvents = eventsByDate.get(dateKey) || [];
          const weekend = isWeekend(day);
          const today = isSameDay(day, new Date());

          return (
            <div
              key={dateKey}
              style={{
                background: weekend ? WEEKEND_BG : "white",
                borderRadius: 24,
                padding: 16,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                border: today ? `2px solid ${BRAND_BLUE}` : "1px solid #e2e8f0",
                minHeight: isMobile ? "auto" : 360,
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  color: TEXT_DARK,
                  marginBottom: 6,
                  textTransform: "capitalize",
                }}
              >
                {day.toLocaleDateString("fr-BE", {
                  weekday: "long",
                })}
              </div>

              <div
                style={{
                  color: TEXT_MEDIUM,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                {formatDate(dateKey)}
              </div>

              <button
                onClick={() => openCalendarEventForm(dateKey)}
                style={{
                  ...outlineButton,
                  width: "100%",
                  marginBottom: 12,
                }}
              >
                + Ajouter
              </button>

              <div style={{ display: "grid", gap: 10 }}>
                {dayEvents.length === 0 ? (
                  <div style={{ color: TEXT_LIGHT, fontSize: 13 }}>
                    Aucun événement
                  </div>
                ) : (
                  dayEvents.map((event) => {
                    const c = getEventTypeStyle(event.event_type);
                    return (
                      <div
                        key={event.id}
                        onClick={() => openCalendarEventDetails(event)}
                        style={{
                          background: c.bg,
                          color: c.color,
                          borderRadius: 14,
                          padding: 10,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 15,
                            lineHeight: 1.2,
                            marginBottom: 3,
                          }}
                        >
                          {getCalendarMainText(event)}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            lineHeight: 1.2,
                            marginBottom: 6,
                            opacity: 0.95,
                          }}
                        >
                          {getCalendarSubText(event)}
                        </div>

                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {event.start_time
                            ? `${event.start_time.slice(0, 5)}${
                                event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ""
                              }`
                            : "Journée"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dateKey = toDateOnly(calendarCursorDate);
    const dayEvents = eventsByDate.get(dateKey) || [];
    const weekend = isWeekend(calendarCursorDate);

    return (
      <div
        style={{
          background: weekend ? WEEKEND_BG : "white",
          borderRadius: 24,
          padding: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          border: isSameDay(calendarCursorDate, new Date())
            ? `2px solid ${BRAND_BLUE}`
            : "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: isMobile ? 22 : 28,
              fontWeight: 900,
              color: TEXT_DARK,
              textTransform: "capitalize",
            }}
          >
            {dayLabel(calendarCursorDate)}
          </div>

          <button onClick={() => openCalendarEventForm(dateKey)} style={blueButtonTop}>
            + Ajouter un événement
          </button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {dayEvents.length === 0 ? (
            <div style={{ color: TEXT_LIGHT }}>Aucun événement ce jour.</div>
          ) : (
            dayEvents.map((event) => {
              const c = getEventTypeStyle(event.event_type);
              return (
                <div
                  key={event.id}
                  onClick={() => openCalendarEventDetails(event)}
                  style={{
                    background: "white",
                    borderRadius: 18,
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      background: c.bg,
                      color: c.color,
                      padding: "10px 14px",
                      fontWeight: 900,
                    }}
                  >
                    {event.event_type}
                  </div>

                  <div style={{ padding: 14 }}>
                    <div
                      style={{
                        fontSize: isMobile ? 22 : 26,
                        fontWeight: 900,
                        color: TEXT_DARK,
                        marginBottom: 4,
                        lineHeight: 1.1,
                      }}
                    >
                      {getCalendarMainText(event)}
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: TEXT_MEDIUM,
                        marginBottom: 10,
                      }}
                    >
                      {getCalendarSubText(event)}
                    </div>

                    <div style={{ color: TEXT_MEDIUM, lineHeight: 1.8 }}>
                      <div>
                        <strong>Heure :</strong>{" "}
                        {event.start_time
                          ? `${event.start_time.slice(0, 5)}${
                              event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ""
                            }`
                          : "Journée"}
                      </div>
                      <div>
                        <strong>Adresse :</strong> {event.address || "-"}
                      </div>
                      <div>
                        <strong>Notes :</strong> {event.notes || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderTasks = () => (
    <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: TEXT_DARK,
          }}
        >
          Tâches
        </div>
        <div style={{ color: TEXT_LIGHT }}>
          Liste simple des choses à faire, de la plus récente à la plus ancienne
        </div>
      </div>

      {showTaskForm && (
        <div
          ref={taskFormRef}
          style={{
            background: "white",
            borderRadius: 28,
            padding: 28,
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              marginBottom: 20,
              color: TEXT_DARK,
            }}
          >
            Ajouter une tâche
          </div>

          <input
            ref={taskTitleInputRef}
            placeholder="Titre de la tâche"
            value={taskForm.title}
            onChange={(e) =>
              setTaskForm({ ...taskForm, title: e.target.value })
            }
            style={bigInputStyle}
          />

          <div style={{ marginTop: 14 }}>
            <div style={bigLabelStyle}>Date limite</div>
            <input
              type="date"
              value={taskForm.due_date}
              onChange={(e) =>
                setTaskForm({ ...taskForm, due_date: e.target.value })
              }
              style={bigInputStyle}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={bigLabelStyle}>Description</div>
            <textarea
              placeholder="Détails de la tâche..."
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm({ ...taskForm, description: e.target.value })
              }
              style={{
                ...bigInputStyle,
                minHeight: 140,
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 22,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={saveTask}
              disabled={savingTask}
              style={{
                ...blueButtonTop,
                opacity: savingTask ? 0.7 : 1,
              }}
            >
              {savingTask ? "Enregistrement..." : "Enregistrer"}
            </button>

            <button
              onClick={() => {
                setShowTaskForm(false);
                setTaskForm(emptyTaskForm);
              }}
              style={outlineButtonTop}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: TEXT_DARK,
              marginBottom: 16,
            }}
          >
            Liste des tâches ({tasks.length})
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {tasks.length === 0 ? (
              <div style={{ color: TEXT_LIGHT }}>Aucune tâche à faire.</div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "52px 1fr",
                    gap: 14,
                    border: "1px solid #e2e8f0",
                    borderRadius: 22,
                    padding: 16,
                    background: "white",
                  }}
                >
                  <button
                    onClick={() => completeTask(task)}
                    title="Marquer comme terminé"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      border: `2px solid ${BRAND_BLUE}`,
                      background: "white",
                      cursor: "pointer",
                      marginTop: 6,
                    }}
                  />

                  <button
                    onClick={() => setSelectedTask(task)}
                    style={{
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: isMobile ? 22 : 28,
                        fontWeight: 900,
                        color: TEXT_DARK,
                        lineHeight: 1.1,
                      }}
                    >
                      {task.title}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 18,
                        flexWrap: "wrap",
                        marginTop: 10,
                        color: TEXT_MEDIUM,
                        fontWeight: 700,
                      }}
                    >
                      <span>Créée : {formatDateTime(task.created_at)}</span>
                      <span>À terminer : {formatDate(task.due_date)}</span>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            minHeight: 260,
            position: isMobile ? "static" : "sticky",
            top: 24,
            alignSelf: "start",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: TEXT_DARK,
              marginBottom: 16,
            }}
          >
            Détail tâche
          </div>

          {selectedTask ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  fontSize: isMobile ? 24 : 30,
                  fontWeight: 900,
                  color: TEXT_DARK,
                  lineHeight: 1.1,
                }}
              >
                {selectedTask.title}
              </div>

              <div style={{ color: TEXT_MEDIUM, lineHeight: 1.8 }}>
                <div>
                  <strong>Créée le :</strong> {formatDateTime(selectedTask.created_at)}
                </div>
                <div>
                  <strong>À terminer pour :</strong> {formatDate(selectedTask.due_date)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 14,
                  background: BG_SOFT,
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    color: TEXT_DARK,
                    marginBottom: 8,
                  }}
                >
                  Description
                </div>
                <div style={{ color: TEXT_MEDIUM, lineHeight: 1.7 }}>
                  {selectedTask.description || "Aucune description."}
                </div>
              </div>

              <button
                onClick={() => completeTask(selectedTask)}
                style={greenButton}
              >
                Terminer la tâche
              </button>
            </div>
          ) : (
            <div style={{ color: TEXT_LIGHT, lineHeight: 1.7 }}>
              Clique sur une tâche dans la liste pour voir son détail.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPurchasesAtelier = () => (
    <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
      <div style={{ background: "linear-gradient(135deg, #0f2447, #1a3a6e)", borderRadius: 24, padding: "24px 28px", color: "white" }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>Commander un produit</div>
        <div style={{ fontSize: 14, opacity: 0.75 }}>Sélectionne un produit et envoie une demande au bureau</div>
      </div>

      {/* Product grid — grouped by category, order panel appears inline under selected category */}
      {Array.from(new Set(PRODUCT_CATALOG.map((p) => p.category))).map((cat) => {
        const catHasSelected = atelierSelectedProduct?.category === cat;
        return (
          <div key={cat}>
            <div style={{ fontSize: 13, fontWeight: 900, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, paddingLeft: 2 }}>{cat}</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 14 }}>
              {PRODUCT_CATALOG.filter((p) => p.category === cat).map((product) => {
                const isSelected = atelierSelectedProduct?.key === product.key;
                return (
                  <button
                    key={product.key}
                    onClick={() => setAtelierSelectedProduct(isSelected ? null : product)}
                    style={{
                      background: isSelected ? "#0f2447" : "white",
                      border: isSelected ? "2.5px solid #1e4d8c" : "1.5px solid #e2e8f0",
                      borderRadius: 18,
                      padding: isMobile ? "12px 8px" : "16px 12px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      boxShadow: isSelected ? "0 4px 20px rgba(15,36,71,0.25)" : "0 1px 4px rgba(0,0,0,0.05)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{
                      width: isMobile ? 80 : 100,
                      height: isMobile ? 80 : 100,
                      borderRadius: 14,
                      background: product.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}>
                      <img
                        src={product.image}
                        alt={product.label}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector("span")) {
                            const span = document.createElement("span");
                            span.textContent = product.label.charAt(0);
                            span.style.cssText = `font-size:22px;font-weight:900;color:${isSelected ? "white" : "#0f172a"}`;
                            parent.appendChild(span);
                          }
                        }}
                      />
                    </div>
                    <div style={{
                      fontSize: isMobile ? 11 : 13,
                      fontWeight: 700,
                      color: isSelected ? "white" : TEXT_DARK,
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}>
                      {product.label}
                    </div>
                    {isSelected && (
                      <div style={{ width: 8, height: 8, borderRadius: 999, background: "#60a5fa" }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Order panel — appears right below the category that contains the selected product */}
            {catHasSelected && atelierSelectedProduct && (
              <div style={{ marginTop: 14, background: "white", borderRadius: 20, padding: 20, border: "2px solid #1e3a8a", boxShadow: "0 4px 20px rgba(15,36,71,0.12)" }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: TEXT_DARK, marginBottom: 16 }}>
                  Demande : {atelierSelectedProduct.label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={bigLabelStyle}>Projet (optionnel)</div>
                    <select value={atelierProjectId} onChange={(e) => setAtelierProjectId(e.target.value)} style={bigInputStyle}>
                      <option value="">Aucun projet (commande générale)</option>
                      {projects.filter((p) => p.status !== "Terminé").map((p) => (
                        <option key={p.id} value={String(p.id)}>{p.project_number} - {p.client_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={bigLabelStyle}>Quantité (pcs)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => setAtelierQuantity((q) => Math.max(1, q - 1))} style={{ width: 44, height: 44, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", fontSize: 22, fontWeight: 900, cursor: "pointer", color: TEXT_DARK }}>−</button>
                      <div style={{ ...bigInputStyle, textAlign: "center", flex: 1, padding: "10px 0", fontWeight: 900, fontSize: 22 }}>{atelierQuantity}</div>
                      <button onClick={() => setAtelierQuantity((q) => q + 1)} style={{ width: 44, height: 44, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", fontSize: 22, fontWeight: 900, cursor: "pointer", color: TEXT_DARK }}>+</button>
                    </div>
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <div style={bigLabelStyle}>Note (optionnel)</div>
                    <input value={atelierNote} onChange={(e) => setAtelierNote(e.target.value)} placeholder="Ex: couleur spécifique, dimension..." style={bigInputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                  <button onClick={saveAtelierOrder} disabled={savingAtelierOrder} style={{ ...blueButtonTop, opacity: savingAtelierOrder ? 0.7 : 1 }}>
                    {savingAtelierOrder ? "Envoi..." : "Envoyer la demande"}
                  </button>
                  <button onClick={() => { setAtelierSelectedProduct(null); setAtelierNote(""); setAtelierQuantity(1); }} style={outlineButtonTop}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* My sent requests */}
      <div style={{ background: "white", borderRadius: 24, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: TEXT_DARK, marginBottom: 16 }}>Mes demandes envoyées</div>
        <div style={{ display: "grid", gap: 12 }}>
          {activePurchases.filter((p) => p.requested_by === "atelier").length === 0 ? (
            <div style={{ color: TEXT_LIGHT }}>Aucune demande en cours.</div>
          ) : (
            activePurchases.filter((p) => p.requested_by === "atelier").map((item) => (
              <div key={item.id} style={{ display: "flex", gap: 14, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 16, padding: "12px 16px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: PRODUCT_CATALOG.find((c) => c.key === item.product_key)?.color || BG_SOFT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  {item.product_key && PRODUCT_CATALOG.find((c) => c.key === item.product_key)?.image ? (
                    <img src={PRODUCT_CATALOG.find((c) => c.key === item.product_key)!.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <span style={{ fontWeight: 800, fontSize: 16, color: TEXT_MEDIUM }}>{item.item_type.charAt(0)}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: TEXT_DARK }}>{item.description}</div>
                  <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 2 }}>{item.project_number} · {item.project_name} · <span style={{ fontWeight: 700 }}>{item.quantity} pcs</span></div>
                </div>
                <div style={{ padding: "4px 10px", borderRadius: 999, background: item.is_completed ? "#dcfce7" : "#fef9c3", color: item.is_completed ? "#166534" : "#854d0e", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {item.is_completed ? "Commandé" : "En attente"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderAtelierCatalog = () => {
    const categories = Array.from(new Set(PRODUCT_CATALOG.map((p) => p.category)));
    return (
      <div style={{ marginTop: 24, display: "grid", gap: 28 }}>
        <div style={{ background: "linear-gradient(135deg, #0f2447, #1a3a6e)", borderRadius: 24, padding: "24px 28px", color: "white" }}>
          <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>Catalogue Achat Atelier</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>Cliquez sur un produit pour l'acheter directement chez le fournisseur</div>
        </div>
        {categories.map((cat) => (
          <div key={cat}>
            <div style={{ fontSize: 13, fontWeight: 900, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, paddingLeft: 2 }}>{cat}</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 14 }}>
              {PRODUCT_CATALOG.filter((p) => p.category === cat).map((product) => (
                <a
                  key={product.key}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "white",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 18,
                    padding: isMobile ? "14px 10px" : "18px 14px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    textDecoration: "none",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                    transition: "all 0.15s ease",
                    cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: isMobile ? 90 : 110,
                    height: isMobile ? 90 : 110,
                    borderRadius: 14,
                    background: product.color,
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <img
                      src={product.image}
                      alt={product.label}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: TEXT_DARK, textAlign: "center", lineHeight: 1.3 }}>
                    {product.label}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#1e4d8c", background: "#eff6ff", padding: "3px 10px", borderRadius: 999 }}>
                    Acheter →
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPurchases = () => {
    if (role === "atelier") return renderPurchasesAtelier();
    if (showAtelierCatalog) return renderAtelierCatalog();
    return (
    <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: TEXT_DARK,
          }}
        >
          Achat projet
        </div>
        <div style={{ color: TEXT_LIGHT }}>
          Liste des achats à prévoir pour chaque projet
        </div>
      </div>

      {showPurchaseForm && (
        <div
          style={{
            background: "white",
            borderRadius: 28,
            padding: 28,
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              marginBottom: 20,
              color: TEXT_DARK,
            }}
          >
            Ajouter un achat projet
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 18,
            }}
          >
            <div>
              <div style={bigLabelStyle}>Projet lié</div>
              <select
                value={purchaseForm.project_id}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, project_id: e.target.value })
                }
                style={bigInputStyle}
              >
                <option value="">Choisir un projet</option>
                {sortedProjects.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.project_number} - {p.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={bigLabelStyle}>Type achat</div>
              <select
                value={purchaseForm.item_type}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, item_type: e.target.value })
                }
                style={bigInputStyle}
              >
                {PURCHASE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
              <div style={bigLabelStyle}>Quoi acheter</div>
              <textarea
                placeholder="Ex: panneau blanc mat, charnières, chants..."
                value={purchaseForm.description}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, description: e.target.value })
                }
                style={{
                  ...bigInputStyle,
                  minHeight: 140,
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
            <button
              onClick={savePurchase}
              disabled={savingPurchase}
              style={{ ...blueButtonTop, opacity: savingPurchase ? 0.7 : 1 }}
            >
              {savingPurchase ? "Enregistrement..." : "Enregistrer"}
            </button>

            <button
              onClick={() => {
                setShowPurchaseForm(false);
                setPurchaseForm(emptyPurchaseForm);
              }}
              style={outlineButtonTop}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: TEXT_DARK,
                marginBottom: 16,
              }}
            >
              Achats en cours ({activePurchases.length})
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {activePurchases.length === 0 ? (
                <div style={{ color: TEXT_LIGHT }}>Aucun achat en cours.</div>
              ) : (
                activePurchases.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => { setSelectedPurchase(item); markPurchaseRead(item); }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "52px 1fr",
                      gap: 14,
                      border: item.requested_by === "atelier" && !item.is_read ? "2px solid #1e4d8c" : "1px solid #e2e8f0",
                      borderRadius: 22,
                      padding: 16,
                      background: item.requested_by === "atelier" && !item.is_read ? "#eff6ff" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePurchaseCompleted(item); }}
                      title="Marquer comme terminé"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        border: `2px solid ${BRAND_BLUE}`,
                        background: "white",
                        cursor: "pointer",
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        {item.requested_by === "atelier" && (
                          <span style={{ padding: "3px 9px", borderRadius: 999, background: "#1e3a8a", color: "white", fontSize: 11, fontWeight: 800 }}>
                            Demande atelier
                          </span>
                        )}
                        {item.requested_by === "atelier" && !item.is_read && (
                          <span style={{ padding: "3px 9px", borderRadius: 999, background: "#fef08a", color: "#854d0e", fontSize: 11, fontWeight: 800 }}>
                            Nouveau
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: TEXT_DARK, lineHeight: 1.1 }}>
                        {item.project_name}
                      </div>
                      <div style={{ marginTop: 4, color: TEXT_MEDIUM, fontWeight: 700, fontSize: 14 }}>
                        {item.project_number}
                        {item.quantity > 1 && <span style={{ marginLeft: 8, color: BRAND_BLUE, fontWeight: 800 }}>× {item.quantity} pcs</span>}
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: BG_SOFT, border: "1px solid #e2e8f0", color: TEXT_DARK, fontWeight: 800, fontSize: 12 }}>
                          {item.item_type}
                        </span>
                        {item.purchase_url && (
                          <a
                            href={item.purchase_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ padding: "4px 12px", borderRadius: 999, background: "#0f2447", color: "white", fontSize: 12, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            Acheter →
                          </a>
                        )}
                      </div>
                      <div style={{ marginTop: 8, color: TEXT_LIGHT, fontSize: 13, lineHeight: 1.5 }}>{item.description}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <button
              onClick={() => setShowCompletedPurchases((prev) => !prev)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: TEXT_DARK,
                }}
              >
                Terminés ({completedPurchases.length})
              </span>
              <span
                style={{
                  color: TEXT_LIGHT,
                  fontWeight: 800,
                }}
              >
                {showCompletedPurchases ? "Masquer" : "Afficher"}
              </span>
            </button>

            {showCompletedPurchases && (
              <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                {completedPurchases.length === 0 ? (
                  <div style={{ color: TEXT_LIGHT }}>Aucun achat terminé.</div>
                ) : (
                  completedPurchases.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "52px 1fr",
                        gap: 14,
                        border: "1px solid #e2e8f0",
                        borderRadius: 22,
                        padding: 16,
                        background: BG_COMPLETED,
                      }}
                    >
                      <button
                        onClick={() => togglePurchaseCompleted(item)}
                        title="Remettre en cours"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          border: `2px solid ${BRAND_BLUE}`,
                          background: BRAND_BLUE,
                          cursor: "pointer",
                          marginTop: 6,
                        }}
                      />

                      <button
                        onClick={() => setSelectedPurchase(item)}
                        style={{
                          border: "none",
                          background: "transparent",
                          textAlign: "left",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: isMobile ? 22 : 28,
                            fontWeight: 900,
                            color: TEXT_DARK,
                            lineHeight: 1.1,
                          }}
                        >
                          {item.project_name}
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            color: TEXT_MEDIUM,
                            fontWeight: 800,
                            fontSize: 16,
                          }}
                        >
                          {item.project_number}
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            minHeight: 260,
            position: isMobile ? "static" : "sticky",
            top: 24,
            alignSelf: "start",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: TEXT_DARK,
              marginBottom: 16,
            }}
          >
            Détail achat projet
          </div>

          {selectedPurchase ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  fontSize: isMobile ? 24 : 30,
                  fontWeight: 900,
                  color: TEXT_DARK,
                  lineHeight: 1.1,
                }}
              >
                {selectedPurchase.project_name}
              </div>

              <div
                style={{
                  color: TEXT_MEDIUM,
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {selectedPurchase.project_number}
              </div>

              <div>
                <div style={bigLabelStyle}>Type achat</div>
                <select
                  value={selectedPurchase.item_type}
                  onChange={(e) =>
                    setSelectedPurchase({
                      ...selectedPurchase,
                      item_type: e.target.value,
                    })
                  }
                  style={bigInputStyle}
                >
                  {PURCHASE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={bigLabelStyle}>Description</div>
                <textarea
                  value={selectedPurchase.description}
                  onChange={(e) =>
                    setSelectedPurchase({
                      ...selectedPurchase,
                      description: e.target.value,
                    })
                  }
                  style={{
                    ...bigInputStyle,
                    minHeight: 140,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={updatePurchase} style={blueButtonTop}>
                  Modifier
                </button>

                <button
                  onClick={() => togglePurchaseCompleted(selectedPurchase)}
                  style={greenButton}
                >
                  {selectedPurchase.is_completed
                    ? "Remettre en cours"
                    : "Marquer terminé"}
                </button>

                <button
                  onClick={() => deletePurchase(selectedPurchase)}
                  style={redButton}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: TEXT_LIGHT, lineHeight: 1.7 }}>
              Clique sur un achat projet pour voir son détail.
            </div>
          )}
        </div>
      </div>
    </div>
    );
  };

  const renderCalendar = () => (
    <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: TEXT_DARK,
              textTransform: "capitalize",
            }}
          >
            Calendrier
          </div>
          <div style={{ color: TEXT_LIGHT }}>
            Pose, mesurage, rendez-vous client, SAV, autres événements + jours
            fériés belges
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={goCalendarPrev} style={outlineButtonTop}>
            ← Précédent
          </button>

          <button onClick={goCalendarToday} style={lightButtonTop}>
            Aujourd&apos;hui
          </button>

          <button onClick={goCalendarNext} style={outlineButtonTop}>
            Suivant →
          </button>

          <button onClick={() => openCalendarEventForm()} style={blueButtonTop}>
            + Événement
          </button>
        </div>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: 18,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: TEXT_DARK,
            textTransform: "capitalize",
          }}
        >
          {renderCalendarHeaderLabel()}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setCalendarViewMode("day")}
            style={calendarViewMode === "day" ? blueButtonTop : outlineButtonTop}
          >
            Jour
          </button>
          <button
            onClick={() => setCalendarViewMode("week")}
            style={calendarViewMode === "week" ? blueButtonTop : outlineButtonTop}
          >
            Semaine
          </button>
          <button
            onClick={() => setCalendarViewMode("month")}
            style={calendarViewMode === "month" ? blueButtonTop : outlineButtonTop}
          >
            Mois
          </button>
        </div>
      </div>

      {showCalendarEventForm && (
        <div
          style={{
            background: "white",
            borderRadius: 28,
            padding: 28,
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              marginBottom: 20,
              color: TEXT_DARK,
            }}
          >
            {calendarForm.id
              ? "Modifier un événement calendrier"
              : "Ajouter un événement calendrier"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 18,
            }}
          >
            <input
              placeholder="Titre"
              value={calendarForm.title}
              onChange={(e) =>
                setCalendarForm({ ...calendarForm, title: e.target.value })
              }
              style={bigInputStyle}
            />

            <select
              value={calendarForm.event_type}
              onChange={(e) =>
                setCalendarForm({ ...calendarForm, event_type: e.target.value })
              }
              style={bigInputStyle}
            >
              {CALENDAR_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={calendarForm.event_date}
              onChange={(e) =>
                setCalendarForm({ ...calendarForm, event_date: e.target.value })
              }
              style={bigInputStyle}
            />

            <select
              value={calendarForm.project_id}
              onChange={(e) => handleCalendarProjectChange(e.target.value)}
              style={bigInputStyle}
            >
              <option value="">Aucun projet</option>
              {sortedProjects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.project_number} - {p.client_name}
                </option>
              ))}
            </select>

            <input
              type="time"
              value={calendarForm.start_time}
              onChange={(e) =>
                setCalendarForm({ ...calendarForm, start_time: e.target.value })
              }
              style={bigInputStyle}
            />

            <input
              type="time"
              value={calendarForm.end_time}
              onChange={(e) =>
                setCalendarForm({ ...calendarForm, end_time: e.target.value })
              }
              style={bigInputStyle}
            />

            <input
              placeholder="Nom client"
              value={calendarForm.client_name}
              onChange={(e) =>
                setCalendarForm({ ...calendarForm, client_name: e.target.value })
              }
              style={bigInputStyle}
            />

            <input
              placeholder="Adresse"
              value={calendarForm.address}
              onChange={(e) =>
                setCalendarForm({ ...calendarForm, address: e.target.value })
              }
              style={bigInputStyle}
            />

            <textarea
              placeholder="Notes"
              value={calendarForm.notes}
              onChange={(e) =>
                setCalendarForm({ ...calendarForm, notes: e.target.value })
              }
              style={{
                ...bigInputStyle,
                minHeight: 140,
                resize: "vertical",
                gridColumn: isMobile ? "auto" : "1 / -1",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
            <button
              onClick={saveCalendarEvent}
              disabled={savingCalendarEvent}
              style={{ ...blueButtonTop, opacity: savingCalendarEvent ? 0.7 : 1 }}
            >
              {savingCalendarEvent ? "Enregistrement..." : "Enregistrer"}
            </button>

            <button
              onClick={() => {
                setShowCalendarEventForm(false);
                setCalendarForm(emptyCalendarForm);
              }}
              style={outlineButtonTop}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {calendarViewMode === "month" && renderMonthView()}
      {calendarViewMode === "week" && renderWeekView()}
      {calendarViewMode === "day" && renderDayView()}
    </div>
  );

  const renderProjects = () => (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr",
          gap: 20,
          alignItems: "start",
          minHeight: "100%",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            Liste des projets actifs ({activeProjects.length})
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {activeProjects.length === 0 ? (
              <div style={{ background: "white", borderRadius: 20, padding: "48px 24px", textAlign: "center", color: "#94a3b8", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Aucun projet trouvé</div>
                <div style={{ fontSize: 14 }}>Modifiez les filtres ou créez un nouveau projet.</div>
              </div>
            ) : (
              activeProjects.map((project) => renderProjectCard(project))
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            position: isMobile ? "static" : "sticky",
            top: 0,
            alignSelf: "start",
            maxHeight: isMobile ? "none" : "calc(100vh - 130px)",
            overflowY: isMobile ? "visible" : "auto",
          }}
        >
          {selectedProject ? (
            <>
              <ProjectInfoCard
                selectedProject={selectedProject}
                setProjectStatus={setProjectStatus}
                toggleCompleted={toggleCompleted}
                onEdit={
                  role === "bureau"
                    ? () => openEditProject(selectedProject)
                    : undefined
                }
                onDelete={
                  role === "bureau"
                    ? () => deleteProject(selectedProject)
                    : undefined
                }
              />

              <FilesBlock
                role={role}
                category={category}
                setCategory={setCategory}
                handleUpload={handleUpload}
                uploading={uploading}
                message={message}
                fileGroups={fileGroups}
                imageFiles={imageFiles}
                renderFileButton={renderFileButton}
                renderPreview={renderPreview}
                isMobile={isMobile}
              />

              {renderHistoryToggleBlock()}
            </>
          ) : (
            <div style={{
              background: "white", borderRadius: 20, padding: "40px 28px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              textAlign: "center",
            }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f1f5f9", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, border: "3px solid #cbd5e1" }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                Aucun projet sélectionné
              </div>
              <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
                Cliquez sur un projet dans la liste pour afficher sa fiche complète.
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          background: "#f8fafc",
          borderRadius: 20,
          padding: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
        }}
      >
        <button
          onClick={() => setShowCompletedProjects((prev) => !prev)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: TEXT_DARK,
              }}
            >
              Projets terminés
            </div>

            <div
              style={{
                fontSize: 13,
                color: TEXT_LIGHT,
                marginTop: 4,
                fontWeight: 700,
              }}
            >
              {completedProjects.length} projet(s) terminé(s)
            </div>
          </div>

          <div
            style={{
              color: TEXT_MEDIUM,
              fontWeight: 900,
              fontSize: 14,
              padding: "8px 12px",
              borderRadius: 999,
              background: "white",
              border: "1px solid #e2e8f0",
            }}
          >
            {showCompletedProjects ? "Masquer" : "Afficher"}
          </div>
        </button>

        {showCompletedProjects && (
          <div style={{ marginTop: 16 }}>
            {completedProjects.length === 0 ? (
              <div style={{ color: TEXT_LIGHT }}>Aucun projet terminé.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {completedProjects.map((project) => renderProjectCard(project))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f1f5f9",
          fontFamily: "Arial, sans-serif",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "white",
            padding: 40,
            borderRadius: 20,
            boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
            textAlign: "center",
            width: "100%",
            maxWidth: 360,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: TEXT_DARK,
            }}
          >
            Accès Aliaj Interior
          </div>

          <div style={{ marginTop: 10, color: TEXT_LIGHT }}>
            Entrez le code PIN Bureau ou Atelier
          </div>

          <input
            type="password"
            placeholder="Code PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 24,
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              outline: "none",
              fontSize: 16,
              color: "#0f172a",
              background: "white",
            }}
          />

          {pinError && (
            <div style={{ color: "#dc2626", marginTop: 12, fontWeight: 700 }}>
              {pinError}
            </div>
          )}

          <button
            onClick={handleLogin}
            style={{
              marginTop: 20,
              width: "100%",
              padding: 14,
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #0f2447, #1e4d8c)",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            Entrer
          </button>
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        height: isMobile ? "auto" : "100vh",
        overflow: isMobile ? "visible" : "hidden",
        background: "#f1f5f9",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          height: isMobile ? "auto" : "100vh",
        }}
      >
        <aside
          style={{
            width: isMobile ? "100%" : 270,
            flexShrink: 0,
            background: "linear-gradient(175deg, #0f2447 0%, #1a3a6e 55%, #1e4d8c 100%)",
            color: "white",
            padding: isMobile ? 16 : 24,
            display: "flex",
            flexDirection: isMobile ? "row" : "column",
            justifyContent: "space-between",
            gap: 16,
            height: "100vh",
            overflowY: "auto",
            overflowX: isMobile ? "auto" : "visible",
          }}
        >
          <div>
            {!isMobile && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 28,
                }}
              >
                <img
                  src="/Logo.png"
                  alt="Logo"
                  style={{
                    width: 82,
                    height: 82,
                    objectFit: "contain",
                    background: "white",
                    borderRadius: 999,
                    padding: 4,
                    border: "2px solid rgba(255,255,255,0.15)",
                  }}
                />
                <div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Application interne
                  </div>
                  <div style={{ fontWeight: 900, letterSpacing: 0.5 }}>
                    ALIAJ INTERIOR
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    Vue {role === "bureau" ? "Bureau" : "Atelier"}
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "row" : "column",
                gap: 10,
              }}
            >
              <button
                onClick={() => setActiveTab("projects")}
                style={activeTab === "projects" ? sidebarActiveButton : sidebarButton}
              >
                Projets
              </button>

              <button
                onClick={() => setActiveTab("calendar")}
                style={activeTab === "calendar" ? sidebarActiveButton : sidebarButton}
              >
                Calendrier
              </button>

              {role === "bureau" && (
                <button
                  onClick={() => setActiveTab("tasks")}
                  style={activeTab === "tasks" ? sidebarActiveButton : sidebarButton}
                >
                  Tâches
                </button>
              )}

              <button
                onClick={() => setActiveTab("purchases")}
                style={{ ...(activeTab === "purchases" ? sidebarActiveButton : sidebarButton), position: "relative" as const }}
              >
                Achat projet
                {unreadPurchaseCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "#dc2626", color: "white", borderRadius: 999, fontSize: 10, fontWeight: 900, padding: "2px 6px", minWidth: 18, textAlign: "center" }}>
                    {unreadPurchaseCount}
                  </span>
                )}
              </button>

              {role === "bureau" && (
                <button
                  onClick={() => setActiveTab("devis")}
                  style={activeTab === "devis" ? sidebarActiveButton : sidebarButton}
                >
                  Devis
                </button>
              )}
            </div>
          </div>

          <button onClick={handleLogout} style={sidebarActiveButton}>
            Déconnexion
          </button>
        </aside>

        <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: isMobile ? "visible" : "hidden" }}>
          {/* Top header bar */}
          <div style={{
            background: activeTab === "projects"
              ? "linear-gradient(135deg, #0f2447 0%, #1a3a6e 60%, #1e4d8c 100%)"
              : "white",
            borderBottom: activeTab === "projects" ? "none" : "1px solid #e2e8f0",
            padding: activeTab === "projects" ? (isMobile ? "10px 14px 0 14px" : "16px 28px 0 28px") : (isMobile ? "10px 14px" : "14px 28px"),
            display: "flex", flexDirection: "column", gap: 0,
            flexShrink: 0,
            minWidth: 0,
            boxShadow: activeTab === "projects" ? "0 4px 20px rgba(15,36,71,0.3)" : "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
            {/* Notification bell — always visible top right */}
            {unreadPurchaseCount > 0 && activeTab !== "purchases" && (
              <button
                onClick={() => setActiveTab("purchases")}
                title={`${unreadPurchaseCount} demande(s) atelier non lue(s)`}
                style={{
                  position: "absolute" as const,
                  top: isMobile ? 8 : 12,
                  right: isMobile ? 8 : 20,
                  zIndex: 10,
                  background: "white",
                  border: "none",
                  borderRadius: 999,
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeTab === "projects" ? "#1e3a8a" : "#1e3a8a"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span style={{ position: "absolute", top: -3, right: -3, background: "#dc2626", color: "white", borderRadius: 999, fontSize: 10, fontWeight: 900, padding: "2px 5px", minWidth: 16, textAlign: "center" }}>
                  {unreadPurchaseCount}
                </span>
              </button>
            )}
            {activeTab === "projects" ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: isMobile ? 6 : 12, flexWrap: isMobile ? "wrap" as const : "nowrap" as const }}>
                {/* Left: filters */}
                <div style={{ display: "flex", gap: isMobile ? 6 : 10, alignItems: "center", flex: 1, minWidth: 0 }}>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                    style={{ width: isMobile ? "100%" : 180, minWidth: 0, flex: isMobile ? 1 : "none", padding: isMobile ? "8px 10px" : "11px 14px", fontSize: isMobile ? 12 : 13, borderRadius: 10,
                      border: "1.5px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)",
                      color: "white", outline: "none", boxSizing: "border-box" as const }} />
                  {!isMobile && (
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, borderRadius: 10,
                        border: "1.5px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)",
                        color: statusFilter ? "white" : "rgba(255,255,255,0.6)", outline: "none", cursor: "pointer" }}>
                      <option value="" style={{ color: "#0f172a" }}>Statut</option>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s} style={{ color: "#0f172a" }}>{s}</option>)}
                    </select>
                  )}
                  {!isMobile && (
                    <select value={projectSort} onChange={(e) => setProjectSort(e.target.value as ProjectSortOption)}
                      style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, borderRadius: 10,
                        border: "1.5px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)",
                        color: "white", outline: "none", cursor: "pointer" }}>
                      <option value="fabrication_desc" style={{ color: "#0f172a" }}>Fabrication ↓</option>
                      <option value="installation_asc" style={{ color: "#0f172a" }}>Pose ↑</option>
                      <option value="client_asc" style={{ color: "#0f172a" }}>Client A→Z</option>
                      <option value="project_number_asc" style={{ color: "#0f172a" }}>N° projet</option>
                      <option value="status_asc" style={{ color: "#0f172a" }}>Statut</option>
                    </select>
                  )}
                </div>
                {/* Right: actions */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {selectedProject && role === "bureau" && (
                    <>
                      <button onClick={() => openEditProject(selectedProject)} style={{
                        background: "rgba(255,255,255,0.15)", color: "white",
                        border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 10,
                        padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                      }}>Modifier</button>
                      <button onClick={() => deleteProject(selectedProject)} style={{
                        background: "rgba(220,38,38,0.25)", color: "#fca5a5",
                        border: "1.5px solid rgba(220,38,38,0.4)", borderRadius: 10,
                        padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                      }}>Supprimer</button>
                    </>
                  )}
                  {role === "bureau" && (
                    <button onClick={openCreateProject} style={{
                      background: "white", color: "#0f2447",
                      border: "none", borderRadius: 10, padding: "12px 24px",
                      fontWeight: 800, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                    }}>+ Nouveau projet</button>
                  )}
                </div>
              </div>
            ) : activeTab === "tasks" ? (
              <>
                <div style={{ flex: 1, fontSize: 15, color: "#64748b", fontWeight: 600 }}>Gestion des tâches</div>
                <button onClick={() => { setShowTaskForm((prev) => { if (!prev) { setTimeout(() => { taskFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); taskTitleInputRef.current?.focus(); }, 50); } return !prev; }); }}
                  style={{ background: "linear-gradient(135deg, #0f2447, #1e4d8c)", color: "white", border: "none", borderRadius: 10, padding: "11px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {showTaskForm ? "Fermer" : "+ Nouvelle tâche"}
                </button>
              </>
            ) : activeTab === "purchases" ? (
              <>
                <div style={{ flex: 1, fontSize: 15, color: "#64748b", fontWeight: 600 }}>
                  {role === "atelier" ? "Commander des produits" : "Achats liés aux projets"}
                </div>
                {role === "bureau" && (
                  <>
                    {unreadPurchaseCount > 0 && !showAtelierCatalog && (
                      <button onClick={markAllPurchasesRead} style={{ padding: "8px 14px", borderRadius: 10, background: "#fef9c3", border: "1px solid #fde68a", color: "#854d0e", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                        Tout marquer lu
                      </button>
                    )}
                    <button onClick={() => { setShowAtelierCatalog((v) => !v); setShowPurchaseForm(false); }}
                      style={{ background: showAtelierCatalog ? "linear-gradient(135deg, #0f2447, #1e4d8c)" : "white", color: showAtelierCatalog ? "white" : "#0f2447", border: "2px solid #0f2447", borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                      Achat Atelier
                    </button>
                    {!showAtelierCatalog && (
                      <button onClick={() => setShowPurchaseForm((prev) => !prev)}
                        style={{ background: "linear-gradient(135deg, #0f2447, #1e4d8c)", color: "white", border: "none", borderRadius: 10, padding: "11px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {showPurchaseForm ? "Fermer" : "+ Achat projet"}
                      </button>
                    )}
                  </>
                )}
              </>
            ) : (
              <div style={{ flex: 1 }} />
            )}
            </div>{/* end inner flex row */}

            {/* Stat cards inside blue header — projects tab only */}
            {activeTab === "projects" && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(3, 1fr)", gap: isMobile ? 8 : 16, padding: isMobile ? "10px 0 12px 0" : "20px 0 24px 0" }}>
                {[
                  { title: "En cours", value: projects.filter((p) => p.status !== "Terminé").length },
                  { title: "Fabrication", value: fabricationCount },
                  { title: "Prêt pose", value: readyInstallCount },
                ].map(stat => (
                  <div key={stat.title} style={{ background: "rgba(255,255,255,0.1)", borderRadius: isMobile ? 10 : 16, padding: isMobile ? "10px 8px" : "20px 24px", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                    <div style={{ fontSize: isMobile ? 9 : 11, fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: isMobile ? 4 : 10 }}>{stat.title}</div>
                    <div style={{ fontSize: isMobile ? 28 : 48, fontWeight: 900, color: "white", lineHeight: 1 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>{/* end blue header */}

          <div style={{ flex: 1, padding: isMobile ? 12 : 28, overflowY: isMobile ? "visible" : "auto", minHeight: isMobile ? "auto" : 0 }}>

          {showProjectForm && role === "bureau" && (
            <div
              ref={projectFormRef}
              style={{
                marginTop: 24,
                background: "white",
                borderRadius: 28,
                padding: 28,
                boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  marginBottom: 20,
                  color: TEXT_DARK,
                }}
              >
                {editingProjectId ? "Modifier projet" : "Créer un projet"}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: 18,
                }}
              >
                <input
                  placeholder="Numéro projet"
                  value={form.project_number}
                  readOnly
                  style={{
                    ...bigInputStyle,
                    background: "#f8fafc",
                    color: TEXT_MEDIUM,
                    cursor: "not-allowed",
                  }}
                />
                <input
                  ref={projectClientInputRef}
                  placeholder="Nom client"
                  value={form.client_name}
                  onChange={(e) =>
                    setForm({ ...form, client_name: e.target.value })
                  }
                  style={bigInputStyle}
                />
                <input
                  placeholder="Type projet"
                  value={form.project_type}
                  onChange={(e) =>
                    setForm({ ...form, project_type: e.target.value })
                  }
                  style={bigInputStyle}
                />
                <input
                  placeholder="Adresse"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  style={bigInputStyle}
                />

                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={bigInputStyle}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  style={bigInputStyle}
                >
                  <option value="Basse">Basse</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Haute">Haute</option>
                </select>

                <input
                  type="date"
                  value={form.validation_date}
                  onChange={(e) =>
                    setForm({ ...form, validation_date: e.target.value })
                  }
                  style={bigInputStyle}
                />

                <input
                  type="date"
                  value={form.fabrication_date}
                  onChange={(e) =>
                    setForm({ ...form, fabrication_date: e.target.value })
                  }
                  style={bigInputStyle}
                />

                <input
                  type="date"
                  value={form.installation_date}
                  onChange={(e) =>
                    setForm({ ...form, installation_date: e.target.value })
                  }
                  style={bigInputStyle}
                />

                <textarea
                  placeholder="Notes / consignes atelier"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{
                    ...bigInputStyle,
                    minHeight: 150,
                    resize: "vertical",
                    gridColumn: isMobile ? "auto" : "1 / -1",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
                <button
                  onClick={saveProject}
                  disabled={savingProject}
                  style={{ ...blueButtonTop, opacity: savingProject ? 0.7 : 1 }}
                >
                  {savingProject ? "Enregistrement..." : "Enregistrer"}
                </button>

                <button
                  onClick={() => {
                    setShowProjectForm(false);
                    setEditingProjectId(null);
                    setForm(emptyForm);
                  }}
                  style={outlineButtonTop}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {showCalendarEventDetails && selectedCalendarEvent && (
            <div
              style={{
                marginTop: 24,
                background: "white",
                borderRadius: 28,
                padding: 28,
                boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: TEXT_DARK,
                  marginBottom: 20,
                }}
              >
                Détail événement
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <strong>Nom affiché :</strong>{" "}
                  {getCalendarMainText(selectedCalendarEvent)}
                </div>
                <div>
                  <strong>Sous-titre :</strong>{" "}
                  {getCalendarSubText(selectedCalendarEvent)}
                </div>
                <div>
                  <strong>Type :</strong> {selectedCalendarEvent.event_type}
                </div>
                <div>
                  <strong>Date :</strong> {formatDate(selectedCalendarEvent.event_date)}
                </div>
                <div>
                  <strong>Heure :</strong>{" "}
                  {selectedCalendarEvent.start_time
                    ? `${selectedCalendarEvent.start_time.slice(0, 5)}${
                        selectedCalendarEvent.end_time
                          ? ` - ${selectedCalendarEvent.end_time.slice(0, 5)}`
                          : ""
                      }`
                    : "Journée"}
                </div>
                <div>
                  <strong>Client :</strong> {selectedCalendarEvent.client_name || "-"}
                </div>
                <div>
                  <strong>Projet :</strong> {selectedCalendarEvent.project_number || "-"}
                </div>
                <div>
                  <strong>Adresse :</strong> {selectedCalendarEvent.address || "-"}
                </div>
                <div>
                  <strong>Notes :</strong> {selectedCalendarEvent.notes || "-"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
                {selectedCalendarEvent.project_id && (
                  <button
                    onClick={() => openLinkedProjectFromEvent(selectedCalendarEvent)}
                    style={blueButtonTop}
                  >
                    Ouvrir le projet lié
                  </button>
                )}

                {selectedCalendarEvent.source === "manual" && role === "bureau" && (
                  <button
                    onClick={() => editManualCalendarEvent(selectedCalendarEvent)}
                    style={lightButtonTop}
                  >
                    Modifier
                  </button>
                )}

                {selectedCalendarEvent.source === "manual" && role === "bureau" && (
                  <button
                    onClick={async () => {
                      await deleteManualCalendarEvent(selectedCalendarEvent);
                      setShowCalendarEventDetails(false);
                      setSelectedCalendarEvent(null);
                    }}
                    style={redButtonTop}
                  >
                    Supprimer
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowCalendarEventDetails(false);
                    setSelectedCalendarEvent(null);
                  }}
                  style={outlineButtonTop}
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ padding: 30, fontWeight: 800, color: TEXT_DARK }}>
              Chargement...
            </div>
          ) : activeTab === "projects" ? (
            renderProjects()
          ) : activeTab === "calendar" ? (
            renderCalendar()
          ) : activeTab === "tasks" ? (
            role === "bureau" ? renderTasks() : null
          ) : activeTab === "devis" ? (
            role === "bureau" ? <DevisPage supabase={supabase} projects={projects} /> : null
          ) : (
            renderPurchases()
          )}
        </div>
        </section>
      </div>
    </main>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 14,
        background: "rgba(255,255,255,0.55)",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: TEXT_LIGHT }}>
        {label}
      </div>
      <div style={{ marginTop: 4, color: TEXT_DARK, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function ProjectInfoCard({
  selectedProject,
  setProjectStatus,
  toggleCompleted,
  onEdit,
  onDelete,
}: {
  selectedProject: Project;
  setProjectStatus: (project: Project, status: string) => void;
  toggleCompleted: (project: Project) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isCompleted = selectedProject.status === "Terminé";

  return (
    <div
      style={{
        background: isCompleted ? BG_COMPLETED : "white",
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        border: isCompleted ? `2px solid ${BORDER_COMPLETED}` : "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: TEXT_DARK,
          marginBottom: 16,
        }}
      >
        Fiche projet
      </div>

      <div
        style={{
          fontSize: 34,
          fontWeight: 900,
          color: TEXT_DARK,
          lineHeight: 1.05,
        }}
      >
        {selectedProject.project_number}
      </div>

      <div
        style={{
          color: TEXT_MEDIUM,
          marginTop: 8,
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {selectedProject.client_name}
      </div>

      <div style={{ marginTop: 10 }}>
        <StatusBadge status={selectedProject.status} />
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <InfoCell label="Type" value={selectedProject.project_type} />
        <InfoCell label="Adresse" value={selectedProject.address || "-"} />
        <InfoCell label="Validation" value={formatDate(selectedProject.validation_date)} />
        <InfoCell label="Fabrication" value={formatDate(selectedProject.fabrication_date)} />
        <InfoCell label="Pose" value={formatDate(selectedProject.installation_date)} />
        <InfoCell label="Priorité" value={selectedProject.priority || "-"} />
      </div>

      <div
        style={{
          marginTop: 16,
          background: "rgba(255,255,255,0.55)",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            color: TEXT_DARK,
            marginBottom: 6,
          }}
        >
          Consignes atelier
        </div>
        <div style={{ color: TEXT_MEDIUM }}>
          {selectedProject.notes || "Aucune remarque."}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setProjectStatus(selectedProject, "En fabrication")}
          style={outlineButton}
        >
          En cours
        </button>

        <button
          onClick={() => setProjectStatus(selectedProject, "Prêt pour pose")}
          style={cyanButton}
        >
          Prêt pour pose
        </button>

        <button onClick={() => toggleCompleted(selectedProject)} style={greenButton}>
          {selectedProject.status === "Terminé"
            ? "Remettre en cours"
            : "Terminé"}
        </button>

        {onEdit && (
          <button onClick={onEdit} style={lightButton}>
            Modifier
          </button>
        )}

        {onDelete && (
          <button onClick={onDelete} style={redButton}>
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

function FilesBlock({
  role,
  category,
  setCategory,
  handleUpload,
  uploading,
  message,
  fileGroups,
  imageFiles,
  renderFileButton,
  renderPreview,
  isMobile,
}: {
  role: UserRole;
  category: string;
  setCategory: (value: string) => void;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  message: string;
  fileGroups: {
    pdf: ProjectFile[];
    image: ProjectFile[];
    technique: ProjectFile[];
    other: ProjectFile[];
  };
  imageFiles: ProjectFile[];
  renderFileButton: (file: ProjectFile) => React.ReactNode;
  renderPreview: () => React.ReactNode;
  isMobile: boolean;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          marginBottom: 12,
          color: TEXT_DARK,
        }}
      >
        Fichiers projet
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ ...inputStyle, maxWidth: 220 }}
        >
          <option value="pdf">Plans PDF</option>
          <option value="image">Images</option>
          <option value="technique">Fiches techniques</option>
          {role === "bureau" && <option value="other">Offre & Facture</option>}
        </select>

        <input
          type="file"
          multiple
          onChange={handleUpload}
          style={{
            ...inputStyle,
            color: TEXT_DARK,
            maxWidth: 360,
          }}
        />

        {uploading && (
          <span style={{ fontWeight: 700, color: TEXT_DARK }}>
            Upload en cours...
          </span>
        )}
      </div>

      {message && (
        <div
          style={{
            marginBottom: 16,
            fontWeight: 700,
            color: TEXT_DARK,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1.1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <div style={sectionTitleStyle}>Plans PDF</div>
            <div style={{ display: "grid", gap: 10 }}>
              {fileGroups.pdf.length === 0 ? (
                <p style={{ color: TEXT_LIGHT }}>Aucun fichier</p>
              ) : (
                fileGroups.pdf.map(renderFileButton)
              )}
            </div>
          </div>

          <div>
            <div style={sectionTitleStyle}>Images ({imageFiles.length})</div>
            <div style={{ display: "grid", gap: 10 }}>
              {fileGroups.image.length === 0 ? (
                <p style={{ color: TEXT_LIGHT }}>Aucun fichier</p>
              ) : (
                fileGroups.image.map(renderFileButton)
              )}
            </div>
          </div>

          <div>
            <div style={sectionTitleStyle}>Fiches techniques</div>
            <div style={{ display: "grid", gap: 10 }}>
              {fileGroups.technique.length === 0 ? (
                <p style={{ color: TEXT_LIGHT }}>Aucun fichier</p>
              ) : (
                fileGroups.technique.map(renderFileButton)
              )}
            </div>
          </div>

          {role === "bureau" && (
            <div>
              <div style={sectionTitleStyle}>Offre & Facture</div>
              <div style={{ display: "grid", gap: 10 }}>
                {fileGroups.other.length === 0 ? (
                  <p style={{ color: TEXT_LIGHT }}>Aucun fichier</p>
                ) : (
                  fileGroups.other.map(renderFileButton)
                )}
              </div>
            </div>
          )}
        </div>

        <div>{renderPreview()}</div>
      </div>
    </div>
  );
}

function HistoryBlock({ history }: { history: ProjectHistory[] }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {history.length === 0 ? (
        <div style={{ color: TEXT_LIGHT }}>Aucun historique.</div>
      ) : (
        history.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 14,
              background: BG_SOFT,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: TEXT_DARK,
                marginBottom: 4,
              }}
            >
              {item.action}
            </div>
            <div style={{ color: TEXT_MEDIUM, marginBottom: 6 }}>
              {item.details || "-"}
            </div>
            <div style={{ fontSize: 12, color: TEXT_LIGHT }}>
              {formatDateTime(item.created_at)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  outline: "none",
  fontSize: 14,
  color: TEXT_DARK,
  background: "white",
};

const bigInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  borderRadius: 16,
  border: `1px solid ${BORDER}`,
  outline: "none",
  fontSize: 15,
  color: TEXT_DARK,
  background: "white",
};

const bigLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: TEXT_MEDIUM,
  marginBottom: 8,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 10,
  color: TEXT_DARK,
};

const outlineButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  background: "white",
  color: TEXT_DARK,
  fontWeight: 800,
  cursor: "pointer",
};

const cyanButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "none",
  background: "#06b6d4",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const greenButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "none",
  background: "#22c55e",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const redButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const lightButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid #d1d5db",
  background: "#e5e7eb",
  color: "#111827",
  fontWeight: 800,
  cursor: "pointer",
};

const lightButtonSmall: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 800,
};

const blueButtonSmall: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: BRAND_BLUE,
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const redButtonSmall: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: "#dc2626",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const openLinkStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: BG_SOFT,
  color: TEXT_DARK,
  textDecoration: "none",
  fontWeight: 800,
};

const blueButtonTop: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "none",
  background: BRAND_BLUE,
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const outlineButtonTop: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  background: "white",
  color: TEXT_DARK,
  fontWeight: 800,
  cursor: "pointer",
};

const lightButtonTop: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  background: "#e5e7eb",
  color: "#111827",
  fontWeight: 800,
  cursor: "pointer",
};

const redButtonTop: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const sidebarButton: React.CSSProperties = {
  background: "transparent",
  color: "white",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 16,
  padding: "14px 16px",
  textAlign: "left",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const sidebarActiveButton: React.CSSProperties = {
  background: "white",
  color: BRAND_BLUE,
  border: "none",
  borderRadius: 16,
  padding: "14px 16px",
  textAlign: "left",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};