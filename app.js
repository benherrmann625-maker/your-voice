const STORAGE_KEY = "yourvoice.items.v1";
const LEGACY_STORAGE_KEY = "echodesk.items.v1";
const SETTINGS_KEY = "yourvoice.settings.v1";
const INDEXED_DB_NAME = "yourvoice-app-db";
const INDEXED_DB_VERSION = 1;
const INDEXED_DB_STORE = "app_state";
const INDEXED_ITEMS_KEY = "items";
const INDEXED_SETTINGS_KEY = "settings";
const EXAMPLE_NOTE = "Morgen 14 Uhr Zahnarzt";
const runtimeConfig =
  typeof window !== "undefined" && window.__YOUR_VOICE_CONFIG__ && typeof window.__YOUR_VOICE_CONFIG__ === "object"
    ? window.__YOUR_VOICE_CONFIG__
    : {};
const envSupabaseUrl = typeof runtimeConfig.supabaseUrl === "string" ? runtimeConfig.supabaseUrl.trim() : "";
const envSupabaseAnonKey = typeof runtimeConfig.supabaseAnonKey === "string" ? runtimeConfig.supabaseAnonKey.trim() : "";
const cloudConfigLocked = Boolean(envSupabaseUrl && envSupabaseAnonKey);
const savedSettings = loadSettings();

const state = {
  items: loadItems(),
  currentDraft: null,
  activeView: "capture",
  recognition: null,
  recognizing: false,
  selectedKind: "",
  theme: savedSettings.theme || "light",
  accountEmail: savedSettings.accountEmail || "",
  loggedIn: Boolean(savedSettings.loggedIn),
  syncEnabled: Boolean(savedSettings.syncEnabled),
  colorScheme: savedSettings.colorScheme || "Indigo",
  styleMode: savedSettings.styleMode || "Minimal",
  fontSize: savedSettings.fontSize || "Normal",
  compactLayout: Boolean(savedSettings.compactLayout),
  speechLang: savedSettings.speechLang || "de-DE",
  micQuality: savedSettings.micQuality || "Automatisch",
  autoDetect: savedSettings.autoDetect !== false,
  recognitionLevel: savedSettings.recognitionLevel || "Ausgewogen",
  defaultCategory: savedSettings.defaultCategory || "note",
  customCategories: Array.isArray(savedSettings.customCategories) ? savedSettings.customCategories : [],
  remindersEnabled: savedSettings.remindersEnabled !== false,
  dailySummary: Boolean(savedSettings.dailySummary),
  focusMode: Boolean(savedSettings.focusMode),
  privacyMode: savedSettings.privacyMode || "Lokal",
  supabaseUrl: envSupabaseUrl || savedSettings.supabaseUrl || "",
  supabaseAnonKey: envSupabaseAnonKey || savedSettings.supabaseAnonKey || "",
  authStatusMessage: savedSettings.authStatusMessage || "Noch kein Login-Versuch.",
  cloudUser: null,
  cloudReady: false,
  syncBusy: false,
  hideDone: savedSettings.hideDone !== false,
  inboxArchiveView: "active",
  inboxGroupOrder: Array.isArray(savedSettings.inboxGroupOrder) ? savedSettings.inboxGroupOrder : [],
  hiddenInboxGroups: Array.isArray(savedSettings.hiddenInboxGroups) ? savedSettings.hiddenInboxGroups : [],
  openInboxGroups: new Set(),
  quickEditItemId: "",
  searchFilters: new Set(),
  searchFilterOpen: false,
  searchDateFilter: "any",
  searchCustomDate: "",
  searchPriorityFilter: "any",
  lastSyncAt: savedSettings.lastSyncAt || "",
  lastBackupAt: savedSettings.lastBackupAt || "",
  lastImportedAt: savedSettings.lastImportedAt || "",
  installDismissedAt: savedSettings.installDismissedAt || "",
  guestModeHintDismissed: Boolean(savedSettings.guestModeHintDismissed),
  calendarView: "month",
  selectedDate: startOfDay(new Date()),
  calendarDate: startOfDay(new Date()),
  dayPanelOpen: false,
  storageReady: false,
  storagePersisted: false,
  storageBackend: typeof indexedDB !== "undefined" ? "indexeddb" : "localstorage",
  storageWarning: "",
  installReady: false,
  standaloneMode: false,
  iosInstallHint: false,
};

const els = {
  tabs: [...document.querySelectorAll(".tab")],
  viewTitle: document.querySelector("#viewTitle"),
  captureInput: document.querySelector("#captureInput"),
  parseButton: document.querySelector("#parseButton"),
  loadExampleButton: document.querySelector("#loadExampleButton"),
  clearInputButton: document.querySelector("#clearInputButton"),
  quickCaptureButtons: [...document.querySelectorAll("[data-quick-capture]")],
  pasteCaptureButton: document.querySelector("#pasteCaptureButton"),
  installPromptCard: document.querySelector("#installPromptCard"),
  installAppButton: document.querySelector("#installAppButton"),
  dismissInstallPromptButton: document.querySelector("#dismissInstallPromptButton"),
  installHintText: document.querySelector("#installHintText"),
  guestModeCard: document.querySelector("#guestModeCard"),
  guestModeText: document.querySelector("#guestModeText"),
  guestModeMeta: document.querySelector("#guestModeMeta"),
  guestModeChecklist: document.querySelector("#guestModeChecklist"),
  guestBackupNowButton: document.querySelector("#guestBackupNowButton"),
  openBackupButton: document.querySelector("#openBackupButton"),
  openSyncSettingsButton: document.querySelector("#openSyncSettingsButton"),
  dismissGuestCardButton: document.querySelector("#dismissGuestCardButton"),
  micButton: document.querySelector("#micButton"),
  floatingVoiceButton: document.querySelector("#floatingVoiceButton"),
  micHint: document.querySelector("#micHint"),
  wave: document.querySelector("#wave"),
  reviewPanel: document.querySelector("#reviewPanel"),
  reviewTemplate: document.querySelector("#reviewTemplate"),
  categoryGrid: document.querySelector("#categoryGrid"),
  agendaMetrics: document.querySelector("#agendaMetrics"),
  focusSummary: document.querySelector("#focusSummary"),
  focusList: document.querySelector("#focusList"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarTitle: document.querySelector("#calendarTitle"),
  dayPanel: document.querySelector("#dayPanel"),
  agendaTitleInput: document.querySelector("#agendaTitleInput"),
  agendaDateInput: document.querySelector("#agendaDateInput"),
  agendaTimeInput: document.querySelector("#agendaTimeInput"),
  agendaReminderInput: document.querySelector("#agendaReminderInput"),
  agendaRepeatInput: document.querySelector("#agendaRepeatInput"),
  repeatTextInput: document.querySelector("#repeatTextInput"),
  createAgendaEventButton: document.querySelector("#createAgendaEventButton"),
  calendarViewButtons: [...document.querySelectorAll("[data-calendar-view]")],
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  recentList: document.querySelector("#recentList"),
  inboxList: document.querySelector("#inboxList"),
  searchInput: document.querySelector("#searchInput"),
  filterToggleButton: document.querySelector("#filterToggleButton"),
  filterPanel: document.querySelector("#filterPanel"),
  searchDateFilter: document.querySelector("#searchDateFilter"),
  searchCustomDateInput: document.querySelector("#searchCustomDateInput"),
  searchPriorityFilter: document.querySelector("#searchPriorityFilter"),
  searchFilterChips: document.querySelector("#searchFilterChips"),
  searchList: document.querySelector("#searchList"),
  showDoneButton: document.querySelector("#showDoneButton"),
  showDeletedButton: document.querySelector("#showDeletedButton"),
  addInboxCategoryButton: document.querySelector("#addInboxCategoryButton"),
  exportButton: document.querySelector("#exportButton"),
  importButton: document.querySelector("#importButton"),
  importFileInput: document.querySelector("#importFileInput"),
  calendarExportButton: document.querySelector("#calendarExportButton"),
  deleteAllButton: document.querySelector("#deleteAllButton"),
  syncStatus: document.querySelector("#syncStatus"),
  themeButton: document.querySelector("#themeButton"),
  settingsThemeButton: document.querySelector("#settingsThemeButton"),
  installSettingsButton: document.querySelector("#installSettingsButton"),
  installStatusText: document.querySelector("#installStatusText"),
  syncToggle: document.querySelector("#syncToggle"),
  supabaseUrlInput: document.querySelector("#supabaseUrlInput"),
  supabaseAnonKeyInput: document.querySelector("#supabaseAnonKeyInput"),
  toggleKeyVisibilityButton: document.querySelector("#toggleKeyVisibilityButton"),
  redirectUrlInput: document.querySelector("#redirectUrlInput"),
  copyRedirectButton: document.querySelector("#copyRedirectButton"),
  connectCloudButton: document.querySelector("#connectCloudButton"),
  manualSyncButton: document.querySelector("#manualSyncButton"),
  cloudStatusText: document.querySelector("#cloudStatusText"),
  authDebugText: document.querySelector("#authDebugText"),
  colorSchemeInput: document.querySelector("#colorSchemeInput"),
  styleModeInput: document.querySelector("#styleModeInput"),
  fontSizeInput: document.querySelector("#fontSizeInput"),
  compactLayoutToggle: document.querySelector("#compactLayoutToggle"),
  speechLangInput: document.querySelector("#speechLangInput"),
  micQualityInput: document.querySelector("#micQualityInput"),
  autoDetectToggle: document.querySelector("#autoDetectToggle"),
  recognitionLevelInput: document.querySelector("#recognitionLevelInput"),
  defaultCategoryInput: document.querySelector("#defaultCategoryInput"),
  customCategoryInput: document.querySelector("#customCategoryInput"),
  addCustomCategoryButton: document.querySelector("#addCustomCategoryButton"),
  customCategoryList: document.querySelector("#customCategoryList"),
  remindersToggle: document.querySelector("#remindersToggle"),
  dailySummaryToggle: document.querySelector("#dailySummaryToggle"),
  focusModeToggle: document.querySelector("#focusModeToggle"),
  privacyModeInput: document.querySelector("#privacyModeInput"),
  backupButton: document.querySelector("#backupButton"),
  backupStatusText: document.querySelector("#backupStatusText"),
  localStorageNote: document.querySelector("#localStorageNote"),
  loginButton: document.querySelector("#loginButton"),
  registerButton: document.querySelector("#registerButton"),
  magicLinkButton: document.querySelector("#magicLinkButton"),
  resetPasswordButton: document.querySelector("#resetPasswordButton"),
  logoutButton: document.querySelector("#logoutButton"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  contactNameInput: document.querySelector("#contactNameInput"),
  contactEmailInput: document.querySelector("#contactEmailInput"),
  contactMessageInput: document.querySelector("#contactMessageInput"),
  sendContactButton: document.querySelector("#sendContactButton"),
  contactStatusText: document.querySelector("#contactStatusText"),
  toast: document.querySelector("#toast"),
};

const viewTitles = {
  capture: "Schnell erfassen",
  agenda: "Agenda",
  inbox: "Inbox",
  search: "Suche",
  tips: "Tipps",
  settings: "Einstellungen",
};

const categories = [
  { kind: "task", label: "To-dos", icon: "check", color: "#5b5bd6", hint: "Anrufen, erledigen, vorbereiten" },
  { kind: "event", label: "Termine", icon: "calendar", color: "#28756b", hint: "Meetings, Arzt, Ereignisse" },
  { kind: "school", label: "Schule", icon: "book", color: "#c94a45", hint: "Hausaufgaben, Prüfungen, Kurse" },
  { kind: "shopping", label: "Einkauf", icon: "basket", color: "#b45f2a", hint: "Listen, Vorräte, Drogerie" },
  { kind: "food", label: "Essen", icon: "food", color: "#b45f2a", hint: "Restaurants, Bestellen, Kochen" },
  { kind: "finance", label: "Finanzen", icon: "wallet", color: "#3f7d4c", hint: "Rechnungen, Budget, Zahlungen" },
  { kind: "health", label: "Gesundheit", icon: "health", color: "#28756b", hint: "Arzt, Sport, Medikamente" },
  { kind: "family", label: "Familie", icon: "people", color: "#b94e67", hint: "Oma, Mama, Zuhause" },
  { kind: "personal", label: "Persönlich", icon: "heart", color: "#b94e67", hint: "Privates, Gewohnheiten" },
  { kind: "idea", label: "Ideen / Business", icon: "bulb", color: "#8f5ac8", hint: "Konzepte, Projekte, Chancen" },
  { kind: "travel", label: "Reisen", icon: "plane", color: "#3478a6", hint: "Urlaub, Flüge, Packen" },
  { kind: "reminder", label: "Erinnerungen", icon: "bell", color: "#5b5bd6", hint: "Später erinnern" },
  { kind: "project", label: "Projekte", icon: "briefcase", color: "#5b6472", hint: "Pläne, Arbeit, Roadmaps" },
  { kind: "work", label: "Arbeit", icon: "briefcase", color: "#4f55b8", hint: "Jobs, Kunden, Fokus" },
  { kind: "home", label: "Zuhause", icon: "home", color: "#9a6a24", hint: "Haushalt, Reparaturen, Alltag" },
  { kind: "sport", label: "Sport", icon: "sport", color: "#2f8a82", hint: "Training, Bewegung, Routinen" },
  { kind: "document", label: "Dokumente", icon: "document", color: "#64748b", hint: "Verträge, Formulare, Unterlagen" },
  { kind: "note", label: "Notizen", icon: "note", color: "#64748b", hint: "Alles, was offen bleiben darf" },
];

const legacyKindLabels = {
  birthday: "Geburtstag",
  errand: "Erledigung",
  reminder: "Erinnerung",
};

const kindLabels = Object.fromEntries(categories.map((category) => [category.kind, category.label]));
Object.assign(kindLabels, legacyKindLabels);

const weekdays = {
  sonntag: 0,
  montag: 1,
  dienstag: 2,
  mittwoch: 3,
  donnerstag: 4,
  freitag: 5,
  samstag: 6,
};
const weekdayCodes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

let supabaseClient = null;
let indexedDbPromise = null;
let persistenceQueue = Promise.resolve();
let reminderRefreshHandle = 0;
const reminderTimers = new Map();
let deferredInstallPrompt = null;

void init();

async function init() {
  await hydratePersistentState();
  applySettings();
  registerServiceWorker();
  setupSpeech();
  bindEvents();
  setupInstallExperience();
  handleIncomingLaunchContext();
  renderAll();
  void initCloud();
}

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  els.parseButton.addEventListener("click", () => {
    const rawText = els.captureInput.value.trim();
    if (!rawText) {
      els.captureInput.focus();
      return;
    }
    const draft = parseGermanOrganizerText(rawText, state.selectedKind);
    state.currentDraft = draft;
    renderReview(draft);
  });

  els.clearInputButton.addEventListener("click", () => {
    els.captureInput.value = "";
    els.captureInput.focus();
  });
  els.loadExampleButton?.addEventListener("click", () => {
    loadExampleNote();
  });
  els.quickCaptureButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyQuickCapture(button.dataset.quickCapture || "");
    });
  });
  els.pasteCaptureButton?.addEventListener("click", () => {
    void pasteFromClipboardToCapture();
  });
  els.installAppButton?.addEventListener("click", () => {
    void promptInstallApp();
  });
  els.installSettingsButton?.addEventListener("click", () => {
    void promptInstallApp();
  });
  els.dismissInstallPromptButton?.addEventListener("click", () => {
    dismissInstallPrompt();
  });
  els.openBackupButton?.addEventListener("click", () => {
    openSettingsPanel("privacy");
  });
  els.guestBackupNowButton?.addEventListener("click", () => {
    exportData();
  });
  els.openSyncSettingsButton?.addEventListener("click", () => {
    openSettingsPanel("sync");
  });
  els.dismissGuestCardButton?.addEventListener("click", () => {
    state.guestModeHintDismissed = true;
    saveSettings();
    updateGuestModeUi();
    showToast("Gast-Hinweis ausgeblendet");
  });

  els.micButton.addEventListener("click", toggleSpeech);
  els.floatingVoiceButton.addEventListener("click", () => {
    setView("capture");
    els.captureInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  els.themeButton.addEventListener("click", () => {
    toggleTheme();
  });
  els.settingsThemeButton.addEventListener("click", toggleTheme);
  bindSettingsEvents();
  els.calendarViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarView = button.dataset.calendarView;
      renderCalendar();
    });
  });
  els.prevMonthButton.addEventListener("click", () => {
    state.calendarDate = addMonths(state.calendarDate, state.calendarView === "day" ? 0 : -1);
    if (state.calendarView === "day") state.selectedDate = addDays(state.selectedDate, -1);
    renderCalendar();
  });
  els.nextMonthButton.addEventListener("click", () => {
    state.calendarDate = addMonths(state.calendarDate, state.calendarView === "day" ? 0 : 1);
    if (state.calendarView === "day") state.selectedDate = addDays(state.selectedDate, 1);
    renderCalendar();
  });
  els.agendaDateInput.value = toDateInputValue(state.selectedDate);
  if (els.agendaReminderInput) els.agendaReminderInput.value = state.remindersEnabled ? "15" : "0";
  els.agendaRepeatInput.addEventListener("change", renderRepeatControls);
  els.createAgendaEventButton.addEventListener("click", createManualAgendaEvent);
  renderRepeatControls();

  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewLink));
  });

  els.loginButton.addEventListener("click", () => {
    const email = els.emailInput.value.trim();
    const password = els.passwordInput.value;
    if (!validateAuthForm(email, password, "login")) return;
    void signInWithPassword(email, password);
  });

  els.registerButton.addEventListener("click", () => {
    const email = els.emailInput.value.trim();
    const password = els.passwordInput.value;
    if (!validateAuthForm(email, password, "register")) return;
    void registerWithPassword(email, password);
  });

  els.magicLinkButton.addEventListener("click", () => {
    const email = els.emailInput.value.trim();
    if (!validateAuthForm(email, "", "magic")) return;
    void signInWithMagicLink(email);
  });

  els.resetPasswordButton.addEventListener("click", () => {
    const email = els.emailInput.value.trim();
    if (!validateAuthForm(email, "", "magic")) return;
    void sendPasswordReset(email);
  });

  els.logoutButton.addEventListener("click", () => {
    void signOutCloud();
  });

  els.searchInput.addEventListener("input", renderSearch);
  els.filterToggleButton.addEventListener("click", () => {
    state.searchFilterOpen = !state.searchFilterOpen;
    renderSearch();
  });
  els.searchDateFilter.addEventListener("change", () => {
    state.searchDateFilter = els.searchDateFilter.value;
    renderSearch();
  });
  els.searchCustomDateInput.addEventListener("change", () => {
    state.searchCustomDate = els.searchCustomDateInput.value;
    renderSearch();
  });
  els.searchPriorityFilter.addEventListener("change", () => {
    state.searchPriorityFilter = els.searchPriorityFilter.value;
    renderSearch();
  });

  els.showDoneButton.addEventListener("click", () => {
    state.inboxArchiveView = state.inboxArchiveView === "done" ? "active" : "done";
    renderInbox();
  });
  els.showDeletedButton.addEventListener("click", () => {
    state.inboxArchiveView = state.inboxArchiveView === "deleted" ? "active" : "deleted";
    renderInbox();
  });

  els.addInboxCategoryButton.addEventListener("click", () => {
    const label = window.prompt("Neuen Bereich benennen");
    if (!label) return;
    createCustomCategory(label);
  });

  els.exportButton.addEventListener("click", exportData);
  els.importButton?.addEventListener("click", () => {
    els.importFileInput?.click();
  });
  els.calendarExportButton?.addEventListener("click", exportCalendarIcs);
  els.importFileInput?.addEventListener("change", () => {
    const [file] = Array.from(els.importFileInput.files || []);
    if (!file) return;
    void importDataFromFile(file);
    els.importFileInput.value = "";
  });

  els.deleteAllButton.addEventListener("click", () => {
    const ok = window.confirm("Lokale Your Voice Daten wirklich löschen?");
    if (!ok) return;
    state.items = [];
    saveItems();
    renderAll();
    showToast("Lokale Daten gelöscht");
  });
  els.sendContactButton.addEventListener("click", sendContactMessage);
}

function setView(view) {
  state.activeView = view;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  document.querySelectorAll(".view").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${view}View`);
  });
  els.viewTitle.textContent = viewTitles[view] || "Your Voice";
}

function bindSettingsEvents() {
  els.syncToggle.addEventListener("change", () => {
    if (els.syncToggle.checked && !state.loggedIn) {
      els.syncToggle.checked = false;
      showToast("Erst per E-Mail anmelden");
      return;
    }
    updateSetting("syncEnabled", els.syncToggle.checked);
  });
  els.colorSchemeInput.addEventListener("change", () => updateSetting("colorScheme", els.colorSchemeInput.value));
  els.styleModeInput.addEventListener("change", () => updateSetting("styleMode", els.styleModeInput.value));
  els.fontSizeInput.addEventListener("change", () => updateSetting("fontSize", els.fontSizeInput.value));
  els.compactLayoutToggle.addEventListener("change", () => updateSetting("compactLayout", els.compactLayoutToggle.checked));
  els.speechLangInput.addEventListener("change", () => updateSetting("speechLang", els.speechLangInput.value));
  els.micQualityInput.addEventListener("change", () => updateSetting("micQuality", els.micQualityInput.value));
  els.autoDetectToggle.addEventListener("change", () => updateSetting("autoDetect", els.autoDetectToggle.checked));
  els.recognitionLevelInput.addEventListener("change", () => updateSetting("recognitionLevel", els.recognitionLevelInput.value));
  els.defaultCategoryInput.addEventListener("change", () => updateSetting("defaultCategory", els.defaultCategoryInput.value));
  els.addCustomCategoryButton?.addEventListener("click", addCustomCategory);
  els.remindersToggle.addEventListener("change", () => updateSetting("remindersEnabled", els.remindersToggle.checked));
  els.dailySummaryToggle.addEventListener("change", () => updateSetting("dailySummary", els.dailySummaryToggle.checked));
  els.focusModeToggle.addEventListener("change", () => updateSetting("focusMode", els.focusModeToggle.checked));
  els.privacyModeInput.addEventListener("change", () => updateSetting("privacyMode", els.privacyModeInput.value));
  els.backupButton.addEventListener("click", () => {
    exportData();
  });
  els.toggleKeyVisibilityButton.addEventListener("click", () => {
    const isHidden = els.supabaseAnonKeyInput.type === "password";
    els.supabaseAnonKeyInput.type = isHidden ? "text" : "password";
    els.toggleKeyVisibilityButton.textContent = isHidden ? "Verbergen" : "Anzeigen";
  });
  els.copyRedirectButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getRedirectUrl());
      showToast("Redirect URL kopiert");
    } catch {
      els.redirectUrlInput.select();
      showToast("Redirect URL markieren und kopieren");
    }
  });
  els.connectCloudButton.addEventListener("click", () => {
    if (cloudConfigLocked) {
      showToast("Supabase kommt aus den Deployment-Variablen");
      return;
    }
    state.supabaseUrl = els.supabaseUrlInput.value.trim();
    state.supabaseAnonKey = els.supabaseAnonKeyInput.value.trim();
    if (!state.supabaseUrl || !state.supabaseAnonKey) {
      showToast("URL und Anon Key einfügen");
      return;
    }
    saveSettings();
    void initCloud(true);
  });
  els.manualSyncButton.addEventListener("click", () => {
    void syncCloud("manual");
  });
}

function renderRepeatControls() {
  const isCustom = els.agendaRepeatInput.value === "custom";
  document.querySelectorAll(".repeat-custom").forEach((element) => {
    element.hidden = !isCustom;
  });
}

function createManualAgendaEvent() {
  const title = els.agendaTitleInput.value.trim();
  const dateValue = els.agendaDateInput.value;
  if (!title || !dateValue) {
    showToast("Inhalt und Datum fehlen");
    return;
  }
  const timeValue = els.agendaTimeInput.value;
  const dueStart = `${dateValue}T${timeValue || "09:00"}:00`;
  const dueDate = new Date(dueStart);
  const recurrenceRule = buildManualRecurrenceRule(dueDate);
  const reminderOffset = state.remindersEnabled ? Number(els.agendaReminderInput?.value || 0) : 0;
  const item = {
    id: crypto.randomUUID(),
    kind: "event",
    tags: ["event"],
    rawText: title,
    normalizedText: title,
    title: sentenceCase(title),
    notes: recurrenceRule ? "Wiederholt sich wöchentlich." : "",
    shoppingItems: [],
    status: "open",
    confidence: 1,
    reviewRequired: false,
    priority: "medium",
    dueStart,
    agendaDate: dueStart,
    allDay: !timeValue,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
    recurrenceRule,
    placeLabel: "",
    people: [],
    reminderOffset,
    parserMode: "manual",
    parserVersion: "0.2.0",
    missingFields: [],
    suggestedActions: ["calendar"],
    ruleHits: recurrenceRule ? ["manual_event", "recurrence_weekly"] : ["manual_event"],
    manualOrder: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  state.items = [item, ...state.items];
  state.selectedDate = startOfDay(dueDate);
  state.calendarDate = startOfDay(dueDate);
  state.dayPanelOpen = true;
  els.agendaTitleInput.value = "";
  els.agendaTimeInput.value = "";
  if (els.agendaReminderInput) els.agendaReminderInput.value = state.remindersEnabled ? "15" : "0";
  els.agendaRepeatInput.value = "none";
  els.repeatTextInput.value = "";
  renderRepeatControls();
  saveItems();
  renderAll();
  showToast(recurrenceRule ? "Wiederholung gespeichert" : "Termin gespeichert");
  if (Number(reminderOffset) > 0 && state.remindersEnabled) void ensureReminderPermission();
  if (state.syncEnabled && state.cloudUser) void syncCloud("manual-event");
}

function buildManualRecurrenceRule(date) {
  const mode = els.agendaRepeatInput.value;
  if (mode === "none") return null;
  if (mode === "daily") return "FREQ=DAILY";
  if (mode === "weekly") return `FREQ=WEEKLY;BYDAY=${weekdayCodes[date.getDay()]}`;
  if (mode === "monthly") return "FREQ=MONTHLY";
  if (mode === "yearly") return "FREQ=YEARLY";
  return parseRecurrenceText(els.repeatTextInput.value.trim().toLowerCase(), date) || `FREQ=WEEKLY;BYDAY=${weekdayCodes[date.getDay()]}`;
}

function parseRecurrenceText(text, date = new Date()) {
  if (!text) return null;
  const everyInterval = text.match(/\balle\s+(\d{1,2}|ein|einen|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn)\s+(tag|tage|woche|wochen|monat|monate|jahr|jahre)\b/);
  if (everyInterval) {
    const interval = Math.max(1, Math.min(99, germanNumberToNumber(everyInterval[1])));
    const unit = everyInterval[2];
    const freq = /tag/.test(unit) ? "DAILY" : /woche/.test(unit) ? "WEEKLY" : /monat/.test(unit) ? "MONTHLY" : "YEARLY";
    const byDay = freq === "WEEKLY" ? `;BYDAY=${weekdayCodes[date.getDay()]}` : "";
    return `FREQ=${freq};INTERVAL=${interval}${byDay}`;
  }
  const nthWeekday = text.match(/jeden\s+(\d)\.\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/);
  if (nthWeekday) return `FREQ=MONTHLY;BYDAY=${weekdayCodes[weekdays[nthWeekday[2]]]};BYSETPOS=${nthWeekday[1]}`;
  const relativeWeekday = text.match(/jeden\s+(zweiten|dritten|vierten)\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/);
  if (relativeWeekday) {
    const interval = { zweiten: 2, dritten: 3, vierten: 4 }[relativeWeekday[1]];
    return `FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${weekdayCodes[weekdays[relativeWeekday[2]]]}`;
  }
  const weeklyDay = text.match(/\bjeden\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/);
  if (weeklyDay) return `FREQ=WEEKLY;BYDAY=${weekdayCodes[weekdays[weeklyDay[1]]]}`;
  if (/täglich|taeglich|jeden tag/.test(text)) return "FREQ=DAILY";
  if (/wöchentlich|woechentlich|jede woche/.test(text)) return `FREQ=WEEKLY;BYDAY=${weekdayCodes[date.getDay()]}`;
  if (/monatlich|jeden monat/.test(text)) return "FREQ=MONTHLY";
  if (/jährlich|jaehrlich|jedes jahr/.test(text)) return "FREQ=YEARLY";
  return null;
}

function sendContactMessage() {
  const name = els.contactNameInput.value.trim();
  const email = els.contactEmailInput.value.trim();
  const message = els.contactMessageInput.value.trim();
  if (!name || !isValidEmail(email) || message.length < 8) {
    els.contactStatusText.textContent = "Bitte Name, gültige E-Mail und Nachricht ausfüllen.";
    showToast("Kontakt prüfen");
    return;
  }
  els.contactStatusText.textContent = "Nachricht vorbereitet. In der Web-Version kann hier später ein Mail-Endpoint angebunden werden.";
  els.contactMessageInput.value = "";
  showToast("Nachricht vorbereitet");
}

function updateSetting(key, value) {
  state[key] = value;
  saveSettings();
  applySettings();
  renderAll();
  if (key === "syncEnabled" && value) void syncCloud("settings");
}

function validateAuthForm(email, password, mode) {
  if (!isValidEmail(email)) {
    state.authStatusMessage = "Bitte gib eine gültige E-Mail-Adresse ein.";
    saveSettings();
    applySettings();
    showToast("E-Mail prüfen");
    return false;
  }
  if (mode !== "magic" && password.length < 6) {
    state.authStatusMessage = "Das Passwort braucht mindestens 6 Zeichen.";
    saveSettings();
    applySettings();
    showToast("Passwort zu kurz");
    return false;
  }
  return true;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasCloudConfig() {
  return Boolean(state.supabaseUrl && state.supabaseAnonKey);
}

async function initCloud(showResult = false) {
  if (!hasCloudConfig()) {
    state.cloudReady = false;
    applySettings();
    if (showResult) showToast("Supabase URL und Key eintragen");
    return;
  }
  if (!window.supabase?.createClient) {
    state.cloudReady = false;
    applySettings();
    if (showResult) showToast("Supabase konnte nicht geladen werden");
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(state.supabaseUrl, state.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    state.cloudReady = true;
    state.cloudUser = data.session?.user || null;
    state.loggedIn = Boolean(state.cloudUser);
    if (state.cloudUser?.email) state.accountEmail = state.cloudUser.email;

    supabaseClient.auth.onAuthStateChange((event, session) => {
      state.cloudUser = session?.user || null;
      state.loggedIn = Boolean(state.cloudUser);
      if (state.cloudUser?.email) state.accountEmail = state.cloudUser.email;
      if (event === "SIGNED_IN" && state.cloudUser) {
        state.authStatusMessage = `Eingeloggt als ${state.cloudUser.email || state.accountEmail}.`;
        cleanAuthUrl();
      }
      if (event === "SIGNED_OUT") state.authStatusMessage = "Abgemeldet.";
      saveSettings();
      applySettings();
      if (state.syncEnabled && state.cloudUser) void syncCloud("auth");
    });

    saveSettings();
    applySettings();
    if (state.cloudUser) cleanAuthUrl();
    if (showResult) showToast(state.cloudUser ? "Cloud verbunden" : "Cloud bereit");
    if (state.syncEnabled && state.cloudUser) await syncCloud("startup");
  } catch (error) {
    state.cloudReady = false;
    state.cloudUser = null;
    applySettings();
    if (showResult) showToast(`Cloud Fehler: ${error.message}`);
  }
}

async function signInWithMagicLink(email) {
  state.accountEmail = email;
  state.authStatusMessage = "Magic Link wird angefragt...";
  saveSettings();
  applySettings();

  if (!supabaseClient) await initCloud();
  if (!supabaseClient || !state.cloudReady) {
    state.authStatusMessage = "Login gestoppt: Cloud ist noch nicht verbunden.";
    saveSettings();
    applySettings();
    showToast("Erst Cloud verbinden");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getRedirectUrl(),
    },
  });

  if (error) {
    state.authStatusMessage = authErrorText(error);
    saveSettings();
    applySettings();
    showToast("Login fehlgeschlagen");
    return;
  }

  state.authStatusMessage = `Magic Link angefragt für ${email}. Wenn keine E-Mail kommt: Spam, Supabase Auth Logs, Redirect URL und SMTP prüfen.`;
  saveSettings();
  showToast("Magic Link gesendet");
  applySettings();
}

async function signInWithPassword(email, password) {
  state.accountEmail = email;
  state.authStatusMessage = "Login wird geprüft...";
  saveSettings();
  applySettings();

  if (!supabaseClient) await initCloud();
  if (!supabaseClient || !state.cloudReady) {
    state.authStatusMessage = "Login gestoppt: Cloud ist noch nicht verbunden.";
    saveSettings();
    applySettings();
    showToast("Erst Cloud verbinden");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    state.authStatusMessage = authErrorText(error);
    saveSettings();
    applySettings();
    showToast("Login fehlgeschlagen");
    return;
  }

  state.cloudUser = data.user;
  state.loggedIn = Boolean(data.user);
  state.accountEmail = data.user?.email || email;
  state.authStatusMessage = `Eingeloggt als ${state.accountEmail}. Session bleibt gespeichert.`;
  saveSettings();
  applySettings();
  showToast("Eingeloggt");
  if (state.syncEnabled) await syncCloud("login");
}

async function registerWithPassword(email, password) {
  state.accountEmail = email;
  state.authStatusMessage = "Account wird erstellt...";
  saveSettings();
  applySettings();

  if (!supabaseClient) await initCloud();
  if (!supabaseClient || !state.cloudReady) {
    state.authStatusMessage = "Registrierung gestoppt: Cloud ist noch nicht verbunden.";
    saveSettings();
    applySettings();
    showToast("Erst Cloud verbinden");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getRedirectUrl(),
    },
  });
  if (error) {
    state.authStatusMessage = authErrorText(error);
    saveSettings();
    applySettings();
    showToast("Registrierung fehlgeschlagen");
    return;
  }

  state.cloudUser = data.session?.user || null;
  state.loggedIn = Boolean(data.session?.user);
  state.authStatusMessage = state.loggedIn
    ? `Registriert und eingeloggt als ${email}.`
    : `Account erstellt. Bitte bestätige ggf. die E-Mail für ${email}.`;
  saveSettings();
  applySettings();
  showToast(state.loggedIn ? "Registriert" : "Bestätigung nötig");
  if (state.loggedIn && state.syncEnabled) await syncCloud("register");
}

async function sendPasswordReset(email) {
  state.accountEmail = email;
  state.authStatusMessage = "Passwort-Link wird angefragt...";
  saveSettings();
  applySettings();

  if (!supabaseClient) await initCloud();
  if (!supabaseClient || !state.cloudReady) {
    state.authStatusMessage = "Passwort-Reset gestoppt: Cloud ist noch nicht verbunden.";
    saveSettings();
    applySettings();
    showToast("Erst Cloud verbinden");
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl(),
  });
  if (error) {
    state.authStatusMessage = authErrorText(error);
    saveSettings();
    applySettings();
    showToast("Reset fehlgeschlagen");
    return;
  }

  state.authStatusMessage = `Passwort-Link gesendet an ${email}. Öffne den Link und setze anschließend dein neues Passwort.`;
  saveSettings();
  applySettings();
  showToast("Passwort-Link gesendet");
}

async function signOutCloud() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  state.loggedIn = false;
  state.cloudUser = null;
  state.syncEnabled = false;
  saveSettings();
  applySettings();
  showToast("Abgemeldet");
}

async function syncCloud(source = "manual") {
  if (!hasCloudConfig()) {
    showToast("Cloud nicht konfiguriert");
    return;
  }
  if (!supabaseClient) await initCloud();
  if (!supabaseClient || !state.cloudUser) {
    showToast("Bitte anmelden");
    return;
  }
  if (state.syncBusy) return;

  state.syncBusy = true;
  applySettings();

  try {
    const payloadRows = state.items.map((item) => ({
      id: item.id,
      user_id: state.cloudUser.id,
      payload: item,
      updated_at: item.updatedAt || item.createdAt || new Date().toISOString(),
      deleted: Boolean(item.deletedAt),
    }));

    if (payloadRows.length) {
      const { error: upsertError } = await supabaseClient.from("voice_items").upsert(payloadRows, {
        onConflict: "id",
      });
      if (upsertError) throw upsertError;
    }

    const { data, error } = await supabaseClient
      .from("voice_items")
      .select("payload, updated_at, deleted")
      .eq("user_id", state.cloudUser.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;

    const merged = mergeCloudItems(state.items, data || []);
    state.items = merged;
    state.lastSyncAt = new Date().toISOString();
    state.syncEnabled = true;
    saveItems();
    saveSettings();
    renderAll();
    if (source === "manual") showToast("Synchronisiert");
  } catch (error) {
    showToast(`Sync Fehler: ${error.message}`);
  } finally {
    state.syncBusy = false;
    applySettings();
  }
}

function mergeCloudItems(localItems, cloudRows) {
  const map = new Map(localItems.map((item) => [item.id, item]));
  cloudRows.forEach((row) => {
    const incoming = row.payload;
    if (!incoming?.id) return;
    if (row.deleted) {
      map.set(incoming.id, { ...incoming, deletedAt: incoming.deletedAt || row.updated_at, updatedAt: incoming.updatedAt || row.updated_at });
      return;
    }
    const existing = map.get(incoming.id);
    if (!existing || new Date(incoming.updatedAt || row.updated_at) >= new Date(existing.updatedAt || existing.createdAt)) {
      map.set(incoming.id, incoming);
    }
  });
  return [...map.values()].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

function getCloudStatusText() {
  if (!hasCloudConfig()) return "Gastmodus aktiv. Du kannst später Backup und Sync ergänzen.";
  if (!state.cloudReady) return "Cloud-Konfiguration gespeichert, Verbindung nicht aktiv.";
  if (!state.cloudUser) return "Cloud bereit. Melde dich per Magic Link an.";
  if (state.syncBusy) return "Synchronisierung läuft...";
  if (state.lastSyncAt) return `Verbunden als ${state.cloudUser.email || state.accountEmail}. Letzter Sync: ${formatDateTime(state.lastSyncAt, false)}`;
  return `Verbunden als ${state.cloudUser.email || state.accountEmail}.`;
}

function getRedirectUrl() {
  return window.location.href.split("#")[0].split("?")[0];
}

function cleanAuthUrl() {
  if (!window.location.hash && !window.location.search.includes("code=")) return;
  window.history.replaceState({}, document.title, getRedirectUrl());
}

function authErrorText(error) {
  const message = error?.message || "Unbekannter Auth-Fehler";
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed")) {
    return "E-Mail ist noch nicht bestätigt. Öffne die Bestätigungsmail oder prüfe Spam und Supabase Auth Logs.";
  }
  if (lower.includes("invalid login credentials")) {
    return "E-Mail oder Passwort ist falsch. Falls du nur Magic Link genutzt hast, erst registrieren oder Passwort setzen.";
  }
  if (lower.includes("signup") || lower.includes("disabled")) {
    return "Registrierung ist in Supabase deaktiviert. Aktiviere Authentication -> Providers -> Email.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Zu viele Login-Versuche. Kurz warten und dann erneut versuchen.";
  }
  return `Auth Fehler: ${message}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function applySettings() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.scheme = state.colorScheme.toLowerCase();
  document.documentElement.dataset.style = state.styleMode.toLowerCase();
  document.documentElement.dataset.font = state.fontSize.toLowerCase();
  document.documentElement.dataset.compact = String(state.compactLayout);
  document.documentElement.dataset.focus = String(state.focusMode);
  els.themeButton.querySelector("span").textContent = state.theme === "dark" ? "☾" : "◐";
  els.emailInput.value = state.accountEmail;
  els.supabaseUrlInput.value = state.supabaseUrl;
  els.supabaseAnonKeyInput.value = state.supabaseAnonKey;
  els.supabaseUrlInput.disabled = cloudConfigLocked;
  els.supabaseAnonKeyInput.disabled = cloudConfigLocked;
  els.connectCloudButton.disabled = cloudConfigLocked;
  els.redirectUrlInput.value = getRedirectUrl();
  els.syncToggle.checked = state.syncEnabled;
  els.colorSchemeInput.value = state.colorScheme;
  els.styleModeInput.value = state.styleMode;
  els.fontSizeInput.value = state.fontSize;
  els.compactLayoutToggle.checked = state.compactLayout;
  els.speechLangInput.value = state.speechLang;
  els.micQualityInput.value = state.micQuality;
  els.autoDetectToggle.checked = state.autoDetect;
  els.recognitionLevelInput.value = state.recognitionLevel;
  els.defaultCategoryInput.value = state.defaultCategory;
  els.remindersToggle.checked = state.remindersEnabled;
  els.dailySummaryToggle.checked = state.dailySummary;
  els.focusModeToggle.checked = state.focusMode;
  els.privacyModeInput.value = state.privacyMode;

  if (state.recognition) {
    state.recognition.lang = state.speechLang;
    state.recognition.interimResults = state.micQuality !== "Datensparend";
    state.recognition.continuous = state.micQuality !== "Datensparend";
  }

  const syncText = state.syncBusy
    ? "Sync läuft"
    : state.syncEnabled && state.cloudUser
      ? "Sync aktiv"
      : state.cloudReady
        ? "Cloud bereit"
        : state.privacyMode === "Cloud optional"
          ? "Gastmodus"
          : "Lokal";
  els.syncStatus.lastChild.textContent = ` ${syncText}`;
  const localStorageStatus = state.storageReady
    ? state.storagePersisted
      ? "IndexedDB gesichert."
      : "IndexedDB aktiv."
    : state.storageBackend === "localstorage"
      ? "Browser-Speicher aktiv."
      : "Lokaler Speicher wird vorbereitet.";
  document.querySelector("#storageStatus").textContent = state.syncEnabled
    ? `${localStorageStatus} Sync zwischen Geräten aktiv.`
    : state.privacyMode === "Cloud optional"
      ? `${localStorageStatus} Cloud optional.`
      : `${localStorageStatus} Lokal zuerst.`;
  if (els.localStorageNote) {
    els.localStorageNote.textContent = state.storageWarning
      ? state.storageWarning
      : state.storageReady
        ? state.storagePersisted
          ? "Deine Daten liegen lokal in IndexedDB und sind als persistenter Speicher angefragt. Cloud Sync bleibt optional."
          : "Deine Daten liegen lokal in IndexedDB. Für zusätzlichen Schutz empfiehlt sich ein Export oder Cloud Sync."
        : "Fallback auf Browser-Speicher aktiv. Bitte sichere wichtige Daten zusätzlich per Export.";
  }
  if (els.backupStatusText) {
    const parts = [];
    if (state.lastBackupAt) parts.push(`Letztes Backup ${formatDateTime(state.lastBackupAt, false)}`);
    if (state.lastImportedAt) parts.push(`Letzter Import ${formatDateTime(state.lastImportedAt, false)}`);
    els.backupStatusText.textContent = parts.length ? `${parts.join(" · ")}.` : "Noch kein Backup erstellt.";
  }
  updateInstallUi();
  updateGuestModeUi();
  els.cloudStatusText.textContent = getCloudStatusText();
  els.authDebugText.textContent = state.authStatusMessage;
  if (cloudConfigLocked && !state.cloudUser) {
    els.authDebugText.textContent = "Supabase ist über Deployment-Variablen vorkonfiguriert.";
  }
  renderCustomCategories();

  if (!state.autoDetect) {
    els.micHint.textContent = "Automatische Erkennung ist aus. Einträge werden als Notiz gespeichert.";
  } else if (state.micQuality === "Hoch") {
    els.micHint.textContent = "Hohe Mikrofonqualität aktiv.";
  } else if (state.micQuality === "Datensparend") {
    els.micHint.textContent = "Datensparende Spracheingabe aktiv.";
  } else if (!state.recognizing) {
    els.micHint.textContent = "Tippe und sprich frei. Du kannst auch direkt schreiben.";
  }
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveSettings();
  applySettings();
}

function addCustomCategory() {
  const label = els.customCategoryInput?.value.trim() || "";
  createCustomCategory(label);
}

function createCustomCategory(label = "") {
  const cleanLabel = label.trim();
  if (!cleanLabel) {
    showToast("Bereich benennen");
    return;
  }
  const kind = `custom-${slugify(cleanLabel)}`;
  if ([...categories, ...state.customCategories].some((category) => category.kind === kind || category.label.toLowerCase() === cleanLabel.toLowerCase())) {
    showToast("Bereich existiert schon");
    return;
  }
  state.customCategories = [
    ...state.customCategories,
    { kind, label: cleanLabel, icon: "note", color: "#64748b", hint: "Eigener Bereich", patterns: generateCustomCategoryPatterns(cleanLabel) },
  ];
  if (els.customCategoryInput) els.customCategoryInput.value = "";
  saveSettings();
  applySettings();
  renderInbox();
  showToast("Bereich hinzugefügt");
}

function deleteCustomCategory(kind) {
  const category = [...categories, ...state.customCategories].find((candidate) => candidate.kind === kind);
  if (!category) return;
  const isCustom = kind.startsWith("custom-");
  const ok = window.confirm(`Bereich "${category.label}" aus der Inbox entfernen? Einträge bleiben über Suche und Agenda erreichbar.`);
  if (!ok) return;
  if (isCustom) state.customCategories = state.customCategories.filter((candidate) => candidate.kind !== kind);
  else state.hiddenInboxGroups = [...new Set([...state.hiddenInboxGroups, kind])];
  state.inboxGroupOrder = state.inboxGroupOrder.filter((entry) => entry !== kind);
  if (isCustom) {
    state.items = state.items.map((item) =>
      normalizeKind(item.kind) === kind || ensureItemTags(item).includes(kind)
        ? {
            ...item,
            kind: normalizeKind(item.kind) === kind ? "note" : item.kind,
            tags: ensureItemTags(item).filter((tag) => tag !== kind).concat("note"),
            updatedAt: new Date().toISOString(),
            version: (item.version || 1) + 1,
          }
        : item,
    );
  }
  saveItems();
  saveSettings();
  renderAll();
  showToast("Bereich entfernt");
  if (state.syncEnabled && state.cloudUser) void syncCloud("category-delete");
}

function renderCustomCategories() {
  els.defaultCategoryInput.querySelectorAll("[data-custom-category]").forEach((option) => option.remove());
  state.customCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.kind;
    option.textContent = category.label;
    option.dataset.customCategory = "true";
    els.defaultCategoryInput.append(option);
  });
  els.defaultCategoryInput.value = state.defaultCategory;
  if (!els.customCategoryList) return;
  if (!state.customCategories.length) {
    const empty = document.createElement("span");
    empty.className = "setting-chip muted";
    empty.textContent = "Noch keine eigenen Bereiche";
    els.customCategoryList.replaceChildren(empty);
    return;
  }
  els.customCategoryList.replaceChildren(
    ...state.customCategories.map((category) => {
      const chipEl = document.createElement("button");
      chipEl.type = "button";
      chipEl.className = "setting-chip";
      chipEl.textContent = `${category.label} ×`;
      chipEl.addEventListener("click", () => {
        state.customCategories = state.customCategories.filter((candidate) => candidate.kind !== category.kind);
        saveSettings();
        applySettings();
        renderInbox();
      });
      return chipEl;
    }),
  );
}

function renderCategories() {
  if (!els.categoryGrid) return;
  const cards = categories.map((category) => {
    const count = activeItems().filter((item) => normalizeKind(item.kind) === category.kind).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-card ${state.selectedKind === category.kind ? "selected" : ""}`;
    button.style.setProperty("--category-color", category.color);
    button.innerHTML = `
      <span class="category-icon" aria-hidden="true">${iconSvg(category.icon)}</span>
      <span class="category-copy">
        <strong>${escapeHtml(category.label)}</strong>
        <small>${escapeHtml(category.hint)}</small>
      </span>
      <span class="category-count">${count}</span>
    `;
    button.addEventListener("click", () => {
      state.selectedKind = state.selectedKind === category.kind ? "" : category.kind;
      renderCategories();
      els.captureInput.focus();
    });
    return button;
  });
  els.categoryGrid.replaceChildren(...cards);
}

function renderAgendaBoard() {
  renderAgendaMetrics();
  renderCalendar();
}

function renderAgendaMetrics() {
  const today = startOfDay(new Date());
  const week = addDays(today, 7);
  const open = activeItems();
  const dueToday = open.filter((item) => sameDay(new Date(item.dueStart || item.agendaDate || item.createdAt), today)).length;
  const dueWeek = open.filter((item) => {
    const date = new Date(item.dueStart || item.agendaDate || item.createdAt);
    return date >= today && date < week;
  }).length;
  const events = open.filter((item) => normalizeKind(item.kind) === "event").length;
  const tasks = open.filter((item) => ["task", "school", "finance", "project", "reminder"].includes(normalizeKind(item.kind))).length;
  const metrics = [
    ["Heute", dueToday],
    ["Diese Woche", dueWeek],
    ["Termine", events],
    ["Aufgaben", tasks],
  ];
  const cards = metrics.map(([label, value]) => {
    const card = document.createElement("article");
    card.className = "metric-card";
    card.innerHTML = `<span>${escapeHtml(label)}</span><strong>${value}</strong>`;
    return card;
  });
  if (state.dailySummary) cards.push(buildDailySummaryCard(open, today));
  els.agendaMetrics.replaceChildren(...cards);
}

function buildDailySummaryCard(openItems, today) {
  const card = document.createElement("article");
  card.className = "summary-card";
  const todayItems = openItems
    .filter((item) => sameDay(new Date(item.dueStart || item.agendaDate || item.createdAt), today))
    .sort((a, b) => new Date(a.dueStart || a.agendaDate || a.createdAt) - new Date(b.dueStart || b.agendaDate || b.createdAt));
  const overdue = openItems.filter((item) => {
    if (!item.dueStart) return false;
    const due = new Date(item.dueStart);
    return due < new Date() && !sameDay(due, today);
  });
  const nextItem = openItems
    .filter((item) => item.dueStart && new Date(item.dueStart) >= new Date())
    .sort((a, b) => new Date(a.dueStart) - new Date(b.dueStart))[0];
  const todayTasks = todayItems.filter((item) => normalizeKind(item.kind) !== "event").length;
  const todayEvents = todayItems.filter((item) => normalizeKind(item.kind) === "event").length;
  card.innerHTML = `
    <p class="eyebrow">Tageszusammenfassung</p>
    <h3>${todayItems.length ? `Heute warten ${todayItems.length} Eintraege` : "Heute ist es ruhig"}</h3>
    <p class="settings-note">
      ${
        nextItem
          ? `Naechster Fokus: ${escapeHtml(cleanDisplayText(nextItem.title))} · ${escapeHtml(formatDueBadge(nextItem))}`
          : "Noch kein naechster Termin geplant."
      }
    </p>
    <div class="summary-pills">
      <span class="setting-chip">${todayTasks} Aufgaben</span>
      <span class="setting-chip">${todayEvents} Termine</span>
      ${overdue.length ? `<span class="setting-chip warn">${overdue.length} ueberfaellig</span>` : `<span class="setting-chip muted">Keine Altlasten</span>`}
    </div>
  `;
  return card;
}

function setupSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.micHint.textContent = "Spracherkennung ist in diesem Browser nicht verfügbar. Texteingabe funktioniert vollständig.";
    els.micButton.disabled = true;
    els.micButton.classList.add("disabled");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = state.speechLang;
  recognition.interimResults = state.micQuality !== "Datensparend";
  recognition.continuous = state.micQuality !== "Datensparend";

  recognition.addEventListener("result", (event) => {
    let finalTranscript = "";
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    const existing = els.captureInput.value.replace(/\s+\[[^\]]+\]$/u, "").trim();
    const next = [existing, finalTranscript.trim()].filter(Boolean).join(" ");
    els.captureInput.value = interimTranscript.trim() ? `${next} [${interimTranscript.trim()}]` : next;
  });

  recognition.addEventListener("end", () => {
    state.recognizing = false;
    els.micButton.classList.remove("recording");
    els.wave.classList.remove("active");
    els.micHint.textContent = "Aufnahme beendet. Prüfe den Text und strukturiere ihn.";
    els.captureInput.value = els.captureInput.value.replace(/\s+\[[^\]]+\]$/u, "").trim();
  });

  recognition.addEventListener("error", () => {
    state.recognizing = false;
    els.micButton.classList.remove("recording");
    els.wave.classList.remove("active");
    els.micHint.textContent = "Die Aufnahme konnte nicht fortgesetzt werden. Texteingabe bleibt bereit.";
  });

  state.recognition = recognition;
  applySettings();
}

function toggleSpeech() {
  if (!state.recognition) return;
  if (state.recognizing) {
    state.recognition.stop();
    return;
  }
  state.recognizing = true;
  els.micButton.classList.add("recording");
  els.wave.classList.add("active");
  els.micHint.textContent = "Ich höre zu. Tippe erneut, um zu stoppen.";
  state.recognition.start();
}

function parseGermanOrganizerText(rawText, preferredKind = "") {
  const now = new Date();
  const normalized = normalizeText(rawText);
  const lower = normalized.toLowerCase();
  const signals = [];
  const missing = [];
  const suggestedActions = [];

  const detectedKind = state.autoDetect ? detectKind(lower, signals, suggestedActions) : "note";
  if (!state.autoDetect) signals.push("auto_detect_off");
  const kind = preferredKind || detectedKind;
  if (preferredKind) signals.push("category_selected");
  const temporal = detectTemporal(lower, now, signals);
  if (!temporal.date && temporal.time) {
    temporal.date = startOfDay(now);
    signals.push("date_inferred_today_from_time");
  }
  const location = detectLocation(normalized, lower, signals);
  const people = detectPeople(normalized, lower, kind, signals);
  const shoppingItems = detectShoppingItems(normalized, kind);
  const reminderOffset = detectReminderOffset(lower, kind, signals);
  const tags = detectTags(lower, kind, temporal, people, shoppingItems, signals);
  const title = buildTitle(normalized, kind, temporal, location, shoppingItems, people);
  const priority = detectPriority(lower, temporal, kind, signals);
  const categoryScores = buildCategoryScores(tags, kind, signals, confidenceSeedScore(signals));

  if (!temporal.date && ["event", "reminder"].includes(normalizeKind(kind))) missing.push("date");
  if (temporal.needsTime && !temporal.time) missing.push("time");
  if ((kind === "errand" || kind === "event") && !location.label) missing.push("location");

  if (temporal.date || temporal.time) suggestedActions.push("reminder");
  if (kind === "event" || kind === "birthday") suggestedActions.push("calendar");
  if (location.label || kind === "errand") suggestedActions.push("maps");

  const confidence = calculateConfidence({
    kind,
    boxKind: normalizeKind(kind),
    boxLabel: getKindLabel(kind),
    temporal,
    location,
    people,
    signals,
    missing,
    rawText,
  });

  return {
    id: crypto.randomUUID(),
    kind,
    itemType: inferItemType(kind, tags, temporal, shoppingItems),
    tags,
    categories: tags,
    categoryScores,
    rawText,
    sourceTranscript: rawText,
    normalizedText: normalized,
    title,
    normalizedShortNote: title,
    notes: buildNotes(rawText, shoppingItems, people),
    shoppingItems,
    status: "open",
    lifecycleStatus: "active",
    priority,
    confidence,
    parseConfidence: confidence,
    timeConfidence: temporal.date || temporal.time ? 0.92 : 0.42,
    reviewRequired: confidence < 0.82 || missing.length > 0,
    dueStart: combineDateTime(temporal.date, temporal.time),
    agendaDate: combineDateTime(temporal.date || now, temporal.time),
    allDay: Boolean(temporal.date && !temporal.time),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
    recurrenceRule: temporal.recurrenceRule,
    placeLabel: location.label,
    people,
    reminderOffset,
    parserMode: "rules-de",
    parserVersion: "0.2.0",
    missingFields: missing,
    suggestedActions: [...new Set(suggestedActions)],
    ruleHits: signals,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

function normalizeText(text) {
  return text
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function detectKind(lower, signals, actions) {
  const customKind = detectCustomCategoryKind(lower);
  if (customKind) {
    signals.push("custom_category_context");
    return customKind;
  }
  if (/(ich muss|ich sollte|muss noch|sollte noch|gassi|hund)/i.test(lower) && /(gehen|machen|erledigen|anrufen|zahlen|kaufen|lernen|vorbereiten|planen|prüfen|pruefen|gassi)/i.test(lower)) {
    signals.push("obligation_task_context");
    return "task";
  }
  if (/(deutsch|mathe|englisch|spanisch|französisch|franzoesisch|bio|chemie|physik|geschichte|abi|abitur|prüfung|pruefung|klausur|hausaufgabe|vokabeln)\b.*\b(lernen|üben|ueben|machen|vorbereiten)|\b(lernen|üben|ueben)\b.*\b(deutsch|mathe|englisch|spanisch|französisch|franzoesisch|abi|abitur|prüfung|pruefung|klausur|vokabeln)/i.test(lower)) {
    signals.push("school_learning_context");
    return "school";
  }
  if (/(brot|milch|eier|butter|käse|kaese|wasser|nudeln|reis|gemüse|gemuese|obst)\b.*\b(kaufen|holen|besorgen)|\b(kaufen|holen|besorgen)\b.*\b(brot|milch|eier|butter|käse|kaese|wasser|nudeln|reis|gemüse|gemuese|obst)/i.test(lower)) {
    signals.push("shopping_context");
    return "shopping";
  }
  if (/(oma|opa|mama|papa|mutter|vater|bruder|schwester|familie|eltern|kind)/i.test(lower) && /(essen|treffen|besuchen|anrufen|telefonieren|abholen|bringen)/i.test(lower)) {
    signals.push("family_context");
    return "family";
  }
  if (/(\bum\b|\buhr\b|\d{1,2}[:.]\s?\d{2})/i.test(lower) && /(heute|morgen|übermorgen|uebermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|nächste|naechste|kommende|am\s+\d)/i.test(lower)) {
    signals.push("datetime_event_context");
    return "event";
  }
  if (/(termin|meeting|call|arzt|zahnarzt|vorlesung|unterricht|treffen|verabreden|besuchen)/i.test(lower) && /(\bum\b|\buhr\b|\d{1,2}[:.]\s?\d{2}|heute|morgen|übermorgen|uebermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|nächste|naechste)/i.test(lower)) {
    signals.push("event_context");
    return "event";
  }
  if (/(döner|doener|pizza|essen|mittag|abendessen|frühstück|fruehstueck|restaurant|bestellen|lieferung|kochen|backen|kuchen|reservieren|tisch)/i.test(lower)) {
    signals.push("food_keyword");
    return "food";
  }
  if (/(lebensmittel|kaufen|einkaufen|besorgen|supermarkt|drogerie|milch|brot|eier|einkaufsliste)/i.test(lower)) {
    signals.push("shopping_keyword");
    return "shopping";
  }
  if (/(rechnung|bezahlen|zahlung|konto|steuer|budget|miete|abo|versicherung|geld|überweisung|ueberweisung|kreditkarte|wallet)/i.test(lower)) {
    signals.push("finance_keyword");
    return "finance";
  }
  if (/(schule|lernen|hausaufgabe|prüfung|pruefung|klausur|abi|abitur|deutsch|mathe|uni|vorlesung|seminar|kurs|referat|vokabeln)/i.test(lower)) {
    signals.push("school_keyword");
    return "school";
  }
  if (/(arzt|zahnarzt|medikament|apotheke|training|gesundheit|therapie|termin beim arzt)/i.test(lower)) {
    signals.push("health_keyword");
    if (!/(termin|um|uhr|morgen|nächste|naechste)/i.test(lower)) return "health";
  }
  if (/(oma|opa|mama|papa|mutter|vater|bruder|schwester|familie|eltern|kind|zuhause)/i.test(lower)) {
    signals.push("family_keyword");
    return "family";
  }
  if (/(urlaub|reise|flug|hotel|koffer|packen|bahnhof|zug|boarding|reiseplan)/i.test(lower)) {
    signals.push("travel_keyword");
    return "travel";
  }
  if (/(vertrag|formular|dokument|unterlagen|pass|ausweis|pdf|bescheinigung|scan|scannen)/i.test(lower)) {
    signals.push("document_keyword");
    return "document";
  }
  if (/(haushalt|zuhause|wohnung|putzen|reparieren|müll|muell|garten|küche|kueche)/i.test(lower)) {
    signals.push("home_keyword");
    return "home";
  }
  if (/(training|fitness|laufen|gym|workout|sport|yoga|schwimmen|fahrrad)/i.test(lower)) {
    signals.push("sport_keyword");
    return "sport";
  }
  if (/(arbeit|kunde|kunden|chef|team|office|deadline|job|bewerbung|meeting vorbereiten)/i.test(lower)) {
    signals.push("work_keyword");
    return "work";
  }
  if (/(projekt|roadmap|sprint|milestone|planung|launch|arbeitspaket)/i.test(lower)) {
    signals.push("project_keyword");
    return "project";
  }
  if (/(idee|business|website|startup|projektidee|produkt|kund|marketing|angebot|pitch|business plan|businessplan)/i.test(lower)) {
    signals.push("idea_keyword");
    return "idea";
  }
  if (/(privat|auto)/i.test(lower)) {
    signals.push("personal_keyword");
    if (!/(termin|meeting|call|arzt|zahnarzt|vorlesung|unterricht|treffen)/i.test(lower)) return "personal";
  }
  if (/(geburtstag|geb\.)/i.test(lower)) {
    signals.push("birthday_keyword");
    return "personal";
  }
  if (/(paket|post|dhl|hermes|versenden|verschicken|abholen|wegbringen)/i.test(lower)) {
    signals.push("errand_keyword");
    actions.push("maps");
    return "errand";
  }
  if (/(termin|meeting|call|arzt|zahnarzt|vorlesung|unterricht|treffen|verabreden)/i.test(lower)) {
    signals.push("event_keyword");
    return "event";
  }
  if (/(erinner|remind|nicht vergessen)/i.test(lower)) {
    signals.push("reminder_keyword");
    return "reminder";
  }
  if (/(todo|aufgabe|machen|erledigen|vorbereiten|abschließen|abschliessen|fertig machen|gießen|giessen|backen)/i.test(lower)) {
    signals.push("task_keyword");
    return "task";
  }
  if (/(anrufen|zahlen|bezahlen|lernen|kaufen|holen|schicken|senden|buchen|reservieren|planen|organisieren|prüfen|pruefen|klären|klaeren|gießen|giessen|backen)/i.test(lower)) {
    signals.push("action_inferred_task");
    return "task";
  }
  if (state.recognitionLevel === "Aktiv" && lower.length > 6) {
    signals.push("active_default_task");
    return state.defaultCategory === "personal" ? "task" : state.defaultCategory;
  }
  signals.push("default_category");
  return state.defaultCategory || "note";
}

function detectTags(lower, kind, temporal, people, shoppingItems, signals) {
  const tags = new Set([normalizeKind(kind)]);
  const hasFamily = /(oma|opa|mama|papa|mutter|vater|bruder|schwester|familie|eltern|kind)/i.test(lower) || people.length > 0;
  const hasFood = /(döner|doener|pizza|essen|restaurant|mittagessen|abendessen|frühstück|fruehstueck|kochen|backen|kuchen|bestellen)/i.test(lower);
  const hasEvent = /(termin|meeting|treffen|verabreden|besuchen|\bmit\b)/i.test(lower) || Boolean(temporal.date || temporal.time);
  const hasTask = /(anrufen|zahlen|bezahlen|lernen|kaufen|holen|schicken|senden|buchen|reservieren|planen|organisieren|prüfen|pruefen|erledigen|vorbereiten|gießen|giessen|backen)/i.test(lower);
  const hasObligation = /(ich muss|ich sollte|muss noch|sollte noch|gassi|hund)/i.test(lower);
  const hasSport = /(training|fitness|laufen|gym|workout|sport|yoga|schwimmen|fahrrad|fußball|fussball)/i.test(lower);

  if (hasFamily) tags.add("family");
  if (hasFood) tags.add(shoppingItems.length ? "shopping" : "food");
  if (hasEvent) tags.add("event");
  if (hasTask || hasObligation) tags.add("task");
  if (hasSport) tags.add("sport");
  if (/(idee|business|website|startup|konzept|pitch)/i.test(lower)) tags.add("idea");
  if (/(rechnung|miete|steuer|konto|überweisung|ueberweisung|geld|budget)/i.test(lower)) tags.add("finance");
  if (/(schule|lernen|hausaufgabe|abi|abitur|mathe|deutsch|prüfung|pruefung)/i.test(lower)) tags.add("school");
  if (/(privat|persönlich|persoenlich|auto)/i.test(lower)) tags.add("personal");
  if (/(erinner|nicht vergessen|remind)/i.test(lower)) tags.add("reminder");
  state.customCategories.forEach((category) => {
    if (customCategoryMatches(lower, category)) tags.add(category.kind);
  });

  if (tags.has("note") && tags.size > 1) tags.delete("note");
  signals.push(`tags_${[...tags].join("_")}`);
  return [...tags].slice(0, 5);
}

function inferItemType(kind, tags, temporal, shoppingItems) {
  const normalizedKind = normalizeKind(kind);
  if (normalizedKind === "event" || tags.includes("event") || temporal.date || temporal.time) return "event";
  if (normalizedKind === "shopping" || shoppingItems.length) return "shopping";
  if (normalizedKind === "idea") return "idea";
  if (normalizedKind === "reminder" || tags.includes("reminder")) return "reminder";
  if (tags.includes("task") || ["task", "school", "finance", "work", "project", "home", "sport"].includes(normalizedKind)) return "todo";
  return "note";
}

function buildCategoryScores(tags, primaryKind, signals, seed = 0.66) {
  const primary = normalizeKind(primaryKind);
  return tags.map((tag, index) => ({
    name: tag,
    score: Number(Math.min(0.98, Math.max(0.52, seed + (tag === primary ? 0.18 : 0.04) - index * 0.035 + signals.length * 0.01)).toFixed(2)),
  }));
}

function confidenceSeedScore(signals) {
  return Math.min(0.82, 0.58 + Math.min(signals.length, 6) * 0.035);
}

function detectCustomCategoryKind(lower) {
  const match = state.customCategories.find((category) => customCategoryMatches(lower, category));
  return match?.kind || "";
}

function customCategoryMatches(lower, category) {
  const terms = category.patterns || generateCustomCategoryPatterns(category.label);
  return terms.some((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(lower));
}

function generateCustomCategoryPatterns(label) {
  const base = slugify(label).split("-").filter(Boolean);
  const lower = label.toLowerCase();
  const presets = [
    { test: /(fitness|sport|training|gym|lauf|joggen|workout)/i, terms: ["fitness", "sport", "training", "gym", "joggen", "laufen", "workout", "yoga"] },
    { test: /(arbeit|job|office|kunde|business)/i, terms: ["arbeit", "job", "office", "kunde", "meeting", "deadline"] },
    { test: /(haustier|hund|katze|tier)/i, terms: ["hund", "katze", "tierarzt", "gassi", "futter"] },
    { test: /(auto|fahrzeug|werkstatt)/i, terms: ["auto", "werkstatt", "tanken", "reifen", "inspektion"] },
    { test: /(musik|band|instrument)/i, terms: ["musik", "probe", "gitarre", "klavier", "song"] },
  ];
  const preset = presets.find((entry) => entry.test.test(lower));
  return [...new Set([label.toLowerCase(), ...base, ...(preset?.terms || [])])].filter((term) => term.length > 2);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectTemporal(lower, now, signals) {
  let date = null;
  let time = null;
  let recurrenceRule = null;
  let needsTime = false;
  const inDaysMatch = lower.match(/\bin\s+(\d{1,2}|ein|einen|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn)\s+tagen?\b/);
  if (inDaysMatch) {
    date = addDays(startOfDay(now), germanNumberToNumber(inDaysMatch[1]));
    signals.push("date_in_days");
  }

  const nextWeekdayMatch = lower.match(/\bnächste(?:n|r)?\s+woche\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b|\bnaechste(?:n|r)?\s+woche\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/);
  if (nextWeekdayMatch) {
    const weekday = nextWeekdayMatch[1] || nextWeekdayMatch[2];
    date = nextWeekday(addDays(now, 7), weekdays[weekday], false);
    signals.push("date_next_week_weekday");
  }

  const recurringWeekday = lower.match(/\bjede[nrs]?\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/);
  if (recurringWeekday) {
    const dayIndex = weekdays[recurringWeekday[1]];
    date = nextWeekday(now, dayIndex, false);
    recurrenceRule = `FREQ=WEEKLY;BYDAY=${weekdayCodes[dayIndex]}`;
    signals.push("recurrence_weekday");
  }

  if (!date && /\bheute\b/.test(lower)) {
    date = startOfDay(now);
    signals.push("date_today");
  } else if (!date && /\bmorgen\b/.test(lower)) {
    date = addDays(startOfDay(now), 1);
    signals.push("date_tomorrow");
  } else if (!date && /\bübermorgen\b|\buebermorgen\b/.test(lower)) {
    date = addDays(startOfDay(now), 2);
    signals.push("date_day_after_tomorrow");
  }

  if (!date && /\bdiese woche\b/.test(lower)) {
    date = startOfDay(now);
    signals.push("date_this_week");
  }

  if (!date && /\bnächste woche\b|\bnaechste woche\b/.test(lower)) {
    date = nextWeekday(addDays(now, 1), 1, true);
    signals.push("date_next_week");
  }

  const weekdayMatch = lower.match(/\b(nächsten|naechsten|kommenden|diesen|am|bis)?\s*(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/);
  if (!date && weekdayMatch) {
    date = nextWeekday(now, weekdays[weekdayMatch[2]], /nächsten|naechsten|kommenden/.test(weekdayMatch[1] || ""));
    signals.push("date_weekday");
  }

  const numericDate = lower.match(/\b(\d{1,2})\.\s*(\d{1,2}|januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)(?:\.?\s*(\d{4}))?\b/);
  if (!date && numericDate) {
    const day = Number(numericDate[1]);
    const month = parseMonth(numericDate[2]);
    const year = numericDate[3] ? Number(numericDate[3]) : inferYear(now, month, day);
    date = new Date(year, month, day);
    signals.push("date_explicit");
  }

  const timeMatch = lower.match(/\b(?:um\s*)?([01]?\d|2[0-3])(?:(?:[:.]|\s)([0-5]\d))?\s*(uhr|h)?\b/);
  if (timeMatch) {
    time = {
      hours: Number(timeMatch[1]),
      minutes: timeMatch[2] ? Number(timeMatch[2]) : 0,
    };
    needsTime = true;
    signals.push("time_explicit");
  }

  if (!time && /\bhalb\s+(eins|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn|elf|zwölf|zwoelf)\b/.test(lower)) {
    const halfMatch = lower.match(/\bhalb\s+(eins|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn|elf|zwölf|zwoelf)\b/);
    const hour = germanHourToNumber(halfMatch[1]);
    if (hour) {
      time = { hours: hour - 1, minutes: 30 };
      needsTime = true;
      signals.push("time_spoken_half");
    }
  }

  if (!time && /nach der schule/.test(lower)) {
    time = { hours: 15, minutes: 0 };
    needsTime = true;
    signals.push("time_after_school");
  }

  if (!time && /\bheute abend\b|\babend\b/.test(lower)) {
    time = { hours: 19, minutes: 0 };
    needsTime = true;
    signals.push("time_evening");
  }

  if (!recurrenceRule && /\b(alle\s+(\d{1,2}|ein|einen|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn)\s+(tag|tage|woche|wochen|monat|monate|jahr|jahre)|jeden\s+\d\.\s+\w+|jede[nrs]? (tag|woche|monat)|wöchentlich|woechentlich|monatlich|jährlich|jaehrlich)\b/.test(lower)) {
    recurrenceRule = parseRecurrenceText(lower, date || now) || (/tag/.test(lower) ? "FREQ=DAILY" : /monat/.test(lower) ? "FREQ=MONTHLY" : /jährlich|jaehrlich|jahr/.test(lower) ? "FREQ=YEARLY" : "FREQ=WEEKLY");
    signals.push("recurrence");
  }

  return { date, time, recurrenceRule, needsTime };
}

function detectLocation(normalized, lower, signals) {
  const direct = normalized.match(/\b(?:in|bei|am|im|zum|zur)\s+([A-ZÄÖÜ][\p{L}\d\s.-]{2,48})/u);
  if (direct) {
    signals.push("location_phrase");
    return { label: cleanLocation(direct[1]) };
  }
  if (/paket/.test(lower)) {
    signals.push("location_hint_package_shop");
    return { label: "Paketshop" };
  }
  if (/supermarkt|einkaufen|milch|brot|eier/.test(lower)) {
    signals.push("location_hint_store");
    return { label: "Supermarkt" };
  }
  return { label: "" };
}

function detectPeople(normalized, lower, kind, signals) {
  const people = [];
  const familyMatches = [...normalized.matchAll(/\b(Oma|Opa|Mama|Papa|Mutter|Vater|Bruder|Schwester)\b/gu)];
  familyMatches.forEach((familyMatch) => {
    if (people.some((person) => person.name === familyMatch[1])) return;
    people.push({
      name: familyMatch[1],
      role: kind === "birthday" ? "birthday_person" : "related_person",
    });
    signals.push("person_family");
  });

  const withMatch = normalized.match(/\bmit\s+([A-ZÄÖÜ][\p{L}-]{2,24})\b/u);
  if (withMatch && !people.some((person) => person.name === withMatch[1])) {
    people.push({ name: withMatch[1], role: "participant" });
    signals.push("person_with");
  }

  if (kind === "birthday" && people.length === 0) {
    const nameBeforeBirthday = normalized.match(/\b([A-ZÄÖÜ][\p{L}-]{2,24})\s+hat\b.*\bGeburtstag\b/u);
    if (nameBeforeBirthday) {
      people.push({ name: nameBeforeBirthday[1], role: "birthday_person" });
      signals.push("person_birthday_pattern");
    }
  }

  return people;
}

function detectShoppingItems(normalized, kind) {
  if (kind !== "shopping" && kind !== "food" && kind !== "errand") return [];
  if (/\bpizza\b.*\bbestellen\b/i.test(normalized)) return ["Pizza bestellen"];
  const knownFoods = ["milch", "brot", "eier", "butter", "käse", "kaese", "wasser", "kaffee", "nudeln", "reis", "obst", "gemüse", "gemuese"];
  const lower = normalized.toLowerCase();
  const directFoods = knownFoods.filter((food) => new RegExp(`\\b${food}\\b`, "i").test(lower));
  if (directFoods.length >= 2) return directFoods.map(sentenceCase);
  const clean = normalized
    .replace(/\b(heute|morgen|übermorgen|uebermorgen|nach der schule|einkaufen|kaufen|besorgen|verschicken|versenden)\b/gi, "")
    .replace(/\b(bestellen|abend|mittag|frühstück|fruehstueck)\b/gi, "")
    .replace(/\b(und wenn möglich gleich noch|wenn möglich|gleich noch)\b/gi, ",")
    .trim();
  const items = clean
    .split(/,|\bund\b/gi)
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !/\bpaket\b/i.test(item))
    .map(sentenceCase)
    .slice(0, 6);
  return items;
}

function detectReminderOffset(lower, kind, signals) {
  if (/zwei wochen vorher|2 wochen vorher/.test(lower)) {
    signals.push("reminder_two_weeks");
    return 20160;
  }
  if (/einen tag vorher|1 tag vorher|morgen erinnern/.test(lower)) {
    signals.push("reminder_one_day");
    return 1440;
  }
  if (/stunde vorher/.test(lower)) {
    signals.push("reminder_one_hour");
    return 60;
  }
  if (/minuten vorher/.test(lower)) {
    signals.push("reminder_minutes");
    return 15;
  }
  return kind === "birthday" ? 20160 : 0;
}

function detectPriority(lower, temporal, kind, signals) {
  if (/(dringend|wichtig|sofort|heute noch|deadline|frist|prüfung|pruefung|klausur|zahlen|miete)/i.test(lower)) {
    signals.push("priority_high");
    return "high";
  }
  if (temporal.date && startOfDay(temporal.date) <= addDays(startOfDay(new Date()), 1)) {
    signals.push("priority_medium_due_soon");
    return "medium";
  }
  if (kind === "idea" || kind === "note") return "low";
  return "medium";
}

function buildTitle(normalized, kind, temporal, location, shoppingItems, people) {
  if (kind === "birthday" && people[0]) return `Geschenk für ${people[0].name} planen`;
  if ((kind === "shopping" || kind === "food") && /\bpizza\b.*\bbestellen\b/i.test(normalized)) return "Pizza bestellen";
  if (kind === "shopping" && shoppingItems.length) return `${shoppingItems.join(", ")} einkaufen`;
  if (kind === "event" && people.length && /(treffen|essen|besuchen)/i.test(normalized)) {
    return sentenceCase(
      normalized
        .replace(/\b(heute|morgen|übermorgen|uebermorgen|um|uhr)\b/gi, "")
        .replace(/\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\b/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  if ((kind === "task" || kind === "personal" || kind === "family") && /\bmama\b/i.test(normalized) && /\bauto\b/i.test(normalized)) {
    return "Mama wegen Auto anrufen";
  }
  if (kind === "idea") {
    return sentenceCase(normalized.replace(/\bidee\s+(für|fuer)\s+/i, "Idee: ").trim());
  }

  let title = normalized
    .replace(/\b(ich muss|ich sollte|vielleicht sollte ich|vielleicht|sollte ich|ich will|ich möchte|ich moechte)\b/gi, "")
    .replace(/\b(heute|morgen|übermorgen|uebermorgen|nächsten|naechsten|kommenden|diesen|abend|nächste woche|naechste woche)\b/gi, "")
    .replace(/\bjede[nrs]?\b/gi, "")
    .replace(/\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, "")
    .replace(/\bbis\b/gi, "")
    .replace(/\b(?:um\s*)?([01]?\d|2[0-3])(?:(?:[:.]|\s)\s?[0-5]\d)?\s*(uhr|h)?\b/gi, "")
    .replace(/\bam\s+\d{1,2}\.\s*[\p{L}\d.]+/giu, "")
    .replace(/\bnach der schule\b/gi, "")
    .replace(/\b(erinner mich|bitte|mal|noch|dran|daran)\b/gi, "")
    .replace(/\b(um|am|gegen|ab)\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (location.label && title.toLowerCase().endsWith(location.label.toLowerCase())) {
    title = title.slice(0, -location.label.length).trim();
  }

  if (!title) title = kindLabels[kind];
  return sentenceCase(polishTitle(title, kind));
}

function buildNotes(rawText, shoppingItems, people) {
  const lines = [`Original: ${rawText}`];
  if (shoppingItems.length) lines.push(`Objekte: ${shoppingItems.join(", ")}`);
  if (people.length) lines.push(`Personen: ${people.map((person) => person.name).join(", ")}`);
  return lines.join("\n");
}

function polishTitle(title, kind) {
  let clean = title
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\b(gehen|tun|machen)\b$/i, "")
    .replace(/\bmal\b/gi, "")
    .replace(/\btermin\b\s*/i, "")
    .trim();
  if (/\beinkaufen\b/i.test(clean) && clean.split(/\s+/).length <= 3) clean = "Einkaufen";
  if (/\bgassi\b/i.test(clean) && /\bhund\b/i.test(clean) && !/^mit\b/i.test(clean)) clean = `Mit ${clean}`;
  if (kind === "event") {
    clean = clean.replace(/\btreffen mit\b/i, "Treffen mit");
  }
  if (kind === "task" && !/\b(anrufen|zahlen|kaufen|erledigen|vorbereiten|lernen)\b/i.test(clean)) {
    clean = `${clean} erledigen`;
  }
  return clean || kindLabels[normalizeKind(kind)] || "Neuer Eintrag";
}

function calculateConfidence({ kind, temporal, location, people, signals, missing, rawText }) {
  let score = 0.42;
  if (kind !== "note") score += 0.12;
  if (temporal.date) score += 0.14;
  if (temporal.time) score += 0.08;
  if (location.label) score += 0.07;
  if (people.length) score += 0.05;
  score += Math.min(signals.length, 7) * 0.025;
  score -= missing.length * 0.08;
  if (rawText.length < 8) score -= 0.18;
  return Math.max(0.08, Math.min(0.98, Number(score.toFixed(2))));
}

function getConfirmationHint(draft) {
  if (draft.missingFields?.includes("date")) return "Datum prüfen";
  if (draft.missingFields?.includes("time")) return "Uhrzeit prüfen";
  if (draft.parseConfidence < 0.65 || draft.confidence < 0.65) return "Zuordnung prüfen";
  return "Kurz prüfen";
}

function renderReview(draft) {
  const fragment = els.reviewTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".review-content");
  const reviewTitle = fragment.querySelector("#reviewTitle");
  const reviewKind = fragment.querySelector("#reviewKind");
  const reviewIcon = fragment.querySelector("#reviewIcon");
  const editFields = fragment.querySelector("#editFields");
  const kindInput = fragment.querySelector("#kindInput");
  const titleInput = fragment.querySelector("#titleInput");
  const dateInput = fragment.querySelector("#dateInput");
  const timeInput = fragment.querySelector("#timeInput");
  const placeInput = fragment.querySelector("#placeInput");
  const reminderInput = fragment.querySelector("#reminderInput");
  const notesInput = fragment.querySelector("#notesInput");
  const reviewChips = fragment.querySelector("#reviewChips");
  const category = getCategory(draft.kind);

  state.customCategories.forEach((customCategory) => {
    const option = document.createElement("option");
    option.value = customCategory.kind;
    option.textContent = customCategory.label;
    kindInput.append(option);
  });
  reviewTitle.textContent = draft.title;
  reviewKind.textContent = `${getKindLabel(draft.kind)} erkannt`;
  reviewIcon.innerHTML = iconSvg(category.icon);

  kindInput.value = draft.kind;
  titleInput.value = draft.title;
  dateInput.value = draft.dueStart ? draft.dueStart.slice(0, 10) : "";
  timeInput.value = draft.dueStart && !draft.allDay ? draft.dueStart.slice(11, 16) : "";
  placeInput.value = draft.placeLabel || "";
  reminderInput.value = String(draft.reminderOffset || 0);
  notesInput.value = draft.notes || "";

  const chips = [
    draft.reviewRequired ? [getConfirmationHint(draft), "warn"] : ["Direkt speicherbar", "ok"],
    ...ensureItemTags(draft).map((tag) => [getKindLabel(tag), "ok"]),
    ...(draft.missingFields || []).map((field) => [`Fehlt: ${field}`, "warn"]),
    ...(draft.suggestedActions || []).map((action) => [`Aktion: ${action}`, "ok"]),
    ...(draft.reminderOffset ? [[formatReminderOffset(draft.reminderOffset), "ok"]] : []),
    ...(draft.recurrenceRule ? [[formatRecurrenceLabel(draft.recurrenceRule), "ok"]] : []),
  ];
  reviewChips.replaceChildren(...chips.map(([label, variant]) => chip(label, variant)));

  const ahaPanel = document.createElement("div");
  ahaPanel.className = "aha-panel";
  ahaPanel.innerHTML = `
    <p class="eyebrow">Das habe ich verstanden</p>
    <h4>${escapeHtml(buildAhaHeadline(draft))}</h4>
    <p>${escapeHtml(buildAhaText(draft))}</p>
  `;
  root.insertBefore(ahaPanel, editFields);

  fragment.querySelector("#editReviewButton").addEventListener("click", () => {
    editFields.hidden = !editFields.hidden;
  });

  fragment.querySelector("#saveReviewButton").addEventListener("click", () => {
    const wasEmptyGuest = !state.loggedIn && activeItems().length === 0;
    const dueStart = dateInput.value ? `${dateInput.value}T${timeInput.value || "09:00"}:00` : null;
    const item = {
      ...draft,
      kind: kindInput.value,
      tags: ensureItemTags({ ...draft, kind: kindInput.value }),
      boxKind: normalizeKind(kindInput.value),
      boxLabel: getKindLabel(kindInput.value),
      title: titleInput.value.trim() || draft.title,
      dueStart,
      agendaDate: dueStart || draft.agendaDate || toLocalIso(new Date()),
      allDay: Boolean(dateInput.value && !timeInput.value),
      placeLabel: placeInput.value.trim(),
      reminderOffset: state.remindersEnabled ? Number(reminderInput.value) : 0,
      notes: notesInput.value.trim(),
      reviewRequired: false,
      updatedAt: new Date().toISOString(),
    };
    const exists = state.items.some((candidate) => candidate.id === item.id);
    state.items = exists
      ? state.items.map((candidate) => (candidate.id === item.id ? item : candidate))
      : [item, ...state.items];
    saveItems();
    state.currentDraft = null;
    els.captureInput.value = "";
    showToast("Gespeichert");
    renderReviewEmpty(
      wasEmptyGuest ? "Erster Eintrag gespeichert." : "Gespeichert.",
      wasEmptyGuest
        ? "Your Voice hat deine erste Eingabe lokal gesichert. Du kannst jetzt einfach weitermachen und Backup oder Sync später ergänzen."
        : state.loggedIn
          ? "Der Eintrag liegt jetzt in deiner Inbox und kann synchronisiert werden."
          : "Der Eintrag liegt jetzt lokal in deiner Inbox. Backup und Sync kannst du später ergänzen.",
    );
    renderAll();
    if (Number(item.reminderOffset || 0) > 0 && state.remindersEnabled) void ensureReminderPermission();
    if (state.syncEnabled && state.cloudUser) void syncCloud("save");
    setView(item.dueStart && isTodayOrOverdue(item.dueStart) ? "agenda" : "inbox");
  });

  fragment.querySelector("#resetReviewButton").addEventListener("click", () => {
    state.currentDraft = null;
    renderReviewEmpty("Verworfen.", "Sprich oder schreibe einfach den nächsten Gedanken.");
  });

  els.reviewPanel.replaceChildren(root);
}

function buildAhaHeadline(draft) {
  const pieces = [];
  pieces.push(getKindLabel(draft.kind));
  if (draft.dueStart) pieces.push(formatDueBadge(draft));
  if (draft.placeLabel) pieces.push(draft.placeLabel);
  return pieces.join(" · ");
}

function buildAhaText(draft) {
  const bits = [];
  if (Array.isArray(draft.people) && draft.people.length) {
    bits.push(`Personen: ${draft.people.map((person) => person.name).join(", ")}`);
  }
  if (Array.isArray(draft.shoppingItems) && draft.shoppingItems.length) {
    bits.push(`Liste: ${draft.shoppingItems.join(", ")}`);
  }
  if (draft.recurrenceRule) bits.push(formatRecurrenceLabel(draft.recurrenceRule));
  if (draft.reminderOffset) bits.push(`Erinnerung ${formatReminderOffset(draft.reminderOffset).toLowerCase()}`);
  if (!bits.length) {
    return draft.reviewRequired
      ? "Du kannst den Vorschlag noch kurz prüfen und bei Bedarf anpassen."
      : "Die Eingabe ist direkt verständlich und kann so gespeichert werden.";
  }
  return bits.join(" · ");
}

function renderReviewEmpty(title = "Bereit.", text = "Deine nächste Eingabe erscheint hier ganz kurz zur Bestätigung.") {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  wrapper.innerHTML = `
    <p class="eyebrow">Review</p>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(text)}</p>
    <div class="empty-actions">
      <button class="ghost" type="button" data-empty-action="example">Beispiel laden</button>
    </div>
  `;
  wrapper.querySelector('[data-empty-action="example"]')?.addEventListener("click", () => {
    loadExampleNote();
  });
  els.reviewPanel.replaceChildren(wrapper);
}

function renderAll() {
  renderCategories();
  renderAgendaBoard();
  renderHomeFocus();
  renderRecent();
  renderInbox();
  renderSearch();
  queueReminderRefresh();
}

function renderInbox() {
  els.showDoneButton.classList.toggle("active", state.inboxArchiveView === "done");
  els.showDeletedButton.classList.toggle("active", state.inboxArchiveView === "deleted");
  if (state.inboxArchiveView === "done") {
    renderArchiveInbox(doneItems(), "Erledigt", "Noch nichts erledigt.");
    return;
  }
  if (state.inboxArchiveView === "deleted") {
    renderArchiveInbox(deletedItems(), "Gelöscht", "Keine gelöschten Einträge.");
    return;
  }
  renderGroupedInbox(activeItems());
}

function renderRecent() {
  const items = activeItems().slice(0, 3);
  renderList(els.recentList, items, "Noch nichts gespeichert.", "recent");
}

function renderHomeFocus() {
  const items = getHomeFocusItems();
  const summary = buildHomeFocusSummary(items);
  els.focusSummary.replaceChildren(summary);
  renderList(els.focusList, items.slice(0, 3), "Heute ist noch nichts akut. Du kannst entspannt neu erfassen.", "focus");
}

function getHomeFocusItems() {
  const now = new Date();
  const today = startOfDay(now);
  const nextWeek = addDays(today, 7);
  return activeItems()
    .filter((item) => {
      if (!item.dueStart) return false;
      const due = new Date(item.dueStart);
      return due <= nextWeek;
    })
    .sort((a, b) => compareFocusPriority(a, b, now));
}

function compareFocusPriority(a, b, now = new Date()) {
  const scoreA = getFocusPriorityScore(a, now);
  const scoreB = getFocusPriorityScore(b, now);
  if (scoreA !== scoreB) return scoreA - scoreB;
  const dueA = new Date(a.dueStart || a.agendaDate || a.createdAt);
  const dueB = new Date(b.dueStart || b.agendaDate || b.createdAt);
  return dueA - dueB;
}

function getFocusPriorityScore(item, now = new Date()) {
  const dueState = getDueVisualState(item, now);
  const priority = getItemPriority(item);
  const stateScore = { overdue: 0, today: 1, tomorrow: 2, "": 3 }[dueState] ?? 3;
  const priorityScore = { high: 0, medium: 1, low: 2 }[priority] ?? 1;
  return stateScore * 10 + priorityScore;
}

function buildHomeFocusSummary(items) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const overdue = items.filter((item) => getDueVisualState(item) === "overdue").length;
  const dueToday = items.filter((item) => item.dueStart && sameDay(new Date(item.dueStart), today)).length;
  const dueTomorrow = items.filter((item) => item.dueStart && sameDay(new Date(item.dueStart), tomorrow)).length;
  const next = items[0];
  const card = document.createElement("article");
  card.className = "summary-card home-focus-card";
  card.innerHTML = `
    <p class="eyebrow">Heute im Blick</p>
    <h3>${next ? escapeHtml(cleanDisplayText(next.title)) : "Gerade ist alles ruhig"}</h3>
    <p class="settings-note">${next ? `Nächster Fokus: ${escapeHtml(formatDueBadge(next))}` : "Deine nächsten fälligen Einträge erscheinen hier automatisch."}</p>
    <div class="summary-pills">
      ${overdue ? `<span class="setting-chip warn">${overdue} überfällig</span>` : `<span class="setting-chip muted">Nichts überfällig</span>`}
      <span class="setting-chip">${dueToday} heute</span>
      <span class="setting-chip muted">${dueTomorrow} morgen</span>
    </div>
  `;
  return card;
}

function activeItems() {
  return state.items.filter((item) => getLifecycleStatus(item) === "active");
}

function doneItems() {
  return state.items.filter((item) => getLifecycleStatus(item) === "done");
}

function deletedItems() {
  return state.items.filter((item) => getLifecycleStatus(item) === "deleted");
}

function getLifecycleStatus(item) {
  if (item.deletedAt || item.lifecycleStatus === "deleted" || item.status === "deleted") return "deleted";
  if (item.status === "done" || item.lifecycleStatus === "done") return "done";
  return "active";
}

function renderArchiveInbox(items, title, emptyText) {
  const section = document.createElement("details");
  section.className = `inbox-group archive-group ${items.length ? "" : "empty"}`;
  section.open = true;
  section.style.setProperty("--category-color", "#64748b");
  section.innerHTML = `
    <summary>
      <span class="drag-handle" aria-hidden="true"></span>
      <span class="group-icon" aria-hidden="true">${iconSvg(title === "Erledigt" ? "check" : "note")}</span>
      <strong>${escapeHtml(title)}</strong>
      <span></span>
      <span>${items.length}</span>
    </summary>
    <div class="group-items"></div>
  `;
  const list = section.querySelector(".group-items");
  if (items.length) list.replaceChildren(...sortInboxItems(items).map(renderItem));
  else {
    const empty = buildEmptyBox(emptyText, title === "Erledigt" ? [] : [{ label: "Zur Inbox", action: "inbox" }]);
    list.replaceChildren(empty);
  }
  els.inboxList.replaceChildren(section);
}

function renderAgendaItems() {
  const items = activeItems()
    .filter((item) => item.dueStart && isTodayOrOverdue(item.dueStart))
    .sort((a, b) => new Date(a.dueStart) - new Date(b.dueStart));
  return items;
}

function renderSearch() {
  renderSearchFilters();
  els.filterPanel.hidden = !state.searchFilterOpen;
  els.filterToggleButton.classList.toggle("active", state.searchFilterOpen || hasActiveSearchFilters());
  els.searchDateFilter.value = state.searchDateFilter;
  els.searchCustomDateInput.value = state.searchCustomDate;
  els.searchCustomDateInput.disabled = state.searchDateFilter !== "custom";
  els.searchPriorityFilter.value = state.searchPriorityFilter;
  const query = els.searchInput.value.trim().toLowerCase();
  const selectedFilters = [...state.searchFilters];
  if (!query && !selectedFilters.length && !hasActiveSearchFilters()) {
    renderList(els.searchList, [], "Suchbegriff oder Filter wählen.", "search-idle");
    return;
  }
  const items = activeItems()
    .filter((item) => !query || [item.title, item.notes, item.rawText, item.placeLabel, item.kind, item.boxLabel, ...ensureItemTags(item).map(getKindLabel)]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query)))
    .filter((item) => !selectedFilters.length || ensureItemTags(item).some((tag) => selectedFilters.includes(tag)))
    .filter(matchesDateFilter)
    .filter(matchesPriorityFilter);
  renderList(els.searchList, items, "Keine Treffer.", "search-empty");
}

function hasActiveSearchFilters() {
  return state.searchDateFilter !== "any" || state.searchPriorityFilter !== "any";
}

function matchesDateFilter(item) {
  if (state.searchDateFilter === "any") return true;
  const today = startOfDay(new Date());
  const itemDate = new Date(item.dueStart || item.agendaDate || item.createdAt);
  if (state.searchDateFilter === "today") return sameDay(itemDate, today);
  if (state.searchDateFilter === "tomorrow") return sameDay(itemDate, addDays(today, 1));
  if (state.searchDateFilter === "week") return startOfDay(itemDate) >= today && startOfDay(itemDate) < addDays(today, 7);
  if (state.searchDateFilter === "custom") return state.searchCustomDate ? sameDay(itemDate, new Date(`${state.searchCustomDate}T00:00:00`)) : true;
  return true;
}

function matchesPriorityFilter(item) {
  return state.searchPriorityFilter === "any" || getItemPriority(item) === state.searchPriorityFilter;
}

function renderSearchFilters() {
  const filters = getInboxGroups().flatMap((group) => group.kinds.map((kind) => ({ kind, label: group.label, color: group.color })));
  const unique = [...new Map(filters.map((filter) => [filter.kind, filter])).values()].slice(0, 14);
  els.searchFilterChips.replaceChildren(
    ...unique.map((filter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter-chip ${state.searchFilters.has(filter.kind) ? "active" : ""}`;
      button.style.setProperty("--filter-color", filter.color);
      button.textContent = filter.label;
      button.addEventListener("click", () => {
        if (state.searchFilters.has(filter.kind)) state.searchFilters.delete(filter.kind);
        else state.searchFilters.add(filter.kind);
        renderSearch();
      });
      return button;
    }),
  );
}

function renderList(container, items, emptyText = "Noch keine Einträge.", emptyVariant = "default") {
  if (!items.length) {
    const empty = buildContextualEmptyState(emptyText, emptyVariant);
    container.replaceChildren(empty);
    return;
  }

  container.replaceChildren(...items.map(renderItem));
}

function renderGroupedInbox(items) {
  const orderedCategories = getInboxGroups();
  const groups = orderedCategories
    .map((category) => ({
      category,
      items: sortInboxItems(items.filter((item) => ensureItemTags(item).some((tag) => category.kinds.includes(tag)))),
    }));

  const sections = groups.map((group, index) => {
    const section = document.createElement("details");
    section.className = `inbox-group ${group.items.length ? "" : "empty"}`;
    section.draggable = true;
    section.dataset.groupKind = group.category.kind;
    section.style.setProperty("--category-color", group.category.color);
    section.open = state.openInboxGroups.has(group.category.kind);
    const urgency = getUrgencyCounts(group.items);
    section.innerHTML = `
      <summary>
        <span class="drag-handle" aria-hidden="true">⋮⋮</span>
        <span class="group-icon" aria-hidden="true">${iconSvg(group.category.icon)}</span>
        <strong>${escapeHtml(group.category.label)}</strong>
        <span class="group-summary-chips">
          ${urgency.overdue ? `<span class="setting-chip warn">${urgency.overdue} überfällig</span>` : ""}
          ${urgency.today ? `<span class="setting-chip">${urgency.today} heute</span>` : ""}
          ${urgency.tomorrow ? `<span class="setting-chip muted">${urgency.tomorrow} morgen</span>` : ""}
        </span>
        <button class="ghost tiny-button delete-group" type="button" data-delete-group="${escapeHtml(group.category.kind)}">Löschen</button>
        <span>${group.items.length}</span>
      </summary>
      <div class="group-items"></div>
    `;
    section.querySelector("[data-delete-group]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteCustomCategory(group.category.kind);
    });
    section.addEventListener("toggle", () => {
      if (section.open) state.openInboxGroups.add(group.category.kind);
      else state.openInboxGroups.delete(group.category.kind);
    });
    section.addEventListener("dragstart", (event) => {
      if (event.target.closest(".item-card")) return;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `group:${group.category.kind}`);
      section.classList.add("dragging");
    });
    section.addEventListener("dragend", () => section.classList.remove("dragging"));
    section.addEventListener("dragover", (event) => {
      if (event.dataTransfer.types.includes("text/plain")) event.preventDefault();
    });
    section.addEventListener("drop", (event) => {
      const payload = event.dataTransfer.getData("text/plain");
      if (!payload.startsWith("group:")) return;
      event.preventDefault();
      moveInboxGroup(payload.replace("group:", ""), group.category.kind);
    });
    const groupItems = section.querySelector(".group-items");
    if (group.items.length) {
      groupItems.replaceChildren(...group.items.map(renderItem));
    } else {
      const empty = buildEmptyBox("Bereit für neue Einträge.", [
        { label: "Beispiel laden", action: "example" },
        { label: "Notiz erstellen", action: "capture" },
      ]);
      groupItems.replaceChildren(empty);
    }
    groupItems.addEventListener("dragover", (event) => {
      if (event.dataTransfer.types.includes("text/plain")) event.preventDefault();
    });
    groupItems.addEventListener("drop", (event) => {
      const payload = event.dataTransfer.getData("text/plain");
      if (!payload.startsWith("item:")) return;
      event.preventDefault();
      reorderItemInGroup(payload.replace("item:", ""), group, event.target.closest(".item-card")?.dataset.itemId || "");
    });
    return section;
  });

  els.inboxList.replaceChildren(...sections);
}

function getInboxGroups() {
  const mainGroups = [
    { kind: "task", label: "To-dos", icon: "check", color: "#5b5bd6", kinds: ["task", "reminder"] },
    { kind: "event", label: "Termine", icon: "calendar", color: "#28756b", kinds: ["event"] },
    { kind: "family", label: "Familie", icon: "people", color: "#b94e67", kinds: ["family"] },
    { kind: "school", label: "Schule", icon: "book", color: "#c94a45", kinds: ["school"] },
    { kind: "food", label: "Einkauf / Essen", icon: "food", color: "#b45f2a", kinds: ["shopping", "food"] },
    { kind: "finance", label: "Finanzen", icon: "wallet", color: "#3f7d4c", kinds: ["finance"] },
    { kind: "idea", label: "Ideen", icon: "bulb", color: "#8f5ac8", kinds: ["idea", "project"] },
    { kind: "personal", label: "Persönlich", icon: "heart", color: "#b94e67", kinds: ["personal", "note"] },
  ];
  const groups = [...mainGroups, ...state.customCategories.map((category) => ({ ...category, kinds: [category.kind] }))];
  const order = new Map(state.inboxGroupOrder.map((kind, index) => [kind, index]));
  return groups
    .filter((group) => !state.hiddenInboxGroups.includes(group.kind))
    .sort((a, b) => (order.get(a.kind) ?? 999) - (order.get(b.kind) ?? 999));
}

function renderCompletedSection() {
  const completedItems = sortInboxItems(doneItems());
  if (state.hideDone || !completedItems.length) return null;
  const section = document.createElement("details");
  section.className = "inbox-group completed-group";
  section.style.setProperty("--category-color", "#64748b");
  section.innerHTML = `
    <summary>
      <span class="drag-handle" aria-hidden="true"></span>
      <span class="group-icon" aria-hidden="true">${iconSvg("check")}</span>
      <strong>Erledigt</strong>
      <span></span>
      <span>${completedItems.length}</span>
    </summary>
    <div class="group-items"></div>
  `;
  section.querySelector(".group-items").replaceChildren(...completedItems.map(renderItem));
  return section;
}

function renderCalendar() {
  els.calendarViewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.calendarView === state.calendarView);
  });

  if (state.calendarView === "month") renderMonthCalendar();
  if (state.calendarView === "week") renderWeekCalendar();
  if (state.calendarView === "day") renderDayOnly();
  renderDayPanel();
  els.dayPanel.classList.toggle("open", state.dayPanelOpen);
}

function renderMonthCalendar() {
  const monthStart = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), 1);
  const monthEnd = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 0);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const start = addDays(monthStart, -startOffset);
  els.calendarTitle.textContent = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(monthStart);

  const cells = [];
  ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach((day) => {
    const head = document.createElement("div");
    head.className = "calendar-weekday";
    head.textContent = day;
    cells.push(head);
  });

  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i);
    cells.push(renderDayCell(date, date.getMonth() !== monthStart.getMonth(), date > monthEnd && i > 27));
  }
  els.calendarGrid.className = "calendar-grid month";
  els.calendarGrid.replaceChildren(...cells);
}

function renderWeekCalendar() {
  const start = addDays(startOfDay(state.selectedDate), -((state.selectedDate.getDay() + 6) % 7));
  const end = addDays(start, 6);
  els.calendarTitle.textContent = `${formatShortDate(start)} - ${formatShortDate(end)}`;
  const cells = [];
  for (let i = 0; i < 7; i += 1) {
    cells.push(renderDayCell(addDays(start, i), false, false, true));
  }
  els.calendarGrid.className = "calendar-grid week";
  els.calendarGrid.replaceChildren(...cells);
}

function renderDayOnly() {
  els.calendarTitle.textContent = formatLongDate(state.selectedDate);
  els.calendarGrid.className = "calendar-grid day";
  els.calendarGrid.replaceChildren(renderDayCell(state.selectedDate, false, false, true));
}

function renderDayCell(date, muted = false, outside = false, large = false) {
  const items = getItemsForDate(date);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `calendar-day ${items.length ? "has-items" : ""} ${muted ? "muted" : ""} ${outside ? "outside" : ""} ${large ? "large" : ""} ${sameDay(date, state.selectedDate) ? "selected" : ""}`;
  if (items[0]) button.style.setProperty("--day-color", getCategory(items[0].kind).color);
  button.innerHTML = `
    <span>${date.getDate()}</span>
    <div class="day-dots">${items.slice(0, 3).map((item) => `<i style="--dot:${getCategory(item.kind).color}"></i>`).join("")}</div>
    ${large && items[0] ? `<small>${escapeHtml(items[0].title)}</small>` : ""}
  `;
  button.addEventListener("click", () => {
    const wasSelected = sameDay(date, state.selectedDate);
    state.selectedDate = startOfDay(date);
    state.calendarDate = startOfDay(date);
    els.agendaDateInput.value = toDateInputValue(date);
    state.dayPanelOpen = wasSelected ? !state.dayPanelOpen : true;
    button.classList.add("zoom");
    renderCalendar();
  });
  return button;
}

function renderDayPanel() {
  if (!state.dayPanelOpen) {
    const compact = document.createElement("div");
    compact.className = "day-panel-content compact";
    compact.innerHTML = `
      <p class="eyebrow">Tagesdetails</p>
      <h3>Tag anklicken</h3>
      <p class="item-raw">Details erscheinen erst, wenn du ein Datum auswählst.</p>
      <div class="empty-actions">
        <button class="ghost" type="button" data-empty-action="capture">Notiz erstellen</button>
      </div>
    `;
    compact.querySelector('[data-empty-action="capture"]')?.addEventListener("click", () => {
      setView("capture");
      els.captureInput.focus();
    });
    els.dayPanel.replaceChildren(compact);
    return;
  }
  const items = getItemsForDate(state.selectedDate);
  const title = formatLongDate(state.selectedDate);
  const body = document.createElement("div");
  body.className = "day-panel-content";
  body.innerHTML = `
    <div class="day-panel-head">
      <div>
        <p class="eyebrow">Tagesansicht</p>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <button class="ghost tiny-button" type="button" data-close-day>Schließen</button>
    </div>
  `;
  const list = document.createElement("div");
  list.className = "item-list";
  if (items.length) {
    list.replaceChildren(...items.map(renderAgendaEntry));
  } else {
    const empty = buildContextualEmptyState("Keine Einträge für diesen Tag.", "agenda-day");
    list.append(empty);
  }
  body.append(list);
  els.dayPanel.replaceChildren(body);
  body.querySelector("[data-close-day]").addEventListener("click", () => {
    state.dayPanelOpen = false;
    renderCalendar();
  });
}

function renderAgendaEntry(item) {
  const card = document.createElement("article");
  card.className = "item-card agenda-entry";
  const category = getCategory(item.kind);
  card.style.setProperty("--category-color", category.color);
  const reminderLabel = getReminderDisplayLabel(item);
  const dueBadge = item.dueStart ? formatDueBadge(item) : "";
  card.innerHTML = `
    <div class="item-top">
      <div class="item-icon" aria-hidden="true">${iconSvg(category.icon)}</div>
      <div>
        <p class="item-title">${escapeHtml(cleanDisplayText(item.title))}</p>
        <div class="item-meta">
          <span class="kind">${escapeHtml(getKindLabel(item.kind))}</span>
          ${dueBadge ? `<span>${escapeHtml(dueBadge)}</span>` : ""}
          ${item.recurrenceRule ? "<span>wiederholt</span>" : ""}
          ${reminderLabel ? `<span>${escapeHtml(reminderLabel)}</span>` : ""}
        </div>
      </div>
      <div class="chips">
        <button class="ghost tiny-button" type="button" data-action="quick-edit">Ändern</button>
      </div>
    </div>
  `;
  card.append(renderQuickEditPanel(item));
  bindQuickEditTriggers(card, item);
  return card;
}

function renderItem(item) {
  const card = document.createElement("article");
  const dueState = getDueVisualState(item);
  card.className = `item-card ${item.status === "done" ? "done" : ""} ${item.pinned ? "pinned" : ""} ${dueState ? `due-${dueState}` : ""}`;
  card.draggable = true;
  card.dataset.itemId = item.id;
  const category = getCategory(item.kind);
  card.style.setProperty("--category-color", category.color);
  card.addEventListener("dragstart", (event) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `item:${item.id}`);
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));

  const meta = [
    getKindLabel(item.kind),
    item.dueStart ? formatDueBadge(item) : "",
    item.placeLabel ? item.placeLabel : "",
    getReminderDisplayLabel(item),
  ].filter(Boolean);
  const tags = ensureItemTags(item);
  const priority = getItemPriority(item);
  const isDeleted = Boolean(item.deletedAt);
  const shoppingList =
    normalizeKind(item.kind) === "shopping" && Array.isArray(item.shoppingItems) && item.shoppingItems.length
      ? `<ul class="shopping-list">${item.shoppingItems.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`
      : "";

	  card.innerHTML = `
	    <div class="item-top">
	      <div class="item-icon" aria-hidden="true">${iconSvg(category.icon)}</div>
	      <div>
        <p class="item-title">${escapeHtml(cleanDisplayText(item.title))}</p>
	        <div class="item-meta">
	          ${meta.map((part, index) => `<span class="${index === 0 ? "kind" : ""}">${escapeHtml(cleanDisplayText(part))}</span>`).join("")}
	        </div>
	      </div>
	      <div class="chips">
	        ${item.pinned ? `<span class="chip pin">Fixiert</span>` : ""}
	        ${priority === "high" ? `<span class="chip warn">Wichtig</span>` : ""}
          ${dueState === "overdue" ? `<span class="chip due urgent">Überfällig</span>` : ""}
          ${dueState === "today" ? `<span class="chip due">Heute</span>` : ""}
          ${dueState === "tomorrow" ? `<span class="chip due soft">Morgen</span>` : ""}
	      </div>
	    </div>
	    ${tags.length > 1 ? `<div class="tag-list item-tags">${tags.slice(1, 4).map((tag) => `<span class="setting-chip">${escapeHtml(getKindLabel(tag))}</span>`).join("")}</div>` : ""}
	    ${shoppingList}
	    <div class="item-actions">
	      ${
          isDeleted
            ? `<button class="ghost" type="button" data-action="restore">Wiederherstellen</button>`
            : `<button class="ghost" type="button" data-action="pin">${item.pinned ? "Lösen" : "Anpinnen"}</button>
               <button class="ghost icon-action" type="button" data-action="up" aria-label="Nach oben">↑</button>
               <button class="ghost icon-action" type="button" data-action="down" aria-label="Nach unten">↓</button>
               <button class="ghost" type="button" data-action="toggle">${item.status === "done" ? "Wieder öffnen" : "Erledigt"}</button>
               <button class="ghost" type="button" data-action="quick-edit">Schnell ändern</button>
               <button class="danger" type="button" data-action="delete">Löschen</button>`
        }
	    </div>
      ${
        !isDeleted && item.dueStart && state.remindersEnabled
          ? `<div class="item-reminders">
               <div class="item-reminder-presets">
                 <button class="ghost tiny-button ${item.reminderDisabled ? "active" : ""}" type="button" data-reminder-preset="off">Aus</button>
                 <button class="ghost tiny-button ${!item.reminderDisabled && Number(item.reminderOffset || 0) === 0 ? "active" : ""}" type="button" data-reminder-preset="0">Zur Zeit</button>
                 <button class="ghost tiny-button ${!item.reminderDisabled && Number(item.reminderOffset || 0) === 15 ? "active" : ""}" type="button" data-reminder-preset="15">15 Min</button>
                 <button class="ghost tiny-button ${!item.reminderDisabled && Number(item.reminderOffset || 0) === 60 ? "active" : ""}" type="button" data-reminder-preset="60">1 Std</button>
                 <button class="ghost tiny-button ${!item.reminderDisabled && Number(item.reminderOffset || 0) === 1440 ? "active" : ""}" type="button" data-reminder-preset="1440">1 Tag</button>
               </div>
               <button class="ghost tiny-button" type="button" data-snooze="10m">In 10 Min</button>
               <button class="ghost tiny-button" type="button" data-snooze="evening">Heute Abend</button>
               <button class="ghost tiny-button" type="button" data-snooze="morning">Morgen früh</button>
             </div>`
          : ""
      }
	  `;
  if (!isDeleted) card.append(renderQuickEditPanel(item));

  card.querySelector('[data-action="restore"]')?.addEventListener("click", () => {
    state.inboxArchiveView = "active";
    updateItem(item.id, { deletedAt: null, status: "open" });
  });

  card.querySelector('[data-action="pin"]')?.addEventListener("click", () => {
    updateItem(item.id, { pinned: !item.pinned, manualOrder: item.pinned ? item.manualOrder || Date.now() : Date.now() });
  });

  card.querySelector('[data-action="up"]')?.addEventListener("click", () => moveItemInInbox(item.id, -1));
  card.querySelector('[data-action="down"]')?.addEventListener("click", () => moveItemInInbox(item.id, 1));

  card.querySelector('[data-action="toggle"]')?.addEventListener("click", () => {
    updateItem(item.id, { status: item.status === "done" ? "open" : "done" });
  });

  card.querySelector('[data-action="delete"]')?.addEventListener("click", () => {
    markItemDeleted(item.id);
  });
  card.querySelectorAll("[data-snooze]").forEach((button) => {
    button.addEventListener("click", () => {
      void snoozeItem(item.id, button.dataset.snooze || "");
    });
  });
  card.querySelectorAll("[data-reminder-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      void setItemReminderPreset(item.id, button.dataset.reminderPreset || "");
    });
  });
  if (!isDeleted) bindQuickEditTriggers(card, item);

  return card;
}

function renderQuickEditPanel(item) {
  const panel = document.createElement("div");
  panel.className = "quick-edit-panel";
  panel.hidden = state.quickEditItemId !== item.id;
  const dateValue = item.dueStart ? item.dueStart.slice(0, 10) : "";
  const timeValue = item.dueStart && !item.allDay ? item.dueStart.slice(11, 16) : "";
  panel.innerHTML = `
    <div class="quick-edit-head">
      <p class="eyebrow">Schnellbearbeitung</p>
      <button class="ghost tiny-button" type="button" data-quick-action="close">Schließen</button>
    </div>
    <div class="quick-edit-grid">
      <label class="input-label" for="quick-title-${item.id}">Titel
        <input id="quick-title-${item.id}" type="text" value="${escapeHtml(cleanDisplayText(item.title))}" />
      </label>
      <label class="input-label" for="quick-date-${item.id}">Datum
        <input id="quick-date-${item.id}" type="date" value="${dateValue}" />
      </label>
      <label class="input-label" for="quick-time-${item.id}">Uhrzeit
        <input id="quick-time-${item.id}" type="time" value="${timeValue}" />
      </label>
    </div>
    <div class="quick-edit-actions">
      <button class="primary" type="button" data-quick-action="save">Speichern</button>
      <button class="ghost" type="button" data-quick-action="full">Mehr Felder</button>
    </div>
  `;
  return panel;
}

function bindQuickEditTriggers(card, item) {
  card.querySelector('[data-action="quick-edit"]')?.addEventListener("click", () => {
    state.quickEditItemId = state.quickEditItemId === item.id ? "" : item.id;
    renderAll();
  });
  card.querySelector('[data-quick-action="close"]')?.addEventListener("click", () => {
    state.quickEditItemId = "";
    renderAll();
  });
  card.querySelector('[data-quick-action="save"]')?.addEventListener("click", () => {
    saveQuickEdit(card, item);
  });
  card.querySelector('[data-quick-action="full"]')?.addEventListener("click", () => {
    state.quickEditItemId = "";
    state.currentDraft = item;
    renderReview(item);
    setView("capture");
  });
}

function saveQuickEdit(card, item) {
  const title = card.querySelector(`#quick-title-${item.id}`)?.value.trim() || cleanDisplayText(item.title);
  const dateValue = card.querySelector(`#quick-date-${item.id}`)?.value || "";
  const timeValue = card.querySelector(`#quick-time-${item.id}`)?.value || "";
  const dueStart = dateValue ? `${dateValue}T${timeValue || "09:00"}:00` : null;
  updateItem(item.id, {
    title: sentenceCase(title),
    normalizedShortNote: sentenceCase(title),
    dueStart,
    agendaDate: dueStart || item.agendaDate || toLocalIso(new Date()),
    allDay: Boolean(dateValue && !timeValue),
    snoozeUntil: null,
    reminderDisabled: dueStart ? item.reminderDisabled : true,
  });
  state.quickEditItemId = "";
  if (dueStart && !item.reminderDisabled && state.remindersEnabled) void ensureReminderPermission();
  showToast("Eintrag aktualisiert");
}

function updateItem(id, patch) {
  commitItems(state.items.map((item) =>
    item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString(), version: (item.version || 1) + 1 } : item,
  ), "update");
}

function markItemDeleted(id) {
  const deletedAt = new Date().toISOString();
  commitItems(
    state.items.map((item) =>
      item.id === id ? { ...item, status: "deleted", lifecycleStatus: "deleted", deletedAt, updatedAt: deletedAt, version: (item.version || 1) + 1 } : item,
    ),
    "delete",
  );
  showToast("Gelöscht");
}

function commitItems(nextItems, source = "update") {
  state.items = nextItems.map(canonicalizeItem);
  saveItems();
  renderAll();
  if (state.syncEnabled && state.cloudUser) void syncCloud(source);
}

function supportsNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

async function ensureReminderPermission() {
  if (!state.remindersEnabled || !supportsNotifications()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") {
    showToast("Benachrichtigungen sind im Browser blockiert");
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    showToast("Erinnerungen aktiviert");
    return true;
  }
  showToast("Erinnerungen bleiben in der App sichtbar");
  return false;
}

function queueReminderRefresh() {
  window.clearTimeout(reminderRefreshHandle);
  reminderRefreshHandle = window.setTimeout(refreshReminderSchedule, 80);
}

function clearReminderTimers() {
  reminderTimers.forEach((timer) => window.clearTimeout(timer));
  reminderTimers.clear();
}

function refreshReminderSchedule() {
  clearReminderTimers();
  if (!state.remindersEnabled) return;
  activeItems().forEach((item) => scheduleReminderForItem(item));
}

function scheduleReminderForItem(item) {
  if (!item.dueStart || item.reminderDisabled) return;
  const schedule = getNextReminderSchedule(item);
  if (!schedule) return;
  const occurrenceKey = schedule.occurrenceAt.toISOString();
  if (item.lastReminderOccurrence === occurrenceKey) return;
  const now = Date.now();
  const delay = Math.max(0, schedule.triggerAt.getTime() - now);
  const safeDelay = Math.min(delay, 2147483647);
  const timer = window.setTimeout(() => {
    void fireReminder(item.id, occurrenceKey);
  }, safeDelay);
  reminderTimers.set(item.id, timer);
}

function getNextReminderSchedule(item, now = new Date()) {
  if (item.reminderDisabled) return null;
  const occurrenceAt = getNextOccurrenceDateTime(item, now);
  if (!occurrenceAt) return null;
  const reminderOffset = Math.max(0, Number(item.reminderOffset || 0));
  let triggerAt = new Date(occurrenceAt.getTime() - reminderOffset * 60000);
  if (item.snoozeUntil) {
    const snoozeDate = new Date(item.snoozeUntil);
    if (!Number.isNaN(snoozeDate.getTime()) && snoozeDate > triggerAt) triggerAt = snoozeDate;
  }
  const tooOld = now.getTime() - triggerAt.getTime() > 3600000;
  if (triggerAt <= now && occurrenceAt >= addHours(now, -1) && !tooOld) {
    triggerAt = new Date(now.getTime() + 1500);
  }
  if (occurrenceAt < addHours(now, -1) || tooOld) return null;
  return { occurrenceAt, triggerAt };
}

function getNextOccurrenceDateTime(item, now = new Date()) {
  const base = new Date(item.dueStart || item.agendaDate || item.createdAt);
  if (Number.isNaN(base.getTime())) return null;
  if (base >= now) return base;
  if (!item.recurrenceRule) return base >= addHours(now, -1) ? base : null;
  const hours = base.getHours();
  const minutes = base.getMinutes();
  for (let offset = 0; offset <= 400; offset += 1) {
    const candidateDate = addDays(startOfDay(now), offset);
    if (!isItemOnDate(item, candidateDate)) continue;
    const candidate = new Date(candidateDate);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate >= now || candidate >= addHours(now, -1)) return candidate;
  }
  return null;
}

async function fireReminder(itemId, occurrenceKey) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item || getLifecycleStatus(item) !== "active") return;
  updateItem(itemId, {
    lastReminderOccurrence: occurrenceKey,
    lastReminderAt: new Date().toISOString(),
    snoozeUntil: null,
  });
  const title = cleanDisplayText(item.title);
  const body = item.dueStart ? `${formatDueBadge(item)} · ${getKindLabel(item.kind)}` : getKindLabel(item.kind);
  showToast(`Erinnerung: ${title}`);
  if (supportsNotifications() && Notification.permission === "granted") {
    try {
      const notification = new Notification(`Your Voice · ${title}`, { body, tag: `yourvoice-${item.id}` });
      notification.onclick = () => {
        window.focus();
        setView(item.dueStart ? "agenda" : "inbox");
      };
    } catch {
      // ignore browser notification errors and keep in-app reminder active
    }
  }
}

async function snoozeItem(id, preset) {
  const until = getSnoozeDate(preset);
  if (!until) return;
  updateItem(id, { snoozeUntil: until.toISOString() });
  if (state.remindersEnabled) await ensureReminderPermission();
  showToast(`Erinnerung verschoben bis ${formatSnoozeLabel(until)}`);
}

async function setItemReminderPreset(id, preset) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item || !item.dueStart) return;
  if (preset === "off") {
    updateItem(id, { reminderDisabled: true, snoozeUntil: null });
    showToast("Erinnerung deaktiviert");
    return;
  }
  const offset = Math.max(0, Number(preset || 0));
  updateItem(id, { reminderDisabled: false, reminderOffset: offset, snoozeUntil: null });
  if (state.remindersEnabled) await ensureReminderPermission();
  showToast(`Erinnerung ${formatReminderOffset(offset).toLowerCase()}`);
}

function getSnoozeDate(preset) {
  const now = new Date();
  if (preset === "10m") return new Date(now.getTime() + 10 * 60000);
  if (preset === "evening") {
    const evening = new Date(now);
    evening.setHours(19, 0, 0, 0);
    if (evening <= now) evening.setDate(evening.getDate() + 1);
    return evening;
  }
  if (preset === "morning") {
    const morning = addDays(startOfDay(now), 1);
    morning.setHours(8, 0, 0, 0);
    return morning;
  }
  return null;
}

function formatReminderOffset(minutes) {
  if (!minutes) return "Zur Zeit";
  if (minutes < 60) return `${minutes} Minuten vorher`;
  if (minutes === 60) return "1 Stunde vorher";
  if (minutes < 1440) return `${Math.round(minutes / 60)} Stunden vorher`;
  if (minutes === 1440) return "1 Tag vorher";
  if (minutes === 20160) return "2 Wochen vorher";
  return `${Math.round(minutes / 1440)} Tage vorher`;
}

function getReminderDisplayLabel(item) {
  if (item.reminderDisabled) return "Ohne Erinnerung";
  if (item.snoozeUntil) return `Schlummert bis ${formatSnoozeLabel(new Date(item.snoozeUntil))}`;
  if (!item.dueStart || !state.remindersEnabled) return "";
  return `Erinnerung ${formatReminderOffset(Number(item.reminderOffset || 0)).toLowerCase()}`;
}

function getDueVisualState(item, now = new Date()) {
  if (!item?.dueStart || getLifecycleStatus(item) !== "active") return "";
  const due = new Date(item.dueStart);
  if (Number.isNaN(due.getTime())) return "";
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  if (due < now && !sameDay(due, today)) return "overdue";
  if (sameDay(due, today)) return "today";
  if (sameDay(due, tomorrow)) return "tomorrow";
  return "";
}

function getUrgencyCounts(items) {
  return items.reduce(
    (summary, item) => {
      const state = getDueVisualState(item);
      if (state === "overdue") summary.overdue += 1;
      if (state === "today") summary.today += 1;
      if (state === "tomorrow") summary.tomorrow += 1;
      return summary;
    },
    { overdue: 0, today: 0, tomorrow: 0 },
  );
}

function formatDueBadge(item, now = new Date()) {
  if (!item?.dueStart) return "";
  const due = new Date(item.dueStart);
  if (Number.isNaN(due.getTime())) return "";
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const timeLabel = item.allDay
    ? ""
    : new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(due);
  const join = (prefix) => (timeLabel ? `${prefix} · ${timeLabel}` : prefix);

  if (due < now && !sameDay(due, today)) return join(`Überfällig seit ${formatShortDate(due)}`);
  if (sameDay(due, today)) return join("Heute");
  if (sameDay(due, tomorrow)) return join("Morgen");
  if (due < addDays(today, 7)) {
    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(due);
    return join(weekday.replace(".", ""));
  }
  return join(formatShortDate(due));
}

function formatSnoozeLabel(date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRecurrenceLabel(rule) {
  if (!rule) return "";
  if (rule.startsWith("FREQ=DAILY")) return "Wiederholt taeglich";
  if (rule.startsWith("FREQ=WEEKLY")) return "Wiederholt woechentlich";
  if (rule.startsWith("FREQ=MONTHLY")) return "Wiederholt monatlich";
  if (rule.startsWith("FREQ=YEARLY")) return "Wiederholt jaehrlich";
  return "Wiederholt";
}

function addHours(date, amount) {
  return new Date(date.getTime() + amount * 3600000);
}

function loadExampleNote() {
  els.captureInput.value = EXAMPLE_NOTE;
  setView("capture");
  els.captureInput.focus();
  renderReviewEmpty("Beispiel geladen.", "Du kannst die Eingabe direkt prüfen oder noch anpassen.");
  showToast("Beispiel geladen");
}

function applyQuickCapture(mode) {
  setView("capture");
  const presets = {
    task: {
      kind: "task",
      placeholder: "Zum Beispiel: Mama anrufen oder Rechnung zahlen",
      toast: "Schnellerfassung für Aufgaben aktiv",
    },
    event: {
      kind: "event",
      placeholder: "Zum Beispiel: Freitag 16 Uhr Training",
      toast: "Schnellerfassung für Termine aktiv",
    },
    shopping: {
      kind: "shopping",
      placeholder: "Zum Beispiel: Milch, Brot und Eier kaufen",
      toast: "Schnellerfassung für Einkauf aktiv",
    },
    idea: {
      kind: "idea",
      placeholder: "Zum Beispiel: Idee für neue Website",
      toast: "Schnellerfassung für Ideen aktiv",
    },
  };
  if (mode === "voice") {
    els.captureInput.focus();
    showToast("Sprachnotiz startet");
    window.setTimeout(() => toggleSpeech(), 120);
    return;
  }
  const preset = presets[mode];
  if (!preset) return;
  state.selectedKind = preset.kind;
  renderCategories();
  els.captureInput.placeholder = preset.placeholder;
  els.captureInput.focus();
  renderReviewEmpty("Schnellerfassung aktiv.", "Dein nächster Eintrag wird direkt in diesen Bereich eingeordnet, kann aber weiterhin intelligent erweitert werden.");
  showToast(preset.toast);
}

async function pasteFromClipboardToCapture() {
  if (!navigator.clipboard?.readText) {
    showToast("Zwischenablage wird in diesem Browser nicht unterstützt");
    return;
  }
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) {
      showToast("Zwischenablage ist leer");
      return;
    }
    els.captureInput.value = text;
    setView("capture");
    els.captureInput.focus();
    renderReviewEmpty("Zwischenablage übernommen.", "Du kannst den Text direkt aufteilen und einordnen.");
    showToast("Text eingefügt");
  } catch {
    showToast("Zwischenablage konnte nicht gelesen werden");
  }
}

function buildContextualEmptyState(text, variant = "default") {
  if (variant === "focus") {
    return buildEmptyBox(text, [
      { label: "Notiz erstellen", action: "capture" },
      { label: "Beispiel laden", action: "example" },
    ]);
  }
  if (variant === "recent") {
    return buildEmptyBox(text, [
      { label: "Beispiel laden", action: "example" },
      { label: "Notiz erstellen", action: "capture" },
    ]);
  }
  if (variant === "search-idle") {
    return buildEmptyBox(text, [
      { label: "Zur Inbox", action: "inbox" },
      { label: "Beispiel laden", action: "example" },
    ]);
  }
  if (variant === "search-empty") {
    return buildEmptyBox(text, [
      { label: "Filter löschen", action: "clear-search" },
      { label: "Zur Inbox", action: "inbox" },
    ]);
  }
  if (variant === "agenda-day") {
    return buildEmptyBox(text, [
      { label: "Termin erstellen", action: "agenda-create" },
      { label: "Beispiel laden", action: "example" },
    ]);
  }
  return buildEmptyBox(text, [{ label: "Beispiel laden", action: "example" }]);
}

function buildEmptyBox(text, actions = []) {
  const empty = document.createElement("article");
  empty.className = "item-card empty-card";
  empty.innerHTML = `
    <p class="item-raw">${escapeHtml(text)}</p>
    ${actions.length ? `<div class="empty-actions">${actions.map((entry) => `<button class="ghost" type="button" data-empty-action="${escapeHtml(entry.action)}">${escapeHtml(entry.label)}</button>`).join("")}</div>` : ""}
  `;
  empty.querySelectorAll("[data-empty-action]").forEach((button) => {
    button.addEventListener("click", () => runEmptyStateAction(button.dataset.emptyAction || ""));
  });
  return empty;
}

function runEmptyStateAction(action) {
  if (action === "example") {
    loadExampleNote();
    return;
  }
  if (action === "capture") {
    setView("capture");
    els.captureInput.focus();
    return;
  }
  if (action === "inbox") {
    setView("inbox");
    return;
  }
  if (action === "agenda-create") {
    setView("agenda");
    els.agendaTitleInput.focus();
    return;
  }
  if (action === "clear-search") {
    els.searchInput.value = "";
    state.searchFilters.clear();
    state.searchDateFilter = "any";
    state.searchCustomDate = "";
    state.searchPriorityFilter = "any";
    renderSearch();
  }
}

function sortInboxItems(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    const manualA = Number.isFinite(Number(a.manualOrder)) ? Number(a.manualOrder) : Number.MAX_SAFE_INTEGER;
    const manualB = Number.isFinite(Number(b.manualOrder)) ? Number(b.manualOrder) : Number.MAX_SAFE_INTEGER;
    if (manualA !== manualB) return manualA - manualB;
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });
}

function moveItemInInbox(id, direction) {
  const visible = sortInboxItems(activeItems());
  const index = visible.findIndex((item) => item.id === id);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= visible.length) {
    showToast("Keine weitere Position");
    return;
  }
  const reordered = [...visible];
  const [current] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, current);
  const orderMap = new Map(reordered.map((item, position) => [item.id, position + 1]));
  state.items = state.items.map((item) =>
    orderMap.has(item.id)
      ? { ...item, manualOrder: orderMap.get(item.id), updatedAt: new Date().toISOString(), version: (item.version || 1) + 1 }
      : item,
  );
  saveItems();
  renderAll();
  showToast(direction < 0 ? "Nach oben verschoben" : "Nach unten verschoben");
  if (state.syncEnabled && state.cloudUser) void syncCloud("order");
}

function moveInboxGroup(sourceKind, targetKind) {
  if (!sourceKind || !targetKind || sourceKind === targetKind) return;
  const current = getInboxGroups().map((group) => group.kind);
  const from = current.indexOf(sourceKind);
  const to = current.indexOf(targetKind);
  if (from < 0 || to < 0) return;
  const next = [...current];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  state.inboxGroupOrder = next;
  saveSettings();
  renderInbox();
  showToast("Bereich verschoben");
  if (state.syncEnabled && state.cloudUser) void syncCloud("group-order");
}

function reorderItemInGroup(sourceId, group, targetId = "") {
  if (!sourceId || sourceId === targetId) return;
  const groupItems = sortInboxItems(
    activeItems().filter((item) => ensureItemTags(item).some((tag) => group.category.kinds.includes(tag))),
  );
  const sourceIndex = groupItems.findIndex((item) => item.id === sourceId);
  if (sourceIndex < 0) return;
  const targetIndex = targetId ? groupItems.findIndex((item) => item.id === targetId) : groupItems.length - 1;
  const next = [...groupItems];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(Math.max(0, targetIndex), 0, moved);
  const orderMap = new Map(next.map((item, index) => [item.id, index + 1]));
  state.items = state.items.map((item) =>
    orderMap.has(item.id)
      ? { ...item, manualOrder: orderMap.get(item.id), updatedAt: new Date().toISOString(), version: (item.version || 1) + 1 }
      : item,
  );
  state.openInboxGroups.add(group.category.kind);
  saveItems();
  renderAll();
  showToast("Eintrag verschoben");
  if (state.syncEnabled && state.cloudUser) void syncCloud("item-order");
}

function loadItems() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    return JSON.parse(current || legacy || "[]").map(canonicalizeItem);
  } catch {
    return [];
  }
}

function saveItems() {
  const items = state.items
    .map((item) => canonicalizeItem({ ...item, manualOrder: item.manualOrder || new Date(item.createdAt || Date.now()).getTime() }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  queuePersistentWrite(INDEXED_ITEMS_KEY, items);
  saveSettings();
}

function canonicalizeItem(item) {
  const tags = ensureItemTags(item);
  const lifecycleStatus = item.deletedAt || item.status === "deleted" ? "deleted" : item.status === "done" ? "done" : "active";
  const kind = normalizeKind(item.kind);
  const normalizedShortNote = cleanDisplayText(item.normalizedShortNote || item.title || item.rawText || "Neuer Eintrag");
  return {
    ...item,
    kind,
    itemType: item.itemType || inferItemType(kind, tags, { date: item.dueStart || item.agendaDate, time: item.dueStart && !item.allDay }, item.shoppingItems || []),
    tags,
    categories: Array.isArray(item.categories) && item.categories.length ? [...new Set(item.categories.map(normalizeKind))] : tags,
    categoryScores: Array.isArray(item.categoryScores) && item.categoryScores.length ? item.categoryScores : buildCategoryScores(tags, kind, item.ruleHits || [], Number(item.confidence || 0.66)),
    sourceTranscript: item.sourceTranscript || item.rawText || "",
    normalizedShortNote,
    title: cleanDisplayText(item.title || normalizedShortNote),
    status: lifecycleStatus === "deleted" ? "deleted" : lifecycleStatus === "done" ? "done" : "open",
    lifecycleStatus,
    parseConfidence: Number(item.parseConfidence || item.confidence || 0.5),
    timeConfidence: Number(item.timeConfidence || (item.dueStart ? 0.9 : 0.4)),
  };
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSettings() {
  const settings = snapshotSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  queuePersistentWrite(INDEXED_SETTINGS_KEY, settings);
}

function snapshotSettings() {
  return {
    theme: state.theme,
    accountEmail: state.accountEmail,
    loggedIn: state.loggedIn,
    syncEnabled: state.syncEnabled,
    colorScheme: state.colorScheme,
    styleMode: state.styleMode,
    fontSize: state.fontSize,
    compactLayout: state.compactLayout,
    speechLang: state.speechLang,
    micQuality: state.micQuality,
    autoDetect: state.autoDetect,
    recognitionLevel: state.recognitionLevel,
    defaultCategory: state.defaultCategory,
    customCategories: state.customCategories,
    remindersEnabled: state.remindersEnabled,
    dailySummary: state.dailySummary,
    focusMode: state.focusMode,
    privacyMode: state.privacyMode,
    supabaseUrl: state.supabaseUrl,
    supabaseAnonKey: state.supabaseAnonKey,
    authStatusMessage: state.authStatusMessage,
    lastSyncAt: state.lastSyncAt,
    lastBackupAt: state.lastBackupAt,
    lastImportedAt: state.lastImportedAt,
    installDismissedAt: state.installDismissedAt,
    guestModeHintDismissed: state.guestModeHintDismissed,
    hideDone: state.hideDone,
    inboxGroupOrder: state.inboxGroupOrder,
    hiddenInboxGroups: state.hiddenInboxGroups,
    updatedAt: new Date().toISOString(),
  };
}

function exportData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    storage: {
      backend: state.storageBackend,
      persisted: state.storagePersisted,
    },
    items: state.items.map(canonicalizeItem),
    settings: snapshotSettings(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `your-voice-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  state.lastBackupAt = payload.exportedAt;
  state.storageWarning = "";
  saveSettings();
  applySettings();
  showToast("Backup exportiert");
}

async function importDataFromFile(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const nextItems = Array.isArray(parsed?.items) ? parsed.items.map(canonicalizeItem) : null;
    if (!nextItems) {
      showToast("Import-Datei ungueltig");
      return;
    }
    state.items = nextItems;
    if (parsed.settings && typeof parsed.settings === "object") {
      applyHydratedSettings(parsed.settings);
    }
    state.lastImportedAt = new Date().toISOString();
    state.storageWarning = "";
    saveItems();
    saveSettings();
    renderAll();
    applySettings();
    showToast(`Importiert: ${nextItems.length} Eintraege`);
    if (state.syncEnabled && state.cloudUser) void syncCloud("import");
  } catch {
    showToast("Import fehlgeschlagen");
  }
}

function exportCalendarIcs() {
  const exportItems = activeItems().filter((item) => item.dueStart || item.recurrenceRule);
  if (!exportItems.length) {
    showToast("Keine Termine fuer .ics vorhanden");
    return;
  }
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Your Voice//Organizer//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...exportItems.flatMap(buildIcsEntries),
    "END:VCALENDAR",
  ];
  downloadTextFile(
    `${foldIcsLines(lines).join("\r\n")}\r\n`,
    `your-voice-calendar-${new Date().toISOString().slice(0, 10)}.ics`,
    "text/calendar;charset=utf-8",
  );
  showToast(`${exportItems.length} Kalendereintraege exportiert`);
}

function buildIcsEntries(item) {
  const kind = normalizeKind(item.kind);
  const isEvent = kind === "event" || item.kind === "birthday";
  return isEvent ? buildEventIcs(item) : buildTodoIcs(item);
}

function buildEventIcs(item) {
  const start = new Date(item.dueStart || item.agendaDate || item.createdAt);
  const end = item.allDay ? addDays(startOfDay(start), 1) : new Date(start.getTime() + 60 * 60000);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(item.id)}@yourvoice.app`,
    `DTSTAMP:${formatUtcIcsDate(new Date(item.updatedAt || item.createdAt || Date.now()))}`,
    item.allDay
      ? `DTSTART;VALUE=DATE:${formatIcsDate(start)}`
      : `DTSTART:${formatUtcIcsDate(start)}`,
    item.allDay
      ? `DTEND;VALUE=DATE:${formatIcsDate(end)}`
      : `DTEND:${formatUtcIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(cleanDisplayText(item.title || "Termin"))}`,
    `DESCRIPTION:${escapeIcsText(buildIcsDescription(item))}`,
  ];
  if (item.placeLabel) lines.push(`LOCATION:${escapeIcsText(item.placeLabel)}`);
  if (item.recurrenceRule) lines.push(`RRULE:${item.recurrenceRule}`);
  if (!item.reminderDisabled && Number(item.reminderOffset || 0) >= 0) lines.push(...buildAlarmIcs(item.reminderOffset, item.title));
  lines.push("END:VEVENT");
  return lines;
}

function buildTodoIcs(item) {
  const due = item.dueStart ? new Date(item.dueStart) : null;
  const lines = [
    "BEGIN:VTODO",
    `UID:${escapeIcsText(item.id)}@yourvoice.app`,
    `DTSTAMP:${formatUtcIcsDate(new Date(item.updatedAt || item.createdAt || Date.now()))}`,
    `SUMMARY:${escapeIcsText(cleanDisplayText(item.title || "Aufgabe"))}`,
    `DESCRIPTION:${escapeIcsText(buildIcsDescription(item))}`,
    `STATUS:${item.status === "done" ? "COMPLETED" : "NEEDS-ACTION"}`,
  ];
  if (due) {
    lines.push(
      item.allDay
        ? `DUE;VALUE=DATE:${formatIcsDate(due)}`
        : `DUE:${formatUtcIcsDate(due)}`,
    );
  }
  if (item.recurrenceRule) lines.push(`RRULE:${item.recurrenceRule}`);
  lines.push("END:VTODO");
  return lines;
}

function buildAlarmIcs(reminderOffset, title) {
  const minutes = Math.max(0, Number(reminderOffset || 0));
  const trigger = formatDurationTrigger(minutes);
  return [
    "BEGIN:VALARM",
    `TRIGGER:-${trigger}`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(`Erinnerung: ${cleanDisplayText(title || "Eintrag")}`)}`,
    "END:VALARM",
  ];
}

function formatDurationTrigger(minutes) {
  if (minutes % 1440 === 0) return `P${minutes / 1440}D`;
  if (minutes % 60 === 0) return `PT${minutes / 60}H`;
  return `PT${minutes}M`;
}

function buildIcsDescription(item) {
  const parts = [
    item.notes ? cleanDisplayText(item.notes).replace(/\n+/g, " | ") : "",
    item.placeLabel ? `Ort: ${item.placeLabel}` : "",
    item.kind ? `Typ: ${getKindLabel(item.kind)}` : "",
  ].filter(Boolean);
  return parts.join(" | ") || "Exportiert aus Your Voice";
}

function formatIcsDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatUtcIcsDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeIcsText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLines(lines) {
  return lines.flatMap((line) => {
    const value = String(line);
    if (value.length <= 74) return [value];
    const parts = [];
    for (let index = 0; index < value.length; index += 74) {
      const segment = value.slice(index, index + 74);
      parts.push(index === 0 ? segment : ` ${segment}`);
    }
    return parts;
  });
}

function downloadTextFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function applyHydratedSettings(settings) {
  const fields = [
    "theme",
    "accountEmail",
    "loggedIn",
    "syncEnabled",
    "colorScheme",
    "styleMode",
    "fontSize",
    "compactLayout",
    "speechLang",
    "micQuality",
    "autoDetect",
    "recognitionLevel",
    "defaultCategory",
    "customCategories",
    "remindersEnabled",
    "dailySummary",
    "focusMode",
    "privacyMode",
    "authStatusMessage",
    "lastSyncAt",
    "lastBackupAt",
    "lastImportedAt",
    "installDismissedAt",
    "guestModeHintDismissed",
    "hideDone",
    "inboxGroupOrder",
    "hiddenInboxGroups",
  ];
  fields.forEach((field) => {
    if (settings[field] !== undefined) state[field] = settings[field];
  });
  if (!cloudConfigLocked) {
    if (settings.supabaseUrl !== undefined) state.supabaseUrl = settings.supabaseUrl;
    if (settings.supabaseAnonKey !== undefined) state.supabaseAnonKey = settings.supabaseAnonKey;
  }
}

function supportsIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openIndexedDatabase() {
  if (!supportsIndexedDb()) return Promise.reject(new Error("indexeddb_unavailable"));
  if (indexedDbPromise) return indexedDbPromise;
  indexedDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(INDEXED_DB_STORE)) {
        database.createObjectStore(INDEXED_DB_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexeddb_open_failed"));
  });
  return indexedDbPromise;
}

async function readIndexedRecord(key) {
  const database = await openIndexedDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INDEXED_DB_STORE, "readonly");
    const store = transaction.objectStore(INDEXED_DB_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error || new Error("indexeddb_read_failed"));
  });
}

async function writeIndexedRecord(key, value) {
  const database = await openIndexedDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INDEXED_DB_STORE, "readwrite");
    const store = transaction.objectStore(INDEXED_DB_STORE);
    const request = store.put({ key, value, updatedAt: new Date().toISOString() });
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error || new Error("indexeddb_write_failed"));
  });
}

function queuePersistentWrite(key, value) {
  persistenceQueue = persistenceQueue
    .then(async () => {
      if (!supportsIndexedDb()) return;
      await writeIndexedRecord(key, value);
      state.storageReady = true;
      state.storageBackend = "indexeddb";
    })
    .catch(() => {
      state.storageBackend = "localstorage";
      state.storageWarning = "IndexedDB konnte nicht beschrieben werden.";
    });
  return persistenceQueue;
}

async function requestPersistentStorage() {
  if (!navigator.storage?.persisted) return false;
  try {
    const alreadyPersisted = await navigator.storage.persisted();
    if (alreadyPersisted) return true;
    if (!navigator.storage.persist) return false;
    return Boolean(await navigator.storage.persist());
  } catch {
    return false;
  }
}

async function hydratePersistentState() {
  if (!supportsIndexedDb()) {
    state.storageBackend = "localstorage";
    state.storageWarning = "IndexedDB wird in diesem Browser nicht unterstuetzt.";
    return;
  }
  try {
    const [storedItems, storedSettings, persisted] = await Promise.all([
      readIndexedRecord(INDEXED_ITEMS_KEY),
      readIndexedRecord(INDEXED_SETTINGS_KEY),
      requestPersistentStorage(),
    ]);
    state.storagePersisted = persisted;
    state.storageReady = true;
    state.storageBackend = "indexeddb";

    const localItems = loadItems();
    const localSettings = loadSettings();
    const hasIndexedItems = Array.isArray(storedItems) && storedItems.length > 0;
    const hasIndexedSettings = storedSettings && typeof storedSettings === "object" && Object.keys(storedSettings).length > 0;

    if (hasIndexedSettings) applyHydratedSettings(storedSettings);
    if (hasIndexedItems) {
      state.items = storedItems.map(canonicalizeItem);
    } else if (localItems.length || Object.keys(localSettings).length) {
      await writeIndexedRecord(INDEXED_ITEMS_KEY, localItems.map(canonicalizeItem));
      await writeIndexedRecord(INDEXED_SETTINGS_KEY, localSettings);
      state.items = localItems;
      state.storageWarning = "Lokale Daten wurden in IndexedDB uebernommen.";
    }
  } catch (error) {
    state.storageBackend = "localstorage";
    state.storageReady = false;
    state.storageWarning = error?.message || "IndexedDB nicht verfuegbar.";
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    els.syncStatus.textContent = "Offline ohne Cache";
  });
}

function setupInstallExperience() {
  updateInstallFlags();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    state.installReady = true;
    updateInstallUi();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    state.installReady = false;
    state.standaloneMode = true;
    state.installDismissedAt = "";
    saveSettings();
    updateInstallUi();
    showToast("Your Voice ist jetzt als App installiert");
  });
}

function updateInstallFlags() {
  state.standaloneMode =
    window.matchMedia?.("(display-mode: standalone)")?.matches || Boolean(window.navigator.standalone);
  const ua = window.navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafariLike = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  state.iosInstallHint = isIos && !state.standaloneMode && isSafariLike;
}

function updateInstallUi() {
  updateInstallFlags();
  const shouldSuggest =
    !state.standaloneMode &&
    !state.installDismissedAt &&
    (state.installReady || state.iosInstallHint);
  if (els.installPromptCard) els.installPromptCard.hidden = !shouldSuggest;
  const statusText = state.standaloneMode
    ? "Your Voice ist bereits installiert und startet app-nah."
    : state.installReady
      ? "Installiere die App fuer schnellere Erfassung, Offline-Basis und spaetere Push-Erinnerungen."
      : state.iosInstallHint
        ? "Auf dem iPhone oder iPad: Teilen → Zum Home-Bildschirm, damit Push spaeter sauber funktioniert."
        : "Sobald dein Browser es erlaubt, kannst du Your Voice direkt als App installieren.";
  if (els.installHintText) els.installHintText.textContent = statusText;
  if (els.installStatusText) els.installStatusText.textContent = statusText;
  const buttonDisabled = state.standaloneMode || (!state.installReady && !state.iosInstallHint);
  if (els.installAppButton) els.installAppButton.disabled = buttonDisabled;
  if (els.installSettingsButton) els.installSettingsButton.disabled = buttonDisabled;
  const buttonLabel = state.standaloneMode ? "Bereits installiert" : "App installieren";
  if (els.installAppButton) els.installAppButton.textContent = buttonLabel;
  if (els.installSettingsButton) els.installSettingsButton.textContent = buttonLabel;
}

async function promptInstallApp() {
  updateInstallFlags();
  if (state.standaloneMode) {
    showToast("Your Voice ist bereits installiert");
    return;
  }
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    state.installReady = false;
    if (choice?.outcome === "accepted") {
      showToast("Installationsdialog geoeffnet");
    } else {
      showToast("Installation spaeter moeglich");
    }
    updateInstallUi();
    return;
  }
  if (state.iosInstallHint) {
    showToast("In Safari: Teilen und dann Zum Home-Bildschirm waehlen");
    return;
  }
  showToast("Installation ist in diesem Browser gerade nicht verfuegbar");
}

function dismissInstallPrompt() {
  state.installDismissedAt = new Date().toISOString();
  saveSettings();
  updateInstallUi();
  showToast("Installationshinweis ausgeblendet");
}

function updateGuestModeUi() {
  if (!els.guestModeCard) return;
  const isGuest = !state.loggedIn;
  const shouldShow = isGuest && !state.guestModeHintDismissed;
  els.guestModeCard.hidden = !shouldShow;
  if (!shouldShow) return;

  const activeCount = activeItems().length;
  const latestItem = [...state.items]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];
  const latestLabel = latestItem ? formatDateTime(latestItem.updatedAt || latestItem.createdAt, false) : "";
  const safetyLevel = getGuestSafetyLevel(activeCount);
  const primaryText = state.syncEnabled && state.cloudUser
    ? "Deine Daten werden bereits zwischen Geräten synchronisiert."
    : state.storageReady
      ? state.storagePersisted
        ? "Deine Einträge werden lokal in IndexedDB gespeichert. Backup und Sync kannst du jederzeit später ergänzen."
        : "Deine Einträge werden lokal im Browser gespeichert. Ein Backup ist sinnvoll, wenn du sie zusätzlich absichern willst."
      : "Deine Einträge bleiben lokal auf diesem Gerät, bis der Speicher vollständig vorbereitet ist.";
  if (els.guestModeText) els.guestModeText.textContent = primaryText;

  const meta = [];
  if (state.storageReady) meta.push(state.storagePersisted ? "Lokal gesichert" : "Lokal aktiv");
  if (state.lastBackupAt) meta.push("Backup vorhanden");
  else meta.push("Noch kein Backup");
  if (state.syncEnabled && state.cloudUser) meta.push("Sync aktiv");
  else meta.push("Ohne Konto nutzbar");
  if (latestLabel) meta.push(`Zuletzt geändert ${latestLabel}`);
  if (els.guestModeMeta) {
    els.guestModeMeta.replaceChildren(
      ...meta.map((label, index) => chip(label, label.includes("kein") ? "warn" : index === 0 ? "ok" : "")),
    );
  }
  if (els.guestBackupNowButton) {
    els.guestBackupNowButton.hidden = Boolean(state.lastBackupAt);
  }
  if (els.guestModeChecklist) {
    const checklist = [
      {
        title: activeCount ? `${activeCount} Einträge lokal gespeichert` : "Bereit für deinen ersten Eintrag",
        text: activeCount
          ? "Deine aktuellen Einträge liegen bereits auf diesem Gerät und bleiben auch ohne Konto nutzbar."
          : "Sobald du etwas speicherst, bleibt es lokal auf diesem Gerät erhalten.",
        ok: activeCount > 0,
      },
      {
        title: state.lastBackupAt ? "Backup bereits erstellt" : `Backup ${safetyLevel === "warn" ? "empfohlen" : "optional"}`,
        text: state.lastBackupAt
          ? `Letztes Backup: ${formatDateTime(state.lastBackupAt, false)}.`
          : safetyLevel === "warn"
            ? "Du nutzt die App schon aktiv. Ein Backup gibt dir spürbar mehr Ruhe."
            : "Für die ersten Schritte reicht lokal speichern völlig aus. Ein Backup ist später mit einem Klick möglich.",
        ok: Boolean(state.lastBackupAt),
      },
      {
        title: state.syncEnabled && state.cloudUser ? "Sync zwischen Geräten aktiv" : "Sync erst dann, wenn es sich lohnt",
        text: state.syncEnabled && state.cloudUser
          ? "Deine Einträge können jetzt auf mehreren Geräten auftauchen."
          : "Ein Konto brauchst du erst, wenn du Backup und Sync zwischen Geräten wirklich möchtest.",
        ok: Boolean(state.syncEnabled && state.cloudUser),
      },
    ];
    els.guestModeChecklist.replaceChildren(...checklist.map(renderGuestCheckItem));
  }
}

function getGuestSafetyLevel(activeCount) {
  if (state.lastBackupAt || (state.syncEnabled && state.cloudUser)) return "safe";
  if (activeCount >= 3) return "warn";
  return "calm";
}

function renderGuestCheckItem(item) {
  const card = document.createElement("div");
  card.className = `guest-check-item ${item.ok ? "ok" : "warn"}`;
  card.innerHTML = `
    <span class="guest-check-mark" aria-hidden="true">${item.ok ? "✓" : "!"}</span>
    <div>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.text)}</span>
    </div>
  `;
  return card;
}

function openSettingsPanel(target) {
  setView("settings");
  const appPanel = document.querySelector("#appOfflinePanel");
  const syncPanel = document.querySelector("#cloudSetupPanel");
  const privacyPanel = document.querySelector("#privacyPanel");
  if (target === "sync" && syncPanel) syncPanel.open = true;
  if (target === "privacy" && privacyPanel) privacyPanel.open = true;
  if (appPanel) appPanel.open = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleIncomingLaunchContext() {
  const url = new URL(window.location.href);
  const search = url.searchParams;
  const sharedText = getSharedCaptureText(search);
  const shortcut = search.get("source");
  let handled = false;

  if (sharedText) {
    els.captureInput.value = sharedText;
    state.activeView = "capture";
    const draft = parseGermanOrganizerText(sharedText, state.selectedKind);
    state.currentDraft = draft;
    renderReview(draft);
    showToast("Geteilter Text uebernommen");
    handled = true;
  } else if (shortcut === "shortcut-note") {
    setView("capture");
    els.captureInput.focus();
    showToast("Bereit fuer eine neue Notiz");
    handled = true;
  } else if (shortcut === "shortcut-voice") {
    setView("capture");
    els.captureInput.focus();
    showToast("Sprachnotiz wird vorbereitet");
    window.setTimeout(() => toggleSpeech(), 120);
    handled = true;
  }

  if (handled) {
    search.delete("share-target");
    search.delete("title");
    search.delete("text");
    search.delete("url");
    search.delete("source");
    const next = `${url.pathname}${search.toString() ? `?${search.toString()}` : ""}${url.hash}`;
    window.history.replaceState({}, "", next);
  }
}

function getSharedCaptureText(search) {
  if (!search.get("share-target")) return "";
  const parts = [search.get("title"), search.get("text"), search.get("url")]
    .map((value) => cleanDisplayText(value || "").trim())
    .filter(Boolean);
  return parts.join("\n");
}

function chip(label, variant = "") {
  const el = document.createElement("span");
  el.className = `chip ${variant}`;
  el.textContent = label;
  return el;
}

function normalizeKind(kind) {
  if (kind === "birthday") return "personal";
  if (kind === "errand") return "task";
  return kind || "note";
}

function getCategory(kind) {
  return [...categories, ...state.customCategories].find((category) => category.kind === normalizeKind(kind)) || categories[categories.length - 1];
}

function getKindLabel(kind) {
  return getCategory(kind)?.label || kindLabels[normalizeKind(kind)] || kindLabels[kind] || "Notiz";
}

function ensureItemTags(item) {
  if (Array.isArray(item.tags) && item.tags.length) return [...new Set(item.tags.map(normalizeKind))];
  return [normalizeKind(item.kind)];
}

function getItemInsight(item) {
  const kind = normalizeKind(item.kind);
  if (kind === "school") return item.dueStart ? "Lernziel erkannt" : "Lernziel erkannt · heute empfohlen";
  if (kind === "shopping") return Array.isArray(item.shoppingItems) && item.shoppingItems.length > 1 ? "Einkaufsliste erkannt" : "Besorgung erkannt";
  if (kind === "food") return "Essen erkannt";
  if (kind === "event") return "Termin erkannt";
  if (kind === "finance") return "Finanzaufgabe erkannt";
  if (kind === "health") return "Gesundheit erkannt";
  if (kind === "family") return "Familie erkannt";
  if (kind === "travel") return "Reiseplanung erkannt";
  if (kind === "reminder") return "Erinnerung erkannt";
  if (kind === "project") return "Projekt erkannt";
  if (kind === "work") return "Arbeitskontext erkannt";
  if (kind === "home") return "Zuhause einsortiert";
  if (kind === "sport") return "Training erkannt";
  if (kind === "document") return "Dokument erkannt";
  if (kind === "idea") return "Idee gesichert";
  if (kind === "personal") return "Persönlich einsortiert";
  if (kind === "task") return "Aufgabe erkannt";
  return "Notiz gesichert";
}

function getItemPriority(item) {
  if (item.priority) return item.priority;
  const lower = `${item.title || ""} ${item.rawText || ""}`.toLowerCase();
  if (/(dringend|wichtig|sofort|deadline|frist|miete|rechnung)/i.test(lower)) return "high";
  if (item.dueStart && new Date(item.dueStart) <= addDays(new Date(), 1)) return "medium";
  return normalizeKind(item.kind) === "idea" || normalizeKind(item.kind) === "note" ? "low" : "medium";
}

function priorityLabel(priority) {
  return { high: "Hoch", medium: "Mittel", low: "Niedrig" }[priority] || "Mittel";
}

function getItemsForDate(date) {
  return activeItems()
    .filter((item) => isItemOnDate(item, date))
    .sort((a, b) => new Date(a.dueStart || a.agendaDate || a.createdAt) - new Date(b.dueStart || b.agendaDate || b.createdAt));
}

function isItemOnDate(item, date) {
  const base = new Date(item.dueStart || item.agendaDate || item.createdAt);
  const target = startOfDay(date);
  if (sameDay(base, target)) return true;
  if (!item.recurrenceRule || target < startOfDay(base)) return false;
  const interval = Number(item.recurrenceRule.match(/INTERVAL=(\d+)/)?.[1] || 1);
  if (item.recurrenceRule.startsWith("FREQ=DAILY")) return daysBetween(startOfDay(base), target) % interval === 0;
  if (item.recurrenceRule.startsWith("FREQ=WEEKLY")) {
    const byDay = item.recurrenceRule.match(/BYDAY=([A-Z]{2})/)?.[1];
    const weekDistance = Math.floor(daysBetween(startOfDay(base), target) / 7);
    return weekDistance % interval === 0 && (byDay ? weekdayCodes[target.getDay()] === byDay : target.getDay() === base.getDay());
  }
  if (item.recurrenceRule.startsWith("FREQ=MONTHLY")) {
    const monthDistance = (target.getFullYear() - base.getFullYear()) * 12 + target.getMonth() - base.getMonth();
    if (monthDistance % interval !== 0) return false;
    const byDay = item.recurrenceRule.match(/BYDAY=([A-Z]{2})/)?.[1];
    const bySetPos = Number(item.recurrenceRule.match(/BYSETPOS=(\d+)/)?.[1] || 0);
    if (byDay && bySetPos) return weekdayCodes[target.getDay()] === byDay && nthWeekdayOfMonth(target) === bySetPos;
    return target.getDate() === base.getDate();
  }
  if (item.recurrenceRule.startsWith("FREQ=YEARLY")) {
    const yearDistance = target.getFullYear() - base.getFullYear();
    return yearDistance % interval === 0 && target.getMonth() === base.getMonth() && target.getDate() === base.getDate();
  }
  return false;
}

function daysBetween(from, to) {
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

function nthWeekdayOfMonth(date) {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getAgendaBuckets() {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const afterTomorrow = addDays(today, 2);
  const inSevenDays = addDays(today, 7);
  const open = activeItems();
  const countRange = (from, to, predicate = () => true) =>
    open.filter((item) => {
      const due = new Date(item.dueStart || item.agendaDate || item.createdAt);
      return due >= from && due < to && predicate(item);
    }).length;
  const taskKinds = new Set(["task", "shopping", "school", "personal", "finance", "family", "health", "travel", "project", "work", "home", "sport", "document", "reminder", "errand"]);
  const eventKinds = new Set(["event", "birthday"]);

  const todayTasks = countRange(today, tomorrow, (item) => taskKinds.has(normalizeKind(item.kind)));
  const todayEvents = countRange(today, tomorrow, (item) => eventKinds.has(item.kind) || normalizeKind(item.kind) === "event");
  const tomorrowTotal = countRange(tomorrow, afterTomorrow);
  const afterTomorrowTotal = countRange(afterTomorrow, addDays(today, 3));
  const nextSeven = countRange(today, inSevenDays);
  const upcomingEvents = countRange(tomorrow, addDays(today, 30), (item) => normalizeKind(item.kind) === "event");
  const weekTasks = countRange(today, inSevenDays, (item) => taskKinds.has(normalizeKind(item.kind)));

  return [
    { label: "Heute", summary: agendaSummary(todayTasks, todayEvents), view: "agenda" },
    { label: "Morgen", summary: countLabel(tomorrowTotal), view: "agenda" },
    { label: "Diese Woche", summary: countLabel(nextSeven), view: "agenda" },
    { label: "Kommende Termine", summary: countLabel(upcomingEvents, "Termin", "Termine"), view: "agenda" },
    { label: "Offene Aufgaben", summary: countLabel(weekTasks, "Aufgabe", "Aufgaben"), view: "inbox" },
  ];
}

function agendaSummary(tasks, events) {
  if (!tasks && !events) return "frei";
  return [`${tasks} ${tasks === 1 ? "Task" : "Tasks"}`, `${events} ${events === 1 ? "Termin" : "Termine"}`].join(" · ");
}

function countLabel(count, singular = "Eintrag", plural = "Einträge") {
  if (!count) return "frei";
  return `${count} ${count === 1 ? singular : plural}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 1700);
}

function iconSvg(name) {
  const icons = {
    check:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.4 2.4 5-5.3"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="6.5" width="14" height="12" rx="3"/><path d="M8 4.5v4M16 4.5v4M5.5 10.5h13"/></svg>',
    food:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15M5 4.5v5a2 2 0 0 0 4 0v-5M15 4.5c2.1 1.4 3.3 3.2 3.3 5.6 0 2.1-1.1 3.7-3.3 4.4v5"/></svg>',
    basket:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10h12l-1.2 8.5a2 2 0 0 1-2 1.5H9.2a2 2 0 0 1-2-1.5z"/><path d="M9 10l3-5 3 5M8.5 14h7"/></svg>',
    book:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 5.5h7a3 3 0 0 1 3 3v10h-7a3 3 0 0 0-3 3z"/><path d="M16.5 5.5h1a2 2 0 0 1 2 2v11h-3"/></svg>',
    bulb:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11a3.5 3.5 0 1 1 7 0c0 2.5-2 3-2.4 5h-2.2c-.4-2-2.4-2.5-2.4-5Z"/><path d="M10 19h4M9.5 3.8l-1 1.8M14.5 3.8l1 1.8M4.5 10h2M17.5 10h2"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19s-7-4-7-9a3.8 3.8 0 0 1 6.7-2.4A3.8 3.8 0 0 1 18.4 10c0 5-6.4 9-6.4 9Z"/></svg>',
    people:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 19a4.5 4.5 0 0 1 9 0M13.5 18.5a3.5 3.5 0 0 1 6 0"/></svg>',
    health:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z"/><path d="M12 8.5v5M9.5 11h5"/></svg>',
    plane:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5 20 4l-5.5 16-3.2-6.8z"/><path d="m20 4-8.7 9.2"/></svg>',
    bell:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17h11l-1.4-2.1V11a4.1 4.1 0 0 0-8.2 0v3.9z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>',
    briefcase:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16"/></svg>',
    home:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-6 8 6"/><path d="M6.5 10.5V19h11v-8.5"/><path d="M10 19v-5h4v5"/></svg>',
    sport:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8v8M18 8v8M3.5 10v4M20.5 10v4M6 12h12"/></svg>',
    document:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h7l3 3v12H7z"/><path d="M14 4.5v4h4M9.5 12h5M9.5 15.5h4"/></svg>',
    wallet:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><path d="M16 13h4M6 7.5l9-3v3"/></svg>',
    note:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h8l3 3v12H7z"/><path d="M15 4.5v4h4M9.5 12h5M9.5 15.5h4"/></svg>',
  };
  return icons[name] || icons.note;
}

function combineDateTime(date, time) {
  if (!date) return null;
  const result = new Date(date);
  result.setHours(time ? time.hours : 9, time ? time.minutes : 0, 0, 0);
  return toLocalIso(result);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date, months) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months, 1);
  return startOfDay(copy);
}

function nextWeekday(now, target, forceNextWeek) {
  const date = startOfDay(now);
  let diff = target - date.getDay();
  if (diff <= 0 || forceNextWeek) diff += 7;
  return addDays(date, diff);
}

function parseMonth(value) {
  const months = {
    januar: 0,
    februar: 1,
    "märz": 2,
    maerz: 2,
    april: 3,
    mai: 4,
    juni: 5,
    juli: 6,
    august: 7,
    september: 8,
    oktober: 9,
    november: 10,
    dezember: 11,
  };
  if (/^\d+$/.test(value)) return Number(value) - 1;
  return months[value.toLowerCase()] ?? 0;
}

function inferYear(now, month, day) {
  const candidate = new Date(now.getFullYear(), month, day);
  return candidate < startOfDay(now) ? now.getFullYear() + 1 : now.getFullYear();
}

function germanHourToNumber(value) {
  const map = {
    eins: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    "fünf": 5,
    fuenf: 5,
    sechs: 6,
    sieben: 7,
    acht: 8,
    neun: 9,
    zehn: 10,
    elf: 11,
    "zwölf": 12,
    zwoelf: 12,
  };
  return map[value] || 0;
}

function germanNumberToNumber(value) {
  const normalized = String(value).toLowerCase();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  const map = {
    ein: 1,
    einen: 1,
    eine: 1,
    eins: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    "fünf": 5,
    fuenf: 5,
    sechs: 6,
    sieben: 7,
    acht: 8,
    neun: 9,
    zehn: 10,
  };
  return map[normalized] || 1;
}

function cleanLocation(value) {
  return value
    .replace(/\b(und|um|heute|morgen|übermorgen|erinner|kaufen|besorgen)\b.*$/iu, "")
    .replace(/[,.!?]$/u, "")
    .trim();
}

function sentenceCase(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cleanDisplayText(value = "") {
  return String(value).replace(/\[([^\]]+)\]/g, "$1").replace(/\s+/g, " ").trim();
}

function toLocalIso(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 19);
}

function toDateInputValue(date) {
  return toLocalIso(startOfDay(date)).slice(0, 10);
}

function formatDateTime(value, allDay) {
  const date = new Date(value);
  const options = allDay
    ? { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }
    : { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" };
  return new Intl.DateTimeFormat("de-DE", options).format(date);
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(value);
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long" }).format(value);
}

function isTodayOrOverdue(value) {
  const due = new Date(value);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return due <= endOfToday;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
