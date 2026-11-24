// --- js/format.js ---
// Formázók, színek, gumi jelvények – közös segédfüggvények
const TEAM_COLORS = {
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
function teamColor(name) {
  if (TEAM_COLORS[name]) return TEAM_COLORS[name];
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 70% 60%)`;
}

// Vizuális gumikeverék ID → megjelenés
const TYRES = {
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
function tyreInfo(visual) {
  return TYRES[visual] || { short: '?', name: `Ismeretlen (${visual})`, color: '#64748b', text: '#fff' };
}
function tyreBadge(stint, size = 'sm') {
  const t = tyreInfo(stint.compound_visual);
  const actual = stint.compound_actual_name ? ` (${stint.compound_actual_name})` : '';
  const laps = stint.start_lap ? ` · ${stint.start_lap}–${stint.end_lap}. kör` : '';
  return `<span class="tyre tyre-${size}" style="color:${t.color}" title="${esc(t.name + actual + laps)}">${t.short}</span>`;
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** ms → "1:23.456" */
function fmtLap(ms) {
  if (!ms || ms <= 0) return '—';
  const m = Math.floor(ms / 60000);
  const s = (ms % 60000) / 1000;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

/** szektoridő ms → "28.123" (perc felett "1:02.345") */
function fmtSector(ms) {
  if (!ms || ms <= 0) return '—';
  return ms < 60000 ? (ms / 1000).toFixed(3) : fmtLap(ms);
}

/** másodperc → "1:23:45.678" */
function fmtRaceTime(sec) {
  if (!sec || sec <= 0) return '—';
  const totalMs = Math.round(sec * 1000);
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = ((totalMs % 60000) / 1000).toFixed(3).padStart(6, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** hátrány másodpercben → "+12.345" / "+1:02.345" */
function fmtGap(sec) {
  if (sec == null || !isFinite(sec)) return '—';
  const ms = Math.round(sec * 1000);
  return '+' + (ms < 60000 ? (ms / 1000).toFixed(3) : fmtLap(ms));
}

const dateFmt = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '—' : dateFmt.format(d);
}
const WEATHER_ICONS = { 0: '☀️', 1: '🌤️', 2: '☁️', 3: '🌦️', 4: '🌧️', 5: '⛈️' };
const STATUS_FINISHED = 3;
const RACE_SESSION_TYPES = new Set([15, 16, 17]);
const QUALI_SESSION_TYPES = new Set([5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
function isRaceSession(sessionType) {
  return RACE_SESSION_TYPES.has(Number(sessionType));
}
function isQualiSession(sessionType) {
  return QUALI_SESSION_TYPES.has(Number(sessionType));
}
function statusLabel(d) {
  switch (d.result_status) {
    case 3: return 'Célba ért';
    case 4: return 'Kiesett';
    case 5: return 'Kizárva';
    case 6: return 'Nem klasszifikált';
    case 7: return 'Kiesett';
    default: return d.result_status_name || '—';
  }
}
function stopwatchIcon(cls = 'w-4 h-4') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="8"/><path d="M12 10v4l2.5 2"/><path d="M9 2h6"/><path d="M12 2v4"/></svg>`;
}
function emptyState(title, text) {
  return `<div class="panel p-10 text-center"><div class="text-4xl mb-3">🏁</div>
    <div class="text-lg font-bold text-white">${esc(title)}</div>
    <div class="text-slate-400 mt-1">${text}</div></div>`;
}

// --- js/api.js ---
// REST API + statikus / beágyazott adat kliens

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).detail; } catch { /* nem JSON */ }
    throw new Error(typeof detail === 'string' && detail ? detail : `HTTP ${res.status}`);
  }
  return res.json();
}
const api = {
  listRaces: () => {
    if (window.__EMBEDDED_RACES__) {
      return Promise.resolve(window.__EMBEDDED_RACES__.list || []);
    }
    if (window.__STATIC_MODE__) {
      return getJSON(`./data/races.json?t=${Date.now()}`);
    }
    return getJSON('/api/v1/races');
  },
  getRace: (uid) => {
    const key = String(uid);
    if (window.__EMBEDDED_RACES__) {
      const detail = window.__EMBEDDED_RACES__.details?.[key];
      if (!detail) return Promise.reject(new Error('A futam nem található a beágyazott fájlban.'));
      return Promise.resolve(detail);
    }
    if (window.__STATIC_MODE__) {
      return getJSON(`./data/races/${encodeURIComponent(key)}.json?t=${Date.now()}`);
    }
    return getJSON(`/api/v1/races/${encodeURIComponent(key)}`);
  },
};

// --- js/analysis.js ---
// Származtatott adatok egy futamhoz: legjobb körök, szektorok, kiállások, szórás

const byPosition = (a, b) => (a.position || 999) - (b.position || 999) || a.car_index - b.car_index;
function stdev(values) {
  if (values.length < 2) return NaN;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
}
function median(values) {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function stintForLap(driver, lap) {
  return driver.tyre_stints.find((s) => lap >= s.start_lap && lap <= s.end_lap) || null;
}

/** Kiugró kör: rajtkör, boksz be/ki kör vagy érvénytelen kör (időmérőn csak az érvénytelen kör) */
function isOutlierLap(driver, lap) {
  if (driver._isRace === false) return !lap.valid;
  return lap.lap === 1 || !lap.valid || driver._inLaps.has(lap.lap) || driver._outLaps.has(lap.lap);
}

/** Safety Car / VSC háttérsávok rajzolása Chart.js vonaldiagramokra. */
function createSafetyCarPlugin(periods = [], lapIndexOffset = -1) {
  const valid = (periods || []).filter((p) => p && p.start_lap >= 1);
  return {
    id: 'safetyCarBands',
    beforeDatasetsDraw(chart) {
      if (!valid.length) return;
      const { ctx, chartArea, scales } = chart;
      const xScale = scales?.x;
      if (!xScale || !chartArea) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      ctx.clip();

      for (const p of valid) {
        const startIdx = p.start_lap + lapIndexOffset;
        const endIdx = Math.max(startIdx, (p.end_lap || p.start_lap) + lapIndexOffset);
        const x1 = xScale.getPixelForValue(startIdx - 0.35);
        const x2 = xScale.getPixelForValue(endIdx + 0.35);
        const left = Math.max(chartArea.left, Math.min(x1, x2));
        const width = Math.max(4, Math.min(chartArea.right, Math.max(x1, x2)) - left);
        const isVsc = p.type === 'VSC';
        ctx.fillStyle = isVsc ? 'rgba(245, 158, 11, 0.11)' : 'rgba(250, 204, 21, 0.14)';
        ctx.fillRect(left, chartArea.top, width, chartArea.bottom - chartArea.top);
        ctx.fillStyle = isVsc ? 'rgba(251, 191, 36, 0.9)' : 'rgba(250, 204, 21, 0.95)';
        ctx.fillRect(left, chartArea.top, width, 3);
        ctx.font = '700 10px "Titillium Web", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.type || 'SC', left + width / 2, chartArea.top + 14);
      }
      ctx.restore();
    },
  };
}

function estimateLapPositions(drivers, maxLaps) {
  const cumByCar = new Map();
  for (const d of drivers) {
    let acc = 0;
    const m = new Map();
    for (const l of d.laps) {
      if (l.lap_time_ms > 0) {
        acc += l.lap_time_ms;
        m.set(l.lap, acc);
      }
    }
    cumByCar.set(d.car_index, m);
  }
  const out = [];
  for (let lap = 1; lap <= maxLaps; lap++) {
    const active = drivers
      .filter((d) => cumByCar.get(d.car_index)?.has(lap))
      .map((d) => ({ car_index: d.car_index, cum: cumByCar.get(d.car_index).get(lap), finalPos: d.position || 999 }))
      .sort((a, b) => a.cum - b.cum || a.finalPos - b.finalPos);
    if (active.length) {
      const positions = {};
      active.forEach((item, idx) => { positions[String(item.car_index)] = idx + 1; });
      out.push({ lap, positions });
    }
  }
  return out;
}
function buildContext(race) {
  const isRace = isRaceSession(race.session.session_type);
  const isQuali = isQualiSession(race.session.session_type);
  const drivers = [...race.drivers].sort(byPosition);
  const teamSeen = {};
  const best = { lap: null, sectors: [null, null, null] };

  for (const d of drivers) {
    d._isRace = isRace;
    d._color = teamColor(d.team_name);
    teamSeen[d.team_name] = (teamSeen[d.team_name] || 0) + 1;
    d._dash = teamSeen[d.team_name] > 1; // a csapattárs szaggatott vonallal
    d._lapMap = new Map(d.laps.map((l) => [l.lap, l]));
    const stops = d.tyre_stints.slice(0, -1).map((s) => s.end_lap);
    d._inLaps = new Set(stops);
    d._outLaps = new Set(stops.map((l) => l + 1));
    d._finished = d.result_status === STATUS_FINISHED;

    // Egyéni legjobbak (csak érvényes körök / szektorok)
    d._pbLap = null;
    d._pbSectors = [null, null, null];
    for (const l of d.laps) {
      if (l.valid && l.lap_time_ms > 0 && (!d._pbLap || l.lap_time_ms < d._pbLap.lap_time_ms)) d._pbLap = l;
      [1, 2, 3].forEach((n, i) => {
        const ms = l[`sector${n}_ms`];
        if (ms > 0 && l[`sector${n}_valid`] && (!d._pbSectors[i] || ms < d._pbSectors[i].ms)) d._pbSectors[i] = { ms, lap: l.lap };
      });
    }
    if (d._pbLap && (!best.lap || d._pbLap.lap_time_ms < best.lap.ms)) best.lap = { ms: d._pbLap.lap_time_ms, lap: d._pbLap.lap, driver: d };
    d._pbSectors.forEach((s, i) => {
      if (s && (!best.sectors[i] || s.ms < best.sectors[i].ms)) best.sectors[i] = { ...s, driver: d };
    });
  }

  // A végeredmény szerinti leggyorsabb kör (a játék adata) – a lila kiemeléshez
  const classBest = Math.min(...drivers.map((d) => d.best_lap_time_ms || Infinity));
  const fastestMs = isFinite(classBest) ? classBest : best.lap?.ms ?? null;
  const fastestDriver = drivers.find((d) => d.best_lap_time_ms === fastestMs) || best.lap?.driver || null;
  const fastestLapNo = fastestDriver?.laps.find((l) => l.lap_time_ms === fastestMs)?.lap ?? null;

  const maxLaps = Math.max(race.session.total_laps || 0, ...drivers.map((d) => d.num_laps || 0), ...drivers.map((d) => d.laps.length));
  const leader = drivers.find((d) => d.position === 1) || drivers[0];
  const hasRawLapPositions = Array.isArray(race.lap_positions) && race.lap_positions.length > 0;
  const lapPositions = hasRawLapPositions ? race.lap_positions : estimateLapPositions(drivers, maxLaps);
  const speedTrap = drivers
    .filter((d) => d.speed_trap_kmh && d.speed_trap_kmh > 0)
    .sort((a, b) => b.speed_trap_kmh - a.speed_trap_kmh || (a.position || 999) - (b.position || 999));

  return {
    race, drivers, leader, maxLaps,
    isRace, isQuali,
    bestLap: best.lap,
    bestSectors: best.sectors,
    fastest: fastestMs ? { ms: fastestMs, driver: fastestDriver, lap: fastestLapNo } : null,
    lapPositions,
    lapPositionsEstimated: !hasRawLapPositions && lapPositions.length > 0,
    speedTrap,
    events: Array.isArray(race.events) ? race.events : [],
    safetyCarPeriods: Array.isArray(race.safety_car_periods) ? race.safety_car_periods : [],
  };
}

// --- js/views/tabs/classification.js ---
// 1. fül: Végeredmény táblázat

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
function renderClassification(el, ctx) {
  const { drivers, leader, fastest, isRace, isQuali } = ctx;
  const hasSpeedTrap = drivers.some((d) => d.speed_trap_kmh && d.speed_trap_kmh > 0);
  const maxSpeedTrap = hasSpeedTrap ? Math.max(...drivers.map((d) => d.speed_trap_kmh || 0)) : 0;
  const leaderBestMs = fastest?.ms || leader?.best_lap_time_ms || 0;

  const rows = drivers.map((d) => {
    const isFastest = fastest && d.best_lap_time_ms === fastest.ms;
    const isTopSpeed = hasSpeedTrap && d.speed_trap_kmh === maxSpeedTrap;
    const warnBadge = d.corner_cutting_warnings > 0
      ? ` <span class="text-[11px] text-amber-400/90 num" title="${d.corner_cutting_warnings} pályaelhagyási figyelmeztetés">⚠${d.corner_cutting_warnings}</span>`
      : '';
    const pen = d.penalties_time_s
      ? `<span class="text-amber-300 font-semibold num">+${d.penalties_time_s} mp</span>${d.num_penalties > 1 ? ` <span class="text-xs text-slate-500">(${d.num_penalties}×)</span>` : ''}${warnBadge}`
      : (warnBadge ? warnBadge.trim() : '<span class="text-slate-600">—</span>');
    const stintsHtml = d.tyre_stints.filter((s) => s.compound_visual > 0).map((s) => tyreBadge(s)).join('<span class="text-slate-600 text-xs">›</span>');

    let nonRaceGapCell = '';
    if (!isRace) {
      if (!d.best_lap_time_ms) {
        nonRaceGapCell = '<span class="text-slate-500 text-xs">Idő nélkül</span>';
      } else if (d === leader || (d.best_lap_time_ms === leaderBestMs && d.position === 1)) {
        nonRaceGapCell = `<span class="text-purple-300 font-bold text-xs uppercase">${isQuali ? 'POLE' : '—'}</span>`;
      } else {
        nonRaceGapCell = `<span class="num text-slate-200">${fmtGap((d.best_lap_time_ms - leaderBestMs) / 1000)}</span>`;
      }
    }

    const rowMuted = isRace ? !d._finished : !d.best_lap_time_ms;
    return `
    <tr class="${rowMuted ? 'opacity-70' : ''}">
      <td class="num font-bold text-white text-center">${d.position || '—'}</td>
      <td>
        <div class="flex items-center gap-2.5">
          <span class="team-bar" style="background:${d._color}"></span>
          <span class="num text-xs text-slate-500 w-6 text-right">${d.race_number || ''}</span>
          <span class="font-bold text-white whitespace-nowrap">${esc(d.name)}</span>
        </div>
      </td>
      <td class="whitespace-nowrap"><span class="inline-block w-2 h-2 rounded-full mr-2" style="background:${d._color}"></span><span class="text-slate-300">${esc(d.team_name)}</span></td>
      ${isRace ? `<td class="whitespace-nowrap"><span class="num text-slate-400 w-6 inline-block text-right mr-2">${d.grid_position || '—'}</span>${gridDelta(d)}</td>` : ''}
      <td class="num text-center">${d.num_laps}</td>
      ${isRace ? `<td class="whitespace-nowrap">${timeCell(d, leader)}</td>` : ''}
      <td class="num whitespace-nowrap ${isFastest ? 'cell-purple rounded' : 'text-slate-300'}">
        ${isFastest ? `<span class="inline-flex items-center gap-1">${stopwatchIcon('w-3.5 h-3.5')}${fmtLap(d.best_lap_time_ms)}</span>` : fmtLap(d.best_lap_time_ms)}
      </td>
      ${!isRace ? `<td class="whitespace-nowrap">${nonRaceGapCell}</td>` : ''}
      ${hasSpeedTrap ? `<td class="num whitespace-nowrap ${isTopSpeed ? 'text-cyan-300 font-bold' : 'text-slate-300'}">${d.speed_trap_kmh ? `${d.speed_trap_kmh.toFixed(1)}` : '—'}</td>` : ''}
      ${isRace ? `<td class="num text-center">${d.num_pit_stops}</td>` : ''}
      <td><div class="flex items-center gap-1">${stintsHtml || '<span class="text-slate-600">—</span>'}</div></td>
      <td class="whitespace-nowrap">${pen}</td>
      ${isRace ? `<td class="num text-center font-bold ${d.points ? 'text-white' : 'text-slate-600'}">${d.points || 0}</td>` : ''}
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="panel overflow-hidden">
      <div class="overflow-x-auto">
        <table class="data-table text-sm">
          <thead><tr>
            <th class="text-center">Poz.</th><th>Pilóta</th><th>Csapat</th>${isRace ? '<th>Rajthely</th>' : ''}<th class="text-center">Körök</th>
            ${isRace ? '<th>Idő / Hátrány</th><th>Legjobb kör</th>' : '<th>Legjobb kör</th><th>Hátrány</th>'}${hasSpeedTrap ? '<th>Végseb. (km/h)</th>' : ''}${isRace ? '<th class="text-center">Kiállás</th>' : ''}<th>Gumik</th><th>Büntetés</th>${isRace ? '<th class="text-center">Pont</th>' : ''}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div class="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs text-slate-400">
      ${isRace ? '<span><span class="text-emerald-400 font-bold">▲</span> nyert pozíció</span><span><span class="text-red-400 font-bold">▼</span> vesztett pozíció</span>' : ''}
      <span><span class="inline-block w-3 h-3 rounded-sm bg-purple-500/40 align-middle mr-1"></span>abszolút leggyorsabb kör</span>
      ${isRace ? '<span>Az összidő a büntetéseket is tartalmazza.</span>' : ''}
    </div>`;
}

// --- js/views/tabs/laps.js ---
// 2. fül: Köridő-elemző (interaktív Chart.js vonaldiagram + szűrhető, lenyitható szektortáblázat)
function renderLapAnalysis(el, ctx) {
  const { drivers, maxLaps, bestLap, bestSectors, fastest, safetyCarPeriods, isRace } = ctx;
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
            <span>${isRace ? 'Kiugró körök elrejtése (rajt, boksz, érvénytelen)' : 'Lassú / érvénytelen körök elrejtése'}</span>
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
      const pbRef = d._pbLap?.lap_time_ms || d.best_lap_time_ms || med;
      const data = labels.map((_, idx) => {
        const lap = d._lapMap.get(idx + 1);
        if (!lap || lap.lap_time_ms <= 0) return null;
        if (hideOutliers) {
          if (isOutlierLap(d, lap)) return null;
          if (isRace && isFinite(med) && lap.lap_time_ms > med * 1.15) return null;
          if (!isRace && isFinite(pbRef) && pbRef > 0 && lap.lap_time_ms > pbRef * 1.07) return null;
        }
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
        if (isRace && d._inLaps.has(l.lap)) notes.push('<span class="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold">BOKSZ BE</span>');
        if (isRace && d._outLaps.has(l.lap)) notes.push('<span class="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-bold">BOKSZ KI</span>');
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

// --- js/views/tabs/positions.js ---
// 3. fül: F1 TV stílusú Pozíciógrafikon (Packet 15 – LapPositions)
function renderPositions(el, ctx) {
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

// --- js/views/tabs/tyres.js ---
// 3. fül: Gumistratégia vizualizáció (Gantt-stílusú sávdiagram + bokszkiállások)
function renderTyreStints(el, ctx) {
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

// --- js/views/tabs/events.js ---
// 5. fül: Speed Trap, Figyelmeztetések és Versenyesemények idővonala (Packet 2 & Packet 3)

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
function renderEvents(el, ctx) {
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

// --- js/views/tabs/stats.js ---
// 4. fül: Verseny statisztikák (Biggest Mover, legkiegyensúlyozottabb tempó, szektorkirályok + lenyitható teljes mezőny)


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
function renderStats(el, ctx) {
  const { drivers, bestSectors, isRace } = ctx;

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
    ${isRace ? `
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
    </div>` : ''}

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

    <div class="grid grid-cols-1 ${isRace ? 'lg:grid-cols-2' : ''} gap-4">
      ${isRace ? `
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
      </div>` : ''}

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

// --- js/views/raceList.js ---
// Futamválasztó oldal
async function renderRaceList(app) {
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
    const isRace = isRaceSession(r.session_type);
    const isQuali = isQualiSession(r.session_type);
    const progress = isRace && r.total_laps ? `${r.laps_completed}/${r.total_laps}` : r.laps_completed;
    const winnerLabel = isRace ? 'Győztes' : (isQuali ? 'Pole pozíció' : 'Leggyorsabb');
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
            <div class="kicker !text-[10px]">${winnerLabel}</div>
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

// --- js/views/raceDetail.js ---
// Verseny részletező: fejléc + 4 fül









const TABS = [
  { id: 'eredmeny', label: 'Végeredmény', render: renderClassification },
  { id: 'korido', label: 'Köridő-elemző', render: renderLapAnalysis },
  { id: 'pozicio', label: 'Pozíciógrafikon', render: renderPositions, raceOnly: true },
  { id: 'gumik', label: 'Gumistratégia', render: renderTyreStints },
  { id: 'esemenyek', label: 'Események & Speed Trap', render: renderEvents },
  { id: 'statisztika', label: 'Statisztikák', render: renderStats },
];

let cache = { uid: null, ctx: null, summary: null };
let cleanup = null;
async function renderRaceDetail(app, uid, tabId) {
  if (cache.uid !== uid) {
    app.innerHTML = `<div class="py-24 text-center text-slate-500">Futam betöltése…</div>`;
    const res = await api.getRace(uid);
    cache = { uid, ctx: buildContext(res.data), summary: res.summary };
  }
  const visibleTabs = TABS.filter((t) => !t.raceOnly || cache.ctx.isRace);
  const tab = visibleTabs.find((t) => t.id === tabId) || visibleTabs[0];

  if (!app.querySelector(`[data-race-shell="${uid}"]`)) {
    app.innerHTML = shell(cache.ctx, cache.summary, uid, visibleTabs);
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

function shell(ctx, summary, uid, visibleTabs) {
  const { race, leader, fastest, isRace, isQuali } = ctx;
  const s = race.session;
  const temps = [s.air_temperature != null ? `Levegő ${s.air_temperature}°C` : '', s.track_temperature != null ? `Aszfalt ${s.track_temperature}°C` : '']
    .filter(Boolean).join(' · ');
  const finished = ctx.drivers.filter((d) => d._finished).length;
  const timed = ctx.drivers.filter((d) => d.best_lap_time_ms > 0).length;
  const winnerLabel = isRace ? 'Győztes' : (isQuali ? 'Pole pozíció' : 'Leggyorsabb');
  const lapsValue = isRace && s.total_laps ? `${summary.laps_completed} / ${s.total_laps}` : `${summary.laps_completed}`;

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
      ${stat(winnerLabel, `<span class="team-bar !h-4 align-middle mr-2" style="background:${teamColor(leader?.team_name)}"></span>${esc(leader?.name || '—')}`, esc(leader?.team_name || ''))}
      ${stat('Leggyorsabb kör', `<span class="inline-flex items-center gap-1.5 text-purple-200">${stopwatchIcon('w-4 h-4')}<span class="num">${fmtLap(fastest?.ms)}</span></span>`,
        fastest ? `${esc(fastest.driver?.name || '')}${fastest.lap ? ` · ${fastest.lap}. kör` : ''}` : '', '!border-purple-500/30')}
      ${stat('Körök', `<span class="num">${lapsValue}</span>`, s.track_length_m ? `${(s.track_length_m / 1000).toFixed(3)} km-es pálya` : '')}
      ${isRace
        ? stat('Célba ért', `<span class="num">${finished} / ${ctx.drivers.length}</span>`, `${ctx.drivers.length - finished} kieső / nem klasszifikált`)
        : stat('Időt futott', `<span class="num">${timed} / ${ctx.drivers.length}</span>`, `${ctx.drivers.length - timed} idő nélkül`)}
    </div>

    <div class="border-b border-white/10 mb-5 overflow-x-auto">
      <nav class="flex gap-1 md:gap-4 -mb-px">
        ${visibleTabs.map((t) => `<a href="#/race/${esc(uid)}/${t.id}" data-tab="${t.id}" class="tab-btn px-3 py-3 font-bold text-sm md:text-base">${t.label}</a>`).join('')}
      </nav>
    </div>

    <div id="tab-content"></div>
  </div>`;
}

// --- js/app.js ---
// Belépési pont: egyszerű hash-alapú router
//   #/                  → futamválasztó
//   #/race/<uid>/<fül>  → verseny részletező



const app = document.getElementById('app');

if (window.Chart) {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = '"Titillium Web", system-ui, sans-serif';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
}

let lastView = '';

async function route() {
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/race\/(\d+)(?:\/([a-z]+))?/);
  const view = m ? `race:${m[1]}` : 'list';
  if (view !== lastView) window.scrollTo({ top: 0 });
  lastView = view;
  try {
    if (m) await renderRaceDetail(app, m[1], m[2] || 'eredmeny');
    else await renderRaceList(app);
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="panel p-8 border-red-500/30">
      <div class="text-red-400 font-bold text-lg">Hiba történt</div>
      <div class="text-slate-400 mt-1">${esc(err.message)}</div>
      <a href="#/" class="inline-block mt-4 text-sm text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-md">← Vissza a futamokhoz</a>
    </div>`;
  }
}

window.addEventListener('hashchange', route);
route();