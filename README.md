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
2. **Erstellen** — «Für wen ist die Checkliste?»: Auswahl aus den erfassten Mitarbeitenden (RPC `get_user_employees`, schreibt `employee_id` mit, Eintrittsdatum wird vorbelegt), Freitext nur als Rückfall («Andere Person» oder leere Liste); Link «Eintritt erfassen» → `/vertrag-erstellen`. Keine zweite Checkliste pro `employee_id`: vor dem Anlegen wird frisch nachgesehen (auto-create-onboarding legt selbst Listen an). Eine Altliste ohne `employee_id` zählt nur, wenn ihr Name exakt passt und genau eine erfasste Person so heisst. Das Eintrittsdatum wird beim Personenwechsel neu vorbelegt, eine Handeingabe bleibt. Seit 24.09.2026 (Vollaudit s2-B04), sichtbarer Name «Eintritts-Checkliste».
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
