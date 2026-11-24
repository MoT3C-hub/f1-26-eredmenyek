// 3. fül: F1 TV stílusú Pozíciógrafikon (Packet 15 – LapPositions)

import { esc } from '../../format.js';
import { createSafetyCarPlugin } from '../../analysis.js';

export function renderPositions(el, ctx) {
  const { drivers, maxLaps, lapPositions, lapPositionsEstimated, events, safetyCarPeriods } = ctx;

  if (!lapPositions.length) {
    el.innerHTML = `<div class="panel p-10 text-center text-slate-400">
      Ehhez a futamhoz nem áll rendelkezésre körönkénti pozícióadat.</div>`;
    return () => {};
  }

  const defaultCount = Math.min(10, drivers.length);
  const selected = new Set(drivers.slice(0, defaultCount).map((d) => d.car_index));
  const posByLap = new Map(lapPositions.map((row) => [Number(row.lap), row.positions || {}]));
  const totalLaps = Math.max(maxLaps, ...lapPositions.map((r) => Number(r.lap) || 0));
  let chart = null;

  const overtakes = events.filter((e) => e.code === 'OVTK');
  const overtakeCounts = new Map();
  for (const ov of overtakes) {
    if (ov.driver_name) {
      const prev = overtakeCounts.get(ov.driver_name) || { name: ov.driver_name, team: ov.team_name, count: 0 };
      prev.count += 1;
      overtakeCounts.set(ov.driver_name, prev);
    }
  }
  const topOvertakers = [...overtakeCounts.values()].sort((a, b) => b.count - a.count);

  el.innerHTML = `
    <div class="panel p-4 md:p-5 mb-5">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div class="kicker">Verseny lefolyása</div>
          <h2 class="text-lg font-bold text-white flex flex-wrap items-center gap-2">
            <span>Pozíciógrafikon (Lap Chart)</span>
            ${lapPositionsEstimated ? '<span class="px-2 py-0.5 rounded bg-slate-700/70 text-slate-300 text-[11px] font-semibold">Becsült (köridők alapján)</span>' : ''}
            ${safetyCarPeriods.length ? '<span class="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 text-[11px] font-semibold">SC / VSC jelölve</span>' : ''}
          </h2>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <button id="pos-all" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-semibold">Összes</button>
          <button id="pos-top10" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-semibold">Top 10</button>
          <button id="pos-top5" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-semibold">Top 5</button>
          <button id="pos-clear" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">Törlés</button>
        </div>
      </div>

      <div id="pos-chips" class="flex flex-wrap gap-1.5 mb-4">
        ${drivers.map((d) => `
          <button type="button" data-car="${d.car_index}" class="chip ${selected.has(d.car_index) ? 'on' : ''}" style="--c:${d._color}">
            <span class="dot"></span>
            <span class="num text-[11px] opacity-70">P${d.position || '?'}</span>
            <span class="font-semibold">${esc(d.name)}</span>
          </button>`).join('')}
      </div>

      <div class="relative h-[400px] md:h-[480px]">
        <canvas id="pos-chart"></canvas>
      </div>
    </div>

    ${overtakes.length ? `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="panel overflow-hidden">
        <div class="px-4 py-3 border-b border-white/5">
          <div class="kicker">Aktivitás</div>
          <h3 class="font-bold text-white">Legtöbb előzés (${overtakes.length} rögzítve)</h3>
        </div>
        <div class="overflow-x-auto max-h-[300px]">
          <table class="data-table text-xs md:text-sm">
            <thead><tr><th class="text-center w-10">#</th><th>Pilóta</th><th>Csapat</th><th class="text-right">Előzések</th></tr></thead>
            <tbody>
              ${topOvertakers.map((o, i) => `
              <tr>
                <td class="num text-center text-slate-500">${i + 1}</td>
                <td class="font-semibold text-white">${esc(o.name)}</td>
                <td class="text-slate-400">${esc(o.team || '')}</td>
                <td class="num text-right font-bold text-emerald-400">${o.count}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel overflow-hidden">
        <div class="px-4 py-3 border-b border-white/5">
          <div class="kicker">Pályán történt helycserék</div>
          <h3 class="font-bold text-white">Előzések listája</h3>
        </div>
        <div class="overflow-x-auto max-h-[300px]">
          <table class="data-table text-xs md:text-sm">
            <thead><tr><th class="text-center w-14">Kör</th><th>Előző</th><th>Megelőzött</th></tr></thead>
            <tbody>
              ${overtakes.map((o) => `
              <tr>
                <td class="num text-center text-slate-400">${o.lap}.</td>
                <td class="font-semibold text-emerald-300">${esc(o.driver_name)}</td>
                <td class="text-slate-300">${esc(o.other_driver_name)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>` : ''}
  `;

  const canvas = el.querySelector('#pos-chart');
  const labels = ['Rajt', ...Array.from({ length: totalLaps }, (_, i) => `${i + 1}. kör`)];
  const scPlugin = createSafetyCarPlugin(safetyCarPeriods, 0);

  function updateChart() {
    const active = drivers.filter((d) => selected.has(d.car_index));
    const datasets = active.map((d) => {
      const carKey = String(d.car_index);
      const data = [d.grid_position > 0 ? d.grid_position : null];
      for (let lap = 1; lap <= totalLaps; lap++) {
        const map = posByLap.get(lap);
        let p = map ? map[carKey] ?? null : null;
        if (p == null && lap === totalLaps && d.position > 0 && d.num_laps >= totalLaps) {
          p = d.position;
        }
        data.push(p);
      }
      return {
        label: `${d.position ? `P${d.position} ` : ''}${d.name}`,
        data,
        borderColor: d._color,
        backgroundColor: d._color,
        borderWidth: 2.2,
        borderDash: d._dash ? [6, 4] : [],
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.12,
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
          legend: { position: 'bottom', labels: { boxWidth: 14, padding: 12, usePointStyle: true } },
          tooltip: {
            backgroundColor: 'rgba(10,12,18,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            itemSort: (a, b) => (a.parsed.y ?? 999) - (b.parsed.y ?? 999),
            callbacks: {
              label: (item) => (item.parsed.y == null ? null : `P${item.parsed.y} · ${item.dataset.label.replace(/^P\d+\s+/, '')}`),
            },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { maxTicksLimit: 18 } },
          y: {
            reverse: true,
            min: 1,
            max: Math.max(drivers.length, 2),
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              stepSize: 1,
              callback: (v) => (Number.isInteger(v) ? `P${v}` : ''),
            },
          },
        },
      },
    });
  }

  function syncPosChips() {
    el.querySelectorAll('#pos-chips [data-car]').forEach((btn) => {
      btn.classList.toggle('on', selected.has(Number(btn.dataset.car)));
    });
  }

  el.querySelector('#pos-chips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-car]');
    if (!btn) return;
    const id = Number(btn.dataset.car);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    syncPosChips();
    updateChart();
  });

  el.querySelector('#pos-all').addEventListener('click', () => {
    drivers.forEach((d) => selected.add(d.car_index));
    syncPosChips(); updateChart();
  });
  el.querySelector('#pos-top10').addEventListener('click', () => {
    selected.clear();
    drivers.slice(0, 10).forEach((d) => selected.add(d.car_index));
    syncPosChips(); updateChart();
  });
  el.querySelector('#pos-top5').addEventListener('click', () => {
    selected.clear();
    drivers.slice(0, 5).forEach((d) => selected.add(d.car_index));
    syncPosChips(); updateChart();
  });
  el.querySelector('#pos-clear').addEventListener('click', () => {
    selected.clear(); syncPosChips(); updateChart();
  });

  updateChart();

  return () => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  };
}
