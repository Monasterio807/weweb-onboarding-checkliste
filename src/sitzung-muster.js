// =============================================================================
// sitzung-muster.js — Muster A «Sitzung läuft ab» (Frontend-Audit 23.11.2026)
//
// Ein gemeinsames Muster für alle Wizards, damit eine abgelaufene Anmeldung
// keine Eingaben mehr kostet. Drei Regeln:
//   1. Token-Wechsel lädt nie neu, sobald die Seite einmal geladen ist
//      (sonst überschreibt das Neuladen, was der Wirt gerade tippt).
//   2. Bleibt es nach der Token-Erneuerung bei 401: Eingaben im Tab sichern,
//      einen Anmelde-Hinweis ÜBER den Wizard legen (Wizard bleibt stehen).
//   3. Nach der Anmeldung (gleicher Tab, ?next= führt zurück) die Eingaben
//      zurückspielen, aber nur für dieselbe Person.
//
// Speicher: nur sessionStorage (stirbt mit dem Tab), an die Nutzer-ID (JWT sub)
// gebunden, 2 Stunden gültig. Schlüssel «imploya-<name>-entwurf»: header-pro
// löscht diese beim Abmelden und setzt «imploya-abgemeldet» (Muster aus
// unfallmeldung-erstellen und onboarding-wizard, Fix-Runde 24.09.2026).
// Keine Personendaten (AHV, IBAN, Geburtsdatum) hineinlegen; der Aufrufer
// filtert mit ohneFelder(). Kein Log mit Inhalt.
//
// Reine Funktionen ohne Vue, damit vitest sie direkt prüfen kann. Die Datei
// ist zum Kopieren gedacht: jedes Komponenten-Repo baut für sich, es gibt kein
// gemeinsames Paket. Änderungen in allen Kopien gleich nachziehen
// (Liste: docs/claude/pakete/MusterA-sitzung-laeuft-ab.md im Imploya-Projekt).
// =============================================================================

export const MUSTER_A_VERSION = '2026-11-23';
export const ENTWURF_MAX_MS = 2 * 60 * 60 * 1000;
export const ABGEMELDET_KEY = 'imploya-abgemeldet';

export function entwurfKey(name) {
  return `imploya-${String(name || '').toLowerCase().replace(/[^a-z0-9_-]/g, '')}-entwurf`;
}

function jwtNutzlast(token) {
  try {
    const t = String(token || '').replace(/^Bearer\s+/i, '');
    const part = t.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const roh = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    return JSON.parse(decodeURIComponent(escape(roh)));
  } catch (e) { return null; }
}

// Nutzer-ID nur aus dem Token (sub), nie aus einer gebundenen Property.
export function uidAusJwt(token) {
  const n = jwtNutzlast(token);
  return (n && n.sub) ? String(n.sub) : '';
}

// true, wenn der Token ein exp trägt und das vorbei ist.
export function jwtAbgelaufen(token, jetzt = Date.now()) {
  const n = jwtNutzlast(token);
  const exp = n && Number(n.exp);
  return !!(exp && isFinite(exp) && exp * 1000 <= jetzt);
}

// Regel 1: Neu laden nur, solange die Seite noch nichts Brauchbares zeigt
// (erster Ladeversuch lief ohne Token, Anmelde-Ansicht oder Ladefehler) oder
// wenn eine andere Person angemeldet ist.
export function sollNeuLaden({ geladen, needLogin, ladeFehler, geladenFuer, nutzerJetzt } = {}) {
  if (!geladen || needLogin || ladeFehler) return true;
  if (geladenFuer && nutzerJetzt && String(geladenFuer) !== String(nutzerJetzt)) return true;
  return false;
}

// Regel 2: nur 401 heisst «Anmeldung abgelaufen». 403 ist fehlende Berechtigung.
export function istSitzungAbgelaufen(status) {
  return Number(status) === 401;
}

// Flache Kopie ohne die genannten Felder (Personendaten bleiben draussen).
export function ohneFelder(obj, felder = []) {
  const aus = {};
  const weg = new Set(felder);
  Object.keys(obj || {}).forEach((k) => { if (!weg.has(k)) aus[k] = obj[k]; });
  return aus;
}

export function entwurfSchreiben(speicher, key, { uid, step, daten } = {}, jetzt = Date.now()) {
  try {
    if (!speicher) return false;
    speicher.setItem(key, JSON.stringify({ v: MUSTER_A_VERSION, uid: uid || null, ts: jetzt, step, daten: daten || {} }));
    return true;
  } catch (e) { return false; }
}

export function entwurfLoeschen(speicher, key) {
  try { if (speicher) speicher.removeItem(key); } catch (e) { /* best-effort */ }
}

// Liest den Entwurf. Kaputte, abgelaufene (> 2 h) oder vor dem letzten
// Abmelden gespeicherte Entwürfe werden gelöscht (null).
export function entwurfLesen(speicher, key, jetzt = Date.now()) {
  if (!speicher) return null;
  let d = null;
  try {
    const roh = speicher.getItem(key);
    if (!roh) return null;
    d = JSON.parse(roh);
  } catch (e) { entwurfLoeschen(speicher, key); return null; }
  const ts = d && Number(d.ts);
  if (!d || !d.daten || typeof d.daten !== 'object' || !ts || (jetzt - ts) > ENTWURF_MAX_MS) {
    entwurfLoeschen(speicher, key);
    return null;
  }
  let abgemeldet = 0;
  try { abgemeldet = Number(speicher.getItem(ABGEMELDET_KEY)) || 0; } catch (e) { abgemeldet = 0; }
  if (abgemeldet && abgemeldet >= ts) { entwurfLoeschen(speicher, key); return null; }
  return d;
}

// Regel 3: Darf der Entwurf zurück? 'hergestellt' | 'wartet' | 'verworfen' | 'kein'.
// - fremde Person angemeldet: verwerfen, nie zeigen
// - niemand gültig angemeldet: liegen lassen (wartet)
// - seit dem Laden schon getippt: das Getippte gilt, Entwurf verwerfen
export function entwurfEntscheid(d, { uid, tokenGueltig, hatGetippt } = {}) {
  if (!d) return 'kein';
  const draftUid = d.uid ? String(d.uid) : '';
  if (draftUid && uid && draftUid !== String(uid)) return 'verworfen';
  if (!uid || !tokenGueltig) return 'wartet';
  if (hatGetippt) return 'verworfen';
  return 'hergestellt';
}
