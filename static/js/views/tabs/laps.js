// 2. fül: Köridő-elemző (interaktív Chart.js vonaldiagram + szűrhető, lenyitható szektortáblázat)

import { esc, fmtLap, fmtSector, tyreBadge } from '../../format.js';
import { createSafetyCarPlugin, isOutlierLap, median, stintForLap } from '../../analysis.js';

export function renderLapAnalysis(el, ctx) {
  const { drivers, maxLaps, bestLap, bestSectors, fastest, safetyCarPeriods } = ctx;
  const selected = new Set(drivers.slice(0, 4).map((d) => d.car_index));
  let hideOutliers = true;
  let driverFilter = 'all';
  let onlyInvalid = false;
  let chart = null;

  el.innerHTML = `
    <div class="panel p-4 md:p-5 mb-5">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div class="kicker">Körönkénti tempó</div>
          <h2 class="text-lg font-bold text-white flex flex-wrap items-center gap-2">
            <span>Köridő-összehasonlító grafikon</span>
            ${safetyCarPeriods.length ? '<span class="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 text-[11px] font-semibold">SC / VSC jelölve</span>' : ''}
          </h2>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer select-none">
            <input id="chk-outliers" type="checkbox" checked class="accent-red-600">
            <span>Kiugró körök elrejtése (rajt, boksz, érvénytelen)</span>
          </label>
          <button id="btn-top5" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-semibold">Top 5</button>
          <button id="btn-podium" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-semibold">Dobogó</button>
          <button id="btn-clear" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">Törlés</button>
        </div>
      </div>

      <div id="driver-chips" class="flex flex-wrap gap-1.5 mb-4">
        ${drivers.map((d) => `
          <button type="button" data-car="${d.car_index}" class="chip ${selected.has(d.car_index) ? 'on' : ''}" style="--c:${d._color}">
            <span class="dot"></span>
            <span class="num text-[11px] opacity-70">P${d.position || '?'}</span>
            <span class="font-semibold">${esc(d.name)}</span>
          </button>`).join('')}
      </div>

      <div class="relative h-[340px] md:h-[400px]">
        <canvas id="lap-chart"></canvas>
      </div>
    </div>

    <div class="panel p-4 md:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div class="kicker">Részletes telemetria</div>
          <h2 class="text-lg font-bold text-white">Kör- és szektoridők (S1 · S2 · S3)</h2>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <select id="sel-driver" class="bg-ink-900 border border-white/10 rounded-lg px-3 py-1.5 text-slate-200">
            <option value="all">Összes pilóta (${drivers.length})</option>
            ${drivers.map((d) => `<option value="${d.car_index}">P${d.position || '?'} · ${esc(d.name)} (${esc(d.team_name)})</option>`).join('')}
          </select>
          <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer text-xs select-none">
            <input id="chk-invalid" type="checkbox" class="accent-red-600">
            <span>Csak érvénytelen körök</span>
          </label>
          <button id="btn-expand" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300">Mind kinyit</button>
          <button id="btn-collapse" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300">Mind becsuk</button>
        </div>
      </div>

      <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400 mb-3">
        <span><span class="inline-block w-2.5 h-2.5 rounded-sm bg-purple-500/40 mr-1 align-middle"></span>Abszolút legjobb</span>
        <span><span class="text-emerald-300 font-semibold mr-1">■</span>Egyéni legjobb</span>
        <span><span class="text-red-400 font-semibold mr-1">■</span>Érvénytelen kör / szektor</span>
      </div>

      <div id="lap-accordions" class="flex flex-col gap-2"></div>
    </div>
  `;

  const canvas = el.querySelector('#lap-chart');
  const labels = Array.from({ length: maxLaps }, (_, i) => `${i + 1}. kör`);
  const scPlugin = createSafetyCarPlugin(safetyCarPeriods, -1);

  function updateChart() {
    const active = drivers.filter((d) => selected.has(d.car_index));
    const datasets = active.map((d) => {
      const validClean = d.laps.filter((l) => !isOutlierLap(d, l) && l.lap_time_ms > 0).map((l) => l.lap_time_ms);
      const med = median(validClean);
      const data = labels.map((_, idx) => {
        const lap = d._lapMap.get(idx + 1);
        if (!lap || lap.lap_time_ms <= 0) return null;
        if (hideOutliers && (isOutlierLap(d, lap) || (isFinite(med) && lap.lap_time_ms > med * 1.15))) return null;
        return +(lap.lap_time_ms / 1000).toFixed(3);
      });
      return {
        label: `${d.position ? `P${d.position} ` : ''}${d.name}`,
        data,
        borderColor: d._color,
        backgroundColor: d._color,
        borderWidth: 2,
        borderDash: d._dash ? [6, 4] : [],
        pointRadius: 2.5,
        pointHoverRadius: 5,
        tension: 0.18,
        spanGaps: false,
      };
    });

    if (chart) chart.destroy();
    if (!window.Chart) return;
    chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      plugins: [scPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 14, padding: 14, usePointStyle: true } },
          tooltip: {
            backgroundColor: 'rgba(10,12,18,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: (item) => item.parsed.y == null ? null : `${item.dataset.label}: ${fmtLap(Math.round(item.parsed.y * 1000))}`,
            },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { maxTicksLimit: 15 } },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { callback: (v) => fmtLap(Math.round(v * 1000)) },
          },
        },
      },
    });
  }

  function cellClass(ms, isValid, pbMs, absMs) {
    if (!ms || ms <= 0) return 'text-slate-600';
    if (!isValid) return 'cell-invalid';
    if (absMs && ms === absMs) return 'cell-purple rounded';
    if (pbMs && ms === pbMs) return 'cell-green';
    return 'text-slate-300';
  }

  function renderAccordions(forceOpen = null) {
    const container = el.querySelector('#lap-accordions');
    const list = driverFilter === 'all' ? drivers : drivers.filter((d) => String(d.car_index) === driverFilter);
    const openByDefault = forceOpen ?? (list.length === 1);

    container.innerHTML = list.map((d, idx) => {
      const laps = onlyInvalid ? d.laps.filter((l) => !l.valid) : d.laps;
      const isOpen = forceOpen !== null ? forceOpen : (openByDefault || idx === 0 && driverFilter !== 'all');
      const pbMs = d._pbLap?.lap_time_ms;
      const absBestLapMs = fastest?.ms || bestLap?.ms;

      const rows = laps.map((l) => {
        const stint = stintForLap(d, l.lap);
        const notes = [];
        if (d._inLaps.has(l.lap)) notes.push('<span class="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold">BOKSZ BE</span>');
        if (d._outLaps.has(l.lap)) notes.push('<span class="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-bold">BOKSZ KI</span>');
        if (!l.valid) notes.push('<span class="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 text-[10px] font-bold">ÉRVÉNYTELEN</span>');

        return `
        <tr class="${l.valid ? '' : 'row-invalid bg-red-500/[0.04]'}">
          <td class="num text-center text-slate-400">${l.lap}</td>
          <td>${stint ? tyreBadge(stint) : '<span class="text-slate-600">—</span>'}</td>
          <td class="num lap-time ${cellClass(l.lap_time_ms, l.valid, pbMs, absBestLapMs)}">${fmtLap(l.lap_time_ms)}</td>
          <td class="num ${cellClass(l.sector1_ms, l.sector1_valid, d._pbSectors[0]?.ms, bestSectors[0]?.ms)}">${fmtSector(l.sector1_ms)}</td>
          <td class="num ${cellClass(l.sector2_ms, l.sector2_valid, d._pbSectors[1]?.ms, bestSectors[1]?.ms)}">${fmtSector(l.sector2_ms)}</td>
          <td class="num ${cellClass(l.sector3_ms, l.sector3_valid, d._pbSectors[2]?.ms, bestSectors[2]?.ms)}">${fmtSector(l.sector3_ms)}</td>
          <td class="space-x-1">${notes.join('') || '<span class="text-slate-600 text-xs">Érvényes</span>'}</td>
        </tr>`;
      }).join('');

      return `
      <details class="rounded-lg border border-white/10 bg-ink-900/60 overflow-hidden" ${isOpen ? 'open' : ''}>
        <summary class="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-white/[0.03]">
          <div class="flex items-center gap-3 min-w-0">
            <svg class="chev w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>
            <span class="num font-bold text-slate-400 w-7">P${d.position || '—'}</span>
            <span class="team-bar !h-5" style="background:${d._color}"></span>
            <span class="font-bold text-white truncate">${esc(d.name)}</span>
            <span class="text-xs text-slate-400 hidden sm:inline">${esc(d.team_name)}</span>
          </div>
          <div class="flex items-center gap-4 text-xs">
            <span class="text-slate-400">${laps.length} kör</span>
            <span class="num ${pbMs && pbMs === absBestLapMs ? 'text-purple-300 font-bold' : 'text-slate-200'}">Legjobb: ${fmtLap(pbMs || d.best_lap_time_ms)}</span>
          </div>
        </summary>
        <div class="border-t border-white/5 overflow-x-auto max-h-[420px]">
          ${laps.length ? `
          <table class="data-table text-xs md:text-sm">
            <thead><tr><th class="text-center w-14">Kör</th><th class="w-12">Gumi</th><th>Köridő</th><th>S1</th><th>S2</th><th>S3</th><th>Megjegyzés</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>` : `<div class="p-4 text-center text-xs text-slate-500">Nincs a szűrésnek megfelelő kör.</div>`}
        </div>
      </details>`;
    }).join('');
  }

  function syncChips() {
    el.querySelectorAll('#driver-chips [data-car]').forEach((btn) => {
      btn.classList.toggle('on', selected.has(Number(btn.dataset.car)));
    });
  }

  el.querySelector('#driver-chips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-car]');
    if (!btn) return;
    const id = Number(btn.dataset.car);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    syncChips();
    updateChart();
  });

  el.querySelector('#chk-outliers').addEventListener('change', (e) => {
    hideOutliers = e.target.checked;
    updateChart();
  });
  el.querySelector('#btn-top5').addEventListener('click', () => {
    selected.clear();
    drivers.slice(0, 5).forEach((d) => selected.add(d.car_index));
    syncChips(); updateChart();
  });
  el.querySelector('#btn-podium').addEventListener('click', () => {
    selected.clear();
    drivers.slice(0, 3).forEach((d) => selected.add(d.car_index));
    syncChips(); updateChart();
  });
  el.querySelector('#btn-clear').addEventListener('click', () => {
    selected.clear(); syncChips(); updateChart();
  });

  el.querySelector('#sel-driver').addEventListener('change', (e) => {
    driverFilter = e.target.value;
    renderAccordions(driverFilter === 'all' ? null : true);
  });
  el.querySelector('#chk-invalid').addEventListener('change', (e) => {
    onlyInvalid = e.target.checked;
    renderAccordions();
  });
  el.querySelector('#btn-expand').addEventListener('click', () => renderAccordions(true));
  el.querySelector('#btn-collapse').addEventListener('click', () => renderAccordions(false));

  updateChart();
  renderAccordions(false);

  return () => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  };
}
