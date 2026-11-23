// 4. fül: Verseny statisztikák (Biggest Mover, legkiegyensúlyozottabb tempó, szektorkirályok + lenyitható teljes mezőny)

import { esc, fmtLap, fmtSector } from '../../format.js';
import { isOutlierLap, stdev } from '../../analysis.js';

function expandableCard(kicker, title, driver, metric, sub, accent, detailsTitle, detailsHtml) {
  if (!driver) {
    return `<div class="panel p-5 border ${accent}"><div class="kicker">${kicker}</div>
      <div class="text-lg font-bold text-white mt-1">${title}</div>
      <div class="text-sm text-slate-500 mt-3">Nincs elég adat</div></div>`;
  }
  return `
  <div class="panel p-5 border ${accent} flex flex-col justify-between">
    <div>
      <div class="kicker">${kicker}</div>
      <div class="text-sm text-slate-400 mt-0.5">${title}</div>
      <div class="flex items-center gap-2.5 mt-3">
        <span class="team-bar !h-7" style="background:${driver._color}"></span>
        <div class="min-w-0">
          <div class="text-xl font-black text-white truncate">${esc(driver.name)}</div>
          <div class="text-xs text-slate-400 truncate">${esc(driver.team_name)}</div>
        </div>
      </div>
    </div>
    <div class="mt-4 pt-3 border-t border-white/5 flex items-baseline justify-between gap-2">
      <span class="num text-2xl font-black text-white">${metric}</span>
      <span class="text-xs text-slate-400 text-right">${sub}</span>
    </div>
    ${detailsHtml ? `
    <details class="mt-3 pt-2.5 border-t border-white/5">
      <summary class="flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white select-none">
        <span>${detailsTitle}</span>
        <svg class="chev w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>
      </summary>
      <div class="mt-2.5 max-h-64 overflow-y-auto rounded-lg border border-white/5 bg-ink-900/70">
        ${detailsHtml}
      </div>
    </details>` : ''}
  </div>`;
}

function deltaBadge(gained) {
  if (gained > 0) return `<span class="text-emerald-400 font-bold">+${gained}</span>`;
  if (gained < 0) return `<span class="text-red-400 font-bold">${gained}</span>`;
  return '<span class="text-slate-500">0</span>';
}

export function renderStats(el, ctx) {
  const { drivers, bestSectors } = ctx;

  // 1. Legtöbbet előrelépő pilóta (Biggest Mover)
  const movers = drivers
    .filter((d) => d.grid_position > 0 && d.position > 0)
    .map((d) => ({ driver: d, gained: d.grid_position - d.position }))
    .sort((a, b) => b.gained - a.gained || a.driver.position - b.driver.position);
  const topMover = movers[0];

  const moversTable = movers.length ? `
    <table class="data-table text-xs">
      <thead><tr><th class="text-center w-8">#</th><th>Pilóta</th><th class="text-center">Rajt → Cél</th><th class="text-right">Változás</th></tr></thead>
      <tbody>
        ${movers.map((m, idx) => `
        <tr>
          <td class="num text-center text-slate-500">${idx + 1}</td>
          <td><span class="team-bar !h-3 align-middle mr-1.5" style="background:${m.driver._color}"></span><span class="font-semibold text-white">${esc(m.driver.name)}</span></td>
          <td class="num text-center text-slate-300">P${m.driver.grid_position} → P${m.driver.position}</td>
          <td class="num text-right">${deltaBadge(m.gained)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '';

  // 2. Legkiegyensúlyozottabb tempó (legkisebb szórás az érvényes tiszta körök között; tartalék: minden érvényes kör)
  const consistency = drivers.map((d) => {
    const clean = d.laps.filter((l) => !isOutlierLap(d, l) && l.lap_time_ms > 0).map((l) => l.lap_time_ms);
    const validAll = d.laps.filter((l) => l.valid && l.lap_time_ms > 0).map((l) => l.lap_time_ms);
    const sample = clean.length >= 5 ? clean : validAll;
    const sd = stdev(sample);
    const mean = sample.length ? sample.reduce((s, v) => s + v, 0) / sample.length : NaN;
    return { driver: d, sd, mean, count: sample.length };
  }).filter((r) => isFinite(r.sd)).sort((a, b) => a.sd - b.sd);
  const mostConsistent = consistency[0];

  const consistencyMiniTable = consistency.length ? `
    <table class="data-table text-xs">
      <thead><tr><th class="text-center w-8">#</th><th>Pilóta</th><th class="text-right">Szórás</th><th class="text-right">Átlag</th><th class="text-center">Kör</th></tr></thead>
      <tbody>
        ${consistency.map((r, idx) => `
        <tr>
          <td class="num text-center text-slate-500">${idx + 1}</td>
          <td><span class="team-bar !h-3 align-middle mr-1.5" style="background:${r.driver._color}"></span><span class="font-semibold text-white">${esc(r.driver.name)}</span></td>
          <td class="num text-right text-sky-300 font-semibold">±${(r.sd / 1000).toFixed(3)}</td>
          <td class="num text-right text-slate-300">${fmtLap(Math.round(r.mean))}</td>
          <td class="num text-center text-slate-400">${r.count}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '';

  // 3. Szektorok ranglistája pilótánként (S1, S2, S3)
  function sectorRankingTable(sectorIdx) {
    const list = drivers
      .filter((d) => d._pbSectors[sectorIdx])
      .map((d) => ({ driver: d, ms: d._pbSectors[sectorIdx].ms, lap: d._pbSectors[sectorIdx].lap }))
      .sort((a, b) => a.ms - b.ms);
    if (!list.length) return '';
    const bestMs = list[0].ms;
    return `
      <table class="data-table text-xs">
        <thead><tr><th class="text-center w-8">#</th><th>Pilóta</th><th class="text-right">Idő</th><th class="text-right">Hátrány</th><th class="text-center">Kör</th></tr></thead>
        <tbody>
          ${list.map((item, idx) => `
          <tr>
            <td class="num text-center text-slate-500">${idx + 1}</td>
            <td><span class="team-bar !h-3 align-middle mr-1.5" style="background:${item.driver._color}"></span><span class="font-semibold text-white">${esc(item.driver.name)}</span></td>
            <td class="num text-right ${idx === 0 ? 'text-purple-300 font-bold' : 'text-slate-200'}">${fmtSector(item.ms)}</td>
            <td class="num text-right text-slate-400">${idx === 0 ? '—' : `+${((item.ms - bestMs) / 1000).toFixed(3)}`}</td>
            <td class="num text-center text-slate-500">${item.lap}.</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  // 4. Elméleti legjobb köridők (pilóták saját legjobb szektorainak összege)
  const theoretical = drivers
    .filter((d) => d._pbSectors.every(Boolean))
    .map((d) => {
      const theo = d._pbSectors[0].ms + d._pbSectors[1].ms + d._pbSectors[2].ms;
      const actual = d._pbLap?.lap_time_ms || d.best_lap_time_ms || 0;
      return { driver: d, theo, actual, diff: actual ? actual - theo : 0 };
    })
    .sort((a, b) => a.theo - b.theo);

  const absTheo = bestSectors.every(Boolean)
    ? bestSectors[0].ms + bestSectors[1].ms + bestSectors[2].ms
    : null;

  el.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start mb-5">
      ${expandableCard(
        'Legtöbbet előrelépő pilóta',
        'Biggest Mover (rajthely → cél)',
        topMover?.driver,
        topMover ? `${topMover.gained > 0 ? `+${topMover.gained}` : topMover.gained} hely` : '—',
        topMover ? `P${topMover.driver.grid_position} → P${topMover.driver.position}` : '',
        'border-emerald-500/30',
        `Összes pilóta (${movers.length})`,
        moversTable,
      )}
      ${expandableCard(
        'Legkiegyensúlyozottabb tempó',
        'Legkisebb szórás az érvényes tiszta körök között',
        mostConsistent?.driver,
        mostConsistent ? `±${(mostConsistent.sd / 1000).toFixed(3)} mp` : '—',
        mostConsistent ? `${mostConsistent.count} kör · átlag ${fmtLap(Math.round(mostConsistent.mean))}` : '',
        'border-sky-500/30',
        `Összes pilóta (${consistency.length})`,
        consistencyMiniTable,
      )}
    </div>

    <div class="mb-5">
      <div class="kicker mb-2">A szektorok királyai (abszolút leggyorsabb szektoridők)</div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        ${[0, 1, 2].map((i) => {
          const s = bestSectors[i];
          const tbl = sectorRankingTable(i);
          const count = drivers.filter((d) => d._pbSectors[i]).length;
          return expandableCard(
            `${i + 1}. szektor`,
            `Leggyorsabb S${i + 1}`,
            s?.driver,
            s ? `<span class="text-purple-300">${fmtSector(s.ms)}</span>` : '—',
            s ? `${s.lap}. körben` : '',
            'border-purple-500/30',
            `Összes pilóta S${i + 1} (${count})`,
            tbl,
          );
        }).join('')}
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="panel overflow-hidden">
        <div class="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div>
            <div class="kicker">Tempó-konzisztencia</div>
            <h3 class="font-bold text-white">Köridő-szórás ranglista</h3>
          </div>
          <span class="text-xs text-slate-400">Rajt- és bokszkörök nélkül</span>
        </div>
        <div class="overflow-x-auto max-h-[380px]">
          <table class="data-table text-xs md:text-sm">
            <thead><tr><th class="text-center">#</th><th>Pilóta</th><th class="text-right">Szórás</th><th class="text-right">Átlag</th><th class="text-center">Kör</th></tr></thead>
            <tbody>
              ${consistency.map((r, i) => `
              <tr>
                <td class="num text-center text-slate-500">${i + 1}</td>
                <td><span class="team-bar !h-3.5 align-middle mr-2" style="background:${r.driver._color}"></span><span class="font-semibold text-white">${esc(r.driver.name)}</span></td>
                <td class="num text-right font-bold text-sky-300">±${(r.sd / 1000).toFixed(3)} mp</td>
                <td class="num text-right text-slate-300">${fmtLap(Math.round(r.mean))}</td>
                <td class="num text-center text-slate-400">${r.count}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel overflow-hidden">
        <div class="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div>
            <div class="kicker">Szektor-összegzés</div>
            <h3 class="font-bold text-white">Elméleti vs. valós legjobb kör</h3>
          </div>
          ${absTheo ? `<span class="text-xs text-purple-300 num">Absz. elméleti: ${fmtLap(absTheo)}</span>` : ''}
        </div>
        <div class="overflow-x-auto max-h-[380px]">
          <table class="data-table text-xs md:text-sm">
            <thead><tr><th class="text-center">#</th><th>Pilóta</th><th class="text-right">Elméleti</th><th class="text-right">Valós legjobb</th><th class="text-right">Tartalék</th></tr></thead>
            <tbody>
              ${theoretical.map((r, i) => `
              <tr>
                <td class="num text-center text-slate-500">${i + 1}</td>
                <td><span class="team-bar !h-3.5 align-middle mr-2" style="background:${r.driver._color}"></span><span class="font-semibold text-white">${esc(r.driver.name)}</span></td>
                <td class="num text-right text-purple-300 font-semibold">${fmtLap(r.theo)}</td>
                <td class="num text-right text-slate-200">${fmtLap(r.actual)}</td>
                <td class="num text-right text-slate-400">${r.diff > 0 ? `+${(r.diff / 1000).toFixed(3)} mp` : '0.000 mp'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}
