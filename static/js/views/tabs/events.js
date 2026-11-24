// 5. fül: Speed Trap, Figyelmeztetések és Versenyesemények idővonala (Packet 2 & Packet 3)

import { esc } from '../../format.js';

const EVENT_STYLES = {
  safety_car: { label: 'Safety Car', badge: 'bg-amber-400/20 text-amber-300 border-amber-400/30' },
  penalty:    { label: 'Büntetés',   badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
  overtake:   { label: 'Előzés',     badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  retirement: { label: 'Kiesés',     badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  fastest_lap:{ label: 'Leggy. kör', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  speed_trap: { label: 'Speed Trap', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
};

function fmtSessionSec(sec) {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function renderEvents(el, ctx) {
  const { drivers, speedTrap, events } = ctx;
  const topSpeed = speedTrap[0];
  const minSpeed = speedTrap.length ? speedTrap[speedTrap.length - 1].speed_trap_kmh : 0;

  const warningsList = drivers
    .filter((d) => (d.corner_cutting_warnings || 0) > 0 || (d.total_warnings || 0) > 0 || (d.penalties_time_s || 0) > 0)
    .sort((a, b) => (b.penalties_time_s || 0) - (a.penalties_time_s || 0)
      || (b.corner_cutting_warnings || 0) - (a.corner_cutting_warnings || 0)
      || (b.total_warnings || 0) - (a.total_warnings || 0));

  const penaltyEvents = events.filter((e) => e.code === 'PENA');
  let activeCategory = 'all';

  el.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
      <div class="panel overflow-hidden">
        <div class="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2">
          <div>
            <div class="kicker">Mérési pont csúcssebesség</div>
            <h2 class="text-lg font-bold text-white">Speed Trap ranglista</h2>
          </div>
          ${topSpeed ? `
          <div class="text-right">
            <div class="num text-xl font-black text-cyan-300">${topSpeed.speed_trap_kmh.toFixed(1)} km/h</div>
            <div class="text-xs text-slate-400">${esc(topSpeed.name)}${topSpeed.speed_trap_lap ? ` · ${topSpeed.speed_trap_lap}. kör` : ''}</div>
          </div>` : ''}
        </div>
        ${speedTrap.length ? `
        <div class="overflow-x-auto max-h-[380px]">
          <table class="data-table text-xs md:text-sm">
            <thead><tr><th class="text-center w-10">#</th><th>Pilóta</th><th>Sebesség</th><th class="text-right">Különbség</th><th class="text-center">Kör</th></tr></thead>
            <tbody>
              ${speedTrap.map((d, idx) => {
                const span = Math.max(1, topSpeed.speed_trap_kmh - minSpeed + 2);
                const pct = Math.min(100, Math.max(15, ((d.speed_trap_kmh - minSpeed + 2) / span) * 100));
                const diff = d.speed_trap_kmh - topSpeed.speed_trap_kmh;
                return `
                <tr>
                  <td class="num text-center text-slate-500">${idx + 1}</td>
                  <td><span class="team-bar !h-3.5 align-middle mr-2" style="background:${d._color}"></span><span class="font-semibold text-white">${esc(d.name)}</span></td>
                  <td class="min-w-[140px]">
                    <div class="flex items-center gap-2">
                      <span class="num font-bold ${idx === 0 ? 'text-cyan-300' : 'text-slate-200'} w-16">${d.speed_trap_kmh.toFixed(1)}</span>
                      <div class="flex-1 h-2 bg-ink-900 rounded-full overflow-hidden">
                        <div class="h-full rounded-full ${idx === 0 ? 'bg-cyan-400' : 'bg-sky-500/70'}" style="width:${pct.toFixed(1)}%"></div>
                      </div>
                    </div>
                  </td>
                  <td class="num text-right text-slate-400">${idx === 0 ? '—' : `${diff.toFixed(1)} km/h`}</td>
                  <td class="num text-center text-slate-500">${d.speed_trap_lap ? `${d.speed_trap_lap}.` : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : `<div class="p-8 text-center text-sm text-slate-500">Ehhez a futamhoz nincs Speed Trap adat.</div>`}
      </div>

      <div class="panel overflow-hidden">
        <div class="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div>
            <div class="kicker">Versenybírói adatok</div>
            <h2 class="text-lg font-bold text-white">Pályaelhagyások és büntetések</h2>
          </div>
          <span class="text-xs text-slate-400">${penaltyEvents.length} részletes esemény</span>
        </div>
        ${warningsList.length ? `
        <div class="overflow-x-auto max-h-[380px]">
          <table class="data-table text-xs md:text-sm">
            <thead><tr><th>Pilóta</th><th class="text-center">Pályaelhagyás</th><th class="text-center">Össz. figyelmeztetés</th><th class="text-right">Időbüntetés</th></tr></thead>
            <tbody>
              ${warningsList.map((d) => `
              <tr>
                <td><span class="team-bar !h-3.5 align-middle mr-2" style="background:${d._color}"></span><span class="font-semibold text-white">${esc(d.name)}</span></td>
                <td class="num text-center ${d.corner_cutting_warnings ? 'text-amber-300 font-bold' : 'text-slate-500'}">${d.corner_cutting_warnings || 0}</td>
                <td class="num text-center text-slate-300">${d.total_warnings || 0}</td>
                <td class="num text-right ${d.penalties_time_s ? 'text-red-300 font-bold' : 'text-slate-600'}">${d.penalties_time_s ? `+${d.penalties_time_s} mp` : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<div class="p-8 text-center text-sm text-slate-500">Nem történt pályaelhagyási figyelmeztetés vagy büntetés.</div>`}
      </div>
    </div>

    <div class="panel p-4 md:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div class="kicker">Versenyirányítás</div>
          <h2 class="text-lg font-bold text-white">Versenyesemények idővonala (${events.length})</h2>
        </div>
        <div id="ev-filters" class="flex flex-wrap gap-1.5 text-xs">
          <button type="button" data-cat="all" class="chip on" style="--c:#e10600">Összes (${events.length})</button>
          <button type="button" data-cat="safety_car" class="chip" style="--c:#facc15">Safety Car / VSC</button>
          <button type="button" data-cat="penalty" class="chip" style="--c:#ef4444">Büntetések</button>
          <button type="button" data-cat="overtake" class="chip" style="--c:#22c55e">Előzések</button>
          <button type="button" data-cat="retirement" class="chip" style="--c:#fb7185">Kiesések</button>
          <button type="button" data-cat="fastest_lap" class="chip" style="--c:#c084fc">Leggyorsabb körök</button>
        </div>
      </div>

      <div id="ev-timeline" class="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1"></div>
    </div>
  `;

  function renderTimeline() {
    const box = el.querySelector('#ev-timeline');
    const items = activeCategory === 'all' ? events : events.filter((e) => e.category === activeCategory);
    if (!items.length) {
      box.innerHTML = `<div class="p-8 text-center text-sm text-slate-500">Nincs megjeleníthető esemény ebben a szűrésben.</div>`;
      return;
    }
    box.innerHTML = items.map((ev) => {
      const st = EVENT_STYLES[ev.category] || { label: ev.code, badge: 'bg-slate-700 text-slate-200 border-white/10' };
      return `
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-ink-900/70 px-3.5 py-2.5 text-sm">
        <div class="flex items-center gap-3 min-w-0">
          <span class="num text-xs font-bold text-slate-400 w-12 shrink-0">${ev.lap ? `${ev.lap}. kör` : '—'}</span>
          <span class="px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider shrink-0 ${st.badge}">${esc(st.label)}</span>
          <div class="min-w-0">
            <span class="font-bold text-white">${esc(ev.title || ev.code)}</span>
            ${ev.driver_name && ev.code !== 'OVTK' ? `<span class="text-slate-300 font-semibold ml-1.5">· ${esc(ev.driver_name)}</span>` : ''}
            ${ev.detail ? `<span class="text-slate-400 ml-1.5">— ${esc(ev.detail)}</span>` : ''}
          </div>
        </div>
        <span class="num text-xs text-slate-500 shrink-0">${fmtSessionSec(ev.session_time)}</span>
      </div>`;
    }).join('');
  }

  el.querySelector('#ev-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    el.querySelectorAll('#ev-filters [data-cat]').forEach((b) => b.classList.toggle('on', b.dataset.cat === activeCategory));
    renderTimeline();
  });

  renderTimeline();
}
