// 1. fül: Végeredmény táblázat

import { esc, fmtLap, fmtRaceTime, fmtGap, tyreBadge, statusLabel, stopwatchIcon } from '../../format.js';

function gridDelta(d) {
  if (!d.grid_position || !d.position) return '<span class="text-slate-600">–</span>';
  const delta = d.grid_position - d.position;
  if (delta > 0) return `<span class="text-emerald-400 font-bold" title="${delta} helyet nyert">▲${delta}</span>`;
  if (delta < 0) return `<span class="text-red-400 font-bold" title="${-delta} helyet vesztett">▼${-delta}</span>`;
  return '<span class="text-slate-500">–</span>';
}

function timeCell(d, leader) {
  if (!d._finished) {
    const reason = d.result_reason_name && d.result_reason_name !== 'Érvénytelen' ? ` · ${d.result_reason_name}` : '';
    return `<span class="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 text-xs font-bold uppercase" title="${esc(d.result_status_name + reason)}">${esc(statusLabel(d))}</span>
            <span class="text-xs text-slate-500 ml-1">${esc(d.result_reason_name && d.result_reason_name !== 'Érvénytelen' ? d.result_reason_name : '')}</span>`;
  }
  const total = d.total_race_time_s + (d.penalties_time_s || 0);
  if (d === leader) return `<span class="num text-white font-bold">${fmtRaceTime(total)}</span>`;
  const lapsDown = (leader?.num_laps || 0) - d.num_laps;
  if (lapsDown > 0) return `<span class="num text-slate-300">+${lapsDown} kör</span>`;
  const leaderTotal = leader.total_race_time_s + (leader.penalties_time_s || 0);
  return `<span class="num text-slate-200">${fmtGap(total - leaderTotal)}</span>`;
}

export function renderClassification(el, ctx) {
  const { drivers, leader, fastest } = ctx;
  const hasSpeedTrap = drivers.some((d) => d.speed_trap_kmh && d.speed_trap_kmh > 0);
  const maxSpeedTrap = hasSpeedTrap ? Math.max(...drivers.map((d) => d.speed_trap_kmh || 0)) : 0;

  const rows = drivers.map((d) => {
    const isFastest = fastest && d.best_lap_time_ms === fastest.ms;
    const isTopSpeed = hasSpeedTrap && d.speed_trap_kmh === maxSpeedTrap;
    const warnBadge = d.corner_cutting_warnings > 0
      ? ` <span class="text-[11px] text-amber-400/90 num" title="${d.corner_cutting_warnings} pályaelhagyási figyelmeztetés">⚠${d.corner_cutting_warnings}</span>`
      : '';
    const pen = d.penalties_time_s
      ? `<span class="text-amber-300 font-semibold num">+${d.penalties_time_s} mp</span>${d.num_penalties > 1 ? ` <span class="text-xs text-slate-500">(${d.num_penalties}×)</span>` : ''}${warnBadge}`
      : (warnBadge ? warnBadge.trim() : '<span class="text-slate-600">—</span>');
    return `
    <tr class="${d._finished ? '' : 'opacity-70'}">
      <td class="num font-bold text-white text-center">${d.position || '—'}</td>
      <td>
        <div class="flex items-center gap-2.5">
          <span class="team-bar" style="background:${d._color}"></span>
          <span class="num text-xs text-slate-500 w-6 text-right">${d.race_number || ''}</span>
          <span class="font-bold text-white whitespace-nowrap">${esc(d.name)}</span>
        </div>
      </td>
      <td class="whitespace-nowrap"><span class="inline-block w-2 h-2 rounded-full mr-2" style="background:${d._color}"></span><span class="text-slate-300">${esc(d.team_name)}</span></td>
      <td class="whitespace-nowrap"><span class="num text-slate-400 w-6 inline-block text-right mr-2">${d.grid_position || '—'}</span>${gridDelta(d)}</td>
      <td class="num text-center">${d.num_laps}</td>
      <td class="whitespace-nowrap">${timeCell(d, leader)}</td>
      <td class="num whitespace-nowrap ${isFastest ? 'cell-purple rounded' : 'text-slate-300'}">
        ${isFastest ? `<span class="inline-flex items-center gap-1">${stopwatchIcon('w-3.5 h-3.5')}${fmtLap(d.best_lap_time_ms)}</span>` : fmtLap(d.best_lap_time_ms)}
      </td>
      ${hasSpeedTrap ? `<td class="num whitespace-nowrap ${isTopSpeed ? 'text-cyan-300 font-bold' : 'text-slate-300'}">${d.speed_trap_kmh ? `${d.speed_trap_kmh.toFixed(1)}` : '—'}</td>` : ''}
      <td class="num text-center">${d.num_pit_stops}</td>
      <td><div class="flex items-center gap-1">${d.tyre_stints.map((s) => tyreBadge(s)).join('<span class="text-slate-600 text-xs">›</span>')}</div></td>
      <td class="whitespace-nowrap">${pen}</td>
      <td class="num text-center font-bold ${d.points ? 'text-white' : 'text-slate-600'}">${d.points || 0}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="panel overflow-hidden">
      <div class="overflow-x-auto">
        <table class="data-table text-sm">
          <thead><tr>
            <th class="text-center">Poz.</th><th>Pilóta</th><th>Csapat</th><th>Rajthely</th><th class="text-center">Körök</th>
            <th>Idő / Hátrány</th><th>Legjobb kör</th>${hasSpeedTrap ? '<th>Végseb. (km/h)</th>' : ''}<th class="text-center">Kiállás</th><th>Gumik</th><th>Büntetés</th><th class="text-center">Pont</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div class="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs text-slate-400">
      <span><span class="text-emerald-400 font-bold">▲</span> nyert pozíció</span>
      <span><span class="text-red-400 font-bold">▼</span> vesztett pozíció</span>
      <span><span class="inline-block w-3 h-3 rounded-sm bg-purple-500/40 align-middle mr-1"></span>abszolút leggyorsabb kör</span>
      <span>Az összidő a büntetéseket is tartalmazza.</span>
    </div>`;
}
