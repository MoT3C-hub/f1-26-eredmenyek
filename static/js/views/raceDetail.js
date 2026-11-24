// Verseny részletező: fejléc + 4 fül

import { api } from '../api.js?v=5';
import { buildContext } from '../analysis.js?v=5';
import { esc, fmtDate, fmtLap, WEATHER_ICONS, teamColor, stopwatchIcon } from '../format.js?v=5';
import { renderClassification } from './tabs/classification.js?v=5';
import { renderLapAnalysis } from './tabs/laps.js?v=5';
import { renderPositions } from './tabs/positions.js?v=5';
import { renderTyreStints } from './tabs/tyres.js?v=5';
import { renderEvents } from './tabs/events.js?v=5';
import { renderStats } from './tabs/stats.js?v=5';

const TABS = [
  { id: 'eredmeny', label: 'Végeredmény', render: renderClassification },
  { id: 'korido', label: 'Köridő-elemző', render: renderLapAnalysis },
  { id: 'pozicio', label: 'Pozíciógrafikon', render: renderPositions },
  { id: 'gumik', label: 'Gumistratégia', render: renderTyreStints },
  { id: 'esemenyek', label: 'Események & Speed Trap', render: renderEvents },
  { id: 'statisztika', label: 'Statisztikák', render: renderStats },
];

let cache = { uid: null, ctx: null, summary: null };
let cleanup = null;

export async function renderRaceDetail(app, uid, tabId) {
  const tab = TABS.find((t) => t.id === tabId) || TABS[0];

  if (cache.uid !== uid) {
    app.innerHTML = `<div class="py-24 text-center text-slate-500">Futam betöltése…</div>`;
    const res = await api.getRace(uid);
    cache = { uid, ctx: buildContext(res.data), summary: res.summary };
  }
  if (!app.querySelector(`[data-race-shell="${uid}"]`)) {
    app.innerHTML = shell(cache.ctx, cache.summary, uid);
  }

  app.querySelectorAll('[data-tab]').forEach((el) => el.classList.toggle('active', el.dataset.tab === tab.id));
  if (cleanup) { cleanup(); cleanup = null; }
  const content = app.querySelector('#tab-content');
  content.innerHTML = '';
  content.classList.remove('fade-in'); void content.offsetWidth; content.classList.add('fade-in');
  cleanup = tab.render(content, cache.ctx) || null;
}

function stat(label, value, sub = '', extra = '') {
  return `<div class="panel px-4 py-3 ${extra}">
    <div class="kicker !text-[10px]">${label}</div>
    <div class="text-white font-bold truncate">${value}</div>
    ${sub ? `<div class="text-xs text-slate-400 truncate">${sub}</div>` : ''}
  </div>`;
}

function shell(ctx, summary, uid) {
  const { race, leader, fastest } = ctx;
  const s = race.session;
  const temps = [s.air_temperature != null ? `Levegő ${s.air_temperature}°C` : '', s.track_temperature != null ? `Aszfalt ${s.track_temperature}°C` : '']
    .filter(Boolean).join(' · ');
  const finished = ctx.drivers.filter((d) => d._finished).length;

  return `
  <div data-race-shell="${esc(uid)}">
    <a href="#/" class="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4">← Összes futam</a>

    <div class="panel relative overflow-hidden p-5 md:p-6 mb-4">
      <div class="absolute inset-y-0 right-0 w-1/2 opacity-[0.07] pointer-events-none"
           style="background: repeating-linear-gradient(-55deg, #fff 0 18px, transparent 18px 36px)"></div>
      <div class="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="px-1.5 py-0.5 rounded bg-f1red text-white font-bold uppercase tracking-wider text-[10px]">${esc(s.session_type_name)}</span>
            <span>${esc(fmtDate(race.recorded_at))}</span>
            <span class="hidden sm:inline">· UID <span class="num">${esc(race.session_uid)}</span></span>
          </div>
          <h1 class="text-3xl md:text-5xl font-black text-white tracking-tight mt-1">${esc(s.track_name)}</h1>
        </div>
        <div class="text-right text-sm text-slate-400">
          <div class="text-2xl">${WEATHER_ICONS[s.weather] || ''} <span class="text-base text-slate-200 font-semibold align-middle">${esc(s.weather_name)}</span></div>
          <div>${esc(temps)}</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      ${stat('Győztes', `<span class="team-bar !h-4 align-middle mr-2" style="background:${teamColor(leader?.team_name)}"></span>${esc(leader?.name || '—')}`, esc(leader?.team_name || ''))}
      ${stat('Leggyorsabb kör', `<span class="inline-flex items-center gap-1.5 text-purple-200">${stopwatchIcon('w-4 h-4')}<span class="num">${fmtLap(fastest?.ms)}</span></span>`,
        fastest ? `${esc(fastest.driver?.name || '')}${fastest.lap ? ` · ${fastest.lap}. kör` : ''}` : '', '!border-purple-500/30')}
      ${stat('Körök', `<span class="num">${summary.laps_completed}${s.total_laps ? ` / ${s.total_laps}` : ''}</span>`, s.track_length_m ? `${(s.track_length_m / 1000).toFixed(3)} km-es pálya` : '')}
      ${stat('Célba ért', `<span class="num">${finished} / ${ctx.drivers.length}</span>`, `${ctx.drivers.length - finished} kieső / nem klasszifikált`)}
    </div>

    <div class="border-b border-white/10 mb-5 overflow-x-auto">
      <nav class="flex gap-1 md:gap-4 -mb-px">
        ${TABS.map((t) => `<a href="#/race/${esc(uid)}/${t.id}" data-tab="${t.id}" class="tab-btn px-3 py-3 font-bold text-sm md:text-base">${t.label}</a>`).join('')}
      </nav>
    </div>

    <div id="tab-content"></div>
  </div>`;
}
