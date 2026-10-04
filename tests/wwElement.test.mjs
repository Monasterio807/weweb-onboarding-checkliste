// =============================================================================
// wwElement.test.mjs — Anlegen einer Checkliste (onboarding-checkliste)
//
// Laeuft mit dem eingebauten Node-Test-Runner, OHNE neue Abhaengigkeiten:
//   npm test        (bzw. node --test tests/wwElement.test.mjs)
//
// Aufbau wie im Schwester-Repo coded-component-dokument-anzeigen: der
// <script>-Block des SFC wird ausgeschnitten, als ESM-Modul geladen und die
// Optionen (computed/methods) mit einem Fake-`this` geprueft. fetch ist gemockt.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sfc = readFileSync(join(here, "..", "src", "wwElement.vue"), "utf8");

const scriptStart = sfc.indexOf("<script>");
const scriptEnd = sfc.indexOf("\n</script>");
assert.ok(scriptStart > -1 && scriptEnd > scriptStart, "Script-Block im SFC nicht gefunden");
const scriptSrc = sfc.slice(scriptStart + "<script>".length, scriptEnd);

const dir = mkdtempSync(join(tmpdir(), "chk-test-"));
const modPath = join(dir, "wwElement.options.mjs");
writeFileSync(modPath, scriptSrc, "utf8");
const options = (await import(pathToFileURL(modPath).href)).default;

function makeVm(contentOverrides = {}) {
  const vm = {
    ...options.data(),
    content: { authToken: "jwt-1234567890", apiKey: "anon-key", supabaseUrl: "https://db.example.co", ...contentOverrides },
    uid: "test",
    emitted: [],
    $emit(name, payload) { this.emitted.push({ name, payload }); },
    $nextTick(fn) { if (fn) fn(); return Promise.resolve(); },
    $el: { querySelector: () => null },
  };
  for (const [name, fn] of Object.entries(options.computed)) {
    Object.defineProperty(vm, name, { get: () => fn.call(vm), configurable: true });
  }
  for (const [name, fn] of Object.entries(options.methods)) {
    vm[name] = fn.bind(vm);
  }
  return vm;
}

/** fetch-Attrappe: antwortet je nach Methode/URL, merkt sich alle Aufrufe. */
function mockFetch({ itemsStatus = 201, itemsThrow = false, deleteStatus = 204 } = {}) {
  const calls = [];
  const res = (status, body = []) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  globalThis.fetch = async (url, opts = {}) => {
    const method = opts.method || "GET";
    calls.push({ method, url: String(url) });
    if (method === "POST" && url.endsWith("/onboarding_checklists")) return res(201, [{ id: "c1" }]);
    if (method === "POST" && url.endsWith("/onboarding_checklist_items")) {
      if (itemsThrow) throw new TypeError("Failed to fetch");
      return res(itemsStatus, []);
    }
    if (method === "DELETE") return res(deleteStatus, []);
    return res(200, []);
  };
  return calls;
}

function neueListeVm() {
  const vm = makeVm();
  vm.form = { employee_id: "", employee_name: "Anna Muster", start_date: "" };
  vm.view = "create";
  vm.templateItems = [
    { id: 1, category: "Vor dem Start", title: "Vertrag", sort_order: 1 },
    { id: 2, category: "Vor dem Start", title: "Zugang", sort_order: 2 },
  ];
  vm.selectedTemplateIds = new Set([1, 2]);
  return vm;
}

// ─── A1-04-020: Punkte nicht angelegt = nicht als Erfolg melden ──────────────

test("A1-04-020: scheitern die Punkte, wird die leere Checkliste zurueckgenommen und der Fehler gezeigt", async () => {
  const calls = mockFetch({ itemsStatus: 500 });
  const vm = neueListeVm();
  await vm.createChecklist();

  assert.ok(calls.some((c) => c.method === "DELETE" && c.url.includes("onboarding_checklists?id=eq.c1")), "leere Checkliste muss per DELETE zurueckgenommen werden");
  assert.match(vm.createError, /Punkte der Checkliste konnten nicht angelegt werden/);
  assert.equal(vm.emitted.filter((e) => e.payload && e.payload.name === "created").length, 0, "kein 'created'-Event bei Fehlschlag");
  assert.equal(vm.view, "create", "Ansicht bleibt im Formular, keine leere Detailansicht");
  assert.equal(vm.creating, false);
});

test("A1-04-020: scheitert das Netz beim Anlegen der Punkte, gilt dasselbe", async () => {
  const calls = mockFetch({ itemsThrow: true });
  const vm = neueListeVm();
  await vm.createChecklist();

  assert.ok(calls.some((c) => c.method === "DELETE"));
  assert.match(vm.createError, /konnten nicht angelegt werden/);
  assert.equal(vm.emitted.filter((e) => e.payload && e.payload.name === "created").length, 0);
  assert.equal(vm.view, "create");
});

test("A1-04-020: laesst sich die leere Checkliste nicht zurücknehmen, sagt die Meldung das ehrlich", async () => {
  mockFetch({ itemsStatus: 500, deleteStatus: 403 });
  const vm = neueListeVm();
  await vm.createChecklist();

  assert.match(vm.createError, /nicht zurücknehmen/);
  assert.equal(vm.emitted.filter((e) => e.payload && e.payload.name === "created").length, 0);
  assert.equal(vm.view, "create");
});

test("Normalfall: Punkte angelegt, 'created' gemeldet, kein DELETE", async () => {
  const calls = mockFetch({ itemsStatus: 201 });
  const vm = neueListeVm();
  await vm.createChecklist();

  assert.equal(calls.filter((c) => c.method === "DELETE").length, 0);
  assert.equal(vm.createError, "");
  assert.equal(vm.emitted.filter((e) => e.payload && e.payload.name === "created").length, 1);
});
