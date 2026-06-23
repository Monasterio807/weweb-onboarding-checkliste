# CLAUDE.md — coded-component-onboarding-checkliste

Diese Datei beschreibt komponentenspezifische Besonderheiten.
**Alle allgemeinen Regeln** (Design-System, Auth-Pattern, Build, Sicherheit) stehen in
`WeWeb-Components/Coded-Components-Vorlage/CLAUDE.md` — zuerst diese lesen.

---

## Zugehörige Supabase-Tabellen

| Tabelle | Zweck |
|---|---|
| `onboarding_checklists` | Kopfdaten (Mitarbeitername, Datum, Status) |
| `onboarding_checklist_items` | Einzelne Punkte (is_done, done_at) |
| `onboarding_item_templates` | Vorlagen, öffentlich lesbar (SELECT, kein JWT nötig) |

RLS ist auf allen 3 Tabellen aktiv. `onboarding_item_templates` hat eine Policy `FOR SELECT USING (true)`.

## Status-Mapping (Checkliste)

| Status DB | Badge | Bedeutung |
|---|---|---|
| `offen` | neutral | Noch kein Item abgehakt |
| `in_bearbeitung` | warning | Mindestens ein Item erledigt |
| `abgeschlossen` | success | Alle Items erledigt |

Status wird bei jedem `toggleItem()`-Aufruf lokal berechnet und per PATCH in die DB geschrieben.

## Hinweise für Änderungen

- `fetchWithTimeout` mit 10s-AbortController — immer verwenden
- `selectedTemplateIds` ist ein `Set` — beim Mutieren immer neues Set erstellen (Reaktivität!)
- `togglingIds` ist ein `Set` — gleiche Regel
- Items werden optimistisch gepatcht (UI sofort, DB parallel)
- Template-Items beim Erstellen: alle vorausgewählt (`new Set(ids)`)
