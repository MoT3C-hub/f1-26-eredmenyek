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

  return {
    race, drivers, leader, maxLaps,
    bestLap: best.lap,
    bestSectors: best.sectors,
    fastest: fastestMs ? { ms: fastestMs, driver: fastestDriver, lap: fastestLapNo } : null,
  };
}
