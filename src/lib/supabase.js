// ── lib/supabase.js ─────────────────────────────────────────────────────────
// Supabase client singleton + localStorage persistence helpers.
// Import _supa wherever you need to read/write the database.

import { createClient } from '@supabase/supabase-js';

// ── Supabase client ──────────────────────────────────────────────
  export const _supa = createClient('https://hebwpxzwptfzzzdxqfvg.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlYndweHp3cHRmenp6ZHhxZnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODAzNTAsImV4cCI6MjA5NzM1NjM1MH0.mllB8kElcNA187A69eI4pNUJ5Wn-YSLOvLvjEMNpjuQ');
  

// ---- DEMO / PERSISTENCE TOGGLE ----
// Flip PERSIST to true before IT presentation to enable localStorage persistence.
// While false, all state resets on refresh — ideal for clean showcases.
const PERSIST = false; // flip to true before IT presentation

function savePersistent(key, value) {
  if (PERSIST) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
  }
}

function loadPersistent(key, fallback) {
  if (!PERSIST) return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch(e) { return fallback; }
}

// Stable, module-level price input. Holds its own local text state and only
// commits up to the parent on blur (or Enter). Typing therefore re-renders ONLY
// this tiny component — not App — so the page never remounts and never scroll-jumps.

export { PERSIST, savePersistent, loadPersistent };
