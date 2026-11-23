// 3. fül: Gumistratégia vizualizáció (Gantt-stílusú sávdiagram + bokszkiállások)

import { esc, tyreInfo, TYRES } from '../../format.js';

export function renderTyreStints(el, ctx) {
  const { drivers, maxLaps } = ctx;
  const total = Math.max(maxLaps, 1);

  const legendIds = [...new Set(drivers.flatMap((d) => d.tyre_stints.map((s) => s.compound_visual)))];
  const tickStep = total <= 25 ? 2 : total <= 55 ? 5 : 10;
  const ticks = [];
  for (let lap = 1; lap <= total; lap += tickStep) ticks.push(lap);
  if (ticks[ticks.length - 1] !== total) ticks.push(total);

  const rows = drivers.map((d) => {
    const stints = d.tyre_stints.map((st, idx) => {
      const t = tyreInfo(st.compound_visual);
      const start = Math.max(1, st.start_lap || 1);
      const end = Math.max(start, Math.min(total, st.end_lap || start));
      const len = end - start + 1;
      const leftPct = ((start - 1) / total) * 100;
      const widthPct = (len / total) * 100;
      const label = widthPct >= 14 ? `${t.name} (${len})` : widthPct >= 7 ? `${t.short}·${len}` : t.short;
      const tip = `${t.name}${st.compound_actual_name ? ` (${st.compound_actual_name})` : ''}: ${start}–${end}. kör (${len} kör)`;
      const pit = idx > 0
        ? `<div class="pit-marker" style="left:${leftPct.toFixed(3)}%" title="Bokszkiállás a ${start - 1}. kör végén"></div>`
        : '';
      return `${pit}<div class="stint" style="left:${leftPct.toFixed(3)}%;width:${widthPct.toFixed(3)}%;background:${t.color};color:${t.text}" title="${esc(tip)}">${esc(label)}</div>`;
    }).join('');

    return `
    <div class="grid grid-cols-12 items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
      <div class="col-span-4 sm:col-span-3 flex items-center gap-2 min-w-0 pr-2">
        <span class="num text-xs text-slate-500 w-6 text-right shrink-0">${d.position || '—'}</span>
        <span class="team-bar !h-5 shrink-0" style="background:${d._color}"></span>
        <span class="font-semibold text-sm text-white truncate" title="${esc(d.name)} (${esc(d.team_name)})">${esc(d.name)}</span>
      </div>
      <div class="col-span-7 sm:col-span-8 relative h-8 bg-ink-900/90 rounded-md overflow-hidden border border-white/[0.04]">
        ${stints || '<div class="text-xs text-slate-600 leading-8 px-2">Nincs gumiadat</div>'}
      </div>
      <div class="col-span-1 text-right num text-xs text-slate-400">
        ${d.num_pit_stops} <span class="hidden sm:inline">kiáll.</span>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="panel p-4 md:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div class="kicker">Etapok és bokszkiállások</div>
          <h2 class="text-lg font-bold text-white">Gumistratégia idővonal (${total} kör)</h2>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-xs">
          ${(legendIds.length ? legendIds : [16, 17, 18]).map((id) => {
            const t = TYRES[id] || tyreInfo(id);
            return `<span class="inline-flex items-center gap-1.5 text-slate-300">
              <span class="w-3 h-3 rounded-sm inline-block" style="background:${t.color}"></span>${esc(t.name)}
            </span>`;
          }).join('')}
          <span class="inline-flex items-center gap-1.5 text-slate-400">
            <span class="w-0.5 h-3.5 bg-white inline-block"></span>Bokszkiállás
          </span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <div class="min-w-[640px]">
          <div class="grid grid-cols-12 gap-2 pb-2 mb-1 border-b border-white/10 text-[11px] text-slate-400 num">
            <div class="col-span-4 sm:col-span-3 pl-2 uppercase tracking-wider font-sans font-bold">Pilóta</div>
            <div class="col-span-7 sm:col-span-8 relative h-4">
              ${ticks.map((lap) => {
                const pct = ((lap - 0.5) / total) * 100;
                return `<span class="absolute -translate-x-1/2" style="left:${Math.min(98, Math.max(2, pct)).toFixed(2)}%">${lap}</span>`;
              }).join('')}
            </div>
            <div class="col-span-1 text-right uppercase tracking-wider font-sans font-bold">Box</div>
          </div>

          ${rows}
        </div>
      </div>
    </div>`;
}
