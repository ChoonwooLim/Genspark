/* Shared client state for the studio pages.
 *
 * The single-page build kept storage, the access-code flow and the project
 * list inside studio.js. Now that each feature has its own page, that state has
 * to be reachable from several entry scripts, so it lives here and each page
 * script loads only the panel it owns.
 *
 * Server first, IndexedDB when the backend says `storage: 'unconfigured'` or is
 * unreachable — the same contract the API was built around. */
window.PlazionCore = (function () {
  const DEFAULT_PRESET = {
    id: 'voxel-default',
    name: 'Voxel Materialize · 기본',
    glow: 100,
    energy: 100,
    aspect: 'landscape',
    isDefault: true,
  };

  const state = {
    projects: [],
    presets: [DEFAULT_PRESET],
    storageMode: 'local',
  };

  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn(state));

  // ---- formatting -------------------------------------------------

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>'"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]
    );
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---- IndexedDB fallback ----------------------------------------

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      // A schema upgrade cannot run while another tab still holds the old
      // version open. Without these two guards the promise simply never
      // settles, and every await on it — including the one that applies a new
      // logo — hangs with no error and no visible failure.
      const settle = setTimeout(
        () => reject(new Error('storage_timeout')),
        4000
      );
      const done = (fn) => (value) => {
        clearTimeout(settle);
        fn(value);
      };
      const request = indexedDB.open('plazion-studio', 2);
      request.onblocked = () => {
        console.warn('[storage] upgrade blocked by another open tab');
        done(reject)(new Error('storage_blocked'));
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('logos')) db.createObjectStore('logos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('presets')) db.createObjectStore('presets', { keyPath: 'id' });
        // v2: the working logo, so it survives navigation between pages.
        if (!db.objectStoreNames.contains('session')) db.createObjectStore('session', { keyPath: 'id' });
      };
      request.onsuccess = () => done(resolve)(request.result);
      request.onerror = () => done(reject)(request.error);
    });
    // A rejected promise must not be cached, or one blocked moment would
    // disable local storage for the rest of the session.
    dbPromise.catch(() => {
      dbPromise = null;
    });
    return dbPromise;
  }

  async function idb(storeName, mode, operation) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = operation(tx.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  const localStore = {
    listLogos: () => idb('logos', 'readonly', (s) => s.getAll()),
    putLogo: (value) => idb('logos', 'readwrite', (s) => s.put(value)),
    deleteLogo: (id) => idb('logos', 'readwrite', (s) => s.delete(id)),
    listPresets: () => idb('presets', 'readonly', (s) => s.getAll()),
    putPreset: (value) => idb('presets', 'readwrite', (s) => s.put(value)),
    deletePreset: (id) => idb('presets', 'readwrite', (s) => s.delete(id)),
  };

  // ---- network ----------------------------------------------------

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `요청 실패 (${response.status})`);
    return body;
  }

  /** Writes carry the access code the AI routes already use; the server gates
   *  POST/DELETE so a visitor cannot overwrite or wipe the library. Prompts
   *  once and retries, so a first save never silently falls back to local. */
  async function studioWrite(url, options) {
    const send = () => {
      const token = sessionStorage.getItem('plazionStudioToken') || '';
      return fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), ...(token ? { 'X-Studio-Token': token } : {}) },
      });
    };
    let response = await send();
    if (response.status === 401) {
      const body = await response.json().catch(() => ({}));
      if (body.code === 'STUDIO_AUTH_REQUIRED') {
        const token = window.prompt('작업실 접근 코드를 입력하세요.') || '';
        if (!token) throw new Error('접근 코드가 없어 취소되었습니다.');
        sessionStorage.setItem('plazionStudioToken', token);
        response = await send();
      }
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) sessionStorage.removeItem('plazionStudioToken');
      throw new Error(body.error || `요청 실패 (${response.status})`);
    }
    return body;
  }

  function setStorageMode(mode) {
    state.storageMode = mode;
    const indicator = document.getElementById('storage-indicator');
    if (indicator) {
      indicator.textContent = mode === 'server' ? 'Orbitron 저장소' : '브라우저 임시 저장';
      indicator.className = mode === 'server' ? 'chip chip--live' : 'chip chip--neutral';
    }
  }

  // ---- projects & presets ----------------------------------------

  async function loadProjects() {
    try {
      const body = await fetchJson('/api/logos');
      if (body.storage === 'unconfigured') throw new Error('unconfigured');
      state.projects = (body.logos || []).map((item) => ({ ...item, source: 'server' }));
      setStorageMode('server');
    } catch {
      state.projects = (await localStore.listLogos().catch(() => [])).map((item) => ({ ...item, source: 'local' }));
      setStorageMode('local');
    }
    state.projects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    notify();
    return state.projects;
  }

  async function loadPresets() {
    let saved = [];
    try {
      const body = await fetchJson('/api/presets');
      if (body.storage === 'unconfigured') throw new Error('unconfigured');
      saved = body.presets || [];
    } catch {
      saved = await localStore.listPresets().catch(() => []);
    }
    state.presets = [DEFAULT_PRESET, ...saved.filter((item) => item.id !== DEFAULT_PRESET.id)];
    notify();
    return state.presets;
  }

  async function saveProject(metadata, blob) {
    try {
      const form = new FormData();
      form.append('metadata', JSON.stringify(metadata));
      form.append('logo', blob, `${metadata.id}.png`);
      const body = await studioWrite('/api/logos', { method: 'POST', body: form });
      setStorageMode('server');
      return body.logo || body.project || body;
    } catch (error) {
      // A missing backend is a fallback; a rejected access code is not — it
      // would silently make the save local when the user meant to store it.
      if (/접근 코드/.test(error.message)) throw error;
      const local = { ...metadata, logoBlob: blob, source: 'local' };
      await localStore.putLogo(local);
      setStorageMode('local');
      return local;
    }
  }

  async function savePreset(preset) {
    await localStore.putPreset(preset).catch(() => {});
    try {
      await studioWrite('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });
    } catch {
      /* local copy stays usable */
    }
    state.presets = [DEFAULT_PRESET, ...state.presets.filter((p) => p.id !== preset.id && p.id !== DEFAULT_PRESET.id), preset];
    notify();
  }

  async function deleteProject(id) {
    try {
      await studioWrite(`/api/logos/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      await localStore.deleteLogo(id).catch(() => {});
    }
    state.projects = state.projects.filter((item) => item.id !== id);
    notify();
  }

  async function deletePreset(id) {
    try {
      await studioWrite(`/api/presets/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      await localStore.deletePreset(id).catch(() => {});
    }
    state.presets = state.presets.filter((item) => item.id !== id);
    notify();
  }

  /** The logo being worked on, shared across pages.
   *
   *  The studio holds it as an object URL, which dies with the page — so a
   *  plain link to /preview used to land on the default logo. Stashing the
   *  blob here lets any page pick up where the last one left off, and it
   *  survives a reload, unlike an in-memory handoff. */
  async function setWorkingLogo(blob, meta = {}) {
    try {
      await idb('session', 'readwrite', (store) =>
        store.put({ id: 'current', blob, meta, savedAt: Date.now() })
      );
      return true;
    } catch (error) {
      // Private mode, blocked storage, or an upgrade another tab is holding
      // open. The page still works — the logo just will not follow you to the
      // next page — so say that rather than failing silently.
      console.warn('[storage] could not stash the working logo:', error?.message);
      return false;
    }
  }

  async function getWorkingLogo() {
    try {
      return (await idb('session', 'readonly', (store) => store.get('current'))) || null;
    } catch {
      return null;
    }
  }

  async function setWorkingSettings(settings) {
    const current = await getWorkingLogo();
    if (!current) return;
    await setWorkingLogo(current.blob, { ...current.meta, settings });
  }

  async function clearWorkingLogo() {
    try {
      await idb('session', 'readwrite', (store) => store.delete('current'));
    } catch {
      /* nothing to clear */
    }
  }

  function projectLogoUrl(project) {
    if (project.logoBlob instanceof Blob) {
      if (!project._objectUrl) project._objectUrl = URL.createObjectURL(project.logoBlob);
      return project._objectUrl;
    }
    return project.logoUrl || project.originalUrl || project.thumbnailUrl || '/static/plazion_logo.png';
  }

  /** Projects are opened from the library but edited in the studio, so the
   *  handoff between pages goes through the query string. */
  function projectIdFromQuery() {
    return new URLSearchParams(window.location.search).get('project');
  }

  return {
    DEFAULT_PRESET,
    state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    formatBytes,
    formatDate,
    escapeHtml,
    uid,
    localStore,
    fetchJson,
    studioWrite,
    setStorageMode,
    loadProjects,
    loadPresets,
    saveProject,
    savePreset,
    deleteProject,
    deletePreset,
    projectLogoUrl,
    projectIdFromQuery,
    setWorkingLogo,
    getWorkingLogo,
    setWorkingSettings,
    clearWorkingLogo,
  };
})();
