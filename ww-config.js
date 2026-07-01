export default {
  editor: {
    label: { en: 'Onboarding checklist', de: 'Onboarding-Checkliste' },
    icon: 'check-square',
  },
  triggerEvents: [
    { name: 'loaded',      label: { en: 'On loaded',         de: 'Geladen' },               event: {} },
    { name: 'created',     label: { en: 'On checklist created', de: 'Checkliste erstellt' }, event: { checklist_id: '' } },
    { name: 'itemtoggled', label: { en: 'On item toggled',   de: 'Item abgehakt' },         event: { item_id: '', is_done: false } },
    { name: 'error',       label: { en: 'On error',          de: 'Fehler' },                event: { reason: '' } },
  ],
  properties: {
    authToken: {
      label: { en: 'User JWT (auth token)', de: 'User-JWT (Login-Token)' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Access Token des eingeloggten Users (Supabase Auth). Bearer wird automatisch ergänzt.',
      },
      /* wwEditor:end */
    },
    apiKey: {
      label: { en: 'Supabase anon/publishable key', de: 'Supabase Anon-/Publishable-Key' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Öffentlicher Anon-/Publishable-Key des Projekts. NIE den service_role-Key verwenden.',
      },
      /* wwEditor:end */
    },
    supabaseUrl: {
      label: { en: 'Supabase URL', de: 'Supabase URL' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: 'https://ztvqsxdudzdyqgeylujr.supabase.co',
    },
    backUrl: {
      label: { en: 'Back URL', de: 'Zurück-Link' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '/dashboard',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Ziel des «Zurück»-Links (z.B. /dashboard).',
      },
      /* wwEditor:end */
    },
    loginUrl: {
      label: { en: 'Login URL', de: 'Anmelden-Link' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '/anmelden',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Ziel des «Anmelden»-Links bei abgelaufener Sitzung (z.B. /anmelden).',
      },
      /* wwEditor:end */
    },
  },
};
