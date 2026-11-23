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

export const api = {
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
