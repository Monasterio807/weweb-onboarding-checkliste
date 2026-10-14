<template>
  <div class="hrk-root">
    <main class="oc-main">

      <!-- ====== ANSICHT: LISTE ====== -->
      <div v-if="view === 'list'">
        <header class="oc-top">
          <div class="oc-wrap oc-head">
            <div class="oc-head__main">
              <p v-if="!loading && !authError && !loadError" class="oc-lab">
                {{ checklists.length === 0 ? 'Noch keine Checkliste angelegt' : checklists.length + ' ' + (checklists.length === 1 ? 'Checkliste' : 'Checklisten') }}
              </p>
              <h1 class="oc-h1">Eintritts-Checklisten</h1>
            </div>
            <div class="oc-head__act">
              <button
                class="oc-bk"
                :disabled="loading"
                aria-label="Aktualisieren"
                @click="loadChecklists"
              ><svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><polyline points="20,4 20,9 15,9"/></svg><span>Aktualisieren</span></button>
              <!-- eine Hauptaktion pro Seite: im Leerzustand sitzt sie im Leerzustand selbst -->
              <button
                v-if="!authError && (loading || loadError || checklists.length > 0)"
                class="oc-fw"
                aria-label="Neue Checkliste anlegen"
                @click="startCreate"
              >Neue Checkliste<svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg></button>
            </div>
          </div>
        </header>

        <!-- Laden -->
        <div v-if="loading" class="oc-band oc-band--grau">
          <div class="oc-wrap hrk-state" aria-live="polite">
            <div class="hrk-spinner" aria-hidden="true"></div>
            <p class="hrk-muted">Checklisten werden geladen …</p>
          </div>
        </div>

        <!-- Auth-Fehler -->
        <div v-else-if="authError" class="oc-band oc-band--grau">
          <div class="oc-wrap hrk-state" role="alert" aria-live="assertive">
            <p class="hrk-state__title">Bitte melde dich an, um deine Checklisten zu sehen.</p>
            <a class="oc-fw" :href="loginHref">Anmelden</a>
          </div>
        </div>

        <!-- Netzwerk-/Ladefehler -->
        <div v-else-if="loadError" class="oc-band oc-band--grau">
          <div class="oc-wrap hrk-state" role="alert" aria-live="assertive">
            <p class="hrk-state__title">{{ loadError }}</p>
            <button class="oc-bk" @click="loadChecklists">Erneut versuchen</button>
          </div>
        </div>

        <!-- Leer -->
        <div v-else-if="checklists.length === 0" class="oc-band oc-band--grau">
          <div class="oc-wrap hrk-state">
            <svg class="hrk-icon hrk-icon--lg oc-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="2"/><polyline points="8,12.5 11,15.5 16.5,9.5"/></svg>
            <p class="hrk-state__title">Noch keine Checkliste angelegt</p>
            <p class="hrk-muted">
              Leg für neue Mitarbeitende eine Checkliste an und hake beim Eintritt Punkt für Punkt ab.
            </p>
            <button class="oc-fw oc-fw--lg" @click="startCreate">Erste Checkliste anlegen<svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg></button>
          </div>
        </div>

        <!-- Liste: Zeilen mit Haarlinien statt Karten -->
        <section v-else class="oc-band oc-band--grau">
          <div class="oc-wrap oc-grp">
            <div class="oc-grp__lab">
              <span class="oc-nr" aria-hidden="true">01</span>
              <h2 class="oc-gt">Checklisten</h2>
            </div>
            <div class="oc-grp__body oc-rows">
              <div
                v-for="cl in sortedChecklists"
                :key="cl.id"
                class="oc-row"
                role="button"
                tabindex="0"
                :aria-label="'Checkliste für ' + cl.employee_name + ' öffnen'"
                @click="openChecklist(cl)"
                @keydown.enter="openChecklist(cl)"
                @keydown.space.prevent="openChecklist(cl)"
              >
                <div class="oc-row__head">
                  <div class="oc-row__main">
                    <h3 class="oc-row__name">{{ cl.employee_name }}</h3>
                    <p class="oc-row__meta">
                      Eintritt: {{ cl.start_date ? formatDate(cl.start_date) : '–' }}
                      <span class="oc-row__dot" aria-hidden="true">·</span>
                      Angelegt: {{ formatDate(cl.created_at) }}
                    </p>
                  </div>
                  <span class="hrk-badge" :class="statusBadge(cl.status).cls">
                    {{ statusBadge(cl.status).label }}
                  </span>
                </div>

                <!-- Fortschritt: feine Linie -->
                <div
                  v-if="cl._stats"
                  class="oc-prog"
                  :aria-label="cl._stats.done + ' von ' + cl._stats.total + ' Punkte erledigt'"
                >
                  <div class="oc-prog__txt">
                    <span class="hrk-small hrk-muted">{{ cl._stats.done }}&thinsp;/&thinsp;{{ cl._stats.total }} erledigt</span>
                    <span class="hrk-small hrk-muted hrk-num">{{ cl._stats.pct }}%</span>
                  </div>
                  <div class="oc-track" role="progressbar" :aria-valuenow="cl._stats.pct" aria-valuemin="0" aria-valuemax="100">
                    <div class="oc-bar" :style="{ width: cl._stats.pct + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- ====== ANSICHT: ERSTELLEN ====== -->
      <div v-else-if="view === 'create'">
        <header class="oc-top">
          <div class="oc-wrap">
            <button class="oc-bk oc-back" @click="view = 'list'"><svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="20" y1="12" x2="5" y2="12"/><polyline points="11,6 5,12 11,18"/></svg>Zurück</button>
            <h1 class="oc-h1">Neue Eintritts-Checkliste</h1>
          </div>
        </header>

        <!-- Formular -->
        <section class="oc-band oc-band--grau">
          <div class="oc-wrap oc-grp">
            <div class="oc-grp__lab">
              <span class="oc-nr" aria-hidden="true">01</span>
              <h2 class="oc-gt">Angaben</h2>
            </div>
            <div class="oc-grp__body">
              <!-- s2-B04: Person aus den Mitarbeitenden wählen, Freitext nur als Rückfall -->
              <div v-if="employeesLoading" class="hrk-field" aria-live="polite">
                <p class="hrk-label">Für wen ist die Checkliste?</p>
                <p class="hrk-muted hrk-small oc-m0">Mitarbeitende werden geladen …</p>
              </div>

              <div v-else-if="employees.length" class="hrk-field">
                <label class="hrk-label" for="oc-person">Für wen ist die Checkliste?</label>
                <select
                  id="oc-person"
                  v-model="form.employee_id"
                  class="hrk-select"
                  :class="{ 'hrk-input--error': formErrors.employee_id }"
                  :aria-invalid="formErrors.employee_id ? 'true' : null"
                  :aria-describedby="formErrors.employee_id ? 'oc-person-error oc-person-hint' : 'oc-person-hint'"
                >
                  <option value="">Bitte wählen</option>
                  <option v-for="e in sortedEmployees" :key="e.id" :value="e.id">{{ employeeLabel(e) }}</option>
                  <option :value="andereWert">Andere Person (Name eingeben)</option>
                </select>
                <p v-if="formErrors.employee_id" id="oc-person-error" class="hrk-field-error">{{ formErrors.employee_id }}</p>
                <p id="oc-person-hint" class="hrk-hint">
                  Neue Person? Zuerst unter <a class="hrk-link" :href="eintrittHref">Eintritt erfassen</a> anlegen.
                </p>
              </div>

              <div v-if="freitextAktiv" class="hrk-field">
                <label class="hrk-label" for="oc-name">{{ employees.length ? 'Vorname und Name' : 'Für wen ist die Checkliste?' }}</label>
                <input
                  id="oc-name"
                  v-model="form.employee_name"
                  class="hrk-input"
                  :class="{ 'hrk-input--error': formErrors.employee_name }"
                  type="text"
                  placeholder="z.B. Maria Muster"
                  autocomplete="name"
                  :aria-invalid="formErrors.employee_name ? 'true' : null"
                  :aria-describedby="formErrors.employee_name ? 'oc-name-error' : (employees.length ? null : 'oc-name-hint')"
                />
                <p v-if="formErrors.employee_name" id="oc-name-error" class="hrk-field-error">{{ formErrors.employee_name }}</p>
                <p v-if="!employees.length" id="oc-name-hint" class="hrk-hint">
                  Neue Person? Zuerst unter <a class="hrk-link" :href="eintrittHref">Eintritt erfassen</a> anlegen.
                </p>
              </div>

              <div class="hrk-field oc-field-date">
                <label class="hrk-label" for="oc-date">Eintrittsdatum</label>
                <input
                  id="oc-date"
                  v-model="form.start_date"
                  class="hrk-input"
                  type="date"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Template-Items laden / anzeigen -->
        <section v-if="templatesLoading || templateError || templateItems.length" class="oc-band oc-band--weiss">
          <div class="oc-wrap oc-grp">
            <div class="oc-grp__lab">
              <span class="oc-nr" aria-hidden="true">02</span>
              <h2 class="oc-gt">Checklisten-Punkte wählen</h2>
              <p v-if="templateItems.length && !templatesLoading && !templateError" class="oc-gd">Alle Punkte sind vorausgewählt. Du kannst einzelne abwählen.</p>
            </div>
            <div class="oc-grp__body">
              <div v-if="templatesLoading" class="hrk-state hrk-state--mini" aria-live="polite">
                <div class="hrk-spinner" aria-hidden="true"></div>
                <p class="hrk-muted">Checklisten-Punkte werden geladen …</p>
              </div>

              <div v-else-if="templateError" class="hrk-note hrk-note--warn" role="alert">
                <p class="oc-m0">{{ templateError }}</p>
                <button class="oc-bk oc-mt" @click="loadTemplates">
                  Erneut versuchen
                </button>
              </div>

              <div v-else-if="templateItems.length">
                <template v-for="cat in templateCategories" :key="cat">
                  <h3 class="oc-sub-h">{{ cat }}</h3>
                  <div
                    v-for="item in templatesByCategory[cat]"
                    :key="item.id"
                    class="oc-item"
                    :class="{ 'oc-item--active': selectedTemplateIds.has(item.id) }"
                    role="checkbox"
                    :aria-checked="selectedTemplateIds.has(item.id)"
                    tabindex="0"
                    @click="toggleTemplate(item.id)"
                    @keydown.space.prevent="toggleTemplate(item.id)"
                    @keydown.enter="toggleTemplate(item.id)"
                  >
                    <span class="oc-box" :class="{ 'oc-box--checked': selectedTemplateIds.has(item.id) }">
                      <svg v-if="selectedTemplateIds.has(item.id)" class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="5,12.5 10,17.5 19,7"/></svg>
                    </span>
                    <div class="oc-item__txt">
                      <span class="oc-item__title">{{ item.title }}</span>
                      <span v-if="item.description" class="hrk-muted hrk-small oc-item__desc">{{ item.description }}</span>
                    </div>
                  </div>
                </template>

                <p class="hrk-muted hrk-small oc-count">
                  {{ selectedTemplateIds.size }} von {{ templateItems.length }} Punkte ausgewählt
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Erstell-Fehler -->
        <div v-if="createError" class="oc-wrap oc-err">
          <div class="hrk-note hrk-note--danger" role="alert" aria-live="assertive">
            <p class="oc-m0">{{ createError }}</p>
          </div>
        </div>

        <!-- Hauptaktion -->
        <div class="oc-cta">
          <div class="oc-wrap">
            <button
              class="oc-fw oc-fw--lg"
              :disabled="creating || !kannAnlegen"
              aria-label="Checkliste anlegen"
              @click="createChecklist"
            >
              <span v-if="creating" class="oc-busy">
                <span class="hrk-spinner oc-spin" aria-hidden="true"></span>
                Wird angelegt …
              </span>
              <span v-else>Checkliste anlegen</span>
              <svg v-if="!creating" class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ====== ANSICHT: DETAIL ====== -->
      <div v-else-if="view === 'detail' && activeChecklist">
        <header class="oc-top">
          <div class="oc-wrap">
            <button class="oc-bk oc-back" @click="view = 'list'"><svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="20" y1="12" x2="5" y2="12"/><polyline points="11,6 5,12 11,18"/></svg>Alle Checklisten</button>

            <p v-if="linkHinweis" class="hrk-note hrk-note--muted hrk-small">{{ linkHinweis }}</p>

            <div class="oc-head">
              <div class="oc-head__main">
                <p class="oc-lab">Eintritt: {{ activeChecklist.start_date ? formatDate(activeChecklist.start_date) : '–' }}</p>
                <h1 class="oc-h1">{{ activeChecklist.employee_name }}</h1>
              </div>
              <span class="hrk-badge" :class="statusBadge(activeChecklist.status).cls">
                {{ statusBadge(activeChecklist.status).label }}
              </span>
            </div>

            <!-- Fortschritt -->
            <div class="oc-prog oc-prog--lg" :aria-label="detailStats.done + ' von ' + detailStats.total + ' Punkte erledigt'">
              <div class="oc-prog__txt">
                <span class="hrk-small oc-strong">
                  Fortschritt: {{ detailStats.done }}&thinsp;/&thinsp;{{ detailStats.total }} Punkte erledigt
                </span>
                <span class="hrk-small hrk-num oc-strong">{{ detailStats.pct }}%</span>
              </div>
              <div class="oc-track oc-track--lg" role="progressbar" :aria-valuenow="detailStats.pct" aria-valuemin="0" aria-valuemax="100">
                <div class="oc-bar" :style="{ width: detailStats.pct + '%' }"></div>
              </div>
            </div>
          </div>
        </header>

        <!-- Items laden -->
        <div v-if="itemsLoading" class="oc-band oc-band--grau">
          <div class="oc-wrap hrk-state" aria-live="polite">
            <div class="hrk-spinner" aria-hidden="true"></div>
            <p class="hrk-muted">Checklisten-Punkte werden geladen …</p>
          </div>
        </div>

        <div v-else-if="itemsError" class="oc-band oc-band--grau">
          <div class="oc-wrap hrk-state" role="alert" aria-live="assertive">
            <p class="hrk-state__title">{{ itemsError }}</p>
            <button class="oc-bk" @click="loadItems(activeChecklist.id)">Erneut versuchen</button>
          </div>
        </div>

        <!-- Items nach Kategorie: Weiss/Warmgrau im Wechsel -->
        <div v-else>
          <section
            v-for="(cat, ci) in itemCategories"
            :key="cat"
            class="oc-band"
            :class="ci % 2 === 0 ? 'oc-band--grau' : 'oc-band--weiss'"
          >
            <div class="oc-wrap oc-grp">
              <div class="oc-grp__lab">
                <span class="oc-nr" aria-hidden="true">{{ String(ci + 1).padStart(2, '0') }}</span>
                <h2 class="oc-gt">{{ cat }}</h2>
              </div>
              <div class="oc-grp__body">
                <div
                  v-for="item in itemsByCategory[cat]"
                  :key="item.id"
                  class="oc-item"
                  :class="{ 'oc-item--done': item.is_done }"
                  role="checkbox"
                  :aria-checked="item.is_done"
                  tabindex="0"
                  :aria-label="(item.is_done ? 'Erledigt: ' : 'Offen: ') + item.title"
                  @click="toggleItem(item)"
                  @keydown.space.prevent="toggleItem(item)"
                  @keydown.enter="toggleItem(item)"
                >
                  <span
                    class="oc-box"
                    :class="{ 'oc-box--checked': item.is_done }"
                    aria-hidden="true"
                  >
                    <svg v-if="item.is_done" class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="5,12.5 10,17.5 19,7"/></svg>
                  </span>
                  <div class="oc-item__txt">
                    <span class="oc-item__title" :class="{ 'oc-item__title--done': item.is_done }">
                      {{ item.title }}
                    </span>
                    <span v-if="item.description" class="hrk-muted hrk-small oc-item__desc">
                      {{ item.description }}
                    </span>
                    <span v-if="item.is_done && item.done_at" class="hrk-muted hrk-small oc-item__desc">
                      Erledigt: {{ formatDate(item.done_at) }}
                    </span>
                  </div>
                  <span v-if="togglingIds.has(item.id)" class="hrk-spinner oc-spin" aria-hidden="true"></span>
                </div>
              </div>
            </div>
          </section>

          <!-- Toggle-Fehler / Sync-Fehler -->
          <div v-if="toggleError || syncError" class="oc-wrap oc-err">
            <div v-if="toggleError" class="hrk-note hrk-note--warn" role="alert" aria-live="polite">
              <p class="oc-m0">{{ toggleError }}</p>
            </div>
            <div v-if="syncError" class="hrk-note hrk-note--danger" role="alert" aria-live="polite">
              <p class="oc-m0">Speichern hat nicht geklappt. Versuche es nochmals.</p>
            </div>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<script>
/**
 * WeWeb Coded Component — coded-component-onboarding-checkliste (imploya / HRklar)
 *
 * Drei Ansichten:
 *  1. Liste   — alle Onboarding-Checklisten des Users
 *  2. Erstellen — Formular (Name, Datum) + Template-Item-Auswahl
 *  3. Detail  — Items einer Checkliste, nach Kategorie, abhakbar mit Fortschrittsbalken
 *
 * Backend: Supabase PostgREST (REST API) + RLS.
 * Tabellen: onboarding_checklists, onboarding_checklist_items, onboarding_item_templates
 * Auth: Anon-Key + User-JWT. Kein service_role im Frontend.
 * Design: einheitliches HRklar-Design-System (.hrk-*).
 */

// Schriften (Stil A, Entscheid 13.10.2026): Gloock (Titel), Archivo (Labels), Inter (Text). Der WeWeb-<head>
// laedt sie nicht. Eigener Link-Id, damit das Paket von header-pro/footer (id hrk-fonts) nicht verdraengt
// wird. Gleicher Anbieter wie bisher; ohne Laden gelten Georgia bzw. System-Schrift.
function hrkEnsureBrandFont() {
  try {
    const doc = (typeof wwLib !== 'undefined' && wwLib && typeof wwLib.getFrontDocument === 'function')
      ? wwLib.getFrontDocument()
      : (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.head || doc.getElementById('hrk-fonts-marke')) return;
    const link = doc.createElement('link');
    link.id = 'hrk-fonts-marke'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600&family=Gloock&family=Inter:wght@400;500;600&display=swap';
    doc.head.appendChild(link);
  } catch (e) { /* Georgia als Rueckfall */ }
}


export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: false, default: '' },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: false, default: () => ({}) },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],

  data() {
    return {
      // Navigation
      view: 'list',          // 'list' | 'create' | 'detail'
      activeChecklist: null,

      // Liste
      loading: false,
      checklists: [],
      authError: false,
      loadError: '',

      // Erstellen
      form: { employee_id: '', employee_name: '', start_date: '' },
      formErrors: {},
      // s2-B04: Personen aus get_user_employees; Freitext nur als Rückfall
      employees: [],
      employeesLoading: false,
      andereWert: '__andere',
      // W2 (Prüfung 24.09.2026): zuletzt automatisch gesetztes Eintrittsdatum. Nur ein Wert,
      // der noch diesem entspricht (oder leer ist), wird beim Personenwechsel ersetzt.
      startAuto: '',
      templateItems: [],
      selectedTemplateIds: new Set(),
      templatesLoading: false,
      templateError: '',
      creating: false,
      linkHinweis: '',
      createError: '',

      // Detail
      items: [],
      itemsLoading: false,
      itemsError: '',
      togglingIds: new Set(),
      toggleError: '',
      syncError: false,
    };
  },

  computed: {
    baseUrl() {
      let url = (this.content && this.content.supabaseUrl) || 'https://ztvqsxdudzdyqgeylujr.supabase.co';
      if (/nemxnflngcfrpamkuesm/.test(String(url))) url = 'https://ztvqsxdudzdyqgeylujr.supabase.co';
      return String(url).replace(/\/+$/, '');
    },
    authHeaders() {
      const key   = (this.content && this.content.apiKey) || '';
      const token = ((this.content && ((this.content && this.content.authToken) || (typeof wwLib !== 'undefined' && wwLib.globalContext && wwLib.globalContext.auth && wwLib.globalContext.auth.session && wwLib.globalContext.auth.session.access_token) || '')) || '').toString();
      const bearer = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      return {
        'apikey':        key,
        'Authorization': bearer,
        'Content-Type':  'application/json',
      };
    },
    backHref() {
      return ((this.content && this.content.backUrl) || '').toString();
    },
    // User-ID aus dem JWT (sub-Claim) — für user_id beim INSERT (RLS: auth.uid() = user_id)
    resolvedUserId() {
      try {
        const token = ((this.content && ((this.content && this.content.authToken) || (typeof wwLib !== 'undefined' && wwLib.globalContext && wwLib.globalContext.auth && wwLib.globalContext.auth.session && wwLib.globalContext.auth.session.access_token) || '')) || '').toString();
        const t = token.replace(/^Bearer\s+/i, '');
        const part = t.split('.')[1];
        if (!part) return '';
        const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(decodeURIComponent(escape(atob(b64))));
        return json && json.sub ? json.sub : '';
      } catch (e) { return ''; }
    },
    loginHref() {
      return (this.content && this.content.loginUrl) || '/anmelden';
    },
    // s2-B04: fester Pfad im Code (kein Property), ww-config-Defaults erreichen live nie.
    eintrittHref() {
      return '/vertrag-erstellen';
    },

    // s2-B04: Personenauswahl
    sortedEmployees() {
      return [...this.employees].sort((a, b) => {
        const la = `${a.lastname || ''} ${a.firstname || ''}`.trim().toLowerCase();
        const lb = `${b.lastname || ''} ${b.firstname || ''}`.trim().toLowerCase();
        return la.localeCompare(lb, 'de-CH');
      });
    },
    gewaehlteEmployee() {
      const id = this.form.employee_id;
      if (!id || id === this.andereWert) return null;
      return this.employees.find((e) => String(e.id) === String(id)) || null;
    },
    // Freitext erscheint, wenn es keine Liste gibt (leer oder Ladefehler) oder «Andere Person» gewählt ist.
    freitextAktiv() {
      if (this.employeesLoading) return false;
      return this.employees.length === 0 || this.form.employee_id === this.andereWert;
    },
    kannAnlegen() {
      if (this.gewaehlteEmployee) return true;
      return this.freitextAktiv && !!(this.form.employee_name || '').trim();
    },

    // Sortiert: offen → in_bearbeitung → abgeschlossen
    sortedChecklists() {
      const order = { offen: 0, in_bearbeitung: 1, abgeschlossen: 2 };
      return [...this.checklists].sort((a, b) => {
        const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
        if (diff !== 0) return diff;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    },

    // Template-Kategorien (geordnet nach sort_order)
    templateCategories() {
      const seen = [];
      this.templateItems.forEach(t => {
        if (!seen.includes(t.category)) seen.push(t.category);
      });
      return seen;
    },
    templatesByCategory() {
      const map = {};
      this.templateItems.forEach(t => {
        if (!map[t.category]) map[t.category] = [];
        map[t.category].push(t);
      });
      return map;
    },

    // Detail-Items nach Kategorie
    itemCategories() {
      const seen = [];
      this.items.forEach(i => {
        if (!seen.includes(i.category)) seen.push(i.category);
      });
      return seen;
    },
    itemsByCategory() {
      const map = {};
      this.items.forEach(i => {
        if (!map[i.category]) map[i.category] = [];
        map[i.category].push(i);
      });
      return map;
    },

    detailStats() {
      return this._calcStats(this.items);
    },
  },

  watch: {
    'content.authToken'(val, old) {
      if (val && val !== old) this.init();
    },
    'content.apiKey'(val, old) {
      if (val && val !== old) this.init();
    },
    // s2-B04: Eintrittsdatum aus dem Personenstamm vorbelegen (nur wenn noch leer),
    // Fehler löschen, sobald eine Auswahl da ist.
    'form.employee_id'(id) {
      const e = this.gewaehlteEmployee;
      // W2: beim Wechsel das Datum der neuen Person übernehmen, eine Handeingabe nie überschreiben.
      if (!this.form.start_date || this.form.start_date === this.startAuto) {
        const neu = e && e.employment_start ? String(e.employment_start).slice(0, 10) : '';
        this.form.start_date = neu;
        this.startAuto = neu;
      }
      if (id && this.formErrors.employee_id) {
        const next = { ...this.formErrors };
        delete next.employee_id;
        this.formErrors = next;
      }
    },
    'form.employee_name'(v) {
      if (v && v.trim() && this.formErrors.employee_name) {
        const next = { ...this.formErrors };
        delete next.employee_name;
        this.formErrors = next;
      }
    },
  },

  mounted() {
    hrkEnsureBrandFont();
    this.init();
  },

  methods: {
    /* ──────────────────── Init ──────────────────── */
    init() {
      this.view = 'list';
      this.loadChecklists();
    },

    /* ──────────────────── Hilfsmethoden ──────────────────── */
    fetchWithTimeout(url, opts, ms = 10000) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ms);
      return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
    },

    formatDate(raw) {
      if (!raw) return '–';
      try {
        return new Date(raw).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        return raw;
      }
    },

    statusBadge(status) {
      const map = {
        offen:          { cls: 'hrk-badge--neutral', label: 'Offen' },
        in_bearbeitung: { cls: 'hrk-badge--warning',  label: 'In Bearbeitung' },
        abgeschlossen:  { cls: 'hrk-badge--success',  label: 'Abgeschlossen' },
      };
      return map[status] || { cls: 'hrk-badge--neutral', label: status || '–' };
    },

    _calcStats(items) {
      const total = items.length;
      const done  = items.filter(i => i.is_done).length;
      const pct   = total ? Math.round((done / total) * 100) : 0;
      return { total, done, pct };
    },

    _isAuth() {
      const token = ((this.content && ((this.content && this.content.authToken) || (typeof wwLib !== 'undefined' && wwLib.globalContext && wwLib.globalContext.auth && wwLib.globalContext.auth.session && wwLib.globalContext.auth.session.access_token) || '')) || '').toString();
      return token.length > 10;
    },

    /* ──────────────────── LISTE laden ──────────────────── */
    async loadChecklists() {
      this.loading    = true;
      this.authError  = false;
      this.loadError  = '';
      this.checklists = [];

      if (!this._isAuth()) {
        this.authError = true;
        this.loading = false;
        return;
      }

      try {
        const url = `${this.baseUrl}/rest/v1/onboarding_checklists?select=*&order=created_at.desc`;
        const res = await this.fetchWithTimeout(url, {
          method: 'GET',
          headers: { ...this.authHeaders, 'Prefer': 'return=representation' },
        });

        if (res.status === 401 || res.status === 403) {
          this.authError = true;
          return;
        }
        if (!res.ok) {
          this.loadError = `Checklisten konnten nicht geladen werden. Bitte versuch es nochmals.`;
          return;
        }

        const data = await res.json();
        // Stats nachladen
        this.checklists = await this._enrichWithStats(data);
        this.$emit('trigger-event', { name: 'loaded', event: {} });

      } catch (err) {
        if (err && err.name === 'AbortError') {
          this.loadError = 'Die Verbindung hat zu lange gedauert. Bitte versuch es nochmals.';
        } else {
          this.loadError = 'Die Verbindung hat nicht geklappt. Prüfe dein Internet und versuche es nochmals.';
        }
      } finally {
        this.loading = false;
      }
    },

    async _enrichWithStats(checklists) {
      if (!checklists || !checklists.length) return [];
      // Alle Items für alle Checklisten auf einmal holen (IN-Filter)
      const ids = checklists.map(c => c.id);
      const inFilter = `(${ids.join(',')})`;
      try {
        const url = `${this.baseUrl}/rest/v1/onboarding_checklist_items?select=checklist_id,is_done&checklist_id=in.${inFilter}`;
        const res = await this.fetchWithTimeout(url, { headers: this.authHeaders });
        if (!res.ok) return checklists.map(c => ({ ...c, _stats: null }));
        const allItems = await res.json();
        // Map checklist_id → items
        const byId = {};
        allItems.forEach(item => {
          if (!byId[item.checklist_id]) byId[item.checklist_id] = [];
          byId[item.checklist_id].push(item);
        });
        return checklists.map(c => ({
          ...c,
          _stats: this._calcStats(byId[c.id] || []),
        }));
      } catch {
        return checklists.map(c => ({ ...c, _stats: null }));
      }
    },

    /* ──────────────────── ERSTELLEN ──────────────────── */
    startCreate() {
      this.form        = { employee_id: '', employee_name: '', start_date: '' };
      this.startAuto   = '';
      this.formErrors  = {};
      this.createError = '';
      this.linkHinweis = '';
      this.selectedTemplateIds = new Set();
      this.view = 'create';
      this.loadTemplates();
      this.loadEmployees();
    },

    employeeLabel(e) {
      const name = `${(e && e.firstname) || ''} ${(e && e.lastname) || ''}`.trim() || 'Ohne Namen';
      return e && e.employment_start ? `${name} (Eintritt ${this.formatDate(e.employment_start)})` : name;
    },

    // s2-B04: dieselbe Quelle wie Dossier, Zeiterfassung und Dienstplan. get_user_employees()
    // ist SECURITY DEFINER und filtert serverseitig auf auth.uid(). Schlägt das Laden fehl,
    // bleibt die Liste leer und das Freitextfeld erscheint als Rückfall.
    async loadEmployees() {
      this.employeesLoading = true;
      this.employees = [];
      try {
        const url = `${this.baseUrl}/rest/v1/rpc/get_user_employees?select=id,firstname,lastname,employment_start&order=lastname.asc,firstname.asc`;
        const res = await this.fetchWithTimeout(url, { headers: { ...this.authHeaders, Accept: 'application/json' } });
        if (!res.ok) {
          console.warn('[onboarding-checkliste] Mitarbeitende laden HTTP', res.status);
          return;
        }
        const rows = await res.json().catch(() => []);
        this.employees = Array.isArray(rows) ? rows.filter((r) => r && r.id) : [];
      } catch (err) {
        console.warn('[onboarding-checkliste] Mitarbeitende laden fehlgeschlagen', err && err.name);
      } finally {
        this.employeesLoading = false;
      }
    },

    async loadTemplates() {
      this.templatesLoading = true;
      this.templateError    = '';
      this.templateItems    = [];

      try {
        const url = `${this.baseUrl}/rest/v1/onboarding_item_templates?select=*&order=sort_order.asc`;
        const res = await this.fetchWithTimeout(url, {
          method: 'GET',
          headers: this.authHeaders,
        });
        if (!res.ok) {
          this.templateError = 'Die Vorlagen konnten nicht geladen werden. Versuche es nochmals.';
          return;
        }
        const data = await res.json();
        this.templateItems = data || [];
        // Alle vorausgewählt
        this.selectedTemplateIds = new Set(this.templateItems.map(t => t.id));
      } catch (err) {
        if (err && err.name === 'AbortError') {
          this.templateError = 'Das Laden der Vorlagen hat zu lange gedauert. Bitte versuch es nochmals.';
        } else {
          this.templateError = 'Die Vorlagen konnten nicht geladen werden. Prüfe dein Internet und versuche es nochmals.';
        }
      } finally {
        this.templatesLoading = false;
      }
    },

    toggleTemplate(id) {
      const next = new Set(this.selectedTemplateIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      this.selectedTemplateIds = next;
    },

    async createChecklist() {
      this.formErrors  = {};
      this.createError = '';

      // s2-B04: Person kommt aus der Auswahl (employee_id), Freitext nur als Rückfall.
      const emp = this.gewaehlteEmployee;
      if (!emp && !this.freitextAktiv) {
        this.formErrors = { employee_id: 'Bitte wähl die Person aus.' };
        return;
      }
      const nameTrimmed = emp
        ? `${emp.firstname || ''} ${emp.lastname || ''}`.trim()
        : (this.form.employee_name || '').trim();
      if (!nameTrimmed) {
        this.formErrors = emp
          ? { employee_id: 'Bei dieser Person fehlt der Name. Ergänze ihn zuerst unter Mitarbeitende.' }
          : { employee_name: 'Bitte gib Vorname und Name ein.' };
        return;
      }

      // Audit-Fund 2.1 / s2-B04: keine zweite Checkliste für dieselbe Person. Mit gewählter
      // Person zählt die employee_id (auto-create-onboarding und onboarding-start prüfen
      // ebenfalls über employee_id). K4 (Prüfung 24.09.2026): eine Altliste OHNE employee_id
      // zählt nur als Rückfall, wenn ihr Name exakt passt und genau eine erfasste Person so
      // heisst; sonst entsteht eine neue Liste (kein Namensvetter wird verknüpft).
      // Freitext-Rückfall: wie bisher über den Namen (case-/leerzeichen-unabhängig).
      const nameNorm = nameTrimmed.toLowerCase();
      const gleicherName = (c) => (c.employee_name || '').trim().toLowerCase() === nameNorm;
      const empName = (x) => `${(x && x.firstname) || ''} ${(x && x.lastname) || ''}`.trim();
      const namensvetter = emp ? this.employees.filter((x) => empName(x) === nameTrimmed).length : 0;
      const bestehende = emp
        ? (this.checklists.find((c) => c.employee_id && String(c.employee_id) === String(emp.id))
          || (namensvetter === 1 ? this.checklists.find((c) => !c.employee_id && (c.employee_name || '').trim() === nameTrimmed) : null))
        : this.checklists.find(gleicherName);
      if (bestehende) {
        await this._bestehendeOeffnen(bestehende);
        return;
      }

      this.creating = true;
      try {
        // K5 (Prüfung 24.09.2026): die Liste auf der Seite kann veraltet sein, weil
        // auto-create-onboarding für neue Personen selbst eine Checkliste anlegt. Vor dem
        // Anlegen frisch nachsehen. Schlägt die Abfrage fehl, wird normal angelegt.
        if (emp) {
          try {
            const chk = await this.fetchWithTimeout(
              `${this.baseUrl}/rest/v1/onboarding_checklists?employee_id=eq.${encodeURIComponent(emp.id)}&select=*&order=created_at.asc&limit=1`,
              { headers: this.authHeaders }
            );
            if (chk.ok) {
              const rows = await chk.json().catch(() => []);
              if (Array.isArray(rows) && rows.length) {
                await this.loadChecklists();
                await this._bestehendeOeffnen(this.checklists.find((c) => c.id === rows[0].id) || rows[0]);
                return;
              }
            } else {
              console.warn('[onboarding-checkliste] Vorab-Prüfung HTTP', chk.status);
            }
          } catch (e) {
            console.warn('[onboarding-checkliste] Vorab-Prüfung fehlgeschlagen', e && e.name);
          }
        }
        // 1. Checkliste anlegen
        const body = {
          employee_name: nameTrimmed,
          // s2-B04: Spalte existiert live (uuid, nullable, ohne Fremdschlüssel), geprüft 24.09.2026.
          ...(emp ? { employee_id: emp.id } : {}),
          status: 'offen',
          ...(this.form.start_date ? { start_date: this.form.start_date } : {}),
          // user_id ist NOT NULL + RLS WITH CHECK auth.uid() = user_id.
          // Fallback: Spalten-Default auth.uid() (Migration 20260702150100).
          ...(this.resolvedUserId ? { user_id: this.resolvedUserId } : {}),
        };
        const clRes = await this.fetchWithTimeout(
          `${this.baseUrl}/rest/v1/onboarding_checklists`,
          {
            method: 'POST',
            headers: { ...this.authHeaders, 'Prefer': 'return=representation' },
            body: JSON.stringify(body),
          }
        );

        if (clRes.status === 401 || clRes.status === 403) {
          this.createError = 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.';
          return;
        }
        if (!clRes.ok) {
          this.createError = `Fehler beim Anlegen der Checkliste. Bitte versuch es nochmals.`;
          console.error('[onboarding-checkliste] create error HTTP', clRes.status);
          return;
        }
        const clData = await clRes.json();
        const checklist = Array.isArray(clData) ? clData[0] : clData;
        const checklistId = checklist.id;

        // 2. Ausgewählte Items anlegen
        const selectedItems = this.templateItems.filter(t => this.selectedTemplateIds.has(t.id));
        if (selectedItems.length) {
          const itemsPayload = selectedItems.map(t => ({
            checklist_id: checklistId,
            category:     t.category,
            title:        t.title,
            description:  t.description || null,
            sort_order:   t.sort_order || 0,
            is_done:      false,
          }));
          let itemsOk = false;
          try {
            const itemRes = await this.fetchWithTimeout(
              `${this.baseUrl}/rest/v1/onboarding_checklist_items`,
              {
                method: 'POST',
                headers: { ...this.authHeaders, 'Prefer': 'return=minimal' },
                body: JSON.stringify(itemsPayload),
              }
            );
            itemsOk = !!itemRes.ok;
            if (!itemsOk) console.warn('[onboarding-checkliste] items insert HTTP', itemRes.status);
          } catch (e) {
            console.warn('[onboarding-checkliste] items insert fehlgeschlagen', e && e.name);
          }
          if (!itemsOk) {
            // Cloud-Fund A1-04-020: eine leere Checkliste lässt sich in der Oberfläche nicht
            // füllen, und die Dubletten-Prüfung würde jedes neue Anlegen darauf umleiten.
            // Darum die eben angelegte Checkliste zurücknehmen (Punkte hängen per CASCADE dran)
            // und den Fehler zeigen, statt «angelegt» zu melden.
            let zurueck = false;
            try {
              const delRes = await this.fetchWithTimeout(
                `${this.baseUrl}/rest/v1/onboarding_checklists?id=eq.${encodeURIComponent(checklistId)}`,
                { method: 'DELETE', headers: { ...this.authHeaders, 'Prefer': 'return=minimal' } }
              );
              zurueck = !!delRes.ok;
              if (!zurueck) console.warn('[onboarding-checkliste] Rücknahme HTTP', delRes.status);
            } catch (e) {
              console.warn('[onboarding-checkliste] Rücknahme fehlgeschlagen', e && e.name);
            }
            this.createError = zurueck
              ? 'Die Punkte der Checkliste konnten nicht angelegt werden. Es wurde nichts gespeichert. Versuche es nochmals.'
              : 'Die Punkte der Checkliste konnten nicht angelegt werden, und die leere Checkliste liess sich nicht zurücknehmen. Bitte melde dich bei uns, bevor du es nochmals versuchst.';
            await this.loadChecklists();
            return;
          }
        }

        this.$emit('trigger-event', { name: 'created', event: { checklist_id: checklistId } });

        // 3. Zur Detailansicht wechseln
        await this.loadChecklists();
        const freshCl = this.checklists.find(c => c.id === checklistId);
        if (freshCl) {
          await this.openChecklist(freshCl);
        } else {
          this.view = 'list';
        }

      } catch (err) {
        if (err && err.name === 'AbortError') {
          this.createError = 'Das hat zu lange gedauert. Versuche es nochmals.';
        } else {
          this.createError = 'Die Checkliste wurde nicht angelegt. Prüfe dein Internet und versuche es nochmals.';
        }
      } finally {
        this.creating = false;
      }
    },

    async _bestehendeOeffnen(cl) {
      this.form = { employee_id: '', employee_name: '', start_date: '' };
      this.startAuto = '';
      this.linkHinweis = `Für ${cl.employee_name} gibt es schon eine Checkliste. Du siehst sie hier, eine zweite haben wir nicht angelegt.`;
      await this.openChecklist(cl, { keepHint: true });
    },

    /* ──────────────────── DETAIL ──────────────────── */
    async openChecklist(cl, opts = {}) {
      if (!opts.keepHint) this.linkHinweis = '';
      this.activeChecklist = cl;
      this.view = 'detail';
      this.$nextTick(() => { const h1 = this.$el.querySelector('h1'); if (h1) h1.focus(); });
      await this.loadItems(cl.id);
    },

    async loadItems(checklistId) {
      this.itemsLoading = true;
      this.itemsError   = '';
      this.toggleError  = '';
      this.items        = [];

      try {
        const url = `${this.baseUrl}/rest/v1/onboarding_checklist_items?checklist_id=eq.${checklistId}&select=*&order=sort_order.asc,created_at.asc`;
        const res = await this.fetchWithTimeout(url, { headers: this.authHeaders });

        if (res.status === 401 || res.status === 403) {
          this.itemsError = 'Keine Berechtigung. Bitte erneut anmelden.';
          return;
        }
        if (!res.ok) {
          this.itemsError = `Punkte konnten nicht geladen werden. Bitte erneut versuchen.`;
          return;
        }
        this.items = await res.json();

        // Checklisten-Status nachführen (lokal)
        this._updateChecklistStatus();

      } catch (err) {
        if (err && err.name === 'AbortError') {
          this.itemsError = 'Das hat zu lange gedauert. Versuche es nochmals.';
        } else {
          this.itemsError = 'Die Punkte konnten nicht geladen werden. Prüfe dein Internet und versuche es nochmals.';
        }
      } finally {
        this.itemsLoading = false;
      }
    },

    async toggleItem(item) {
      if (this.togglingIds.has(item.id)) return;

      const next = new Set(this.togglingIds);
      next.add(item.id);
      this.togglingIds = next;
      this.toggleError = '';

      const newDone = !item.is_done;
      const nowIso  = new Date().toISOString();

      try {
        const patch = {
          is_done: newDone,
          done_at: newDone ? nowIso : null,
        };
        const res = await this.fetchWithTimeout(
          `${this.baseUrl}/rest/v1/onboarding_checklist_items?id=eq.${item.id}`,
          {
            method: 'PATCH',
            headers: { ...this.authHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify(patch),
          }
        );

        if (!res.ok) {
          this.toggleError = `Punkt konnte nicht gespeichert werden. Bitte versuch es nochmals.`;
          // Rollback: UI-State zurücksetzen, da der PATCH fehlgeschlagen ist
          const rollbackIdx = this.items.findIndex(i => i.id === item.id);
          if (rollbackIdx !== -1) {
            this.items = [
              ...this.items.slice(0, rollbackIdx),
              { ...this.items[rollbackIdx], is_done: item.is_done, done_at: item.done_at },
              ...this.items.slice(rollbackIdx + 1),
            ];
          }
          return;
        }

        // Optimistisch updaten (nach erfolgreichem PATCH)
        const idx = this.items.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          this.items = [
            ...this.items.slice(0, idx),
            { ...this.items[idx], is_done: newDone, done_at: newDone ? nowIso : null },
            ...this.items.slice(idx + 1),
          ];
        }

        this._updateChecklistStatus();
        this.$emit('trigger-event', { name: 'itemtoggled', event: { item_id: item.id, is_done: newDone } });

      } catch (err) {
        if (err && err.name === 'AbortError') {
          this.toggleError = 'Das hat zu lange gedauert. Versuche es nochmals.';
        } else {
          this.toggleError = 'Der Punkt wurde nicht gespeichert. Prüfe dein Internet und versuche es nochmals.';
        }
        // Rollback: UI-State zurücksetzen (Netzwerkfehler = kein PATCH durchgekommen)
        const catchIdx = this.items.findIndex(i => i.id === item.id);
        if (catchIdx !== -1) {
          this.items = [
            ...this.items.slice(0, catchIdx),
            { ...this.items[catchIdx], is_done: item.is_done, done_at: item.done_at },
            ...this.items.slice(catchIdx + 1),
          ];
        }
      } finally {
        const next2 = new Set(this.togglingIds);
        next2.delete(item.id);
        this.togglingIds = next2;
      }
    },

    _updateChecklistStatus() {
      if (!this.activeChecklist) return;
      const total = this.items.length;
      const done  = this.items.filter(i => i.is_done).length;
      let newStatus = 'offen';
      if (total > 0 && done === total) {
        newStatus = 'abgeschlossen';
      } else if (done > 0) {
        newStatus = 'in_bearbeitung';
      }
      if (this.activeChecklist.status !== newStatus) {
        this.activeChecklist = { ...this.activeChecklist, status: newStatus };
        // In DB nachführen (fire-and-forget, kein await)
        this.fetchWithTimeout(
          `${this.baseUrl}/rest/v1/onboarding_checklists?id=eq.${this.activeChecklist.id}`,
          {
            method: 'PATCH',
            headers: { ...this.authHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() }),
          }
        ).then((r) => {
          if (r && r.ok) { this.syncError = false; }
          else { console.warn('Checkliste Sync-Fehler: Status', r && r.status); this.syncError = true; }
        })
          .catch((err) => { console.warn('Checkliste Sync-Fehler:', err); this.syncError = true; });
        // Auch in der Liste updaten
        const idx = this.checklists.findIndex(c => c.id === this.activeChecklist.id);
        if (idx !== -1) {
          this.checklists = [
            ...this.checklists.slice(0, idx),
            { ...this.checklists[idx], status: newStatus },
            ...this.checklists.slice(idx + 1),
          ];
        }
      }
    },
  },
};
</script>

<style scoped>
/* ============================================================
   HR am Tisch — Design-Tokens (einheitliches App-Design)
   Kopiert aus Coded-Components-Vorlage/design-tokens.css
   ============================================================ */

:root, .hrk-root {
  --hrk-bordeaux:        #72323C;
  --hrk-bordeaux-dark:   #5A2630;
  --hrk-bordeaux-soft:   #F1E7E9;
  --hrk-creme: #F7F5F1;
  --hrk-anthrazit: #241F1C;
  --hrk-gold:            #C3A359;
  --hrk-on-primary:      #FFFFFF;  /* Text/Icons auf primaer (Bordeaux) gefaerbten Flaechen */
  --hrk-surface:         #FFFFFF;
  --hrk-surface-muted: #F2EFEA;
  --hrk-border: #E2DDD5;
  --hrk-border-strong: #CFC8BD;
  --hrk-text: #241F1C;
  --hrk-text-muted:      #6B6357;
  --hrk-success: #2A7254;  --hrk-success-bg: #E5F1EB;
  --hrk-warning: #946010;  --hrk-warning-bg: #FBF1DD;
  --hrk-danger:          #B23A48;  --hrk-danger-bg:  #F8E7E9;
  --hrk-info:            #2F6F9F;  --hrk-info-bg:    #E6F0F7;
  --hrk-neutral:         #6B6357;  --hrk-neutral-bg: #EFEAE2;
  --hrk-font-head: "Archivo", "Inter", system-ui, sans-serif;
  --hrk-font-body: "Inter", "Source Sans 3", system-ui, sans-serif;
  --hrk-fs-h1: 1.875rem;
  --hrk-fs-h2: 1.375rem;
  --hrk-fs-h3: 1.125rem;
  --hrk-fs-body: 1.0625rem;
  --hrk-fs-small: 0.9375rem;
  --hrk-lh-body: 1.55;
  --hrk-fw-regular: 400; --hrk-fw-medium: 500; --hrk-fw-semibold: 600;
  --hrk-space-1: 4px;  --hrk-space-2: 8px;  --hrk-space-3: 12px;
  --hrk-space-4: 16px; --hrk-space-5: 24px; --hrk-space-6: 32px;
  --hrk-space-7: 48px;
  --hrk-radius-sm: 6px; --hrk-radius-md: 6px; --hrk-radius-lg: 10px;
  --hrk-radius-pill: 6px;
  --hrk-shadow-card: 0 1px 2px rgba(40,35,30,.05);
  --hrk-shadow-pop: 0 1px 2px rgba(40,35,30,.05);
  --hrk-focus-ring: 0 0 0 2px var(--hrk-surface), 0 0 0 4px var(--hrk-bordeaux);
  --hrk-tap-min: 44px;
  --hrk-page-max: 880px;
  --hrk-icon-size-sm: 16px;
  --hrk-icon-size-md: 20px;
  --hrk-icon-size-lg: 28px;
  /* Design-Umsetzung 23.09.2026 (Phase 1): Schiefer, Schriften, zwei Radien, ein Schatten */
  --hrk-schiefer: #33475B;
  --hrk-schiefer-dark: #243444;
  --hrk-schiefer-soft: #EBEEF1;
  --hrk-on-dark: #FFFFFF;
  --hrk-on-dark-strong: rgba(255,255,255,.92);
  --hrk-on-dark-soft: rgba(255,255,255,.82);
  --hrk-on-dark-muted: rgba(255,255,255,.40);
  --hrk-on-dark-faint: rgba(255,255,255,.12);
  --hrk-overlay: rgba(20,24,28,.55);
  --hrk-font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --hrk-font-brand: "Gloock", Georgia, serif;
  --hrk-fs-xs: 0.8125rem;
  --hrk-ls-caps: .06em;
  --hrk-radius-field: 6px;
  --hrk-radius-card: 10px;
  --hrk-shadow: 0 1px 2px rgba(40,35,30,.05);
  --hrk-page-wide: 1200px;
  /* Stil A «Editorial» (Entscheid 13.10.2026) */
  --hrk-linie: #D6D0CA;
  --hrk-warmgrau: #EFEBE7;
  --hrk-gold-hauch: #FAF6EC;
  --hrk-schiefer-hauch: #F2F5F8;
  --hrk-font-label: "Archivo", "Inter", system-ui, sans-serif;
}

/* ============================================================
   Stil A «Editorial» (Entscheid 13.10.2026, Phase 2) — gemeinsame Basis.
   Linien statt Karten (Haarlinie #D6D0CA), Text-Knoepfe (Schiefer, Gold-Unterstrich nur fuer die eine Hauptaktion),
   grosse Gloock-Titel, Archivo-Labels in Grossbuchstaben, Weiss/Warmgrau im Wechsel, Label-Spalte 220px + Inhalt.
   Farbrollen: Bordeaux = Links/Hover, Schiefer = Knoepfe und Schritte, Gold = nur Linien und Punkte. Loeschen = Bordeaux-Rand.
   ============================================================ */
.hrk-root, .hrk-root * { box-sizing: border-box; }
.hrk-root {
  width: 100%; /* volle Breite im WeWeb-Flex-Parent (sonst klebt der Inhalt links) */
  font-family: var(--hrk-font-body);
  font-size: var(--hrk-fs-body);
  line-height: var(--hrk-lh-body);
  color: var(--hrk-text);
  background: var(--hrk-surface);
  -webkit-font-smoothing: antialiased;
}
.hrk-root a:focus-visible, .hrk-root button:focus-visible, .hrk-root input:focus-visible, .hrk-root select:focus-visible,
.hrk-root textarea:focus-visible, .hrk-root [tabindex]:focus-visible, .hrk-root summary:focus-visible {
  outline: 2px solid var(--hrk-schiefer); outline-offset: 3px; border-radius: 3px; box-shadow: none;
}
.hrk-muted { color: var(--hrk-text-muted); }
.hrk-small { font-size: var(--hrk-fs-small); }
.hrk-num { font-family: var(--hrk-font-mono); font-variant-numeric: tabular-nums; }
.hrk-stack > * + * { margin-top: var(--hrk-space-4); }
.hrk-icon { width: 20px; height: 20px; flex: none; }
.hrk-icon--sm { width: 16px; height: 16px; }
.hrk-icon--lg { width: 28px; height: 28px; }

/* ---------------- Kopf, Raster, Baender ---------------- */
.oc-main { display: block; width: 100%; }
.oc-wrap { max-width: 1120px; margin: 0 auto; padding: 0 var(--hrk-space-5); }
.oc-top { background: var(--hrk-surface); padding: clamp(40px, 6vw, 64px) 0 clamp(24px, 4vw, 40px); }
.oc-head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--hrk-space-4) var(--hrk-space-5); flex-wrap: wrap; }
.oc-head__main { flex: 1 1 18rem; min-width: 0; }
.oc-head__act { display: flex; align-items: center; gap: var(--hrk-space-5); flex-wrap: wrap; }
.oc-lab { font-family: var(--hrk-font-label); font-size: var(--hrk-fs-xs); font-weight: var(--hrk-fw-semibold); letter-spacing: .14em;
  text-transform: uppercase; color: var(--hrk-text-muted); margin: 0 0 var(--hrk-space-3); }
.oc-h1 { font-family: var(--hrk-font-brand); font-weight: 400; letter-spacing: -.01em; color: var(--hrk-text);
  font-size: clamp(36px, 6.4vw, 72px); line-height: 1.04; margin: 0; overflow-wrap: anywhere; }
.oc-sub { margin: var(--hrk-space-3) 0 0; color: var(--hrk-text-muted); max-width: 46rem; }
.oc-back { margin-bottom: var(--hrk-space-5); }

.oc-band { border-top: 1px solid var(--hrk-linie); }
.oc-band--grau { background: var(--hrk-warmgrau); }
.oc-band--weiss { background: var(--hrk-surface); }
.oc-grp { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--hrk-space-6); padding-top: 28px; padding-bottom: 28px; }
.oc-grp__lab { min-width: 0; }
.oc-nr { display: block; font-family: var(--hrk-font-label); font-size: var(--hrk-fs-xs); font-weight: var(--hrk-fw-semibold); letter-spacing: .14em; color: var(--hrk-text-muted); margin-bottom: 6px; }
.oc-gt { font-family: var(--hrk-font-brand); font-weight: 400; letter-spacing: -.01em; font-size: 26px; line-height: 1.15; margin: 0; color: var(--hrk-text); overflow-wrap: anywhere; }
.oc-gd { margin: var(--hrk-space-2) 0 0; font-size: var(--hrk-fs-small); color: var(--hrk-text-muted); }
.oc-grp__body { min-width: 0; border-top: 1px solid var(--hrk-text); padding-top: var(--hrk-space-4); }
.oc-sub-h { font-family: var(--hrk-font-label); font-size: var(--hrk-fs-xs); font-weight: var(--hrk-fw-semibold); letter-spacing: .14em;
  text-transform: uppercase; color: var(--hrk-text-muted); margin: var(--hrk-space-5) 0 var(--hrk-space-2); }
.oc-sub-h:first-child { margin-top: 0; }

/* ---------------- Text-Knoepfe ---------------- */
.oc-fw { display: inline-flex; align-items: center; gap: 10px; min-height: var(--hrk-tap-min); background: none; border: 0; border-bottom: 2px solid var(--hrk-gold);
  border-radius: 0; padding: 6px 0; font: 600 16px/1.3 var(--hrk-font-body); color: var(--hrk-schiefer); text-decoration: none; cursor: pointer; }
.hrk-root a.oc-fw { color: var(--hrk-schiefer); }
.oc-fw:hover, .hrk-root a.oc-fw:hover { color: var(--hrk-schiefer-dark); }
.oc-fw .hrk-icon { transition: transform .15s; }
.oc-fw:hover .hrk-icon { transform: translateX(3px); }
.oc-fw--lg { font-size: 18px; padding: 8px 0; }
.oc-fw[disabled] { opacity: .5; cursor: not-allowed; }
.oc-fw[disabled]:hover .hrk-icon { transform: none; }
.oc-bk { display: inline-flex; align-items: center; gap: var(--hrk-space-2); min-height: var(--hrk-tap-min); background: none; border: 0; border-bottom: 1px solid var(--hrk-linie);
  border-radius: 0; padding: 6px 0; font: 500 var(--hrk-fs-small)/1.3 var(--hrk-font-body); color: var(--hrk-text-muted); text-decoration: none; cursor: pointer; }
.hrk-root a.oc-bk { color: var(--hrk-text-muted); }
.oc-bk:hover, .hrk-root a.oc-bk:hover { color: var(--hrk-text); border-bottom-color: var(--hrk-text-muted); }
.oc-bk[disabled] { opacity: .5; cursor: not-allowed; }
.oc-del { display: inline-flex; align-items: center; min-height: var(--hrk-tap-min); background: transparent; border: 1px solid var(--hrk-bordeaux); border-radius: 4px;
  padding: 0 var(--hrk-space-4); font: 600 var(--hrk-fs-small)/1.3 var(--hrk-font-body); color: var(--hrk-bordeaux); cursor: pointer; }
.oc-del:hover { background: var(--hrk-bordeaux-soft); }
.hrk-link, .hrk-root a.hrk-link { color: var(--hrk-bordeaux); text-decoration: underline; text-underline-offset: 2px; }
.hrk-link:hover { color: var(--hrk-bordeaux-dark); }

/* Aktionsleiste unten (vorwaerts rechts, zurueck links) */
.oc-bar { display: flex; justify-content: space-between; align-items: center; gap: var(--hrk-space-4); flex-wrap: wrap; padding-top: var(--hrk-space-5); margin-top: var(--hrk-space-5); border-top: 1px solid var(--hrk-linie); }
.oc-bar--end { justify-content: flex-end; }
.oc-cta { position: sticky; bottom: 0; z-index: 2; background: var(--hrk-surface); border-top: 1px solid var(--hrk-linie); padding: var(--hrk-space-3) 0; }
.oc-cta .oc-fw:last-child { margin-left: auto; }
.oc-cta .oc-wrap { display: flex; justify-content: space-between; align-items: center; gap: var(--hrk-space-4); flex-wrap: wrap; }

/* ---------------- Felder ---------------- */
.hrk-field { display: block; margin-bottom: var(--hrk-space-5); }
.hrk-label { display: block; font-family: var(--hrk-font-label); font-size: var(--hrk-fs-xs); font-weight: var(--hrk-fw-semibold); letter-spacing: .12em;
  text-transform: uppercase; color: var(--hrk-text-muted); margin-bottom: var(--hrk-space-2); }
.hrk-hint { color: var(--hrk-text-muted); font-size: var(--hrk-fs-small); margin-top: var(--hrk-space-2); }
.hrk-input, .hrk-select, .hrk-textarea {
  width: 100%; min-height: 46px; padding: 11px var(--hrk-space-3);
  font: inherit; color: var(--hrk-text); background: var(--hrk-surface);
  border: 1px solid #8A827B; border-radius: 4px;
}
.hrk-input:focus, .hrk-select:focus, .hrk-textarea:focus { outline: 2px solid var(--hrk-schiefer); outline-offset: 3px; border-color: var(--hrk-schiefer); box-shadow: none; }
.hrk-input--error { border-color: var(--hrk-danger); }
.hrk-field-error { color: var(--hrk-danger); font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-medium); margin: var(--hrk-space-2) 0 0; }

/* ---------------- Hinweise (Feld mit Linie links) ---------------- */
.hrk-note { border-left: 2px solid var(--hrk-schiefer); background: var(--hrk-schiefer-hauch);
  padding: var(--hrk-space-3) var(--hrk-space-4); border-radius: 0 4px 4px 0; margin: 0 0 var(--hrk-space-4); }
.hrk-note--warn { border-left-color: var(--hrk-gold); background: var(--hrk-gold-hauch); }
.hrk-note--danger { border-left-color: var(--hrk-danger); background: #FBF5F5; }
.hrk-note--success { border-left-color: var(--hrk-success); background: var(--hrk-schiefer-hauch); }
.hrk-note--muted { border-left-color: var(--hrk-linie); background: var(--hrk-warmgrau); color: var(--hrk-text-muted); }
.hrk-note__list { margin: var(--hrk-space-2) 0 0; padding-left: var(--hrk-space-5); }

/* ---------------- Status (Punkt + Wort) ---------------- */
.hrk-badge { display: inline-flex; align-items: center; gap: var(--hrk-space-2); padding: 0; background: none;
  font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-semibold); line-height: 1.6; white-space: nowrap; }
.hrk-badge::before { content: ""; flex: none; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.hrk-badge--success { color: var(--hrk-success); }
.hrk-badge--warning { color: var(--hrk-warning); }
.hrk-badge--danger  { color: var(--hrk-danger); }
.hrk-badge--info    { color: var(--hrk-info); }
.hrk-badge--neutral { color: var(--hrk-neutral); }

/* ---------------- Zustaende ---------------- */
.hrk-state { display: flex; flex-direction: column; align-items: center; gap: var(--hrk-space-3);
  padding: var(--hrk-space-7) var(--hrk-space-4); color: var(--hrk-text-muted); text-align: center; }
.hrk-state--mini { padding: var(--hrk-space-6) var(--hrk-space-3); }
.hrk-state__title { color: var(--hrk-text); font-weight: var(--hrk-fw-semibold); margin: 0; }
.hrk-spinner { width: 28px; height: 28px; border: 3px solid var(--hrk-linie); border-top-color: var(--hrk-schiefer); border-radius: 50%; animation: hrk-spin .8s linear infinite; }
@keyframes hrk-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .hrk-spinner { animation-duration: 2.4s; } .oc-fw .hrk-icon { transition: none; } }
.oc-wrap.hrk-state { padding-top: clamp(40px, 6vw, 64px); padding-bottom: clamp(40px, 6vw, 64px); }

@media (max-width: 860px) {
  .oc-grp { grid-template-columns: minmax(0, 1fr); gap: var(--hrk-space-4); }
  .oc-gt { font-size: 24px; }
}
@media (max-width: 600px) {
  .oc-wrap { padding-left: var(--hrk-space-4); padding-right: var(--hrk-space-4); }
  .oc-bar, .oc-cta .oc-wrap { flex-direction: column-reverse; align-items: stretch; }
  .oc-bar .oc-fw, .oc-cta .oc-fw { justify-content: space-between; }
  .oc-cta .oc-fw:last-child { margin-left: 0; }
  .oc-head__act { width: 100%; justify-content: space-between; }
}

/* ============================================================
   Eintritts-Checklisten — Besonderheiten
   ============================================================ */
.oc-m0 { margin: 0; }
.oc-mt { margin-top: var(--hrk-space-2); }
.oc-strong { font-weight: var(--hrk-fw-semibold); color: var(--hrk-text); }
.oc-empty-icon { color: var(--hrk-schiefer); }
.oc-err { padding-top: var(--hrk-space-4); }
.oc-field-date { max-width: 16rem; }
.oc-busy { display: inline-flex; align-items: center; gap: var(--hrk-space-2); }
.oc-spin { width: 16px; height: 16px; border-width: 2px; flex: none; }

/* Liste: Zeilen mit Haarlinien */
.oc-row { padding: var(--hrk-space-4) 0; border-bottom: 1px solid var(--hrk-linie); cursor: pointer; }
.oc-row:last-child { border-bottom: 0; }
.oc-row:hover { background: var(--hrk-schiefer-hauch); }
.oc-row:hover .oc-row__name { color: var(--hrk-bordeaux); }
.oc-row__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--hrk-space-3); flex-wrap: wrap; }
.oc-row__main { flex: 1 1 14rem; min-width: 0; }
.oc-row__name { font-family: var(--hrk-font-body); font-size: var(--hrk-fs-body); font-weight: var(--hrk-fw-semibold); margin: 0; color: var(--hrk-text); overflow-wrap: anywhere; }
.oc-row__meta { margin: 2px 0 0; font-size: var(--hrk-fs-small); color: var(--hrk-text-muted); }
.oc-row__dot { margin: 0 var(--hrk-space-1); }

/* Fortschritt: feine Linie statt dicker Balken */
.oc-prog { margin-top: var(--hrk-space-3); }
.oc-prog--lg { margin-top: var(--hrk-space-6); }
.oc-prog__txt { display: flex; justify-content: space-between; align-items: baseline; gap: var(--hrk-space-3); margin-bottom: var(--hrk-space-2); }
.oc-track { width: 100%; height: 3px; background: var(--hrk-linie); overflow: hidden; }
.oc-track--lg { height: 4px; }
.oc-bar { height: 100%; background: var(--hrk-schiefer); transition: width .3s ease; min-width: 3px; }

/* Punkte (Liste und Auswahl) */
.oc-item { display: flex; align-items: flex-start; gap: var(--hrk-space-3); min-height: var(--hrk-tap-min); padding: var(--hrk-space-3) 0;
  border-bottom: 1px solid var(--hrk-linie); cursor: pointer; user-select: none; }
.oc-item:last-of-type { border-bottom: 0; }
.oc-item:hover { background: var(--hrk-schiefer-hauch); }

.oc-item__txt { flex: 1; min-width: 0; }
.oc-item__title { font-weight: var(--hrk-fw-medium); }
.oc-item__title--done { text-decoration: line-through; color: var(--hrk-text-muted); }
.oc-item__desc { display: block; margin-top: 2px; }
.oc-box { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; margin-top: 2px;
  border: 1px solid #8A827B; border-radius: 4px; background: var(--hrk-surface); color: var(--hrk-on-dark); }
.oc-box--checked { background: var(--hrk-schiefer); border-color: var(--hrk-schiefer); }
.oc-count { margin: var(--hrk-space-4) 0 0; }
</style>
