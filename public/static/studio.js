(function () {
  const app = window.PlazionApp;
  if (!app) return;

  const els = {
    newProject: document.getElementById('new-project-btn'),
    upload: document.getElementById('logo-upload'),
    dropzone: document.getElementById('logo-dropzone'),
    brandName: document.getElementById('ai-brand-name'),
    aiPrompt: document.getElementById('ai-logo-prompt'),
    aiStyle: document.getElementById('ai-logo-style'),
    aiModel: document.getElementById('ai-logo-model'),
    generate: document.getElementById('generate-logo-btn'),
    projectName: document.getElementById('project-name'),
    presetSelect: document.getElementById('preset-select'),
    deletePreset: document.getElementById('delete-preset-btn'),
    glow: document.getElementById('glow-range'),
    glowValue: document.getElementById('glow-value'),
    energy: document.getElementById('energy-range'),
    energyValue: document.getElementById('energy-value'),
    autoPreset: document.getElementById('auto-preset-toggle'),
    save: document.getElementById('save-project-btn'),
    status: document.getElementById('studio-status'),
    storage: document.getElementById('storage-indicator'),
    preview: document.getElementById('studio-preview-btn'),
    sequence: document.getElementById('studio-download-btn'),
    downloadLogo: document.getElementById('download-current-logo-btn'),
    libraryGrid: document.getElementById('library-grid'),
    libraryEmpty: document.getElementById('library-empty'),
    librarySearch: document.getElementById('library-search'),
    refreshLibrary: document.getElementById('refresh-library-btn'),
  };

  const DEFAULT_PRESET = {
    id: 'voxel-default',
    name: 'Voxel Materialize · 기본',
    glow: 100,
    energy: 100,
    aspect: 'landscape',
    isDefault: true,
  };

  let currentLogoBlob = null;
  let currentLogoUrl = '/static/plazion_logo.png';
  let currentProjectId = null;
  let projects = [];
  let presets = [DEFAULT_PRESET];
  let storageMode = 'local';
  let dbPromise = null;

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('plazion-studio', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('logos')) db.createObjectStore('logos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('presets')) db.createObjectStore('presets', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function idbRequest(storeName, mode, operation) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  const localStore = {
    listLogos: () => idbRequest('logos', 'readonly', (store) => store.getAll()),
    putLogo: (item) => idbRequest('logos', 'readwrite', (store) => store.put(item)),
    deleteLogo: (id) => idbRequest('logos', 'readwrite', (store) => store.delete(id)),
    listPresets: () => idbRequest('presets', 'readonly', (store) => store.getAll()),
    putPreset: (item) => idbRequest('presets', 'readwrite', (store) => store.put(item)),
    deletePreset: (id) => idbRequest('presets', 'readwrite', (store) => store.delete(id)),
  };

  function showStatus(message, type = 'info') {
    els.status.textContent = message;
    els.status.className = `studio-status is-${type}`;
  }

  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.querySelector('span')?.textContent || '';
      button.disabled = true;
      const span = button.querySelector('span');
      if (span) span.textContent = busyText;
    } else {
      button.disabled = false;
      const span = button.querySelector('span');
      if (span && button.dataset.label) span.textContent = button.dataset.label;
    }
  }

  function setStorageMode(mode, message) {
    storageMode = mode;
    els.storage.className = `storage-indicator is-${mode}`;
    els.storage.innerHTML = `<i class="fa-solid fa-circle"></i> ${message}`;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `요청 실패 (${response.status})`);
    return body;
  }

  function normalizedRemoteList(body, key) {
    const value = Array.isArray(body) ? body : body[key] || body.items || [];
    return Array.isArray(value) ? value : [];
  }

  async function loadProjects() {
    try {
      const body = await fetchJson('/api/logos');
      if (body.storage === 'unconfigured') throw new Error('Storage service is not configured yet.');
      projects = normalizedRemoteList(body, 'logos').map((item) => ({ ...item, source: 'server' }));
      setStorageMode('server', 'Orbitron 저장소 연결됨');
    } catch {
      projects = (await localStore.listLogos()).map((item) => ({ ...item, source: 'local' }));
      setStorageMode('local', '브라우저 임시 저장 모드');
    }
    projects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    renderLibrary();
  }

  async function loadPresets() {
    let saved = [];
    try {
      const body = await fetchJson('/api/presets');
      if (body.storage === 'unconfigured') throw new Error('Storage service is not configured yet.');
      saved = normalizedRemoteList(body, 'presets');
    } catch {
      saved = await localStore.listPresets();
    }
    presets = [DEFAULT_PRESET, ...saved.filter((item) => item.id !== DEFAULT_PRESET.id)];
    renderPresets();
  }

  function renderPresets(selectedId) {
    els.presetSelect.innerHTML = '';
    presets.forEach((preset) => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      els.presetSelect.appendChild(option);
    });
    if (selectedId && presets.some((item) => item.id === selectedId)) els.presetSelect.value = selectedId;
    els.deletePreset.disabled = els.presetSelect.value === DEFAULT_PRESET.id;
  }

  function getSettings() {
    return {
      glow: Number(els.glow.value),
      energy: Number(els.energy.value),
      aspect: document.querySelector('input[name="studio-aspect"]:checked')?.value || 'landscape',
    };
  }

  function applySettings(settings) {
    els.glow.value = String(settings.glow ?? 100);
    els.energy.value = String(settings.energy ?? 100);
    els.glowValue.textContent = `${els.glow.value}%`;
    els.energyValue.textContent = `${els.energy.value}%`;
    const radio = document.querySelector(`input[name="studio-aspect"][value="${settings.aspect || 'landscape'}"]`);
    if (radio) radio.checked = true;
    app.intro.setVisualSettings({ glow: Number(els.glow.value) / 100, energy: Number(els.energy.value) / 100 });
    app.setAspect(settings.aspect || 'landscape');
  }

  async function setLogo(blob, filename, name) {
    if (!blob || !blob.type.startsWith('image/')) throw new Error('이미지 파일을 선택해 주세요.');
    if (blob.size > 20 * 1024 * 1024) throw new Error('로고 파일은 20MB 이하만 사용할 수 있습니다.');
    const previousUrl = currentLogoUrl;
    currentLogoBlob = blob;
    currentLogoUrl = URL.createObjectURL(blob);
    await app.intro.setLogoSource(currentLogoUrl);
    if (previousUrl.startsWith('blob:')) URL.revokeObjectURL(previousUrl);
    els.dropzone.classList.add('has-file');
    els.dropzone.querySelector('strong').textContent = filename || '로고 준비 완료';
    els.dropzone.querySelector('span').textContent = `${Math.max(1, Math.round(blob.size / 1024))} KB · 미리보기에 적용됨`;
    if (name && !els.projectName.value.trim()) els.projectName.value = name;
    showStatus('로고가 미리보기에 적용되었습니다.', 'success');
  }

  async function ensureCurrentBlob() {
    if (currentLogoBlob) return currentLogoBlob;
    const response = await fetch(currentLogoUrl);
    if (!response.ok) throw new Error('현재 로고 파일을 가져오지 못했습니다.');
    currentLogoBlob = await response.blob();
    return currentLogoBlob;
  }

  async function savePreset(projectName, settings, projectId) {
    const preset = {
      id: `preset_${projectId}`,
      name: `${projectName} · 자동 프리셋`,
      ...settings,
      projectId,
      updatedAt: new Date().toISOString(),
    };
    await localStore.putPreset(preset);
    try {
      await fetchJson('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });
    } catch {
      // The local copy remains immediately usable while the backend is being wired.
    }
    presets = [DEFAULT_PRESET, ...presets.filter((item) => item.id !== preset.id && item.id !== DEFAULT_PRESET.id), preset];
    renderPresets(preset.id);
  }

  async function saveProject() {
    const name = els.projectName.value.trim();
    if (!name) throw new Error('프로젝트 이름을 입력해 주세요.');
    const blob = await ensureCurrentBlob();
    const settings = getSettings();
    const id = currentProjectId || uid('logo');
    const now = new Date().toISOString();
    const metadata = {
      id,
      name,
      settings,
      presetId: els.presetSelect.value,
      autoRegisterPreset: els.autoPreset.checked,
      frameRate: 30,
      duration: 3,
      createdAt: projects.find((item) => item.id === id)?.createdAt || now,
      updatedAt: now,
    };

    let savedProject = null;
    try {
      const form = new FormData();
      form.append('metadata', JSON.stringify(metadata));
      form.append('logo', blob, `${id}.png`);
      const body = await fetchJson('/api/logos', { method: 'POST', body: form });
      savedProject = body.logo || body.project || body;
      setStorageMode('server', 'Orbitron 저장소 연결됨');
    } catch {
      savedProject = { ...metadata, logoBlob: blob, source: 'local' };
      await localStore.putLogo(savedProject);
      setStorageMode('local', '브라우저 임시 저장 모드');
    }

    currentProjectId = savedProject.id || id;
    if (els.autoPreset.checked) await savePreset(name, settings, currentProjectId);
    await loadProjects();
    showStatus(`“${name}” 프로젝트와 설정을 저장했습니다.`, 'success');
  }

  function projectLogoUrl(project) {
    if (project.logoBlob instanceof Blob) {
      if (!project._objectUrl) project._objectUrl = URL.createObjectURL(project.logoBlob);
      return project._objectUrl;
    }
    return project.logoUrl || project.originalUrl || project.thumbnailUrl || '/static/plazion_logo.png';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[char]);
  }

  function renderLibrary() {
    const query = els.librarySearch.value.trim().toLowerCase();
    const filtered = projects.filter((item) => String(item.name || '').toLowerCase().includes(query));
    els.libraryGrid.innerHTML = filtered.map((project) => {
      const settings = project.settings || {};
      const date = project.updatedAt || project.createdAt;
      const dateLabel = date ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(date)) : '방금 전';
      return `<article class="library-card" data-project-id="${escapeHtml(project.id)}">
        <button class="library-thumb" type="button" data-action="open" aria-label="${escapeHtml(project.name)} 열기">
          <img src="${escapeHtml(projectLogoUrl(project))}" alt="${escapeHtml(project.name)} 로고" />
          <span><i class="fa-solid fa-play"></i></span>
        </button>
        <div class="library-card__body">
          <div class="library-card__title"><div><h3>${escapeHtml(project.name)}</h3><p>${settings.aspect === 'portrait' ? '9:16' : '16:9'} · 30fps · Voxel</p></div><span class="source-badge is-${project.source || 'server'}">${project.source === 'local' ? 'LOCAL' : 'ORBITRON'}</span></div>
          <div class="library-card__meta"><span>${dateLabel}</span><span>${Math.round((settings.glow ?? 100))}% glow</span></div>
          <div class="library-card__actions">
            <button type="button" data-action="open"><i class="fa-solid fa-pen"></i> 불러오기</button>
            <button type="button" data-action="logo"><i class="fa-solid fa-download"></i> 원본</button>
            <button type="button" data-action="sequence"><i class="fa-solid fa-layer-group"></i> 시퀀스</button>
            <button type="button" class="danger" data-action="delete" aria-label="삭제"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </article>`;
    }).join('');
    els.libraryEmpty.hidden = filtered.length > 0;
  }

  async function loadProject(project) {
    currentProjectId = project.id;
    els.projectName.value = project.name || '로고 프로젝트';
    const source = project.logoBlob instanceof Blob ? project.logoBlob : await fetch(projectLogoUrl(project)).then((res) => {
      if (!res.ok) throw new Error('저장된 로고를 불러오지 못했습니다.');
      return res.blob();
    });
    await setLogo(source, `${project.name}.png`);
    applySettings(project.settings || DEFAULT_PRESET);
    const preset = presets.find((item) => item.projectId === project.id);
    if (preset) els.presetSelect.value = preset.id;
    document.getElementById('stage-section').scrollIntoView({ behavior: 'smooth' });
    showStatus(`“${project.name}” 프로젝트를 불러왔습니다.`, 'success');
  }

  async function downloadProjectLogo(project) {
    const blob = project.logoBlob instanceof Blob ? project.logoBlob : await fetch(projectLogoUrl(project)).then((res) => res.blob());
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${String(project.name || 'logo').replace(/[^a-zA-Z0-9가-힣_-]+/g, '_')}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function deleteProject(project) {
    if (!window.confirm(`“${project.name}” 프로젝트를 삭제할까요?`)) return;
    try {
      await fetchJson(`/api/logos/${encodeURIComponent(project.id)}`, { method: 'DELETE' });
    } catch {
      await localStore.deleteLogo(project.id);
    }
    projects = projects.filter((item) => item.id !== project.id);
    renderLibrary();
    showStatus('프로젝트를 삭제했습니다.', 'success');
  }

  async function generateLogo() {
    const brandName = els.brandName.value.trim();
    const prompt = els.aiPrompt.value.trim();
    if (!brandName && !prompt) throw new Error('브랜드 이름 또는 로고 설명을 입력해 주세요.');
    const payload = { brandName, prompt, style: els.aiStyle.value, model: els.aiModel.value };

    const requestGeneration = (accessToken) => fetch('/api/ai/generate-logo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'X-Studio-Token': accessToken } : {}),
      },
      body: JSON.stringify(payload),
    });

    let accessToken = sessionStorage.getItem('plazionStudioToken') || '';
    let response = await requestGeneration(accessToken);
    if (response.status === 401) {
      const authBody = await response.json().catch(() => ({}));
      if (authBody.code === 'STUDIO_AUTH_REQUIRED') {
        accessToken = window.prompt('AI 생성 접근 코드를 입력하세요.') || '';
        if (!accessToken) throw new Error('AI 생성이 취소되었습니다.');
        sessionStorage.setItem('plazionStudioToken', accessToken);
        response = await requestGeneration(accessToken);
      }
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) sessionStorage.removeItem('plazionStudioToken');
      throw new Error(body.setup || body.error || 'AI 로고 생성에 실패했습니다.');
    }
    const blob = await response.blob();
    await setLogo(blob, `${brandName || 'genspark-logo'}.png`, brandName || 'AI Logo');
    if (brandName) els.projectName.value = `${brandName} VFX Intro`;
    showStatus('Genspark AI 로고 생성이 완료되었습니다. 설정 후 프로젝트를 저장하세요.', 'success');
  }

  els.newProject.addEventListener('click', () => {
    currentProjectId = null;
    els.projectName.value = '새 로고 프로젝트';
    els.brandName.value = '';
    els.aiPrompt.value = '';
    els.presetSelect.value = DEFAULT_PRESET.id;
    applySettings(DEFAULT_PRESET);
    els.dropzone.classList.remove('has-file');
    els.dropzone.querySelector('strong').textContent = '로고 파일을 놓거나 선택';
    els.dropzone.querySelector('span').textContent = 'PNG · SVG · WEBP · JPG / 투명 PNG 권장';
    document.getElementById('workspace-section').scrollIntoView({ behavior: 'smooth' });
    showStatus('새 프로젝트가 준비되었습니다. 로고를 업로드하거나 AI로 생성하세요.', 'info');
  });

  els.upload.addEventListener('change', () => {
    const file = els.upload.files?.[0];
    if (file) setLogo(file, file.name, file.name.replace(/\.[^.]+$/, '')).catch((error) => showStatus(error.message, 'error'));
  });
  ['dragenter', 'dragover'].forEach((eventName) => els.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropzone.classList.add('is-dragging');
  }));
  ['dragleave', 'drop'].forEach((eventName) => els.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropzone.classList.remove('is-dragging');
  }));
  els.dropzone.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) setLogo(file, file.name, file.name.replace(/\.[^.]+$/, '')).catch((error) => showStatus(error.message, 'error'));
  });

  els.glow.addEventListener('input', () => {
    els.glowValue.textContent = `${els.glow.value}%`;
    app.intro.setVisualSettings({ glow: Number(els.glow.value) / 100, energy: Number(els.energy.value) / 100 });
  });
  els.energy.addEventListener('input', () => {
    els.energyValue.textContent = `${els.energy.value}%`;
    app.intro.setVisualSettings({ glow: Number(els.glow.value) / 100, energy: Number(els.energy.value) / 100 });
  });
  document.querySelectorAll('input[name="studio-aspect"]').forEach((radio) => radio.addEventListener('change', () => app.setAspect(radio.value)));
  window.addEventListener('plazion:aspect-change', (event) => {
    const radio = document.querySelector(`input[name="studio-aspect"][value="${event.detail.aspect}"]`);
    if (radio) radio.checked = true;
  });
  els.presetSelect.addEventListener('change', () => {
    const preset = presets.find((item) => item.id === els.presetSelect.value);
    if (preset) applySettings(preset);
    els.deletePreset.disabled = !preset || preset.isDefault;
  });
  els.deletePreset.addEventListener('click', async () => {
    const preset = presets.find((item) => item.id === els.presetSelect.value);
    if (!preset || preset.isDefault) return;
    try { await fetchJson(`/api/presets/${encodeURIComponent(preset.id)}`, { method: 'DELETE' }); } catch { await localStore.deletePreset(preset.id); }
    presets = presets.filter((item) => item.id !== preset.id);
    renderPresets(DEFAULT_PRESET.id);
    applySettings(DEFAULT_PRESET);
  });

  els.generate.addEventListener('click', async () => {
    setBusy(els.generate, true, 'Genspark가 로고 생성 중…');
    showStatus('Genspark AI에 로고 생성을 요청했습니다. 잠시만 기다려 주세요.', 'info');
    try { await generateLogo(); } catch (error) { showStatus(error.message, 'error'); } finally { setBusy(els.generate, false); }
  });
  els.save.addEventListener('click', async () => {
    setBusy(els.save, true, '프로젝트 저장 중…');
    try { await saveProject(); } catch (error) { showStatus(error.message, 'error'); } finally { setBusy(els.save, false); }
  });
  els.preview.addEventListener('click', () => {
    app.restart();
    document.getElementById('stage-section').scrollIntoView({ behavior: 'smooth' });
  });
  els.sequence.addEventListener('click', () => app.exportSequence());
  els.downloadLogo.addEventListener('click', async () => {
    try { await downloadProjectLogo({ name: els.projectName.value || 'logo', logoBlob: await ensureCurrentBlob() }); } catch (error) { showStatus(error.message, 'error'); }
  });
  els.librarySearch.addEventListener('input', renderLibrary);
  els.refreshLibrary.addEventListener('click', loadProjects);
  els.libraryGrid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    const card = event.target.closest('[data-project-id]');
    if (!button || !card) return;
    const project = projects.find((item) => item.id === card.dataset.projectId);
    if (!project) return;
    try {
      if (button.dataset.action === 'open') await loadProject(project);
      if (button.dataset.action === 'logo') await downloadProjectLogo(project);
      if (button.dataset.action === 'sequence') { await loadProject(project); app.exportSequence(); }
      if (button.dataset.action === 'delete') await deleteProject(project);
    } catch (error) { showStatus(error.message, 'error'); }
  });

  Promise.all([loadProjects(), loadPresets()]).catch(() => setStorageMode('local', '브라우저 임시 저장 모드'));
})();
