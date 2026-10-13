"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COL,
  convertir,
  decodeCp1252,
  encodeCp1252,
  normalise,
  parseCsv,
  referenceDepuisNom,
  versCsv,
  type Ligne,
  type Resultat,
  type TermeGlossaire,
} from "../../lib/decoupe/engine";
import { construireBon, nomDuBon } from "../../lib/decoupe/bon";
import { optimiser, type Panneau, type Piece } from "../../lib/decoupe/optimiseur";
import { construirePlan } from "../../lib/decoupe/plan";
import { construireEtiquettes, piecesOrdonnees } from "../../lib/decoupe/etiquettes";

type Project = { id: number; project_number: string; client_name: string };

type Props = { supabase: SupabaseClient; projects: Project[] };

type SortDefaut = "supprimer" | "garder" | "rematerialiser";

type Chute = {
  id?: number;
  materiau: string;
  long_mm: number;
  larg_mm: number;
  quantite: number;
  rive_mm: number;
  note: string | null;
  disponible: boolean;
};

type Reglage = {
  materiau: string;
  veine: boolean;
  kerf_mm: number;
  rive_mm: number;
  panneau_long_mm: number | null;
  panneau_larg_mm: number | null;
  traduire: boolean;
};

export default function DecoupePage({ supabase, projects }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [glossaire, setGlossaire] = useState<Map<string, TermeGlossaire>>(new Map());
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");
  const [occupe, setOccupe] = useState(false);

  const [nomFichier, setNomFichier] = useState("");
  const [brut, setBrut] = useState<Ligne[] | null>(null);
  const [reference, setReference] = useState("");
  const [projetId, setProjetId] = useState<number | "">("");

  // Réglages
  const [traduire, setTraduire] = useState(true);
  const [matieresExclues, setMatieresExclues] = useState<string[]>([]);
  const [sortDefaut, setSortDefaut] = useState<SortDefaut>("supprimer");
  const [matiereRemplacement, setMatiereRemplacement] = useState("");

  // Termes inconnus en attente de décision
  const [saisies, setSaisies] = useState<Record<string, string>>({});

  // Optimisation
  const [reglages, setReglages] = useState<Reglage[]>([]);
  const [chutes, setChutes] = useState<Chute[]>([]);
  const [matiereActive, setMatiereActive] = useState("");
  const [plan, setPlan] = useState<{ matiere: string; panneaux: Panneau[]; tous: Panneau[]; horsFormat: Piece[]; nbNeufs: number } | null>(null);
  const [nouvelleChute, setNouvelleChute] = useState<Chute>({
    materiau: "", long_mm: 0, larg_mm: 0, quantite: 1, rive_mm: 0, note: "", disponible: true,
  });

  async function rechargerBase() {
    const [g, r, c] = await Promise.all([
      supabase.from("decoupe_glossaire").select("cle, terme_source, terme_fr, garder_tel_quel"),
      supabase.from("decoupe_reglages").select("*"),
      supabase.from("decoupe_chutes").select("*").eq("disponible", true).order("materiau"),
    ]);
    if (g.error || r.error || c.error) {
      setMessage(`Chargement : ${(g.error ?? r.error ?? c.error)!.message}`);
      return;
    }
    setGlossaire(new Map((g.data ?? []).map((t) => [t.cle, t as TermeGlossaire])));
    setReglages((r.data ?? []) as Reglage[]);
    setChutes((c.data ?? []) as Chute[]);
  }

  useEffect(() => {
    (async () => {
      await rechargerBase();
      setChargement(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  /** Réglage de la matière, avec repli sur la ligne DEFAUT. */
  function reglagePour(materiau: string): Reglage {
    const exact = reglages.find((r) => r.materiau === materiau);
    const defaut = reglages.find((r) => r.materiau === "DEFAUT");
    return (
      exact ??
      defaut ?? {
        materiau, veine: true, kerf_mm: 5, rive_mm: 0,
        panneau_long_mm: 2800, panneau_larg_mm: 2070, traduire: true,
      }
    );
  }

  async function enregistrerReglage(r: Reglage) {
    setOccupe(true);
    const { error } = await supabase.from("decoupe_reglages").upsert(r, { onConflict: "materiau" });
    if (error) setMessage(`Réglages : ${error.message}`);
    else { await rechargerBase(); setMessage(`Réglages enregistrés pour ${r.materiau}.`); }
    setOccupe(false);
  }

  async function ajouterChute() {
    if (!nouvelleChute.materiau || !nouvelleChute.long_mm || !nouvelleChute.larg_mm) {
      setMessage("Chute : matière, longueur et largeur sont obligatoires.");
      return;
    }
    setOccupe(true);
    const { error } = await supabase.from("decoupe_chutes").insert(nouvelleChute);
    if (error) setMessage(`Chute : ${error.message}`);
    else {
      await rechargerBase();
      setNouvelleChute({ ...nouvelleChute, long_mm: 0, larg_mm: 0, quantite: 1, note: "" });
    }
    setOccupe(false);
  }

  async function supprimerChute(id: number) {
    setOccupe(true);
    const { error } = await supabase.from("decoupe_chutes").delete().eq("id", id);
    if (error) setMessage(`Chute : ${error.message}`);
    else await rechargerBase();
    setOccupe(false);
  }

  /** Matières présentes dans le fichier brut, pour les cases à cocher. */
  const matieresDuFichier = useMemo(() => {
    if (!brut) return [];
    const vues = new Map<string, number>();
    for (const l of brut.slice(1)) {
      const m = (l[COL.matiere] ?? "").trim();
      if (m) vues.set(m, (vues.get(m) ?? 0) + 1);
    }
    return [...vues.entries()].map(([matiere, nb]) => ({ matiere, nb }));
  }, [brut]);

  const lignesDefaut = useMemo(
    () =>
      (brut ?? [])
        .slice(1)
        .filter((l) => normalise(l[COL.matiere] ?? "") === "materiel par defaut"),
    [brut]
  );

  /** Applique le choix fait sur les lignes « Matériel par défaut » avant conversion. */
  const brutPrepare = useMemo(() => {
    if (!brut) return null;
    if (sortDefaut === "supprimer" || lignesDefaut.length === 0) return brut;
    return brut.map((l, i) => {
      if (i === 0) return l;
      if (normalise(l[COL.matiere] ?? "") !== "materiel par defaut") return l;
      const copie = [...l];
      copie[COL.matiere] =
        sortDefaut === "rematerialiser" && matiereRemplacement
          ? matiereRemplacement
          : `${l[COL.matiere]} (à définir)`;
      return copie;
    });
  }, [brut, sortDefaut, matiereRemplacement, lignesDefaut.length]);

  const resultat: Resultat | null = useMemo(() => {
    if (!brutPrepare) return null;
    try {
      return convertir(brutPrepare, glossaire, { traduire, matieresExclues });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [brutPrepare, glossaire, traduire, matieresExclues]);

  async function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMessage("");
    const buffer = await f.arrayBuffer();
    setBrut(parseCsv(decodeCp1252(buffer)));
    setNomFichier(f.name);
    setReference(referenceDepuisNom(f.name));
    setMatieresExclues([]);
    setSaisies({});
  }

  function basculerMatiere(m: string) {
    setMatieresExclues((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  async function enregistrerTermes() {
    const nouveaux = Object.entries(saisies)
      .filter(([, v]) => v.trim())
      .map(([source, fr]) => ({
        cle: normalise(source),
        terme_source: source,
        terme_fr: fr.trim().toUpperCase(),
        garder_tel_quel: false,
      }));
    if (!nouveaux.length) return;
    setOccupe(true);
    const { error } = await supabase.from("decoupe_glossaire").upsert(nouveaux, { onConflict: "cle" });
    if (error) setMessage(`Enregistrement : ${error.message}`);
    else {
      setGlossaire((prev) => {
        const copie = new Map(prev);
        nouveaux.forEach((t) => copie.set(t.cle, t as TermeGlossaire));
        return copie;
      });
      setSaisies({});
      setMessage(`${nouveaux.length} terme(s) ajouté(s) au glossaire.`);
    }
    setOccupe(false);
  }

  async function garderTelQuel(terme: string) {
    const entree = {
      cle: normalise(terme),
      terme_source: terme,
      terme_fr: terme,
      garder_tel_quel: true,
    };
    setOccupe(true);
    const { error } = await supabase.from("decoupe_glossaire").upsert(entree, { onConflict: "cle" });
    if (error) setMessage(`Enregistrement : ${error.message}`);
    else setGlossaire((prev) => new Map(prev).set(entree.cle, entree as TermeGlossaire));
    setOccupe(false);
  }

  function telecharger(blob: Blob, nom: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nom;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Dépose un fichier produit dans la fiche projet (catégorie « decoupe »). */
  async function attacherAuProjet(blob: Blob, nom: string, type: string) {
    if (projetId === "") return;
    const projet = projects.find((p) => p.id === projetId);
    if (!projet) return;
    const dossier = projet.project_number.replace(/[^a-zA-Z0-9._-]/g, "_");
    const prefixe = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const chemin = `${dossier}/${prefixe}_${nom.replace(/[^a-zA-Z0-9._()\- ]/g, "_")}`;

    const { error: up } = await supabase.storage
      .from("project-files")
      .upload(chemin, blob, { upsert: false, contentType: type });
    if (up) throw new Error(up.message);

    const { error: ins } = await supabase.from("project_files").insert({
      project_id: projet.id,
      file_name: nom,
      file_path: chemin,
      file_type: type,
      file_category: "decoupe",
    });
    if (ins) throw new Error(ins.message);
  }

  async function lancerConversion() {
    if (!resultat) return;
    setOccupe(true);
    setMessage("");
    try {
      const csv = new Blob([encodeCp1252(versCsv(resultat.entete, resultat.groupes))], {
        type: "text/csv",
      });
      const nomCsv = `${referenceDepuisNom(nomFichier)}_FR.csv`;
      const bon = await construireBon(resultat, reference);
      const nomXlsx = nomDuBon(reference);

      telecharger(csv, nomCsv);
      telecharger(bon, nomXlsx);

      let suffixe = "";
      if (projetId !== "") {
        await attacherAuProjet(csv, nomCsv, "text/csv");
        await attacherAuProjet(
          bon,
          nomXlsx,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        suffixe = " et attachés au projet";
      }

      await supabase.from("decoupe_runs").insert({
        project_id: projetId === "" ? null : projetId,
        reference,
        fichier_source: nomFichier,
        nb_pieces: resultat.nbPieces,
        reglages: { traduire, matieresExclues, sortDefaut, matiereRemplacement },
        resultat: {
          supprimeesDefaut: resultat.supprimeesDefaut,
          supprimees1mm: resultat.supprimees1mm,
          arrondis: resultat.arrondis.length,
          inconnus: resultat.inconnus.map((i) => i.terme),
        },
      });

      setMessage(`${resultat.nbPieces} pièces — fichiers générés${suffixe}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
    setOccupe(false);
  }

  /** Pièces unitaires d'une matière, quantité dépliée. */
  function piecesDe(matiere: string): Piece[] {
    const groupe = resultat?.groupes.find((g) => g.matiere === matiere);
    if (!groupe) return [];
    const out: Piece[] = [];
    for (const l of groupe.lignes) {
      const L = Math.round(parseFloat((l[COL.longueur] ?? "0").replace(",", ".")));
      const W = Math.round(parseFloat((l[COL.largeur] ?? "0").replace(",", ".")));
      const q = Math.max(1, parseInt(l[COL.nombre] ?? "1", 10) || 1);
      for (let i = 0; i < q; i++)
        out.push({ L, W, desc: l[COL.nom] ?? "", ref: l[COL.position] ?? "", cnc1: l[COL.cnc1] ?? "", cnc2: l[COL.cnc2] ?? "" });
    }
    return out;
  }

  function lancerOptimisation(matiere: string) {
    const r = reglagePour(matiere);
    const dispo = chutes.filter((c) => c.materiau === matiere);
    const res = optimiser(piecesDe(matiere), dispo, {
      kerf: Number(r.kerf_mm),
      uni: !r.veine,
      panneauLong: Number(r.panneau_long_mm ?? 2800),
      panneauLarg: Number(r.panneau_larg_mm ?? 2070),
    });
    const avecMatiere = { ...res, matiere };
    setPlan(avecMatiere);
    setMatiereActive(matiere);
    setMessage(
      `${matiere} : ${res.panneaux.length} panneau(x) — dont ${res.nbNeufs} neuf(s)` +
        (res.horsFormat.length ? `, ${res.horsFormat.length} pièce(s) hors format` : "")
    );
    return avecMatiere;
  }

  /** Bandeaux et notes du plan, repris mot pour mot des scripts atelier. */
  function textesPlan(matiere: string) {
    const r = reglagePour(matiere);
    const uni = !r.veine;
    const kerf = Number(r.kerf_mm ?? 5);
    const trim = Number(r.rive_mm ?? 0);
    const rive = trim ? `COUPE DE RIVE ${trim} mm SUR LES 4 BORDS` : "pas de coupe de rive";
    const fil = uni ? "COULEUR UNIE, pas de sens de fil" : "sens du fil respecte";
    const sub =
      `ALIAJ INTERIOR  -  PROJET ${reference}  -  optimisation sur chutes atelier` +
      `  -  trait de scie ${kerf} mm  -  ${rive}  -  ${fil}`;
    const foot = trim
      ? `Trait de scie ${kerf} mm entre pieces. COUPE DE RIVE ${trim} mm sur les 4 bords de la ` +
        `chute (bords ebreches) : le trait tirete rouge delimite la zone exploitable. ` +
        `Zone grise = chute restante. Le veinage donne le sens du fil.`
      : uni
      ? `Trait de scie ${kerf} mm entre pieces. Aucune coupe sur les rives du panneau. ` +
        `Zone grise = chute restante. Panneau de couleur unie : aucun sens de fil, ` +
        `les pieces peuvent etre tournees.`
      : `Trait de scie ${kerf} mm entre pieces. Aucune coupe sur les rives du panneau ` +
        `(chutes deja calibrees). Zone grise = chute restante. ` +
        `Le veinage dessine dans chaque piece donne le sens du fil.`;
    const note =
      (uni
        ? "Panneau de couleur unie : aucun sens de fil, les pieces sont orientees librement."
        : "Sens du fil : 1re dimension, sur la commande comme sur les chutes. Aucune piece tournee.") +
      (trim ? ` ${trim} mm de rive retires sur les 4 bords.` : "");
    return { sub, foot, note, uni };
  }

  async function sortirPlan(res = plan, matiere = matiereActive) {
    if (!res || res.matiere !== matiere) res = lancerOptimisation(matiere);
    if (!res.panneaux.length) return;
    const t = textesPlan(matiere);
    const r = reglagePour(matiere);
    const stockDef: [number, number, number][] = chutes
      .filter((c) => c.materiau === matiere)
      .map((c) => [c.quantite, c.long_mm, c.larg_mm]);
    if (res.nbNeufs)
      stockDef.push([res.nbNeufs, Number(r.panneau_long_mm ?? 2800), Number(r.panneau_larg_mm ?? 2070)]);
    const blob = construirePlan(res.tous, {
      materiau: matiere,
      projet: reference,
      horsFormat: res.horsFormat,
      stockDef,
      note: t.note,
      sub: t.sub,
      foot: t.foot,
      unit: chutes.some((c) => c.materiau === matiere) ? "CHUTE" : "PANNEAU",
    });
    const nom = `PLAN DE DECOUPE - ${matiere.replace(/[\\/]/g, "-")} - ${reference}.pdf`;
    telecharger(blob, nom);
    if (projetId !== "") await attacherAuProjet(blob, nom, "application/pdf");
  }

  async function sortirEtiquettes(res = plan, matiere = matiereActive) {
    // les étiquettes portent le n° de panneau et suivent l'ordre du plan :
    // si l'optimisation n'a pas encore tourné pour cette matière, on la lance.
    if (!res || res.matiere !== matiere) res = lancerOptimisation(matiere);
    if (!res.panneaux.length) return;
    const blob = await construireEtiquettes(piecesOrdonnees(res.panneaux), matiere, reference, {
      uni: !reglagePour(matiere).veine,
    });
    const nom = `ETIQUETTES AVERY L7173 - ${matiere.replace(/[\\/]/g, "-")} - ${reference}.pdf`;
    telecharger(blob, nom);
    if (projetId !== "") await attacherAuProjet(blob, nom, "application/pdf");
  }

  /** Conversion + optimisation + plan + étiquettes, pour toutes les matières. */
  async function toutFaire() {
    if (!resultat) return;
    setOccupe(true);
    setMessage("");
    try {
      await lancerConversion();
      for (const g of resultat.groupes) {
        const res = lancerOptimisation(g.matiere);
        if (!res.panneaux.length) continue;
        await sortirPlan(res, g.matiere);
        await sortirEtiquettes(res, g.matiere);
      }
      setMessage(`Tout est sorti : bon, plans et étiquettes pour ${resultat.groupes.length} matière(s).`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
    setOccupe(false);
  }

  const inconnusBloquants = (resultat?.inconnus.length ?? 0) > 0;

  if (chargement) return <div style={{ padding: 32 }}>Chargement du glossaire…</div>;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, color: "#111827" }}>
      <div style={carte}>
        <div style={titre}>1 — Liste de débit</div>
        <input ref={fileRef} type="file" accept=".csv" onChange={choisirFichier} />
        {nomFichier && (
          <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <label style={champ}>
              Référence
              <input value={reference} onChange={(e) => setReference(e.target.value)} style={input} />
            </label>
            <label style={champ}>
              Projet
              <select
                value={projetId}
                onChange={(e) => setProjetId(e.target.value === "" ? "" : Number(e.target.value))}
                style={input}
              >
                <option value="">— téléchargement seul —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_number} · {p.client_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {brut && (
        <div style={carte}>
          <div style={titre}>2 — Réglages</div>
          <label style={{ display: "block", marginBottom: 10 }}>
            <input type="checkbox" checked={traduire} onChange={(e) => setTraduire(e.target.checked)} />{" "}
            Traduire les noms de pièces
          </label>

          <div style={{ fontSize: 13, fontWeight: 700, margin: "12px 0 6px" }}>
            Matières à exclure de ce bon
          </div>
          {matieresDuFichier.map(({ matiere, nb }) => (
            <label key={matiere} style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={matieresExclues.includes(matiere)}
                onChange={() => basculerMatiere(matiere)}
              />{" "}
              {matiere} <span style={{ color: "#111827" }}>({nb})</span>
            </label>
          ))}

          {lignesDefaut.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: "#fef3c7", borderRadius: 10 }}>
              <strong>{lignesDefaut.length} ligne(s) en « Matériel par défaut ».</strong>
              <div style={{ fontSize: 13, margin: "6px 0" }}>
                {[...new Set(lignesDefaut.map((l) => l[COL.nom]))].join(", ")}
              </div>
              <select
                value={sortDefaut}
                onChange={(e) => setSortDefaut(e.target.value as SortDefaut)}
                style={input}
              >
                <option value="supprimer">Supprimer ces lignes (plinthes)</option>
                <option value="garder">Les garder telles quelles</option>
                <option value="rematerialiser">Leur donner une matière</option>
              </select>
              {sortDefaut === "rematerialiser" && (
                <input
                  placeholder="ex. W980 ST7 18mm"
                  value={matiereRemplacement}
                  onChange={(e) => setMatiereRemplacement(e.target.value)}
                  style={{ ...input, marginTop: 8 }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {resultat && resultat.inconnus.length > 0 && (
        <div style={{ ...carte, borderTop: "4px solid #dc2626" }}>
          <div style={titre}>Termes inconnus — à définir avant de continuer</div>
          {resultat.inconnus.map(({ terme, nb }) => (
            <div key={terme} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <span style={{ minWidth: 220, fontSize: 13 }}>
                {terme} <span style={{ color: "#111827" }}>×{nb}</span>
              </span>
              <input
                placeholder="terme atelier"
                value={saisies[terme] ?? ""}
                onChange={(e) => setSaisies({ ...saisies, [terme]: e.target.value })}
                style={input}
              />
              <button onClick={() => garderTelQuel(terme)} style={boutonSecondaire} disabled={occupe}>
                Garder tel quel
              </button>
            </div>
          ))}
          <button onClick={enregistrerTermes} style={bouton} disabled={occupe}>
            Enregistrer au glossaire
          </button>
        </div>
      )}

      {resultat && (
        <div style={carte}>
          <div style={titre}>3 — Résultat</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 14, marginBottom: 14 }}>
            <span><strong>{resultat.nbPieces}</strong> pièces</span>
            <span><strong>{resultat.groupes.length}</strong> matières</span>
            <span>{resultat.supprimeesDefaut} « par défaut » retirées</span>
            <span>{resultat.supprimees1mm} lignes de 1 mm</span>
            <span>{resultat.arrondis.length} cotes arrondies</span>
          </div>
          {resultat.groupes.map((g) => (
            <div key={g.matiere} style={{ fontSize: 13, color: "#111827" }}>
              {g.lignes.length.toString().padStart(3)} — {g.matiere}
            </div>
          ))}

          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={lancerConversion} style={bouton} disabled={occupe || inconnusBloquants}>
              Conversion Excel
            </button>
            <select
              value={matiereActive}
              onChange={(e) => setMatiereActive(e.target.value)}
              style={input}
            >
              <option value="">— matière à optimiser —</option>
              {resultat.groupes.map((g) => (
                <option key={g.matiere} value={g.matiere}>
                  {g.matiere} ({g.lignes.length})
                </option>
              ))}
            </select>
            <button
              onClick={() => lancerOptimisation(matiereActive)}
              style={matiereActive ? bouton : boutonDesactive}
              disabled={occupe || !matiereActive}
            >
              Optimisation
            </button>
            <button
              onClick={() => sortirEtiquettes()}
              style={matiereActive ? bouton : boutonDesactive}
              disabled={occupe || !matiereActive}
            >
              Étiquettes
            </button>
            <button onClick={toutFaire} style={bouton} disabled={occupe || inconnusBloquants}>
              Tout faire
            </button>
          </div>
          {inconnusBloquants && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#dc2626" }}>
              Des termes inconnus restent à définir.
            </div>
          )}
        </div>
      )}

      {matiereActive && (
        <div style={carte}>
          <div style={titre}>4 — Réglages de {matiereActive}</div>
          {(() => {
            const r = reglagePour(matiereActive);
            const maj = (p: Partial<Reglage>) =>
              setReglages((prev) => {
                const base = { ...r, ...p, materiau: matiereActive };
                const autres = prev.filter((x) => x.materiau !== matiereActive);
                return [...autres, base];
              });
            return (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <label style={champ}>
                  Trait de scie (mm)
                  <input type="number" value={r.kerf_mm} onChange={(e) => maj({ kerf_mm: Number(e.target.value) })} style={{ ...input, minWidth: 110 }} />
                </label>
                <label style={champ}>
                  Panneau neuf — fil
                  <input type="number" value={r.panneau_long_mm ?? 2800} onChange={(e) => maj({ panneau_long_mm: Number(e.target.value) })} style={{ ...input, minWidth: 110 }} />
                </label>
                <label style={champ}>
                  Panneau neuf — travers
                  <input type="number" value={r.panneau_larg_mm ?? 2070} onChange={(e) => maj({ panneau_larg_mm: Number(e.target.value) })} style={{ ...input, minWidth: 130 }} />
                </label>
                <label style={{ fontSize: 13 }}>
                  <input type="checkbox" checked={r.veine} onChange={(e) => maj({ veine: e.target.checked })} />{" "}
                  Matière veinée (aucune rotation)
                </label>
                <button onClick={() => enregistrerReglage(reglagePour(matiereActive))} style={boutonSecondaire} disabled={occupe}>
                  Enregistrer ces réglages
                </button>
              </div>
            );
          })()}

          <div style={{ fontSize: 13, fontWeight: 700, margin: "18px 0 8px" }}>
            Chutes disponibles en {matiereActive}
          </div>
          {chutes.filter((c) => c.materiau === matiereActive).length === 0 && (
            <div style={{ fontSize: 13, color: "#111827" }}>
              Aucune chute encodée — tout partira sur panneaux neufs.
            </div>
          )}
          {chutes
            .filter((c) => c.materiau === matiereActive)
            .map((c) => (
              <div key={c.id} style={{ fontSize: 13, display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                <span style={{ minWidth: 200 }}>
                  {c.long_mm} × {c.larg_mm} · ×{c.quantite}
                  {c.rive_mm ? ` · rive ${c.rive_mm}` : ""}
                  {c.note ? ` · ${c.note}` : ""}
                </span>
                <button onClick={() => c.id && supprimerChute(c.id)} style={{ ...boutonSecondaire, padding: "4px 10px", background: "#b91c1c" }} disabled={occupe}>
                  Supprimer
                </button>
              </div>
            ))}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
            <label style={champ}>
              Longueur (fil)
              <input type="number" value={nouvelleChute.long_mm || ""} onChange={(e) => setNouvelleChute({ ...nouvelleChute, long_mm: Number(e.target.value), materiau: matiereActive })} style={{ ...input, minWidth: 110 }} />
            </label>
            <label style={champ}>
              Largeur
              <input type="number" value={nouvelleChute.larg_mm || ""} onChange={(e) => setNouvelleChute({ ...nouvelleChute, larg_mm: Number(e.target.value), materiau: matiereActive })} style={{ ...input, minWidth: 110 }} />
            </label>
            <label style={champ}>
              Quantité
              <input type="number" value={nouvelleChute.quantite} onChange={(e) => setNouvelleChute({ ...nouvelleChute, quantite: Number(e.target.value) })} style={{ ...input, minWidth: 90 }} />
            </label>
            <label style={champ}>
              Coupe de rive
              <select value={nouvelleChute.rive_mm} onChange={(e) => setNouvelleChute({ ...nouvelleChute, rive_mm: Number(e.target.value) })} style={{ ...input, minWidth: 150 }}>
                <option value={0}>0 — chute calibrée</option>
                <option value={5}>5 — chute ébréchée</option>
              </select>
            </label>
            <button onClick={() => ajouterChute()} style={bouton} disabled={occupe}>
              Ajouter la chute
            </button>
          </div>
        </div>
      )}

      {plan && (
        <div style={carte}>
          <div style={titre}>5 — Plan de découpe · {matiereActive}</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 14, marginBottom: 12 }}>
            <span><strong>{plan.panneaux.length}</strong> panneaux</span>
            <span><strong>{plan.nbNeufs}</strong> neufs</span>
            <span>{plan.panneaux.length - plan.nbNeufs} chutes utilisées</span>
            {plan.horsFormat.length > 0 && (
              <span style={{ color: "#b91c1c", fontWeight: 700 }}>
                {plan.horsFormat.length} pièce(s) hors format
              </span>
            )}
          </div>
          {plan.panneaux.map((p, i) => {
            const util = p.placed.reduce((s, x) => s + x.w * x.h, 0);
            return (
              <div key={i} style={{ fontSize: 13, color: "#111827" }}>
                {p.neuf ? "NEUF" : `chute ${p.id}`} · {p.label} · {p.placed.length} pièces ·{" "}
                {((util / (p.w * p.h)) * 100).toFixed(0)} %
              </div>
            );
          })}
          {plan.horsFormat.length > 0 && (
            <div style={{ marginTop: 10, padding: 10, background: "#fef2f2", borderRadius: 8, fontSize: 13 }}>
              Trop grandes pour un panneau neuf :{" "}
              {plan.horsFormat.map((p) => `${p.desc} ${p.L}×${p.W}`).join(", ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={() => sortirPlan()} style={bouton} disabled={occupe}>
              Plan de découpe PDF
            </button>
            <button onClick={() => sortirEtiquettes()} style={bouton} disabled={occupe}>
              Étiquettes
            </button>
          </div>
        </div>
      )}

      {message && (
        <div style={{ ...carte, background: "#ecfdf5", fontSize: 14 }}>{message}</div>
      )}
    </div>
  );
}

const carte: React.CSSProperties = {
  background: "white",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
};
const titre: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#0f172a",
  marginBottom: 12,
};
const champ: React.CSSProperties = { display: "flex", flexDirection: "column", fontSize: 12, fontWeight: 700, gap: 4, color: "#111827" };
const input: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  minWidth: 220,
  color: "#111827",
  background: "white",
};
const bouton: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#1e3a8a",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};
const boutonSecondaire: React.CSSProperties = { ...bouton, background: "#475569" };
const boutonDesactive: React.CSSProperties = { ...bouton, background: "#cbd5e1", cursor: "not-allowed" };
