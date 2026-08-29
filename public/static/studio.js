/* Studio page — pick a logo source, tune the animation, save the project.
 *
 * The library moved to its own page, so this file no longer owns the project
 * list; shared storage and the access-code flow live in core.js. */
(function () {
  const core = window.PlazionCore;
  const el = (id) => document.getElementById(id);

  const els = {
    status: el('studio-status'),
    newProject: el('new-project-btn'),

    modeUpload: el('source-mode-upload'),
    modeAi: el('source-mode-ai'),
    modeImport: el('source-mode-import'),
    panelUpload: el('upload-source-panel'),
    panelAi: el('ai-source-panel'),
    panelImport: el('import-source-panel'),
    dropzone: el('logo-dropzone'),
    upload: el('logo-upload'),
    sourceReady: el('source-ready-status'),

    brandName: el('ai-brand-name'),
    prompt: el('ai-logo-prompt'),
    type: el('ai-logo-type'),
    style: el('ai-logo-style'),
    palette: el('ai-logo-palette'),
    avoid: el('ai-logo-avoid'),
    originality: el('ai-logo-originality'),
    model: el('ai-logo-model'),
    generate: el('generate-logo-btn'),

    pasteZone: el('genspark-paste-zone'),
    importUrl: el('genspark-import-url'),
    importBtn: el('import-genspark-btn'),

    projectName: el('project-name'),
    presetSelect: el('preset-select'),
    deletePreset: el('delete-preset-btn'),
    glow: el('glow-range'),
    glowValue: el('glow-value'),
    energy: el('energy-range'),
    energyValue: el('energy-value'),
    autoPreset: el('auto-preset-toggle'),
    save: el('save-project-btn'),
    downloadLogo: el('download-current-logo-btn'),

    canvas: el('intro-canvas'),
    canvasWrap: el('canvas-wrap'),
    loopCount: el('loop-count'),
  };
  if (!core || !els.save) return;

  let logoBlob = null;
  let logoUrl = '/static/plazion_logo.png';
  let sourceConfirmed = false;
  let projectId = null;
  let busy = false;

  const say = (message, type = 'info') => {
    els.status.textContent = message;
    els.status.dataset.type = type;
  };

  const ready = (message) => {
    sourceConfirmed = true;
    els.sourceReady.textContent = message;
    els.sourceReady.dataset.type = 'success';
  };

  function setBusy(button, on, label) {
    busy = on;
    button.disabled = on;
    if (label) button.dataset.idle = button.dataset.idle || button.textContent;
    button.textContent = on ? label : button.dataset.idle || button.textContent;
  }

  // ---- live preview ------------------------------------------------

  let intro = null;
  if (els.canvas && window.PlazionIntro) {
    let loops = 0;
    intro = new window.PlazionIntro(els.canvas, {
      logoSrc: logoUrl,
      aspect: 'landscape',
      onLoop: () => {
        loops += 1;
        els.loopCount.textContent = String(loops);
      },
    });
  }

  function pushSettings() {
    const settings = getSettings();
    els.glowValue.textContent = `${settings.glow}%`;
    els.energyValue.textContent = `${settings.energy}%`;
    if (!intro) return;
    intro.setVisualSettings({ glow: settings.glow / 100, energy: settings.energy / 100 });
    if (intro.aspect !== settings.aspect) {
      intro.setAspect(settings.aspect);
      els.canvasWrap.classList.toggle('canvas-wrap--landscape', settings.aspect === 'landscape');
      els.canvasWrap.classList.toggle('canvas-wrap--portrait', settings.aspect === 'portrait');
    }
  }

  function getSettings() {
    return {
      glow: Number(els.glow.value),
      energy: Number(els.energy.value),
      aspect: document.querySelector('input[name="studio-aspect"]:checked')?.value || 'landscape',
    };
  }

  function applySettings(settings = {}) {
    if (settings.glow != null) els.glow.value = settings.glow;
    if (settings.energy != null) els.energy.value = settings.energy;
    if (settings.aspect) {
      const radio = document.querySelector(`input[name="studio-aspect"][value="${settings.aspect}"]`);
      if (radio) radio.checked = true;
    }
    pushSettings();
  }

  // ---- logo source -------------------------------------------------

  async function setLogo(blob, filename, name) {
    logoBlob = blob;
    if (logoUrl.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
    logoUrl = URL.createObjectURL(blob);
    if (intro) await intro.setLogoSource(logoUrl);
    if (name && !els.projectName.value.trim()) els.projectName.value = name;
    ready(`${filename} · ${core.formatBytes(blob.size)} · 미리보기에 적용됨`);
  }

  async function currentBlob() {
    if (logoBlob) return logoBlob;
    const response = await fetch(logoUrl);
    if (!response.ok) throw new Error('현재 로고 파일을 가져오지 못했습니다.');
    logoBlob = await response.blob();
    return logoBlob;
  }

  function setMode(mode) {
    const map = {
      upload: [els.modeUpload, els.panelUpload],
      ai: [els.modeAi, els.panelAi],
      import: [els.modeImport, els.panelImport],
    };
    Object.entries(map).forEach(([key, [button, panel]]) => {
      button.classList.toggle('is-active', key === mode);
      button.setAttribute('aria-selected', key === mode ? 'true' : 'false');
      panel.hidden = key !== mode;
    });
  }

  // ---- AI generation ----------------------------------------------

  async function callAi(url, payload) {
    const send = () => {
      const token = sessionStorage.getItem('plazionStudioToken') || '';
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Studio-Token': token } : {}) },
        body: JSON.stringify(payload),
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
    if (!response.ok) {
      if (response.status === 401) sessionStorage.removeItem('plazionStudioToken');
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `요청 실패 (${response.status})`);
    }
    return response;
  }

  function buildPrompt() {
    return [
      els.prompt.value.trim(),
      `로고 형태: ${els.type.options[els.type.selectedIndex].text}.`,
      els.palette.value.trim() ? `컬러: ${els.palette.value.trim()}.` : '',
      els.avoid.value.trim() ? `피할 요소: ${els.avoid.value.trim()}.` : '',
      `독창성 ${els.originality.value}/100.`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ---- save --------------------------------------------------------

  async function save() {
    if (!sourceConfirmed) throw new Error('먼저 로고를 확정해 주세요.');
    const name = els.projectName.value.trim();
    if (!name) throw new Error('프로젝트 이름을 입력해 주세요.');

    const blob = await currentBlob();
    const settings = getSettings();
    const id = projectId || core.uid('logo');
    const existing = core.state.projects.find((p) => p.id === id);
    const now = new Date().toISOString();

    const saved = await core.saveProject(
      {
        id,
        name,
        settings,
        presetId: els.presetSelect.value,
        autoRegisterPreset: els.autoPreset.checked,
        frameRate: 30,
        duration: 3,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      },
      blob
    );

    projectId = saved.id || id;
    if (els.autoPreset.checked) {
      await core.savePreset({
        id: `preset_${projectId}`,
        name: `${name} · 자동 프리셋`,
        ...settings,
        projectId,
        updatedAt: now,
      });
      renderPresets(`preset_${projectId}`);
    }
    say(`“${name}” 저장 완료 · ${core.state.storageMode === 'server' ? 'Orbitron 서버' : '브라우저 임시 저장'}`, 'success');
  }

  // ---- presets -----------------------------------------------------

  function renderPresets(selectedId) {
    els.presetSelect.replaceChildren(
      ...core.state.presets.map((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        if (preset.id === selectedId) option.selected = true;
        return option;
      })
    );
  }

  // ---- wiring ------------------------------------------------------

  els.modeUpload.addEventListener('click', () => setMode('upload'));
  els.modeAi.addEventListener('click', () => setMode('ai'));
  els.modeImport.addEventListener('click', () => setMode('import'));

  els.upload.addEventListener('change', async () => {
    const file = els.upload.files?.[0];
    if (file) await setLogo(file, file.name, file.name.replace(/\.[^.]+$/, ''));
  });

  ['dragover', 'dragleave', 'drop'].forEach((type) => {
    els.dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      els.dropzone.classList.toggle('is-over', type === 'dragover');
      if (type !== 'drop') return;
      const file = event.dataTransfer?.files?.[0];
      if (file?.type?.startsWith('image/')) setLogo(file, file.name, file.name.replace(/\.[^.]+$/, ''));
    });
  });

  [els.glow, els.energy].forEach((input) => input.addEventListener('input', pushSettings));
  document
    .querySelectorAll('input[name="studio-aspect"]')
    .forEach((radio) => radio.addEventListener('change', pushSettings));

  els.presetSelect.addEventListener('change', () => {
    const preset = core.state.presets.find((p) => p.id === els.presetSelect.value);
    if (preset) applySettings(preset);
  });

  els.deletePreset.addEventListener('click', async () => {
    const preset = core.state.presets.find((p) => p.id === els.presetSelect.value);
    if (!preset || preset.isDefault) {
      say('기본 프리셋은 삭제할 수 없습니다.', 'error');
      return;
    }
    await core.deletePreset(preset.id);
    renderPresets(core.DEFAULT_PRESET.id);
    say(`“${preset.name}” 프리셋을 삭제했습니다.`, 'success');
  });

  els.generate.addEventListener('click', async () => {
    if (busy) return;
    if (els.prompt.value.trim().length < 10) {
      say('로고 설명을 조금 더 자세히 적어 주세요.', 'error');
      return;
    }
    setBusy(els.generate, true, '생성 중…');
    say('Genspark AI로 로고를 생성하는 중… 최대 1분 정도 걸립니다.');
    try {
      const response = await callAi('/api/ai/generate-logo', {
        prompt: buildPrompt(),
        brandName: els.brandName.value.trim(),
        style: els.style.value,
        model: els.model.value,
      });
      const blob = await response.blob();
      await setLogo(blob, 'genspark-logo.png', els.brandName.value.trim());
      say('생성한 로고를 미리보기에 적용했습니다.', 'success');
    } catch (error) {
      say(error.message, 'error');
    } finally {
      setBusy(els.generate, false);
    }
  });

  els.importBtn.addEventListener('click', async () => {
    if (busy) return;
    const url = els.importUrl.value.trim();
    if (!url) {
      say('Genspark 이미지 주소를 입력해 주세요.', 'error');
      return;
    }
    setBusy(els.importBtn, true, '가져오는 중…');
    try {
      const response = await callAi('/api/ai/import-genspark-image', { url });
      const blob = await response.blob();
      await setLogo(blob, 'genspark-import.png', els.brandName.value.trim());
      say('Genspark 결과를 가져왔습니다.', 'success');
    } catch (error) {
      say(error.message, 'error');
    } finally {
      setBusy(els.importBtn, false);
    }
  });

  els.pasteZone.addEventListener('paste', async (event) => {
    const file = Array.from(event.clipboardData?.files || [])[0];
    if (!file?.type?.startsWith('image/')) {
      say('클립보드에서 이미지를 찾지 못했습니다.', 'error');
      return;
    }
    await setLogo(file, file.name || 'pasted.png', els.brandName.value.trim());
    say('붙여넣은 이미지를 적용했습니다.', 'success');
  });

  els.save.addEventListener('click', async () => {
    if (busy) return;
    setBusy(els.save, true, '저장 중…');
    try {
      await save();
    } catch (error) {
      say(error.message, 'error');
    } finally {
      setBusy(els.save, false);
    }
  });

  els.downloadLogo.addEventListener('click', async () => {
    const blob = await currentBlob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${els.projectName.value.trim() || 'plazion-logo'}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  els.newProject.addEventListener('click', () => {
    projectId = null;
    logoBlob = null;
    logoUrl = '/static/plazion_logo.png';
    sourceConfirmed = false;
    els.projectName.value = '';
    els.sourceReady.textContent = '';
    applySettings(core.DEFAULT_PRESET);
    if (intro) intro.setLogoSource(logoUrl);
    say('새 프로젝트를 시작했습니다.');
  });

  /** Opened from the handoff page: /studio?handoff=<id>. Applies only what the
   *  handoff actually specifies — the logo, the name, and the aspect implied by
   *  its master resolutions. Glow and energy are this engine's own dials with
   *  no counterpart in the spec, so they are left alone. */
  async function restoreFromHandoff() {
    const id = new URLSearchParams(window.location.search).get('handoff');
    if (!id) return false;
    const body = await core.fetchJson(`/api/handoffs/${encodeURIComponent(id)}`).catch(() => null);
    const bundle = body?.handoff;
    if (!bundle?.logoUrl) {
      say('핸드오프에서 로고를 찾지 못했습니다.', 'error');
      return true;
    }
    const blob = await fetch(bundle.logoUrl).then((r) => r.blob());
    const spec = bundle.spec || {};
    const land = spec.resolutions?.landscape;
    if (land) applySettings({ aspect: land.width >= land.height ? 'landscape' : 'portrait' });
    els.projectName.value = spec.title || bundle.name || '';
    await setLogo(blob, bundle.entrypoints?.logo?.split('/').pop() || 'handoff-logo.png', spec.title || bundle.name);
    say(`“${bundle.name}” 핸드오프를 불러왔습니다. 저장하면 라이브러리에 남습니다.`, 'success');
    return true;
  }

  // Opened from the library: /studio?project=<id>
  async function restoreFromQuery() {
    const wanted = core.projectIdFromQuery();
    if (!wanted) return;
    const project = core.state.projects.find((p) => p.id === wanted);
    if (!project) {
      say('요청한 프로젝트를 찾지 못했습니다.', 'error');
      return;
    }
    projectId = project.id;
    els.projectName.value = project.name || '';
    applySettings(project.settings || {});
    const source = project.logoBlob instanceof Blob ? project.logoBlob : await fetch(core.projectLogoUrl(project)).then((r) => r.blob());
    await setLogo(source, `${project.name}.png`, project.name);
    say(`“${project.name}” 을 불러왔습니다.`, 'success');
  }

  // ---- boot --------------------------------------------------------

  setMode('upload');
  applySettings(core.DEFAULT_PRESET);
  window.PlazionStudio = { setLogo, applySettings, setProjectName: (n) => { els.projectName.value = String(n || '').slice(0, 120); } };

  Promise.all([core.loadProjects(), core.loadPresets()])
    .then(() => {
      renderPresets(core.DEFAULT_PRESET.id);
      return restoreFromHandoff().then((handled) => (handled ? null : restoreFromQuery()));
    })
    .catch(() => core.setStorageMode('local'));
})();
