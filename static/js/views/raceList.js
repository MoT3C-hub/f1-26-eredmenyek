// Futamválasztó oldal

import { api } from '../api.js?v=4';
import { esc, fmtDate, fmtLap, teamColor, stopwatchIcon, emptyState } from '../format.js?v=4';

export async function renderRaceList(app) {
  app.innerHTML = `<div class="py-24 text-center text-slate-500">Futamok betöltése…</div>`;
  const races = await api.listRaces();

  const header = `
    <div class="flex flex-wrap items-end justify-between gap-4 mb-6 fade-in">
      <div>
        <div class="kicker">Futamarchívum</div>
        <h1 class="text-3xl md:text-4xl font-black text-white tracking-tight">Rögzített futamok</h1>
        <p class="text-slate-400 mt-1">Válassz egy versenyt a részletes eredményekhez, köridőkhöz és gumistratégiákhoz.</p>
      </div>
      <div class="panel px-4 py-2 text-sm"><span class="text-slate-400">Összesen:</span>
        <span class="num text-white font-bold ml-1">${races.length}</span> <span class="text-slate-400">szakasz</span></div>
    </div>`;

  if (!races.length) {
    app.innerHTML = header + emptyState('Még nincs rögzített futam',
      'Indítsd el az adatgyűjtőt a játék mellett, vagy próbáld ki a szimulációt: <code class="num text-slate-200 bg-white/5 px-1.5 py-0.5 rounded">python collector/main.py --simulate</code>');
    return;
  }

  const rows = races.map((r, i) => {
    const color = teamColor(r.winner_team);
    const progress = r.total_laps ? `${r.laps_completed}/${r.total_laps}` : r.laps_completed;
    return `
    <a href="#/race/${esc(r.session_uid)}" class="race-row panel block p-4 md:p-5 fade-in" style="animation-delay:${Math.min(i, 10) * 25}ms">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
        <div class="md:col-span-4 min-w-0">
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span>${esc(fmtDate(r.recorded_at))}</span>
            <span class="px-1.5 py-0.5 rounded bg-f1red/15 text-red-300 font-bold uppercase tracking-wider text-[10px]">${esc(r.session_type_name)}</span>
          </div>
          <div class="text-xl font-black text-white truncate mt-0.5">${esc(r.track_name)}</div>
        </div>
        <div class="md:col-span-3 flex items-center gap-3 min-w-0">
          <span class="team-bar !h-9" style="background:${color}"></span>
          <div class="min-w-0">
            <div class="kicker !text-[10px]">Győztes</div>
            <div class="font-bold text-white truncate">${esc(r.winner_name || '—')}</div>
            <div class="text-xs text-slate-400 truncate">${esc(r.winner_team || '')}</div>
          </div>
        </div>
        <div class="md:col-span-2">
          <div class="kicker !text-[10px]">Körök</div>
          <div class="num text-white font-bold">${esc(progress)}</div>
          <div class="text-xs text-slate-400">${esc(r.num_drivers)} pilóta</div>
        </div>
        <div class="md:col-span-3 flex md:justify-end">
          ${r.fastest_lap_ms ? `
          <div class="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-purple-200" title="Leggyorsabb kör">
            ${stopwatchIcon('w-5 h-5 text-purple-300')}
            <div class="leading-tight">
              <div class="num font-bold text-purple-100">${fmtLap(r.fastest_lap_ms)}</div>
              <div class="text-xs truncate max-w-[11rem]">${esc(r.fastest_lap_driver)}</div>
            </div>
          </div>` : ''}
        </div>
      </div>
    </a>`;
  }).join('');

  app.innerHTML = header + `<div class="flex flex-col gap-3">${rows}</div>`;
}
