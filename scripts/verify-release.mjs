import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass, detail });
};

const app = read("app.js");
const html = read("index.html");
const css = read("styles.css");
const sw = read("sw.js");
const manifest = read("manifest.webmanifest");
const goldset = JSON.parse(read("qa-nlu-goldset.json"));

const syntax = spawnSync(process.execPath, ["--check", path.join(root, "app.js")], {
  encoding: "utf8",
});
check("app.js syntax", syntax.status === 0, syntax.stderr.trim());

[
  "graphit",
  "ocean",
  "warm",
  "rose",
  "forest",
  "kontrast",
].forEach((scheme) => {
  check(`dark scheme token: ${scheme}`, css.includes(`[data-theme="dark"][data-scheme="${scheme}"]`));
});

[
  "validateAuthForm",
  "signInWithPassword",
  "registerWithPassword",
  "sendPasswordReset",
  "cleanAuthUrl",
  "resetPasswordForEmail",
].forEach((token) => check(`auth token: ${token}`, app.includes(token)));

[
  "pinned",
  "manualOrder",
  "moveItemInInbox",
  "moveInboxGroup",
  "reorderItemInGroup",
  "inboxGroupOrder",
  "hiddenInboxGroups",
  'data-action="pin"',
  'data-action="up"',
  'data-action="down"',
].forEach((token) => check(`inbox ordering token: ${token}`, app.includes(token)));

check("settings custom category removed", !html.includes("customCategoryInput"));
check("agenda manual event form", html.includes("agendaTitleInput") && app.includes("createManualAgendaEvent"));
check("agenda recurrence system", app.includes("parseRecurrenceText") && app.includes("BYSETPOS") && app.includes("FREQ=YEARLY"));
check("agenda recurrence reduced UI", html.includes("repeatTextInput") && !html.includes("repeatIntervalInput") && !html.includes("repeatUnitInput"));
check("completed section", app.includes("renderCompletedSection") && app.includes("Erledigt"));
check("archive buttons", html.includes("showDoneButton") && html.includes("showDeletedButton") && app.includes("deletedItems"));
check("search filters", html.includes("filterToggleButton") && app.includes("matchesDateFilter") && app.includes("matchesPriorityFilter"));
check("custom category patterns", app.includes("generateCustomCategoryPatterns") && app.includes("customCategoryMatches"));
check("single source helpers", app.includes("activeItems()") && app.includes("doneItems()") && app.includes("deletedItems()") && app.includes("canonicalizeItem"));
check("bracket cleanup", app.includes("cleanDisplayText") && app.includes("replace(/\\[([^\\]]+)\\]/g"));
check("contact settings", html.includes("sendContactButton") && app.includes("sendContactMessage"));
check("indexeddb storage", app.includes("INDEXED_DB_NAME") && app.includes("hydratePersistentState") && app.includes("openIndexedDatabase"));
check("backup import", html.includes("importButton") && html.includes("importFileInput") && app.includes("importDataFromFile"));
check("storage transparency", html.includes("localStorageNote") && app.includes("storagePersisted") && app.includes("snapshotSettings"));
check("reminder system", html.includes("agendaReminderInput") && app.includes("ensureReminderPermission") && app.includes("scheduleReminderForItem") && app.includes("Notification.requestPermission"));
check("reminder quick edit", app.includes("setItemReminderPreset") && app.includes('data-reminder-preset="15"') && app.includes("reminderDisabled"));
check("snooze actions", app.includes("snoozeItem") && app.includes('data-snooze="10m"') && app.includes("formatSnoozeLabel"));
check("inline quick edit", app.includes("renderQuickEditPanel") && app.includes("saveQuickEdit") && app.includes('data-action="quick-edit"') && css.includes(".quick-edit-panel"));
check("due highlighting", app.includes("getDueVisualState") && app.includes("getUrgencyCounts") && css.includes(".item-card.due-overdue") && css.includes(".chip.due"));
check("aha review guidance", app.includes("buildAhaHeadline") && app.includes("buildAhaText") && css.includes(".aha-panel"));
check("simplified capture cta", html.includes('id="parseButton"') && html.includes("Strukturieren"));
check("home focus removed", !html.includes("focusList") && !app.includes("renderHomeFocus") && !css.includes(".focus-section"));
check("quick capture removed", !html.includes("data-quick-capture=\"task\"") && !html.includes("pasteCaptureButton") && !app.includes("applyQuickCapture") && !app.includes("pasteFromClipboardToCapture"));
check("guest overlay removed", !html.includes("guestModeCard") && !app.includes("updateGuestModeUi") && !css.includes(".guest-mode-card"));
check("example actions removed", !html.includes("loadExampleButton") && !html.includes("Beispiel laden") && !app.includes("loadExampleNote"));
check("interactive empty states", app.includes("buildContextualEmptyState") && app.includes("runEmptyStateAction") && css.includes(".empty-actions"));
check("calendar ics export", html.includes("calendarExportButton") && app.includes("BEGIN:VCALENDAR") && app.includes("buildEventIcs") && app.includes("buildTodoIcs"));
check("daily summary card", html.includes("dailySummaryToggle") && app.includes("buildDailySummaryCard") && app.includes("formatDueBadge") && css.includes(".summary-card"));
check(
  "pwa install flow",
  html.includes("installSettingsButton") &&
    app.includes("beforeinstallprompt") &&
    app.includes("handleIncomingLaunchContext") &&
    manifest.includes('"share_target"') &&
    manifest.includes('"shortcuts"'),
);
check("tips collapsed by default", !html.includes('<details class="settings-panel" open>\n              <summary>Wie sprechen</summary>'));
check("cache version advanced", /your-voice-v\d+/.test(sw));
check("goldset has release examples", goldset.length >= 19);

const appExpectations = [
  "school_learning_context",
  "shopping_context",
  "family_context",
  "obligation_task_context",
  "datetime_event_context",
  "priority_high",
  "date_in_days",
  "date_next_week_weekday",
  "custom_category_context",
  "getConfirmationHint",
  "timeMatch",
  "time_spoken_half",
  "tags_",
];
appExpectations.forEach((token) => check(`nlu implementation token: ${token}`, app.includes(token)));

const failed = checks.filter((entry) => !entry.pass);
checks.forEach((entry) => {
  const prefix = entry.pass ? "PASS" : "FAIL";
  console.log(`${prefix} ${entry.name}${entry.detail ? ` - ${entry.detail}` : ""}`);
});

if (failed.length) {
  console.error(`\n${failed.length} release check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} release checks passed.`);
