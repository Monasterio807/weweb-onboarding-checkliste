<template>
  <div class="hrk-root">
    <main class="hrk-page">

      <!-- ====== ANSICHT: LISTE ====== -->
      <div v-if="view === 'list'">
        <header class="hrk-record-head">
          <div class="hrk-record-head__main">
            <h1 class="hrk-h1 hrk-record-head__name">Onboarding-Checklisten</h1>
            <p v-if="!loading && !authError && !loadError" class="hrk-muted hrk-record-head__type">
              {{ checklists.length === 0 ? 'Noch keine Checkliste angelegt' : checklists.length + ' ' + (checklists.length === 1 ? 'Checkliste' : 'Checklisten') }}
            </p>
          </div>
          <div class="hrk-actions">
            <button
              class="hrk-btn hrk-btn--ghost"
              :disabled="loading"
              aria-label="Aktualisieren"
              @click="loadChecklists"
            >↻</button>
            <button
              v-if="!authError"
              class="hrk-btn hrk-btn--primary"
              aria-label="Neue Checkliste anlegen"
              @click="startCreate"
            >+ Neue Checkliste</button>
          </div>
        </header>

        <!-- Laden -->
        <div v-if="loading" class="hrk-state" aria-live="polite">
          <div class="hrk-spinner" aria-hidden="true"></div>
          <p class="hrk-muted">Checklisten werden geladen …</p>
        </div>

        <!-- Auth-Fehler -->
        <div v-else-if="authError" class="hrk-state" role="alert" aria-live="assertive">
          <p class="hrk-state__title">Bitte melde dich an, um deine Checklisten zu sehen.</p>
          <a class="hrk-btn hrk-btn--primary" :href="loginHref">Anmelden</a>
          <a v-if="content && content.backUrl" class="hrk-btn hrk-btn--ghost" :href="backHref">Zurück</a>
        </div>

        <!-- Netzwerk-/Ladefehler -->
        <div v-else-if="loadError" class="hrk-state" role="alert" aria-live="assertive">
          <p class="hrk-state__title">{{ loadError }}</p>
          <button class="hrk-btn hrk-btn--secondary" @click="loadChecklists">Erneut versuchen</button>
        </div>

        <!-- Leer -->
        <div v-else-if="checklists.length === 0" class="hrk-empty">
          <svg class="hrk-icon hrk-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:2.5rem;height:2.5rem">
            <rect x="4" y="4" width="16" height="16" rx="2"/><polyline points="8,12 11,15 16,9"/>
          </svg>
          <p class="hrk-state__title" style="margin:var(--hrk-space-2) 0 0">Noch keine Checkliste angelegt</p>
          <p class="hrk-muted" style="margin:var(--hrk-space-1) 0 var(--hrk-space-4)">
            Leg eine Checkliste für neue Mitarbeitende an — dauert nur 2 Minuten.
          </p>
          <button class="hrk-btn hrk-btn--primary" @click="startCreate">+ Erste Checkliste anlegen</button>
        </div>

        <!-- Liste -->
        <div v-else class="hrk-stack" style="margin-top:var(--hrk-space-5)">
          <div
            v-for="cl in sortedChecklists"
            :key="cl.id"
            class="hrk-card"
            style="cursor:pointer"
            role="button"
            tabindex="0"
            :aria-label="'Checkliste für ' + cl.employee_name + ' öffnen'"
            @click="openChecklist(cl)"
            @keydown.enter="openChecklist(cl)"
            @keydown.space.prevent="openChecklist(cl)"
          >
            <div class="hrk-record-head" style="margin-bottom:var(--hrk-space-3)">
              <div class="hrk-record-head__main">
                <h2 class="hrk-h2" style="margin:0 0 var(--hrk-space-1)">{{ cl.employee_name }}</h2>
                <p class="hrk-muted hrk-small" style="margin:0">
                  Eintritt: {{ cl.start_date ? formatDate(cl.start_date) : '–' }}
                </p>
              </div>
              <span class="hrk-badge" :class="statusBadge(cl.status).cls">
                {{ statusBadge(cl.status).label }}
              </span>
            </div>

            <!-- Fortschrittsbalken -->
            <div
              v-if="cl._stats"
              style="margin-top:var(--hrk-space-2)"
              :aria-label="cl._stats.done + ' von ' + cl._stats.total + ' Punkte erledigt'"
            >
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--hrk-space-1)">
                <span class="hrk-muted hrk-small">{{ cl._stats.done }}&thinsp;/&thinsp;{{ cl._stats.total }} erledigt</span>
                <span class="hrk-muted hrk-small">{{ cl._stats.pct }}%</span>
              </div>
              <div class="progress-track" role="progressbar" :aria-valuenow="cl._stats.pct" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" :style="{ width: cl._stats.pct + '%' }"></div>
              </div>
            </div>

            <p class="hrk-muted hrk-small" style="margin:var(--hrk-space-3) 0 0;text-align:right">
              Angelegt: {{ formatDate(cl.created_at) }}
            </p>
          </div>
        </div>

        <!-- Zurück -->
        <div v-if="backHref" style="margin-top:var(--hrk-space-6)">
          <a class="hrk-btn hrk-btn--ghost" :href="backHref">← Zurück</a>
        </div>
      </div>

      <!-- ====== ANSICHT: ERSTELLEN ====== -->
      <div v-else-if="view === 'create'">
        <button class="hrk-btn hrk-btn--ghost" style="margin-bottom:var(--hrk-space-4)" @click="view = 'list'">← Zurück</button>
        <h1 class="hrk-h1">Neue Onboarding-Checkliste</h1>
        <p class="hrk-muted" style="margin-bottom:var(--hrk-space-5)">
          Erfasse die neuen Mitarbeitenden und wähle aus, welche Punkte abgehakt werden sollen.
        </p>

        <!-- Formular -->
        <div class="hrk-card hrk-stack">
          <div class="hrk-field">
            <label class="hrk-label" for="oc-name">Vorname &amp; Name *</label>
            <input
              id="oc-name"
              v-model="form.employee_name"
              class="hrk-input"
              :class="{ 'hrk-input--error': formErrors.employee_name }"
              type="text"
              placeholder="z.B. Maria Muster"
              autocomplete="name"
            />
            <p v-if="formErrors.employee_name" role="alert" class="hrk-hint" style="color:var(--hrk-danger)">
              {{ formErrors.employee_name }}
            </p>
          </div>

          <div class="hrk-field">
            <label class="hrk-label" for="oc-date">Eintrittsdatum</label>
            <input
              id="oc-date"
              v-model="form.start_date"
              class="hrk-input"
              type="date"
            />
          </div>
        </div>

        <!-- Template-Items laden / anzeigen -->
        <div v-if="templatesLoading" class="hrk-state hrk-state--mini" aria-live="polite">
          <div class="hrk-spinner" aria-hidden="true"></div>
          <p class="hrk-muted">Checklisten-Punkte werden geladen …</p>
        </div>

        <div v-else-if="templateError" class="hrk-note hrk-note--warn" role="alert">
          <p style="margin:0">{{ templateError }}</p>
          <button class="hrk-btn hrk-btn--ghost" style="margin-top:var(--hrk-space-2)" @click="loadTemplates">
            Erneut versuchen
          </button>
        </div>

        <div v-else-if="templateItems.length">
          <h2 class="hrk-h2">Checklisten-Punkte wählen</h2>
          <p class="hrk-muted" style="margin-bottom:var(--hrk-space-4)">
            Alle Punkte sind vorausgewählt — du kannst einzelne abwählen.
          </p>

          <div
            v-for="cat in templateCategories"
            :key="cat"
            class="hrk-card"
            style="margin-bottom:var(--hrk-space-3)"
          >
            <h3 class="hrk-h3" style="margin-top:0">{{ cat }}</h3>
            <div
              v-for="item in templatesByCategory[cat]"
              :key="item.id"
              class="checklist-item-select"
              :class="{ 'checklist-item-select--active': selectedTemplateIds.has(item.id) }"
              role="checkbox"
              :aria-checked="selectedTemplateIds.has(item.id)"
              tabindex="0"
              @click="toggleTemplate(item.id)"
              @keydown.space.prevent="toggleTemplate(item.id)"
              @keydown.enter="toggleTemplate(item.id)"
            >
              <span class="checklist-checkbox" :class="{ 'checklist-checkbox--checked': selectedTemplateIds.has(item.id) }">
                <span v-if="selectedTemplateIds.has(item.id)">✓</span>
              </span>
              <div>
                <span class="checklist-item-title">{{ item.title }}</span>
                <span v-if="item.description" class="hrk-muted hrk-small" style="display:block">{{ item.description }}</span>
              </div>
            </div>
          </div>

          <p class="hrk-muted hrk-small" style="margin-top:var(--hrk-space-2)">
            {{ selectedTemplateIds.size }} von {{ templateItems.length }} Punkte ausgewählt
          </p>
        </div>

        <!-- Erstell-Fehler -->
        <div v-if="createError" class="hrk-note hrk-note--danger" role="alert" aria-live="assertive" style="margin-top:var(--hrk-space-4)">
          <p style="margin:0">{{ createError }}</p>
        </div>

        <!-- CTA -->
        <div class="hrk-cta-bar" style="margin-top:var(--hrk-space-5)">
          <button
            class="hrk-btn hrk-btn--primary hrk-btn--block"
            :disabled="creating || !form.employee_name.trim()"
            aria-label="Checkliste anlegen"
            @click="createChecklist"
          >
            <span v-if="creating">
              <span class="hrk-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></span>
              Wird angelegt …
            </span>
            <span v-else>Checkliste anlegen</span>
          </button>
        </div>
      </div>

      <!-- ====== ANSICHT: DETAIL ====== -->
      <div v-else-if="view === 'detail' && activeChecklist">
        <button class="hrk-btn hrk-btn--ghost" style="margin-bottom:var(--hrk-space-4)" @click="view = 'list'">← Alle Checklisten</button>

        <!-- Kopf + Fortschritt -->
        <div class="hrk-card" style="margin-bottom:var(--hrk-space-5)">
          <div class="hrk-record-head" style="margin-bottom:var(--hrk-space-4)">
            <div class="hrk-record-head__main">
              <h1 class="hrk-h1 hrk-record-head__name" style="margin-bottom:var(--hrk-space-1)">
                {{ activeChecklist.employee_name }}
              </h1>
              <p class="hrk-muted hrk-record-head__type" style="margin:0">
                Eintritt: {{ activeChecklist.start_date ? formatDate(activeChecklist.start_date) : '–' }}
              </p>
            </div>
            <span class="hrk-badge" :class="statusBadge(activeChecklist.status).cls">
              {{ statusBadge(activeChecklist.status).label }}
            </span>
          </div>

          <!-- Fortschrittsbalken -->
          <div
            :aria-label="detailStats.done + ' von ' + detailStats.total + ' Punkte erledigt'"
          >
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--hrk-space-2)">
              <span class="hrk-small" style="font-weight:var(--hrk-fw-semibold)">
                Fortschritt: {{ detailStats.done }}&thinsp;/&thinsp;{{ detailStats.total }} Punkte erledigt
              </span>
              <span class="hrk-small" style="font-weight:var(--hrk-fw-semibold);color:var(--hrk-bordeaux)">
                {{ detailStats.pct }}%
              </span>
            </div>
            <div
              class="progress-track progress-track--lg"
              role="progressbar"
              :aria-valuenow="detailStats.pct"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div class="progress-bar" :style="{ width: detailStats.pct + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Items laden -->
        <div v-if="itemsLoading" class="hrk-state" aria-live="polite">
          <div class="hrk-spinner" aria-hidden="true"></div>
          <p class="hrk-muted">Checklisten-Punkte werden geladen …</p>
        </div>

        <div v-else-if="itemsError" class="hrk-state" role="alert" aria-live="assertive">
          <p class="hrk-state__title">{{ itemsError }}</p>
          <button class="hrk-btn hrk-btn--secondary" @click="loadItems(activeChecklist.id)">Erneut versuchen</button>
        </div>

        <!-- Items nach Kategorie -->
        <div v-else>
          <div
            v-for="cat in itemCategories"
            :key="cat"
            class="hrk-card"
            style="margin-bottom:var(--hrk-space-4)"
          >
            <h2 class="hrk-h2" style="margin-top:0">{{ cat }}</h2>

            <div
              v-for="item in itemsByCategory[cat]"
              :key="item.id"
              class="checklist-item"
              :class="{ 'checklist-item--done': item.is_done }"
              role="checkbox"
              :aria-checked="item.is_done"
              tabindex="0"
              :aria-label="(item.is_done ? 'Erledigt: ' : 'Offen: ') + item.title"
              @click="toggleItem(item)"
              @keydown.space.prevent="toggleItem(item)"
              @keydown.enter="toggleItem(item)"
            >
              <span
                class="checklist-checkbox"
                :class="{ 'checklist-checkbox--checked': item.is_done }"
                aria-hidden="true"
              >
                <span v-if="item.is_done">✓</span>
              </span>
              <div style="flex:1;min-width:0">
                <span class="checklist-item-title" :class="{ 'checklist-item-title--done': item.is_done }">
                  {{ item.title }}
                </span>
                <span v-if="item.description" class="hrk-muted hrk-small" style="display:block;margin-top:2px">
                  {{ item.description }}
                </span>
                <span v-if="item.is_done && item.done_at" class="hrk-muted hrk-small" style="display:block;margin-top:2px">
                  Erledigt: {{ formatDate(item.done_at) }}
                </span>
              </div>
              <span v-if="togglingIds.has(item.id)" class="hrk-spinner" style="width:16px;height:16px;border-width:2px;flex:none" aria-hidden="true"></span>
            </div>
          </div>

          <!-- Toggle-Fehler -->
          <div v-if="toggleError" class="hrk-note hrk-note--warn" role="alert" aria-live="polite">
            <p style="margin:0">{{ toggleError }}</p>
          </div>

          <!-- Sync-Fehler (Status-Update fehlgeschlagen) -->
          <div v-if="syncError" class="hrk-note hrk-note--danger" role="alert" aria-live="polite" style="margin-top:var(--hrk-space-3)">
            <p style="margin:0">Speichern hat nicht geklappt — versuch es nochmal.</p>
          </div>
        </div>

        <!-- Zurück (Desktop) -->
        <div v-if="backHref" style="margin-top:var(--hrk-space-6)">
          <a class="hrk-btn hrk-btn--ghost" :href="backHref">← Zurück zur Übersicht</a>
        </div>
      </div>

    </main>
  </div>
</template>

<script>
/**
 * WeWeb Coded Component — coded-component-onboarding-checkliste (Imploya / HRklar)
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
      form: { employee_name: '', start_date: '' },
      formErrors: {},
      templateItems: [],
      selectedTemplateIds: new Set(),
      templatesLoading: false,
      templateError: '',
      creating: false,
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
      let url = (this.content && this.content.supabaseUrl) || '';
      if (/nemxnflngcfrpamkuesm/.test(String(url))) url = '';
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
  },

  mounted() {
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
          this.loadError = 'Netzwerkfehler — bitte Internetverbindung prüfen und erneut versuchen.';
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
      this.form        = { employee_name: '', start_date: '' };
      this.formErrors  = {};
      this.createError = '';
      this.selectedTemplateIds = new Set();
      this.view = 'create';
      this.loadTemplates();
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
          this.templateError = `Vorlagen konnten nicht geladen werden.`;
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
          this.templateError = 'Netzwerkfehler beim Laden der Vorlagen.';
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

      if (!this.form.employee_name.trim()) {
        this.formErrors = { employee_name: 'Bitte gib Vorname und Name ein.' };
        return;
      }

      this.creating = true;
      try {
        // 1. Checkliste anlegen
        const body = {
          employee_name: this.form.employee_name.trim(),
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
          this.createError = 'Sitzung abgelaufen — bitte erneut anmelden.';
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
          const itemRes = await this.fetchWithTimeout(
            `${this.baseUrl}/rest/v1/onboarding_checklist_items`,
            {
              method: 'POST',
              headers: { ...this.authHeaders, 'Prefer': 'return=minimal' },
              body: JSON.stringify(itemsPayload),
            }
          );
          if (!itemRes.ok) {
            console.warn('[onboarding-checkliste] items insert partial HTTP', itemRes.status);
            // Checkliste ist angelegt — trotzdem weiterfahren, Items lassen sich nachträglich hinzufügen
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
          this.createError = 'Das hat zu lange gedauert — versuch es nochmals.';
        } else {
          this.createError = 'Netzwerkfehler beim Anlegen der Checkliste.';
        }
      } finally {
        this.creating = false;
      }
    },

    /* ──────────────────── DETAIL ──────────────────── */
    async openChecklist(cl) {
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
          this.itemsError = 'Das hat zu lange gedauert — versuch es nochmals.';
        } else {
          this.itemsError = 'Netzwerkfehler beim Laden der Punkte.';
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
          this.toggleError = 'Das hat zu lange gedauert — versuch es nochmals.';
        } else {
          this.toggleError = 'Netzwerkfehler beim Speichern.';
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
        ).then((r) => { if (r && r.ok) this.syncError = false; })
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
  --hrk-bordeaux:        #7B2D3B;
  --hrk-bordeaux-dark:   #5E2129;
  --hrk-bordeaux-soft:   #F3E7E9;
  --hrk-creme:           #FBF8F3;
  --hrk-anthrazit:       #2B2B2B;
  --hrk-gold:            #C9A24B;
  --hrk-on-primary:      #FFFFFF;  /* Text/Icons auf primaer (Bordeaux) gefaerbten Flaechen */
  --hrk-surface:         #FFFFFF;
  --hrk-surface-muted:   #F5F1EB;
  --hrk-border:          #ECE5D9;
  --hrk-border-strong:   #DAD2C6;
  --hrk-text:            #2B2B2B;
  --hrk-text-muted:      #6B6357;
  --hrk-success:         #2E7D5B;  --hrk-success-bg: #E5F1EB;
  --hrk-warning:         #B7791F;  --hrk-warning-bg: #FBF1DD;
  --hrk-danger:          #B23A48;  --hrk-danger-bg:  #F8E7E9;
  --hrk-info:            #2F6F9F;  --hrk-info-bg:    #E6F0F7;
  --hrk-neutral:         #6B6357;  --hrk-neutral-bg: #EFEAE2;
  --hrk-font-head: "Fraunces", "Lora", Georgia, serif;
  --hrk-font-body: "Inter", "Source Sans 3", system-ui, sans-serif;
  --hrk-fs-h1: 1.9375rem;
  --hrk-fs-h2: 1.375rem;
  --hrk-fs-h3: 1.125rem;
  --hrk-fs-body: 1.0625rem;
  --hrk-fs-small: 0.9375rem;
  --hrk-lh-body: 1.55;
  --hrk-fw-regular: 400; --hrk-fw-medium: 500; --hrk-fw-semibold: 600;
  --hrk-space-1: 4px;  --hrk-space-2: 8px;  --hrk-space-3: 12px;
  --hrk-space-4: 16px; --hrk-space-5: 24px; --hrk-space-6: 32px;
  --hrk-space-7: 48px;
  --hrk-radius-sm: 8px; --hrk-radius-md: 12px; --hrk-radius-lg: 14px;
  --hrk-radius-pill: 999px;
  --hrk-shadow-card: 0 1px 2px rgba(40,35,30,.05);
  --hrk-shadow-pop:  0 8px 28px rgba(40,35,30,.12);
  --hrk-focus-ring:  0 0 0 3px rgba(123,45,59,.30);
  --hrk-tap-min: 44px;
  --hrk-page-max: 880px;
  --hrk-icon-size-sm: 16px;
  --hrk-icon-size-md: 20px;
  --hrk-icon-size-lg: 28px;
}

.hrk-root, .hrk-root * { box-sizing: border-box; }
.hrk-root {
  width: 100%; /* volle Breite im WeWeb-Flex-Parent (sonst klebt der Inhalt links) */
  font-family: var(--hrk-font-body);
  font-size: var(--hrk-fs-body);
  line-height: var(--hrk-lh-body);
  color: var(--hrk-text);
  background: var(--hrk-creme);
  -webkit-font-smoothing: antialiased;
}
.hrk-page { max-width: var(--hrk-page-max); margin: 0 auto; padding: var(--hrk-space-6) var(--hrk-space-4); }
.hrk-h1 { font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h1); font-weight: var(--hrk-fw-semibold); line-height: 1.12; letter-spacing: -.02em; color: var(--hrk-bordeaux); margin: 0 0 var(--hrk-space-3); }
.hrk-h2 { font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h2); font-weight: var(--hrk-fw-semibold); line-height: 1.2; letter-spacing: -.01em; color: var(--hrk-bordeaux); margin: var(--hrk-space-6) 0 var(--hrk-space-3); }
.hrk-h3 { font-family: var(--hrk-font-body); font-size: var(--hrk-fs-h3); font-weight: var(--hrk-fw-semibold); margin: var(--hrk-space-5) 0 var(--hrk-space-2); }
.hrk-muted { color: var(--hrk-text-muted); }
.hrk-small { font-size: var(--hrk-fs-small); }
.hrk-stack > * + * { margin-top: var(--hrk-space-4); }

/* Knöpfe */
.hrk-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--hrk-space-2);
  min-height: var(--hrk-tap-min); padding: 0 var(--hrk-space-5);
  font: inherit; font-weight: var(--hrk-fw-semibold);
  border-radius: var(--hrk-radius-md); border: 1px solid transparent;
  cursor: pointer; text-decoration: none; transition: background .15s, border-color .15s, transform .05s;
}
.hrk-btn:active { transform: translateY(1px); }
.hrk-btn:focus-visible { outline: none; box-shadow: var(--hrk-focus-ring); }
.hrk-btn--primary   { background: var(--hrk-bordeaux); color: var(--hrk-on-primary); }
.hrk-btn--primary:hover { background: var(--hrk-bordeaux-dark); }
.hrk-btn--secondary { background: var(--hrk-surface); color: var(--hrk-bordeaux); border-color: var(--hrk-border-strong); }
.hrk-btn--secondary:hover { background: var(--hrk-bordeaux-soft); }
.hrk-btn--ghost     { background: transparent; color: var(--hrk-bordeaux); }
.hrk-btn--ghost:hover { background: var(--hrk-bordeaux-soft); }
.hrk-btn[disabled] { opacity: .5; cursor: not-allowed; }
.hrk-btn--block { width: 100%; }
.hrk-cta-bar { position: sticky; bottom: 0; padding: var(--hrk-space-3) var(--hrk-space-4);
  background: linear-gradient(180deg, rgba(251,248,243,0), var(--hrk-creme) 35%); }

/* Eingabefelder */
.hrk-field { display: block; margin-bottom: var(--hrk-space-4); }
.hrk-label { display: block; font-weight: var(--hrk-fw-medium); margin-bottom: var(--hrk-space-1); }
.hrk-hint  { color: var(--hrk-text-muted); font-size: var(--hrk-fs-small); margin-top: var(--hrk-space-1); }
.hrk-input, .hrk-select {
  width: 100%; min-height: var(--hrk-tap-min); padding: var(--hrk-space-3);
  font: inherit; color: var(--hrk-text); background: var(--hrk-surface);
  border: 1px solid var(--hrk-border); border-radius: var(--hrk-radius-sm);
}
.hrk-input:focus, .hrk-select:focus { outline: none; border-color: var(--hrk-bordeaux); box-shadow: var(--hrk-focus-ring); }
.hrk-input--error { border-color: var(--hrk-danger); }

/* Karten */
.hrk-card { background: var(--hrk-surface); border: 1px solid var(--hrk-border);
  border-radius: var(--hrk-radius-lg); box-shadow: var(--hrk-shadow-card); padding: var(--hrk-space-5); }

/* Record-Head */
.hrk-record-head { display: flex; align-items: flex-start; justify-content: space-between;
  gap: var(--hrk-space-3); flex-wrap: wrap; }
.hrk-record-head__main { flex: 1 1 14rem; min-width: 0; }
.hrk-record-head__name { margin: 0 0 var(--hrk-space-1); }
.hrk-record-head__type { margin: 0; }

/* Badges */
.hrk-badge { display: inline-flex; align-items: center; gap: var(--hrk-space-2);
  font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-semibold); line-height: 1.6; white-space: nowrap; }
.hrk-badge::before { content: ""; flex: none; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.hrk-badge--success { color: var(--hrk-success); }
.hrk-badge--warning { color: var(--hrk-warning); }
.hrk-badge--danger  { color: var(--hrk-danger); }
.hrk-badge--info    { color: var(--hrk-info); }
.hrk-badge--neutral { color: var(--hrk-neutral); }

/* Zustände */
.hrk-state { display: flex; flex-direction: column; align-items: center; gap: var(--hrk-space-3);
  padding: var(--hrk-space-7) var(--hrk-space-4); color: var(--hrk-text-muted); text-align: center; }
.hrk-state--mini { padding: var(--hrk-space-6) var(--hrk-space-3); }
.hrk-state__title { color: var(--hrk-text); font-weight: var(--hrk-fw-semibold); margin: 0; }
.hrk-spinner { width: 28px; height: 28px; border: 3px solid var(--hrk-border);
  border-top-color: var(--hrk-bordeaux); border-radius: 50%; animation: hrk-spin .8s linear infinite; }
@keyframes hrk-spin { to { transform: rotate(360deg); } }
.hrk-empty { text-align: center; color: var(--hrk-text-muted); padding: var(--hrk-space-7) var(--hrk-space-4); }

/* ---------------- Icons (Inline-SVG, stroke=currentColor) ---------------- */
.hrk-icon { width: var(--hrk-icon-size-md); height: var(--hrk-icon-size-md); flex: none; }
.hrk-icon--sm { width: var(--hrk-icon-size-sm); height: var(--hrk-icon-size-sm); }
.hrk-icon--lg { width: var(--hrk-icon-size-lg); height: var(--hrk-icon-size-lg); }
.hrk-empty-icon { color: var(--hrk-bordeaux); margin: 0 auto; }
.hrk-actions { display: flex; flex-wrap: wrap; gap: var(--hrk-space-3); }

/* Hinweis-Boxen */
.hrk-note { border-left: 4px solid var(--hrk-info); background: var(--hrk-info-bg);
  padding: var(--hrk-space-3) var(--hrk-space-4); border-radius: var(--hrk-radius-sm); }
.hrk-note--warn   { border-left-color: var(--hrk-warning); background: var(--hrk-warning-bg); }
.hrk-note--danger { border-left-color: var(--hrk-danger); background: var(--hrk-danger-bg); }

/* ──────── Fortschrittsbalken (komponentenspezifisch) ──────── */
.progress-track {
  width: 100%;
  height: 8px;
  background: var(--hrk-border);
  border-radius: var(--hrk-radius-pill);
  overflow: hidden;
}
.progress-track--lg { height: 12px; }
.progress-bar {
  height: 100%;
  background: var(--hrk-bordeaux);
  border-radius: var(--hrk-radius-pill);
  transition: width .3s ease;
  min-width: 4px;
}

/* ──────── Checklisten-Items (Liste + Auswahl) ──────── */
.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: var(--hrk-space-3);
  padding: var(--hrk-space-3) var(--hrk-space-2);
  border-radius: var(--hrk-radius-sm);
  border-bottom: 1px solid var(--hrk-border);
  cursor: pointer;
  transition: background .12s;
  user-select: none;
}
.checklist-item:last-child { border-bottom: 0; }
.checklist-item:hover  { background: var(--hrk-surface-muted); }
.checklist-item:focus-visible { outline: none; box-shadow: var(--hrk-focus-ring); }
.checklist-item--done { opacity: .75; }

.checklist-item-select {
  display: flex;
  align-items: flex-start;
  gap: var(--hrk-space-3);
  padding: var(--hrk-space-3) var(--hrk-space-2);
  border-radius: var(--hrk-radius-sm);
  border-bottom: 1px solid var(--hrk-border);
  cursor: pointer;
  transition: background .12s;
  user-select: none;
}
.checklist-item-select:last-child { border-bottom: 0; }
.checklist-item-select:hover { background: var(--hrk-surface-muted); }
.checklist-item-select:focus-visible { outline: none; box-shadow: var(--hrk-focus-ring); }
.checklist-item-select--active { background: var(--hrk-bordeaux-soft); }

.checklist-checkbox {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 2px solid var(--hrk-border-strong);
  border-radius: var(--hrk-radius-sm);
  background: var(--hrk-surface);
  color: var(--hrk-on-primary);
  font-size: 13px;
  font-weight: var(--hrk-fw-semibold);
  margin-top: 2px;
  transition: background .12s, border-color .12s;
}
.checklist-checkbox--checked {
  background: var(--hrk-bordeaux);
  border-color: var(--hrk-bordeaux);
}

.checklist-item-title {
  font-weight: var(--hrk-fw-medium);
}
.checklist-item-title--done {
  text-decoration: line-through;
  color: var(--hrk-text-muted);
}

/* ──────── Responsive ──────── */
@media (max-width: 600px) {
  :root, .hrk-root { --hrk-fs-h1: 1.625rem; }
  .hrk-page { padding: var(--hrk-space-4) var(--hrk-space-3); }
  .hrk-card { padding: var(--hrk-space-4); }
  .hrk-actions { flex-direction: column; align-items: stretch; }
  .hrk-actions .hrk-btn { width: 100%; }
  .hrk-cta-bar .hrk-btn { width: 100%; }
}
</style>
