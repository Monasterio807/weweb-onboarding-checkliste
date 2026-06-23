# coded-component-onboarding-checkliste

WeWeb Coded Component für **Imploya / HRklar** — Onboarding-Checkliste für neue Mitarbeitende.

## Dateien

| Datei | Zweck |
|---|---|
| `ww-config.js` | WeWeb-Editor-Properties + Trigger-Events |
| `src/wwElement.vue` | Komponente (Template + Script + Scoped Style) |
| `package.json` | npm-Metadaten, Build-Script |
| `.gitignore` | node_modules, dist, .DS_Store |

## Properties

| Property | Typ | Pflicht | Default | Beschreibung |
|---|---|---|---|---|
| `authToken` | Text | ja | — | User-JWT (Supabase Auth) |
| `apiKey` | Text | ja | — | Anon-/Publishable-Key (NIE service_role) |
| `supabaseUrl` | Text | nein | `https://ztvqsxdudzdyqgeylujr.supabase.co` | Supabase-Projekt-URL |
| `backUrl` | Text | nein | `/dashboard` | Ziel des «Zurück»-Links |

## Trigger-Events

| Event | Payload | Wann |
|---|---|---|
| `loaded` | `{}` | Checklisten-Liste erfolgreich geladen |
| `created` | `{ checklist_id }` | Neue Checkliste angelegt |
| `itemtoggled` | `{ item_id, is_done }` | Item abgehakt / als offen markiert |
| `error` | `{ reason }` | Unerwarteter Fehler |

## Drei Ansichten

1. **Liste** — Alle Checklisten des Users mit Fortschrittsbalken, sortiert offen → in Bearbeitung → abgeschlossen
2. **Erstellen** — Formular (Name, Eintrittsdatum) + Vorauswahl der Template-Items
3. **Detail** — Items einer Checkliste abhaken, gruppiert nach Kategorie

## Backend-Tabellen

- `onboarding_checklists` — eine Checkliste pro Mitarbeitenden
- `onboarding_checklist_items` — einzelne abhakbare Punkte
- `onboarding_item_templates` — Vorlagen (beim Erstellen vorausgewählt)

## Build & Deploy

```bash
npm i
npm run build -- name=onboarding-checkliste type=wwobject
```

Dann in WeWeb über «Coded Components → Import» das generierte Paket hochladen.

## Sicherheit

- Nur Anon-/Publishable-Key + User-JWT — **kein** service_role im Frontend
- RLS filtert alle Daten serverseitig auf den eingeloggten User
- Keine Tokens/PII in Console-Logs (Production)
