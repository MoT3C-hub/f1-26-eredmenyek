// Származtatott adatok egy futamhoz: legjobb körök, szektorok, kiállások, szórás

import { teamColor, STATUS_FINISHED } from './format.js';

const byPosition = (a, b) => (a.position || 999) - (b.position || 999) || a.car_index - b.car_index;

export function stdev(values) {
  if (values.length < 2) return NaN;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
}

export function median(values) {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function stintForLap(driver, lap) {
  return driver.tyre_stints.find((s) => lap >= s.start_lap && lap <= s.end_lap) || null;
}

/** Kiugró kör: rajtkör, boksz be/ki kör vagy érvénytelen kör */
export function isOutlierLap(driver, lap) {
  return lap.lap === 1 || !lap.valid || driver._inLaps.has(lap.lap) || driver._outLaps.has(lap.lap);
}

/** Safety Car / VSC háttérsávok rajzolása Chart.js vonaldiagramokra. */
export function createSafetyCarPlugin(periods = [], lapIndexOffset = -1) {
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

export function buildContext(race) {
  const drivers = [...race.drivers].sort(byPosition);
  const teamSeen = {};
  const best = { lap: null, sectors: [null, null, null] };

  for (const d of drivers) {
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
