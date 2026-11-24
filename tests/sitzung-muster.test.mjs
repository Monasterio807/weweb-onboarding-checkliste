// =============================================================================
// sitzung-muster.test.mjs — Muster A «Sitzung läuft ab» (Frontend-Audit 23.11.2026, A-012)
// Teil 1: reine Funktionen aus src/sitzung-muster.js (unverändert aus dem Pilot)
// Teil 2: Regel 1 in der Checkliste: Token-Wechsel lädt nach dem Laden nie neu.
// Läuft mit dem eingebauten Node-Test-Runner (npm test), ohne neue Abhängigkeiten.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "src");
const sfc = readFileSync(join(src, "wwElement.vue"), "utf8");
const scriptSrc = sfc.slice(sfc.indexOf("<script>") + "<script>".length, sfc.indexOf("\n</script>"));

const dir = mkdtempSync(join(tmpdir(), "chk-muster-"));
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
copyFileSync(join(src, "sitzung-muster.js"), join(dir, "sitzung-muster.js"));
writeFileSync(join(dir, "wwElement.options.js"), scriptSrc, "utf8");

const M = await import(pathToFileURL(join(dir, "sitzung-muster.js")).href);
const options = (await import(pathToFileURL(join(dir, "wwElement.options.js")).href)).default;
const { ENTWURF_MAX_MS, ABGEMELDET_KEY, entwurfKey, uidAusJwt, jwtAbgelaufen, sollNeuLaden, istSitzungAbgelaufen, ohneFelder, entwurfSchreiben, entwurfLesen, entwurfEntscheid } = M;

// Unsignierter Test-JWT: nur die Nutzlast zählt (sub, exp).
function jwt({ sub = "user-1", expInSek = 3600 } = {}) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64({ alg: "none" })}.${b64({ sub, exp: Math.floor(Date.now() / 1000) + expInSek })}.x`;
}

function fakeSpeicher() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

// ─── Teil 1: reine Funktionen ────────────────────────────────────────────────
const KEY = entwurfKey("onboarding-checkliste");

test("Muster: Schlüssel folgt «imploya-<name>-entwurf» (header-pro löscht ihn beim Abmelden)", () => {
  assert.equal(KEY, "imploya-onboarding-checkliste-entwurf");
  assert.ok(/^imploya-[a-z0-9_-]*entwurf/i.test(KEY));
});

test("Muster: liest sub und exp aus dem Token, auch mit «Bearer »", () => {
  assert.equal(uidAusJwt(jwt({ sub: "abc" })), "abc");
  assert.equal(uidAusJwt("Bearer " + jwt({ sub: "abc" })), "abc");
  assert.equal(uidAusJwt("kaputt"), "");
  assert.equal(jwtAbgelaufen(jwt({ expInSek: -10 })), true);
  assert.equal(jwtAbgelaufen(jwt({ expInSek: 600 })), false);
  assert.equal(jwtAbgelaufen("kaputt"), false);
});

test("Muster: Token-Wechsel lädt nur neu, solange nichts geladen ist oder eine andere Person kommt", () => {
  assert.equal(sollNeuLaden({ geladen: false }), true);
  assert.equal(sollNeuLaden({ geladen: true, needLogin: true }), true);
  assert.equal(sollNeuLaden({ geladen: true, ladeFehler: true }), true);
  assert.equal(sollNeuLaden({ geladen: true, geladenFuer: "a", nutzerJetzt: "a" }), false);
  assert.equal(sollNeuLaden({ geladen: true, geladenFuer: "a", nutzerJetzt: "b" }), true);
});

test("Muster: nur 401 heisst «Anmeldung abgelaufen», 403 nicht", () => {
  assert.equal(istSitzungAbgelaufen(401), true);
  assert.equal(istSitzungAbgelaufen(403), false);
  assert.equal(istSitzungAbgelaufen(500), false);
});

test("Muster: ohneFelder lässt Personendaten draussen", () => {
  assert.deepEqual(ohneFelder({ a: 1, ahv_number: "x", iban: "y" }, ["ahv_number", "iban"]), { a: 1 });
});

test("Muster: Entwurf schreiben, lesen, nach 2 Stunden weg, nach dem Abmelden weg, kaputt weg", () => {
  const ss = fakeSpeicher();
  const t0 = 1_000_000;
  entwurfSchreiben(ss, KEY, { uid: "u", step: 2, daten: { form: { employee_name: "Test" } } }, t0);
  assert.equal(entwurfLesen(ss, KEY, t0 + 1000).daten.form.employee_name, "Test");
  assert.equal(entwurfLesen(ss, KEY, t0 + ENTWURF_MAX_MS + 1), null);
  assert.equal(ss.getItem(KEY), null);

  entwurfSchreiben(ss, KEY, { uid: "u", step: 2, daten: { form: {} } }, t0);
  ss.setItem(ABGEMELDET_KEY, String(t0 + 5));
  assert.equal(entwurfLesen(ss, KEY, t0 + 10), null);
  ss.removeItem(ABGEMELDET_KEY);

  ss.setItem(KEY, "{kaputt");
  assert.equal(entwurfLesen(ss, KEY), null);
  assert.equal(ss.getItem(KEY), null);
});

test("Muster: Entscheid: dieselbe Person bekommt den Entwurf, fremde nie, ohne gültigen Login wartet er", () => {
  const d = { uid: "u1", daten: { form: {} } };
  assert.equal(entwurfEntscheid(null, { uid: "u1", tokenGueltig: true }), "kein");
  assert.equal(entwurfEntscheid(d, { uid: "u1", tokenGueltig: true }), "hergestellt");
  assert.equal(entwurfEntscheid(d, { uid: "u2", tokenGueltig: true }), "verworfen");
  assert.equal(entwurfEntscheid(d, { uid: "u1", tokenGueltig: false }), "wartet");
  assert.equal(entwurfEntscheid(d, { uid: "", tokenGueltig: true }), "wartet");
  assert.equal(entwurfEntscheid(d, { uid: "u1", tokenGueltig: true, hatGetippt: true }), "verworfen");
});

// ─── Teil 2: Regel 1 in der Checkliste (G5a-33) ──────────────────────────────
function makeVm(contentOverrides = {}) {
  const vm = {
    ...options.data(),
    content: { authToken: jwt(), apiKey: "anon-key", supabaseUrl: "https://db.example.co", ...contentOverrides },
    uid: "test",
    emitted: [],
    $emit(name, payload) { this.emitted.push({ name, payload }); },
    $nextTick(fn) { if (fn) fn(); return Promise.resolve(); },
    $el: { querySelector: () => null },
  };
  for (const [name, fn] of Object.entries(options.computed)) {
    Object.defineProperty(vm, name, { get: () => fn.call(vm), configurable: true });
  }
  for (const [name, fn] of Object.entries(options.methods)) vm[name] = fn.bind(vm);
  return vm;
}

function mockListe({ listStatus = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ method: opts.method || "GET", url: String(url) });
    const ok = listStatus < 400;
    return { ok, status: listStatus, json: async () => (ok ? [] : {}) };
  };
  return calls;
}

const listenAufrufe = (calls) => calls.filter((c) => c.url.includes("/onboarding_checklists?select=")).length;
const watchToken = (vm, neu, alt) => options.watch["content.authToken"].call(vm, neu, alt);
const watchKey = (vm, neu, alt) => options.watch["content.apiKey"].call(vm, neu, alt);

test("G5a-33: Token-Wechsel nach dem Laden lädt nicht neu und lässt das Formular stehen", async () => {
  const calls = mockListe();
  const vm = makeVm();
  await vm.loadChecklists();
  assert.equal(vm.geladenEinmal, true);
  vm.view = "create";
  vm.form.employee_name = "Gerade getippt";
  const vorher = listenAufrufe(calls);

  const neu = jwt({ expInSek: 7200 });
  vm.content.authToken = neu;
  watchToken(vm, neu, "alt");
  await new Promise((r) => setTimeout(r, 0));

  assert.equal(listenAufrufe(calls), vorher, "kein neuer Ladeaufruf");
  assert.equal(vm.view, "create", "Ansicht bleibt");
  assert.equal(vm.form.employee_name, "Gerade getippt");
});

test("G5a-33: ein Wechsel des apiKey lädt nach dem Laden ebenfalls nicht neu", async () => {
  const calls = mockListe();
  const vm = makeVm();
  await vm.loadChecklists();
  vm.view = "detail";
  const vorher = listenAufrufe(calls);
  watchKey(vm, "anon-neu", "anon-key");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(listenAufrufe(calls), vorher);
  assert.equal(vm.view, "detail");
});

test("G5a-33: kam der erste Token erst nach dem Start (Mount-Race), wird danach geladen", async () => {
  const calls = mockListe();
  const vm = makeVm({ authToken: "" });
  await vm.loadChecklists();
  assert.equal(vm.authError, true);
  assert.equal(vm.geladenEinmal, false);

  const neu = jwt();
  vm.content.authToken = neu;
  watchToken(vm, neu, "");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(listenAufrufe(calls), 1);
  assert.equal(vm.authError, false);
  assert.equal(vm.geladenEinmal, true);
});

test("G5a-33: nach einem Ladefehler lädt ein neuer Token neu", async () => {
  const calls = mockListe({ listStatus: 500 });
  const vm = makeVm();
  await vm.loadChecklists();
  assert.ok(vm.loadError);
  assert.equal(vm.geladenEinmal, false);

  mockListe();
  const neu = jwt({ expInSek: 7200 });
  vm.content.authToken = neu;
  watchToken(vm, neu, "alt");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(vm.loadError, "");
  assert.equal(vm.geladenEinmal, true);
  assert.equal(calls.length > 0, true);
});

test("G5a-33: meldet sich eine andere Person an, wird für sie neu geladen", async () => {
  const calls = mockListe();
  const vm = makeVm({ authToken: jwt({ sub: "user-1" }) });
  await vm.loadChecklists();
  const vorher = listenAufrufe(calls);

  const neu = jwt({ sub: "user-2" });
  vm.content.authToken = neu;
  watchToken(vm, neu, "alt");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(listenAufrufe(calls), vorher + 1);
  assert.equal(vm.geladenFuer, "user-2");
  assert.equal(vm.view, "list");
});

test("G5a-33: leerer neuer Token löst nichts aus", async () => {
  const calls = mockListe();
  const vm = makeVm();
  await vm.loadChecklists();
  const vorher = listenAufrufe(calls);
  watchToken(vm, "", "alt");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(listenAufrufe(calls), vorher);
});

// ─── Laufnummer: ein überholter Ladelauf schreibt nichts (Review-Fund) ───────
test("G5a-33: eine ältere Anfrage mit 401 darf nach einer neueren erfolgreichen nichts überschreiben", async () => {
  const wartende = [];
  globalThis.fetch = async (url) => {
    if (String(url).includes("/onboarding_checklists?select=")) {
      return new Promise((resolve) => wartende.push(resolve));
    }
    return { ok: true, status: 200, json: async () => [] };
  };
  const vm = makeVm();
  const alt = vm.loadChecklists();
  const neu = vm.loadChecklists();
  assert.equal(wartende.length, 2);
  wartende[1]({ ok: true, status: 200, json: async () => [] });
  await neu;
  assert.equal(vm.geladenEinmal, true);
  wartende[0]({ ok: false, status: 401, json: async () => ({}) });
  await alt;
  assert.equal(vm.authError, false, "überholter Lauf darf die Anmelde-Ansicht nicht setzen");
  assert.equal(vm.loading, false);
});

test("G5a-33: ein überholter Lauf mit Netzfehler setzt keinen Ladefehler", async () => {
  const wartende = [];
  globalThis.fetch = async (url) => {
    if (String(url).includes("/onboarding_checklists?select=")) {
      return new Promise((resolve, reject) => wartende.push({ resolve, reject }));
    }
    return { ok: true, status: 200, json: async () => [] };
  };
  const vm = makeVm();
  const alt = vm.loadChecklists();
  const neu = vm.loadChecklists();
  wartende[1].resolve({ ok: true, status: 200, json: async () => [] });
  await neu;
  wartende[0].reject(new TypeError("Failed to fetch"));
  await alt;
  assert.equal(vm.loadError, "");
  assert.equal(vm.loading, false);
});
