"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type TabType = "projects" | "calendar" | "tasks" | "purchases";
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
}: {
  title: string;
  value: number;
  big?: boolean;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 24,
        padding: 24,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        gridColumn: big ? "span 2" : undefined,
      }}
    >
      <div style={{ fontSize: 13, color: TEXT_LIGHT, fontWeight: 800 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: big ? 52 : 34,
          fontWeight: 900,
          marginTop: 10,
          color: TEXT_DARK,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
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

  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(emptyPurchaseForm);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseItem | null>(null);
  const [showCompletedPurchases, setShowCompletedPurchases] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    const savedRole = sessionStorage.getItem("aliaj-role");
    if (savedRole === "bureau" || savedRole === "atelier") {
      setRole(savedRole);
      setIsAuthenticated(true);
    }
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
    if (role === "atelier" && activeTab === "tasks") {
      setActiveTab("projects");
    }
  }, [role, activeTab]);

  useEffect(() => {
    if (role === "atelier" && selectedFile?.file_category === "other") {
      const firstVisible = files.find((file) => file.file_category !== "other") || null;
      setSelectedFile(firstVisible);
    }
  }, [role, selectedFile, files]);

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
    const map: Record<string, number> = {};

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

    alert("La tâche a bien été terminée.");
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
      <button
        key={project.id}
        onClick={() => setSelectedProject(project)}
        style={{
          width: "100%",
          textAlign: "left",
          background: isCompleted ? BG_COMPLETED : "white",
          borderRadius: 24,
          padding: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          border: isSelected
            ? `3px solid ${BRAND_BLUE}`
            : isCompleted
            ? `2px solid ${BORDER_COMPLETED}`
            : "1px solid #e2e8f0",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 31,
                fontWeight: 900,
                color: TEXT_DARK,
                lineHeight: 1.05,
              }}
            >
              {project.project_number}
            </div>

            <div
              style={{
                color: TEXT_MEDIUM,
                marginTop: 8,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {project.client_name}
            </div>
          </div>

          <StatusBadge status={project.status} />
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          <InfoCell label="Type" value={project.project_type} />
          <InfoCell label="Adresse" value={project.address || "-"} />
          <InfoCell label="Fabrication" value={formatDate(project.fabrication_date)} />
          <InfoCell label="Pose" value={formatDate(project.installation_date)} />
          <InfoCell label="Priorité" value={project.priority || "-"} />
        </div>

        {project.notes && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 14,
              background: "rgba(255,255,255,0.55)",
              border: "1px solid #e2e8f0",
              color: TEXT_MEDIUM,
            }}
          >
            <div style={{ fontWeight: 800, color: TEXT_DARK, marginBottom: 4 }}>
              Notes atelier
            </div>
            <div>{project.notes}</div>
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
                maxHeight: 560,
                objectFit: "contain",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                background: BG_SOFT,
              }}
            />

            {imageFiles.length > 1 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {imageFiles.map((img) => {
                  const thumbUrl = getPublicFileUrl(img.file_path);
                  return (
                    <button
                      key={img.id}
                      onClick={() => setSelectedFile(img)}
                      style={{
                        border:
                          selectedFile?.id === img.id
                            ? `2px solid ${BRAND_BLUE}`
                            : "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 4,
                        background: "white",
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={thumbUrl}
                        alt={img.file_name}
                        style={{
                          width: "100%",
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                          display: "block",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : pdf ? (
          <iframe
            src={url}
            title={selectedFile.file_name}
            style={{
              width: "100%",
              height: 650,
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
          padding: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
    );
  };

  const renderWeekView = () => {
    const start = startOfWeekMonday(calendarCursorDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
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
                minHeight: 360,
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

                        {event.address && (
                          <div style={{ fontSize: 12, marginTop: 4 }}>{event.address}</div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            marginTop: 10,
                          }}
                        >
                          {event.project_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openLinkedProjectFromEvent(event);
                              }}
                              style={calendarTinyButton}
                            >
                              Ouvrir projet
                            </button>
                          )}

                          {event.source === "manual" && role === "bureau" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                editManualCalendarEvent(event);
                              }}
                              style={calendarTinyButton}
                            >
                              Modifier
                            </button>
                          )}

                          {event.source === "manual" && role === "bureau" && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await deleteManualCalendarEvent(event);
                              }}
                              style={calendarTinyDeleteButton}
                            >
                              Supprimer
                            </button>
                          )}
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
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: TEXT_DARK,
                textTransform: "capitalize",
              }}
            >
              {dayLabel(calendarCursorDate)}
            </div>
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
                        fontSize: 26,
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

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 14,
                      }}
                    >
                      {event.project_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openLinkedProjectFromEvent(event);
                          }}
                          style={outlineButton}
                        >
                          Ouvrir le projet lié
                        </button>
                      )}

                      {event.source === "manual" && role === "bureau" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editManualCalendarEvent(event);
                          }}
                          style={lightButton}
                        >
                          Modifier
                        </button>
                      )}

                      {event.source === "manual" && role === "bureau" && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await deleteManualCalendarEvent(event);
                          }}
                          style={redButton}
                        >
                          Supprimer l'événement
                        </button>
                      )}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 18,
            }}
          >
            <input
              placeholder="Titre de la tâche"
              value={taskForm.title}
              onChange={(e) =>
                setTaskForm({ ...taskForm, title: e.target.value })
              }
              style={bigInputStyle}
            />

            <div>
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

            <div style={{ gridColumn: "1 / -1" }}>
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
                padding: "14px 22px",
                fontSize: 15,
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
              style={{
                ...outlineButtonTop,
                padding: "14px 22px",
                fontSize: 15,
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
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
                    alignItems: "stretch",
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
                      alignSelf: "flex-start",
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
                        fontSize: 28,
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

                    {task.description && (
                      <div
                        style={{
                          marginTop: 10,
                          color: TEXT_LIGHT,
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {task.description.length > 140
                          ? `${task.description.slice(0, 140)}...`
                          : task.description}
                      </div>
                    )}
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
                  fontSize: 30,
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

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={() => completeTask(selectedTask)}
                  style={greenButton}
                >
                  Terminer la tâche
                </button>

                <button
                  onClick={() => setSelectedTask(null)}
                  style={outlineButton}
                >
                  Fermer
                </button>
              </div>
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
  const renderPurchases = () => (
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
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={bigLabelStyle}>Quoi acheter</div>
              <textarea
                placeholder="Ex: panneau blanc mat 2800x2070, 4 charnières, chants assortis..."
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

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 22,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={savePurchase}
              disabled={savingPurchase}
              style={{
                ...blueButtonTop,
                padding: "14px 22px",
                fontSize: 15,
                opacity: savingPurchase ? 0.7 : 1,
              }}
            >
              {savingPurchase ? "Enregistrement..." : "Enregistrer"}
            </button>

            <button
              onClick={() => {
                setShowPurchaseForm(false);
                setPurchaseForm(emptyPurchaseForm);
              }}
              style={{
                ...outlineButtonTop,
                padding: "14px 22px",
                fontSize: 15,
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
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
                    style={{
                      display: "grid",
                      gridTemplateColumns: "52px 1fr",
                      gap: 14,
                      alignItems: "stretch",
                      border: "1px solid #e2e8f0",
                      borderRadius: 22,
                      padding: 16,
                      background: "white",
                    }}
                  >
                    <button
                      onClick={() => togglePurchaseCompleted(item)}
                      title="Marquer comme terminé"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        border: `2px solid ${BRAND_BLUE}`,
                        background: "white",
                        cursor: "pointer",
                        alignSelf: "flex-start",
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
                          fontSize: 28,
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

                      <div
                        style={{
                          marginTop: 10,
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: BG_SOFT,
                          border: "1px solid #e2e8f0",
                          color: TEXT_DARK,
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        {item.item_type}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          color: TEXT_LIGHT,
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.description.length > 140
                          ? `${item.description.slice(0, 140)}...`
                          : item.description}
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
                        alignItems: "stretch",
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
                          alignSelf: "flex-start",
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
                            fontSize: 28,
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

                        <div
                          style={{
                            marginTop: 10,
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "white",
                            border: "1px solid #e2e8f0",
                            color: TEXT_DARK,
                            fontWeight: 800,
                            fontSize: 13,
                          }}
                        >
                          {item.item_type}
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
                  fontSize: 30,
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

              <div style={{ color: TEXT_MEDIUM, lineHeight: 1.8 }}>
                <div>
                  <strong>Créé le :</strong> {formatDateTime(selectedPurchase.created_at)}
                </div>
                <div>
                  <strong>Statut :</strong>{" "}
                  {selectedPurchase.is_completed ? "Terminé" : "En cours"}
                </div>
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

                <button
                  onClick={() => setSelectedPurchase(null)}
                  style={outlineButton}
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: TEXT_LIGHT, lineHeight: 1.7 }}>
              Clique sur un achat projet dans la liste pour voir son détail,
              le modifier ou le supprimer.
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

            <div>
              <div style={bigLabelStyle}>Date</div>
              <input
                type="date"
                value={calendarForm.event_date}
                onChange={(e) =>
                  setCalendarForm({ ...calendarForm, event_date: e.target.value })
                }
                style={bigInputStyle}
              />
            </div>

            <div>
              <div style={bigLabelStyle}>Projet lié (optionnel)</div>
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
            </div>

            <div>
              <div style={bigLabelStyle}>Heure début</div>
              <input
                type="time"
                value={calendarForm.start_time}
                onChange={(e) =>
                  setCalendarForm({ ...calendarForm, start_time: e.target.value })
                }
                style={bigInputStyle}
              />
            </div>

            <div>
              <div style={bigLabelStyle}>Heure fin</div>
              <input
                type="time"
                value={calendarForm.end_time}
                onChange={(e) =>
                  setCalendarForm({ ...calendarForm, end_time: e.target.value })
                }
                style={bigInputStyle}
              />
            </div>

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

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={bigLabelStyle}>Notes</div>
              <textarea
                placeholder="Informations complémentaires"
                value={calendarForm.notes}
                onChange={(e) =>
                  setCalendarForm({ ...calendarForm, notes: e.target.value })
                }
                style={{
                  ...bigInputStyle,
                  minHeight: 140,
                  resize: "vertical",
                }}
              />
            </div>
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
              onClick={saveCalendarEvent}
              disabled={savingCalendarEvent}
              style={{
                ...blueButtonTop,
                padding: "14px 22px",
                fontSize: 15,
                opacity: savingCalendarEvent ? 0.7 : 1,
              }}
            >
              {savingCalendarEvent ? "Enregistrement..." : "Enregistrer"}
            </button>

            <button
              onClick={() => {
                setShowCalendarEventForm(false);
                setCalendarForm(emptyCalendarForm);
              }}
              style={{
                ...outlineButtonTop,
                padding: "14px 22px",
                fontSize: 15,
              }}
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
    <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          title="PROJETS EN COURS"
          value={projects.filter((p) => p.status !== "Terminé").length}
          big
        />
        <StatCard title="EN FABRICATION" value={fabricationCount} />
        <StatCard title="PRÊTS POUR POSE" value={readyInstallCount} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
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
            Liste des projets actifs ({activeProjects.length})
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {activeProjects.length === 0 ? (
              <div style={{ color: TEXT_LIGHT }}>Aucun projet trouvé.</div>
            ) : (
              activeProjects.map((project) => renderProjectCard(project))
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
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
              />

              {renderHistoryToggleBlock()}
            </>
          ) : (
            <div
              style={{
                background: "white",
                borderRadius: 24,
                padding: 28,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                color: TEXT_LIGHT,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: TEXT_DARK,
                  marginBottom: 10,
                }}
              >
                Aucun projet sélectionné
              </div>
              <div style={{ lineHeight: 1.7 }}>
                Clique sur un projet dans la liste de gauche pour afficher sa
                fiche complète, ses fichiers et son historique.
              </div>
            </div>
          )}

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
              Projets terminés par année
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {completedByYear.length === 0 ? (
                <div style={{ color: TEXT_LIGHT }}>
                  Aucun projet terminé.
                </div>
              ) : (
                completedByYear.map(([year, total]) => (
                  <div
                    key={year}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid #e2e8f0",
                      borderRadius: 18,
                      padding: "14px 16px",
                    }}
                  >
                    <span
                      style={{
                        color: TEXT_MEDIUM,
                        fontWeight: 800,
                      }}
                    >
                      {year}
                    </span>
                    <span
                      style={{
                        color: TEXT_DARK,
                        fontWeight: 900,
                        fontSize: 26,
                      }}
                    >
                      {total}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
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
        }}
      >
        <div
          style={{
            background: "white",
            padding: 40,
            borderRadius: 20,
            boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
            textAlign: "center",
            width: 360,
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
              background: BRAND_BLUE,
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
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{
            width: 270,
            background: BRAND_BLUE,
            color: "white",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
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

            <div style={{ display: "grid", gap: 10 }}>
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
                style={activeTab === "purchases" ? sidebarActiveButton : sidebarButton}
              >
                Achat projet
              </button>
            </div>
          </div>

          <div>
            <button onClick={handleLogout} style={sidebarActiveButton}>
              Déconnexion
            </button>
          </div>
        </aside>

        <section style={{ flex: 1, padding: 24 }}>
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              display: "grid",
              gridTemplateColumns:
                activeTab === "projects"
                  ? "auto 1fr 240px 220px auto"
                  : activeTab === "calendar"
                  ? "auto 1fr auto"
                  : "auto 1fr auto",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img
                src="/Logo.png"
                alt="Logo"
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "contain",
                  background: "white",
                  borderRadius: 999,
                  padding: 4,
                  border: "1px solid #e2e8f0",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: TEXT_DARK,
                  }}
                >
                  Aliaj Interior — Dashboard
                </div>
                <div style={{ color: TEXT_LIGHT }}>
                  Gestion de projets menuiserie · Bureau + Atelier
                </div>
              </div>
            </div>

            {activeTab === "projects" ? (
              <>
                <div>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher par client, numéro projet, adresse, date fabrication ou statut..."
                    style={{
                      ...inputStyle,
                      width: "100%",
                      padding: "16px 18px",
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      padding: "16px 18px",
                      fontWeight: 800,
                      background: statusFilter ? "white" : FILTER_CLEAR_BG,
                      color: statusFilter ? TEXT_DARK : FILTER_CLEAR_COLOR,
                      borderColor: statusFilter ? BORDER : "#fecaca",
                    }}
                  >
                    <option value="">Aucun filtre statut</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={projectSort}
                    onChange={(e) =>
                      setProjectSort(e.target.value as ProjectSortOption)
                    }
                    style={{
                      ...inputStyle,
                      width: "100%",
                      padding: "16px 18px",
                      fontWeight: 800,
                    }}
                  >
                    <option value="fabrication_desc">Tri : fabrication ↓</option>
                    <option value="installation_asc">Tri : pose ↑</option>
                    <option value="client_asc">Tri : client A → Z</option>
                    <option value="project_number_asc">Tri : numéro projet</option>
                    <option value="status_asc">Tri : statut</option>
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {role === "bureau" && (
                    <button onClick={openCreateProject} style={outlineButtonTop}>
                      Nouveau projet
                    </button>
                  )}

                  {selectedProject && role === "bureau" && (
                    <>
                      <button
                        onClick={() => openEditProject(selectedProject)}
                        style={lightButtonTop}
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => deleteProject(selectedProject)}
                        style={redButtonTop}
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : activeTab === "calendar" ? (
              <>
                <div style={{ color: TEXT_LIGHT, fontWeight: 700 }}>
                  Vue calendrier partagée entre Bureau et Atelier
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                    color: TEXT_LIGHT,
                    fontWeight: 800,
                  }}
                >
                  Interface {role === "bureau" ? "Bureau" : "Atelier"}
                </div>
              </>
            ) : activeTab === "tasks" ? (
              <>
                <div style={{ color: TEXT_LIGHT, fontWeight: 700 }}>
                  Gestion simple des tâches à effectuer
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => setShowTaskForm((prev) => !prev)}
                    style={blueButtonTop}
                  >
                    {showTaskForm ? "Fermer" : "+ Nouvelle tâche"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ color: TEXT_LIGHT, fontWeight: 700 }}>
                  Gestion des achats liés aux projets
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => setShowPurchaseForm((prev) => !prev)}
                    style={blueButtonTop}
                  >
                    {showPurchaseForm ? "Fermer" : "+ Achat projet"}
                  </button>
                </div>
              </>
            )}
          </div>

          {showProjectForm && role === "bureau" && (
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
                  marginBottom: 20,
                  color: TEXT_DARK,
                }}
              >
                {editingProjectId ? "Modifier projet" : "Créer un projet"}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

                <div>
                  <div style={bigLabelStyle}>Date validation</div>
                  <input
                    type="date"
                    value={form.validation_date}
                    onChange={(e) =>
                      setForm({ ...form, validation_date: e.target.value })
                    }
                    style={bigInputStyle}
                  />
                </div>

                <div>
                  <div style={bigLabelStyle}>Date fabrication</div>
                  <input
                    type="date"
                    value={form.fabrication_date}
                    onChange={(e) =>
                      setForm({ ...form, fabrication_date: e.target.value })
                    }
                    style={bigInputStyle}
                  />
                </div>

                <div>
                  <div style={bigLabelStyle}>Date pose</div>
                  <input
                    type="date"
                    value={form.installation_date}
                    onChange={(e) =>
                      setForm({ ...form, installation_date: e.target.value })
                    }
                    style={bigInputStyle}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={bigLabelStyle}>Notes / consignes atelier</div>
                  <textarea
                    placeholder="Ajouter ici toutes les informations utiles pour l'atelier..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    style={{
                      ...bigInputStyle,
                      minHeight: 150,
                      resize: "vertical",
                    }}
                  />
                </div>
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
                  onClick={saveProject}
                  disabled={savingProject}
                  style={{
                    ...blueButtonTop,
                    padding: "14px 22px",
                    fontSize: 15,
                    opacity: savingProject ? 0.7 : 1,
                  }}
                >
                  {savingProject ? "Enregistrement..." : "Enregistrer"}
                </button>

                <button
                  onClick={() => {
                    setShowProjectForm(false);
                    setEditingProjectId(null);
                    setForm(emptyForm);
                  }}
                  style={{
                    ...outlineButtonTop,
                    padding: "14px 22px",
                    fontSize: 15,
                  }}
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
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 900,
                    color: TEXT_DARK,
                  }}
                >
                  Détail événement
                </div>

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
                <div>
                  <strong>Source :</strong>{" "}
                  {selectedCalendarEvent.source === "manual"
                    ? "Événement manuel"
                    : selectedCalendarEvent.source === "project"
                    ? "Projet"
                    : "Jour férié"}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 22,
                  flexWrap: "wrap",
                }}
              >
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
          ) : (
            renderPurchases()
          )}
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

      <div
        style={{
          color: TEXT_LIGHT,
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        Tu peux sélectionner plusieurs fichiers en une fois.
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
          gridTemplateColumns: "1fr 1.1fr",
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
            <div
              style={{
                ...sectionTitleStyle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Images</span>
              <span style={{ fontSize: 13, color: TEXT_LIGHT }}>
                {imageFiles.length} image(s)
              </span>
            </div>

            {imageFiles.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {imageFiles.map((img) => {
                  const thumbUrl = getPublicFileUrl(img.file_path);
                  return (
                    <div
                      key={img.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 4,
                        background: "white",
                      }}
                    >
                      <img
                        src={thumbUrl}
                        alt={img.file_name}
                        style={{
                          width: "100%",
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                          display: "block",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

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
};

const calendarTinyButton: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 10,
  border: "none",
  background: "rgba(255,255,255,0.9)",
  color: TEXT_DARK,
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

const calendarTinyDeleteButton: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 10,
  border: "none",
  background: "#b91c1c",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};