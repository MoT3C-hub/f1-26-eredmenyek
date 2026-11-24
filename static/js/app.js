// Belépési pont: egyszerű hash-alapú router
//   #/                  → futamválasztó
//   #/race/<uid>/<fül>  → verseny részletező

import { renderRaceList } from './views/raceList.js?v=5';
import { renderRaceDetail } from './views/raceDetail.js?v=5';
import { esc } from './format.js?v=5';

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
