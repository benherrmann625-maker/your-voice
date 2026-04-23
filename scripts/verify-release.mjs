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
