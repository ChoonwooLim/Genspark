/* Preview page — the stage, its controls, and PNG sequence export.
 * The archive listing moved to archive.js when each feature got its own page. */
(function () {
  const canvas = document.getElementById('intro-canvas');
  const canvasWrap = document.getElementById('canvas-wrap');
  const soundGate = document.getElementById('sound-gate');
  const soundGateBtn = document.getElementById('sound-gate-btn');
  const muteToggle = document.getElementById('mute-toggle');
  const muteLabel = document.getElementById('mute-label');
  const restartBtn = document.getElementById('restart-btn');
  const loopCountEl = document.getElementById('loop-count');
  const aspectBtns = document.querySelectorAll('.aspect-btn');
  const downloadSequenceBtn = document.getElementById('download-sequence');
  const sequenceLabel = document.getElementById('sequence-label');
  const exportStatus = document.getElementById('export-status');
  const exportStatusText = document.getElementById('export-status-text');
  const exportProgressValue = document.getElementById('export-progress-value');
  const exportProgressBar = document.getElementById('export-progress-bar');
  const exportStatusNote = document.getElementById('export-status-note');
  const uploadSequenceBtn = document.getElementById('upload-sequence');
  const uploadLabel = document.getElementById('upload-label');
  const downloadLogo = document.getElementById('download-logo');
  const sourceSelect = document.getElementById('source-select');
  const sourceNote = document.getElementById('source-note');
  const engineView = document.getElementById('engine-view');
  const protoView = document.getElementById('proto-view');

  let loops = 0;
  let soundEnabled = false;
  let userMuted = false;
  let isExporting = false;
  let serverStorage = null;

  const intro = new window.PlazionIntro(canvas, {
    logoSrc: '/static/plazion_logo.png',
    aspect: 'landscape',
    onLoop: () => {
      loops += 1;
      loopCountEl.textContent = String(loops);
    },
  });
  window.PlazionApp = {
    intro,
    setAspect(aspect) {
      const button = Array.from(aspectBtns).find((item) => item.getAttribute('data-aspect') === aspect);
      if (button) button.click();
    },
    restart() { restartBtn.click(); },
    exportSequence() { downloadSequenceBtn.click(); },
  };

  function updateMuteUI() {
    const off = userMuted || !soundEnabled;
    muteLabel.textContent = off ? (soundEnabled ? '사운드 꺼짐' : '사운드 대기') : '사운드 켜짐';
    muteToggle.setAttribute('aria-pressed', off ? 'false' : 'true');
  }

  async function enableSound() {
    try {
      const ctx = window.__plazionAudio.getAudioCtx();
      if (ctx) {
        await ctx.resume();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.02);
      }
    } catch (e) { /* ignore */ }
    soundEnabled = true;
    intro.setSound(!userMuted);
    soundGate.classList.add('hidden');
    updateMuteUI();
  }

  soundGateBtn.addEventListener('click', enableSound);
  soundGate.addEventListener('click', (e) => {
    if (e.target === soundGate) enableSound();
  });

  muteToggle.addEventListener('click', () => {
    if (!soundEnabled) {
      enableSound();
      return;
    }
    userMuted = !userMuted;
    intro.setSound(!userMuted);
    updateMuteUI();
  });

  restartBtn.addEventListener('click', () => {
    loops = 0;
    loopCountEl.textContent = '0';
    intro.restart();
  });

  aspectBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isExporting) return;
      const aspect = btn.getAttribute('data-aspect');
      aspectBtns.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      canvasWrap.classList.toggle('canvas-wrap--landscape', aspect === 'landscape');
      canvasWrap.classList.toggle('canvas-wrap--portrait', aspect === 'portrait');
      loops = 0;
      loopCountEl.textContent = '0';
      intro.setAspect(aspect);
      window.dispatchEvent(new CustomEvent('plazion:aspect-change', { detail: { aspect } }));
    });
  });

  function setExportProgress(current, total, label) {
    const percent = total ? Math.round((current / total) * 100) : 0;
    exportStatusText.textContent = label || `PNG 프레임 생성 중 · ${current}/${total}`;
    exportProgressValue.textContent = `${percent}%`;
    exportProgressBar.style.width = `${percent}%`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function getSequenceInfo(frameCount) {
    return [
      'PLAZION VFX Intro — Transparent PNG Sequence',
      `Aspect: ${intro.aspect}`,
      `Resolution: ${canvas.width}x${canvas.height}`,
      'Frame rate: 30 fps',
      `Frames: ${frameCount}`,
      'Duration: 3.0 seconds',
      'Alpha: transparent RGBA',
    ].join('\n');
  }

  async function writeFile(directory, filename, contents) {
    const fileHandle = await directory.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
  }

  async function exportToSelectedFolder(rootDirectory) {
    const folderName = `plazion_transparent_${canvas.width}x${canvas.height}_30fps`;
    const outputDirectory = await rootDirectory.getDirectoryHandle(folderName, { create: true });
    exportStatusNote.textContent = `선택한 위치의 ${folderName} 폴더에 PNG 90장을 저장합니다.`;

    await intro.exportPngSequence({
      fps: 30,
      onFrame: async (blob, index) => {
        const frameNumber = String(index).padStart(4, '0');
        await writeFile(outputDirectory, `plazion_${frameNumber}.png`, blob);
      },
      onProgress: (current, total) => {
        setExportProgress(current, total, `폴더에 저장 중 · ${current}/${total}`);
      },
    });
    await writeFile(outputDirectory, 'sequence-info.txt', getSequenceInfo(90));
    exportStatus.classList.add('is-complete');
    setExportProgress(90, 90, `저장 완료 · ${folderName}`);
  }

  async function exportAsZipFallback() {
    if (!window.JSZip) throw new Error('이 브라우저에서는 폴더 저장을 지원하지 않으며 ZIP 모듈도 불러오지 못했습니다.');
    exportStatusNote.textContent = '이 브라우저는 폴더 직접 저장을 지원하지 않아 ZIP 파일로 다운로드합니다.';
    const result = await intro.exportPngSequence({
      fps: 30,
      onProgress: (current, total) => {
        const renderProgress = Math.round((current / total) * 85);
        setExportProgress(renderProgress, 100, `PNG 프레임 생성 중 · ${current}/${total}`);
      },
    });
    const zip = new window.JSZip();
    const folder = zip.folder('plazion_png_sequence');
    result.frames.forEach((blob, index) => {
      folder.file(`plazion_${String(index).padStart(4, '0')}.png`, blob);
    });
    folder.file('sequence-info.txt', getSequenceInfo(result.frames.length));
    setExportProgress(85, 100, 'ZIP 패키징 중');
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (metadata) => {
      setExportProgress(85 + Math.round(metadata.percent * 0.15), 100, 'ZIP 패키징 중');
    });
    downloadBlob(zipBlob, `plazion_transparent_${canvas.width}x${canvas.height}_30fps.zip`);
    exportStatus.classList.add('is-complete');
    setExportProgress(100, 100, `완료 · PNG ${result.frames.length}장 ZIP 다운로드`);
  }

  downloadSequenceBtn.addEventListener('click', async () => {
    if (isExporting) return;

    let directoryHandle = null;
    if ('showDirectoryPicker' in window) {
      try {
        directoryHandle = await window.showDirectoryPicker({
          id: 'plazion-png-sequence',
          mode: 'readwrite',
          startIn: 'desktop',
        });
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        console.error(error);
      }
    }

    isExporting = true;
    exportStatus.hidden = false;
    exportStatus.classList.remove('is-error', 'is-complete');
    downloadSequenceBtn.disabled = true;
    aspectBtns.forEach((btn) => { btn.disabled = true; });
    sequenceLabel.textContent = directoryHandle ? '폴더에 저장 중…' : 'ZIP 생성 중…';
    setExportProgress(0, 90, 'PNG 프레임 준비 중');

    try {
      if (directoryHandle) {
        await exportToSelectedFolder(directoryHandle);
      } else {
        await exportAsZipFallback();
      }
    } catch (error) {
      console.error(error);
      exportStatus.classList.add('is-error');
      exportStatusText.textContent = error instanceof Error ? error.message : 'PNG 시퀀스 저장에 실패했습니다.';
      exportProgressValue.textContent = '오류';
    } finally {
      isExporting = false;
      downloadSequenceBtn.disabled = false;
      aspectBtns.forEach((btn) => { btn.disabled = false; });
      sequenceLabel.textContent = '폴더에 PNG 시퀀스 저장';
    }
  });


  // ===== Orbitron 서버 보관함 =====================================
  // The /api/sequences backend only exists on the Node container deploy, and
  // only reports enabled:true once a database is attached. Everything below
  // stays hidden otherwise, so the Cloudflare Workers build is unaffected.

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function sha256Hex(blob) {
    // crypto.subtle needs a secure context; the site is https-only in
    // production, but fall back to skipping the checksum on plain http so a
    // LAN/dev origin can still upload. The server treats it as optional.
    if (!(window.crypto && window.crypto.subtle)) return null;
    const digest = await window.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function uploadZip(zipBlob, meta) {
    const checksum = await sha256Hex(zipBlob);

    const initRes = await fetch('/api/sequences/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...meta, byteSize: zipBlob.size }),
    });
    const initBody = await initRes.json().catch(() => ({}));
    if (!initRes.ok) throw new Error(initBody.message || '업로드를 시작하지 못했습니다.');

    const { uploadId, chunkSize } = initBody;
    const total = Math.ceil(zipBlob.size / chunkSize);

    // Sequential on purpose: the server appends chunks in order and rejects
    // anything out of sequence, which keeps its state to a single file handle.
    for (let index = 0; index < total; index += 1) {
      const slice = zipBlob.slice(index * chunkSize, (index + 1) * chunkSize);
      const res = await fetch(`/api/sequences/${uploadId}/chunk?index=${index}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/octet-stream' },
        body: slice,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `청크 ${index + 1}/${total} 업로드 실패`);
      }
      setExportProgress(90 + Math.round(((index + 1) / total) * 10), 100, `서버 업로드 중 · ${index + 1}/${total}`);
    }

    const completeRes = await fetch(`/api/sequences/${uploadId}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(checksum ? { sha256: checksum } : {}),
    });
    const completeBody = await completeRes.json().catch(() => ({}));
    if (!completeRes.ok) throw new Error(completeBody.message || '업로드 마무리에 실패했습니다.');
    return completeBody;
  }

  async function saveSequenceToServer() {
    const result = await intro.exportPngSequence({
      fps: 30,
      onProgress: (current, total) => {
        setExportProgress(Math.round((current / total) * 80), 100, `PNG 프레임 생성 중 · ${current}/${total}`);
      },
    });

    const zip = new window.JSZip();
    const folder = zip.folder('plazion_png_sequence');
    result.frames.forEach((blob, index) => {
      folder.file(`plazion_${String(index).padStart(4, '0')}.png`, blob);
    });
    folder.file('sequence-info.txt', getSequenceInfo(result.frames.length));

    setExportProgress(80, 100, 'ZIP 패키징 중');
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (metadata) => {
      setExportProgress(80 + Math.round(metadata.percent * 0.1), 100, 'ZIP 패키징 중');
    });

    if (serverStorage && zipBlob.size > serverStorage.maxBytes) {
      throw new Error(`파일이 서버 상한(${formatBytes(serverStorage.maxBytes)})을 넘었습니다 — ${formatBytes(zipBlob.size)}`);
    }

    const saved = await uploadZip(zipBlob, {
      filename: `plazion_transparent_${canvas.width}x${canvas.height}_30fps.zip`,
      aspect: intro.aspect,
      width: canvas.width,
      height: canvas.height,
      fps: 30,
      frameCount: result.frames.length,
    });

    exportStatus.classList.add('is-complete');
    setExportProgress(100, 100, `서버 저장 완료 · ${formatBytes(saved.byteSize)}`);
    exportStatusNote.textContent = '보관함 페이지에서 언제든 다시 내려받을 수 있습니다.';
  }

  if (uploadSequenceBtn) {
    uploadSequenceBtn.addEventListener('click', async () => {
      if (isExporting) return;

      isExporting = true;
      exportStatus.hidden = false;
      exportStatus.classList.remove('is-error', 'is-complete');
      uploadSequenceBtn.disabled = true;
      downloadSequenceBtn.disabled = true;
      aspectBtns.forEach((btn) => { btn.disabled = true; });
      uploadLabel.textContent = '서버에 저장 중…';
      exportStatusNote.textContent = 'PNG 90장을 ZIP으로 묶어 Orbitron 서버에 업로드합니다.';
      setExportProgress(0, 100, 'PNG 프레임 준비 중');

      try {
        await saveSequenceToServer();
      } catch (error) {
        console.error(error);
        exportStatus.classList.add('is-error');
        exportStatusText.textContent = error instanceof Error ? error.message : '서버 저장에 실패했습니다.';
        exportProgressValue.textContent = '오류';
      } finally {
        isExporting = false;
        uploadSequenceBtn.disabled = false;
        downloadSequenceBtn.disabled = false;
        aspectBtns.forEach((btn) => { btn.disabled = false; });
        uploadLabel.textContent = '서버 보관함에 저장';
      }
    });
  }

  (async function initServerStorage() {
    if (!uploadSequenceBtn) return;
    try {
      const res = await fetch('/api/sequences/status', { headers: { accept: 'application/json' } });
      if (!res.ok) return;
      const status = await res.json();
      if (!status.enabled) return;
      serverStorage = status;
      uploadSequenceBtn.hidden = false;
      } catch (error) {
      // No backend (Cloudflare Workers build) — leave the UI hidden.
    }
  })();

  /* ===== Sources ===================================================
   *
   * Two different things can play here and they are not two views of one
   * animation: the built-in voxel engine, which renders whatever logo is
   * loaded, and a prototype from an imported handoff, which is its own
   * HTML/CSS animation and knows nothing about our logo or our engine.
   * Swapping only the logo into the engine — what this page used to do —
   * played the PLAZION animation with someone else's mark on it.
   */

  let sources = [{ kind: 'engine', label: '내장 엔진 · Voxel Materialize' }];
  let active = sources[0];
  let protoFit = null;

  const PROTO_SIZE = (path) =>
    /9[x_-]?16|portrait/i.test(path) ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };

  /** "Logo Animation Hologram 9x16.html" -> concept "Hologram", portrait. */
  function describePreview(path) {
    const file = path.split('/').pop().replace(/\.html$/i, '');
    const portrait = /9[x_-]?16|portrait/i.test(file);
    const concept = file.replace(/logo\s*animation/i, '').replace(/9[x_-]?16/i, '').trim();
    return { concept: concept || '기본', portrait, path };
  }

  async function loadHandoffSources() {
    try {
      const body = await fetch('/api/handoffs').then((r) => r.json());
      for (const bundle of body.handoffs || []) {
        const byConcept = new Map();
        for (const path of bundle.entrypoints?.previews || []) {
          const info = describePreview(path);
          if (!byConcept.has(info.concept)) byConcept.set(info.concept, {});
          byConcept.get(info.concept)[info.portrait ? 'portrait' : 'landscape'] = path;
        }
        for (const [concept, files] of byConcept) {
          sources.push({
            kind: 'proto',
            label: `${bundle.name} · ${concept}`,
            bundleId: bundle.id,
            files,
          });
        }
      }
    } catch {
      /* no backend — the engine is still selectable */
    }

    sourceSelect.replaceChildren(
      ...sources.map((source, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = source.label;
        return option;
      })
    );
    sourceSelect.disabled = sources.length < 2;
  }

  function currentAspect() {
    return canvasWrap.classList.contains('canvas-wrap--portrait') ? 'portrait' : 'landscape';
  }

  function renderProto() {
    const aspect = currentAspect();
    const path = active.files[aspect] || active.files.landscape || active.files.portrait;
    if (!path) {
      sourceNote.textContent = '이 컨셉에는 해당 화면비 파일이 없습니다.';
      return;
    }
    const { w, h } = PROTO_SIZE(path);
    const src = `/api/handoffs/${encodeURIComponent(active.bundleId)}/files/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
    protoView.innerHTML = `<iframe class="handoff-preview" style="width:${w}px;height:${h}px" src="${src}" sandbox="allow-scripts" title="${active.label}"></iframe>`;

    const fit = () => {
      const availW = protoView.clientWidth;
      if (!availW) return;
      const availH = Math.min(window.innerHeight * 0.66, (availW * h) / w);
      const k = Math.min(availW / w, availH / h);
      protoView.style.height = `${Math.round(h * k)}px`;
      protoView.style.setProperty('--frame-scale', String(k));
      const frame = protoView.querySelector('.handoff-preview');
      if (frame) frame.style.left = `${Math.round((availW - w * k) / 2)}px`;
    };
    fit();
    protoFit?.disconnect();
    protoFit = new ResizeObserver(fit);
    protoFit.observe(protoView);
  }

  function applySource(source) {
    active = source;
    const isEngine = source.kind === 'engine';

    engineView.hidden = !isEngine;
    protoView.hidden = isEngine;
    if (isEngine) {
      protoFit?.disconnect();
      protoFit = null;
      protoView.innerHTML = '';
    }

    // The sound gate and mute control belong to the engine's procedural audio.
    // A prototype brings its own (this handoff is silent), so offering our
    // audio controls over it would be a lie.
    muteToggle.hidden = !isEngine;
    soundGate.hidden = !isEngine;

    // Frames can only be captured from our own canvas. A sandboxed iframe on
    // an opaque origin cannot be read, so export is engine-only.
    downloadSequenceBtn.disabled = !isEngine;
    if (uploadSequenceBtn) uploadSequenceBtn.disabled = !isEngine;

    sourceNote.textContent = isEngine
      ? '내장 엔진 · 3초 루프 · PNG 시퀀스 내보내기 가능'
      : '가져온 원본 프로토타입을 그대로 재생합니다 · PNG 시퀀스 내보내기는 내장 엔진에서만 가능합니다';

    if (!isEngine) renderProto();
  }

  sourceSelect.addEventListener('change', () => applySource(sources[Number(sourceSelect.value)]));
  window.addEventListener('plazion:aspect-change', () => {
    if (active.kind === 'proto') renderProto();
  });

  /** Adopt whatever the studio was last working on. Navigating here is a fresh
   *  page load, so the studio's object URL is already gone. */
  async function applyLogo(blob, settings, name) {
    const url = URL.createObjectURL(blob);
    await intro.setLogoSource(url);
    downloadLogo.href = url;
    downloadLogo.setAttribute('download', `${name || 'logo'}.png`);

    if (settings) {
      intro.setVisualSettings({
        glow: (settings.glow ?? 100) / 100,
        energy: (settings.energy ?? 100) / 100,
      });
      if (settings.aspect && settings.aspect !== intro.aspect) {
        const button = Array.from(aspectBtns).find((b) => b.getAttribute('data-aspect') === settings.aspect);
        if (button) button.click();
      }
    }
    if (name) exportStatusNote.textContent = `현재 로고: ${name} · 30fps · 3초 · 투명 PNG 90장`;
  }

  (async function boot() {
    await loadHandoffSources();
    applySource(sources[0]);

    const core = window.PlazionCore;
    if (!core) return;

    const wantedProject = core.projectIdFromQuery();
    if (wantedProject) {
      await core.loadProjects().catch(() => {});
      const project = core.state.projects.find((p) => p.id === wantedProject);
      if (project) {
        const blob =
          project.logoBlob instanceof Blob
            ? project.logoBlob
            : await fetch(core.projectLogoUrl(project)).then((r) => r.blob()).catch(() => null);
        if (blob) await applyLogo(blob, project.settings, project.name);
        return;
      }
    }

    const working = await core.getWorkingLogo();
    if (working?.blob) await applyLogo(working.blob, working.meta?.settings, working.meta?.name);
  })();

  updateMuteUI();
})();
