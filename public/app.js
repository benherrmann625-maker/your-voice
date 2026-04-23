const STORAGE_KEY = "yourvoice.items.v1";
const LEGACY_STORAGE_KEY = "echodesk.items.v1";
const SETTINGS_KEY = "yourvoice.settings.v1";
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
  searchFilters: new Set(),
  searchFilterOpen: false,
  searchDateFilter: "any",
  searchCustomDate: "",
  searchPriorityFilter: "any",
  lastSyncAt: savedSettings.lastSyncAt || "",
  lastBackupAt: savedSettings.lastBackupAt || "",
  calendarView: "month",
  selectedDate: startOfDay(new Date()),
  calendarDate: startOfDay(new Date()),
  dayPanelOpen: false,
};

const els = {
  tabs: [...document.querySelectorAll(".tab")],
  viewTitle: document.querySelector("#viewTitle"),
  captureInput: document.querySelector("#captureInput"),
  parseButton: document.querySelector("#parseButton"),
  clearInputButton: document.querySelector("#clearInputButton"),
  micButton: document.querySelector("#micButton"),
  floatingVoiceButton: document.querySelector("#floatingVoiceButton"),
  micHint: document.querySelector("#micHint"),
  wave: document.querySelector("#wave"),
  reviewPanel: document.querySelector("#reviewPanel"),
  reviewTemplate: document.querySelector("#reviewTemplate"),
  categoryGrid: document.querySelector("#categoryGrid"),
  agendaMetrics: document.querySelector("#agendaMetrics"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarTitle: document.querySelector("#calendarTitle"),
  dayPanel: document.querySelector("#dayPanel"),
  agendaTitleInput: document.querySelector("#agendaTitleInput"),
  agendaDateInput: document.querySelector("#agendaDateInput"),
  agendaTimeInput: document.querySelector("#agendaTimeInput"),
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
  deleteAllButton: document.querySelector("#deleteAllButton"),
  syncStatus: document.querySelector("#syncStatus"),
  themeButton: document.querySelector("#themeButton"),
  settingsThemeButton: document.querySelector("#settingsThemeButton"),
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

init();

function init() {
  applySettings();
  registerServiceWorker();
  setupSpeech();
  bindEvents();
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

  els.deleteAllButton.addEventListener("click", () => {
    const ok = window.confirm("Lokale Your Voice Daten wirklich löschen?");
    if (!ok) return;
    state.items = [];
    saveItems();
    renderAll();
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
    state.lastBackupAt = new Date().toISOString();
    saveSettings();
    exportData();
    showToast("Backup erstellt");
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
    reminderOffset: state.remindersEnabled ? 30 : 0,
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
  els.agendaRepeatInput.value = "none";
  els.repeatTextInput.value = "";
  renderRepeatControls();
  saveItems();
  renderAll();
  showToast(recurrenceRule ? "Wiederholung gespeichert" : "Termin gespeichert");
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
  if (!hasCloudConfig()) return "Cloud noch nicht verbunden. Supabase URL und Anon Key eintragen.";
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
          ? "Cloud bereit"
          : "Lokal";
  els.syncStatus.lastChild.textContent = ` ${syncText}`;
  document.querySelector("#storageStatus").textContent = state.syncEnabled
    ? "Sync zwischen Geräten aktiv."
    : state.privacyMode === "Cloud optional"
      ? "Cloud optional. Lokal zuerst."
      : "Lokal gespeichert.";
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
  const tomorrow = addDays(today, 1);
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
  els.agendaMetrics.replaceChildren(
    ...metrics.map(([label, value]) => {
      const card = document.createElement("article");
      card.className = "metric-card";
      card.innerHTML = `<span>${escapeHtml(label)}</span><strong>${value}</strong>`;
      return card;
    }),
  );
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
  ];
  reviewChips.replaceChildren(...chips.map(([label, variant]) => chip(label, variant)));

  fragment.querySelector("#editReviewButton").addEventListener("click", () => {
    editFields.hidden = !editFields.hidden;
  });

  fragment.querySelector("#saveReviewButton").addEventListener("click", () => {
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
    renderReviewEmpty("Gespeichert.", "Der Eintrag liegt jetzt lokal in deiner Inbox.");
    renderAll();
    if (state.syncEnabled && state.cloudUser) void syncCloud("save");
    setView(item.dueStart && isTodayOrOverdue(item.dueStart) ? "agenda" : "inbox");
  });

  fragment.querySelector("#resetReviewButton").addEventListener("click", () => {
    state.currentDraft = null;
    renderReviewEmpty("Verworfen.", "Sprich oder schreibe einfach den nächsten Gedanken.");
  });

  els.reviewPanel.replaceChildren(root);
}

function renderReviewEmpty(title = "Bereit.", text = "Deine nächste Eingabe erscheint hier ganz kurz zur Bestätigung.") {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  wrapper.innerHTML = `<p class="eyebrow">Review</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>`;
  els.reviewPanel.replaceChildren(wrapper);
}

function renderAll() {
  renderCategories();
  renderAgendaBoard();
  renderRecent();
  renderInbox();
  renderSearch();
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
  renderList(els.recentList, items, "Noch nichts gespeichert.");
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
    const empty = document.createElement("div");
    empty.className = "empty-box";
    empty.textContent = emptyText;
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
    renderList(els.searchList, [], "Suchbegriff oder Filter wählen.");
    return;
  }
  const items = activeItems()
    .filter((item) => !query || [item.title, item.notes, item.rawText, item.placeLabel, item.kind, item.boxLabel, ...ensureItemTags(item).map(getKindLabel)]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query)))
    .filter((item) => !selectedFilters.length || ensureItemTags(item).some((tag) => selectedFilters.includes(tag)))
    .filter(matchesDateFilter)
    .filter(matchesPriorityFilter);
  renderList(els.searchList, items, "Keine Treffer.");
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

function renderList(container, items, emptyText = "Noch keine Einträge.") {
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "item-card";
    empty.innerHTML = `<p class="item-raw">${escapeHtml(emptyText)}</p>`;
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
    section.innerHTML = `
      <summary>
        <span class="drag-handle" aria-hidden="true">⋮⋮</span>
        <span class="group-icon" aria-hidden="true">${iconSvg(group.category.icon)}</span>
        <strong>${escapeHtml(group.category.label)}</strong>
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
      const empty = document.createElement("div");
      empty.className = "empty-box";
      empty.textContent = "Bereit für neue Einträge.";
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
    compact.innerHTML = `<p class="eyebrow">Tagesdetails</p><h3>Tag anklicken</h3><p class="item-raw">Details erscheinen erst, wenn du ein Datum auswählst.</p>`;
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
    const empty = document.createElement("article");
    empty.className = "item-card";
    empty.innerHTML = `<p class="item-raw">Keine Einträge für diesen Tag.</p>`;
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
  card.innerHTML = `
    <div class="item-top">
      <div class="item-icon" aria-hidden="true">${iconSvg(category.icon)}</div>
      <div>
        <p class="item-title">${escapeHtml(cleanDisplayText(item.title))}</p>
        <div class="item-meta">
          <span class="kind">${escapeHtml(getKindLabel(item.kind))}</span>
          ${item.dueStart ? `<span>${escapeHtml(formatDateTime(item.dueStart, item.allDay))}</span>` : ""}
          ${item.recurrenceRule ? "<span>wiederholt</span>" : ""}
        </div>
      </div>
    </div>
  `;
  return card;
}

function renderItem(item) {
  const card = document.createElement("article");
  card.className = `item-card ${item.status === "done" ? "done" : ""} ${item.pinned ? "pinned" : ""}`;
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
    item.dueStart ? formatDateTime(item.dueStart, item.allDay) : "",
    item.placeLabel ? item.placeLabel : "",
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
               <button class="ghost" type="button" data-action="edit">Bearbeiten</button>
               <button class="danger" type="button" data-action="delete">Löschen</button>`
        }
	    </div>
	  `;

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

  card.querySelector('[data-action="edit"]')?.addEventListener("click", () => {
    state.currentDraft = item;
    renderReview(item);
    setView("capture");
  });

  card.querySelector('[data-action="delete"]')?.addEventListener("click", () => {
    markItemDeleted(item.id);
  });

  return card;
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
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      state.items
        .map((item) => canonicalizeItem({ ...item, manualOrder: item.manualOrder || new Date(item.createdAt || Date.now()).getTime() })),
    ),
  );
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
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
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
      hideDone: state.hideDone,
      inboxGroupOrder: state.inboxGroupOrder,
      hiddenInboxGroups: state.hiddenInboxGroups,
      updatedAt: new Date().toISOString(),
    }),
  );
}

function exportData() {
  const blob = new Blob([JSON.stringify({ items: state.items, exportedAt: new Date().toISOString() }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `your-voice-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    els.syncStatus.textContent = "Offline ohne Cache";
  });
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
