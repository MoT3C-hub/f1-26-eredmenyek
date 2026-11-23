// Formázók, színek, gumi jelvények – közös segédfüggvények

export const TEAM_COLORS = {
  'Mercedes': '#27F4D2',
  'Ferrari': '#E8002D',
  'Red Bull Racing': '#3671C6',
  'Williams': '#64C4FF',
  'Aston Martin': '#229971',
  'Alpine': '#FF87BC',
  'Racing Bulls': '#6692FF',
  'RB': '#6692FF',
  'Haas': '#B6BABD',
  'McLaren': '#FF8000',
  'Audi': '#C1272D',
  'Sauber': '#52E252',
  'Cadillac': '#D4AF37',
};

export function teamColor(name) {
  if (TEAM_COLORS[name]) return TEAM_COLORS[name];
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 70% 60%)`;
}

// Vizuális gumikeverék ID → megjelenés
export const TYRES = {
  16: { short: 'S', name: 'Lágy', color: '#ef4444', text: '#fff' },
  17: { short: 'M', name: 'Közepes', color: '#facc15', text: '#111' },
  18: { short: 'H', name: 'Kemény', color: '#f1f5f9', text: '#111' },
  7:  { short: 'I', name: 'Intermedier', color: '#22c55e', text: '#04140a' },
  8:  { short: 'W', name: 'Esős', color: '#3b82f6', text: '#fff' },
  15: { short: 'W', name: 'Esős', color: '#3b82f6', text: '#fff' },
  19: { short: 'SS', name: 'Szuperlágy', color: '#c026d3', text: '#fff' },
  20: { short: 'S', name: 'Lágy', color: '#ef4444', text: '#fff' },
  21: { short: 'M', name: 'Közepes', color: '#facc15', text: '#111' },
  22: { short: 'H', name: 'Kemény', color: '#f1f5f9', text: '#111' },
};

export function tyreInfo(visual) {
  return TYRES[visual] || { short: '?', name: `Ismeretlen (${visual})`, color: '#64748b', text: '#fff' };
}

export function tyreBadge(stint, size = 'sm') {
  const t = tyreInfo(stint.compound_visual);
  const actual = stint.compound_actual_name ? ` (${stint.compound_actual_name})` : '';
  const laps = stint.start_lap ? ` · ${stint.start_lap}–${stint.end_lap}. kör` : '';
  return `<span class="tyre tyre-${size}" style="color:${t.color}" title="${esc(t.name + actual + laps)}">${t.short}</span>`;
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** ms → "1:23.456" */
export function fmtLap(ms) {
  if (!ms || ms <= 0) return '—';
  const m = Math.floor(ms / 60000);
  const s = (ms % 60000) / 1000;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

/** szektoridő ms → "28.123" (perc felett "1:02.345") */
export function fmtSector(ms) {
  if (!ms || ms <= 0) return '—';
  return ms < 60000 ? (ms / 1000).toFixed(3) : fmtLap(ms);
}

/** másodperc → "1:23:45.678" */
export function fmtRaceTime(sec) {
  if (!sec || sec <= 0) return '—';
  const totalMs = Math.round(sec * 1000);
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = ((totalMs % 60000) / 1000).toFixed(3).padStart(6, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** hátrány másodpercben → "+12.345" / "+1:02.345" */
export function fmtGap(sec) {
  if (sec == null || !isFinite(sec)) return '—';
  const ms = Math.round(sec * 1000);
  return '+' + (ms < 60000 ? (ms / 1000).toFixed(3) : fmtLap(ms));
}

const dateFmt = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '—' : dateFmt.format(d);
}

export const WEATHER_ICONS = { 0: '☀️', 1: '🌤️', 2: '☁️', 3: '🌦️', 4: '🌧️', 5: '⛈️' };

export const STATUS_FINISHED = 3;

export function statusLabel(d) {
  switch (d.result_status) {
    case 3: return 'Célba ért';
    case 4: return 'Kiesett';
    case 5: return 'Kizárva';
    case 6: return 'Nem klasszifikált';
    case 7: return 'Kiesett';
    default: return d.result_status_name || '—';
  }
}

export function stopwatchIcon(cls = 'w-4 h-4') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="8"/><path d="M12 10v4l2.5 2"/><path d="M9 2h6"/><path d="M12 2v4"/></svg>`;
}

export function emptyState(title, text) {
  return `<div class="panel p-10 text-center"><div class="text-4xl mb-3">🏁</div>
    <div class="text-lg font-bold text-white">${esc(title)}</div>
    <div class="text-slate-400 mt-1">${text}</div></div>`;
}
