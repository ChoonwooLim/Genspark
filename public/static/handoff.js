(function () {
  // Genspark handoff bundle panel. Kept in its own file rather than folded into
  // studio.js so the two can be worked on independently; it talks to the studio
  // through the small window.PlazionStudio surface and nothing else.
  const els = {
    section: document.getElementById('handoff-section'),
    dropzone: document.getElementById('handoff-dropzone'),
    input: document.getElementById('handoff-upload'),
    status: document.getElementById('handoff-status'),
    list: document.getElementById('handoff-list'),
    empty: document.getElementById('handoff-empty'),
    detail: document.getElementById('handoff-detail'),
    folderBtn: document.getElementById('handoff-folder-btn'),
    folderInput: document.getElementById('handoff-folder-input'),
  };
  if (!els.section) return;

  // Set from JS: `webkitdirectory` is a non-standard attribute the JSX
  // renderer would not emit, and it is what makes the fallback picker select a
  // whole folder instead of individual files.
  if (els.folderInput) {
    els.folderInput.setAttribute('webkitdirectory', '');
    els.folderInput.setAttribute('directory', '');
  }

  let bundles = [];
  let busy = false;

  const fmtBytes = (n) => {
    if (!n) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
    return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
  };

  const esc = (v) =>
    String(v ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);

  function say(message, type = 'info') {
    els.status.textContent = message;
    els.status.dataset.type = type;
  }

  // Same access-code flow the studio uses for its own writes.
  async function write(url, options) {
    const send = () => {
      const token = sessionStorage.getItem('plazionStudioToken') || '';
      return fetch(url, { ...options, headers: { ...(options.headers || {}), ...(token ? { 'X-Studio-Token': token } : {}) } });
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

  async function refresh() {
    try {
      const response = await fetch('/api/handoffs');
      if (!response.ok) return;
      const body = await response.json();
      if (body.storage === 'unconfigured') {
        say('핸드오프 저장소가 아직 활성화되지 않았습니다 (PostgreSQL 미설정).', 'error');
        return;
      }
      // This page never loads the project list, so it resolves the shared
      // storage chip from its own response instead of leaving it at "확인 중".
      window.PlazionCore?.setStorageMode(body.storage === 'server' ? 'server' : 'local');
      bundles = body.handoffs || [];
      render();
    } catch {
      say('핸드오프 목록을 불러오지 못했습니다.', 'error');
    }
  }

  function specSummary(spec) {
    if (!spec) return '';
    const selected = (spec.variants || []).find((v) => v.selected);
    const land = spec.resolutions?.landscape;
    const port = spec.resolutions?.portrait;
    const concepts = spec.concepts || [];

    const size = land && port ? `${land.width}×${land.height} · ${port.width}×${port.height}`
      : land ? `${land.width}×${land.height}`
      : port ? `${port.width}×${port.height}`
      : (spec.aspects || []).join(' · ') || null;

    // A bundle with several concepts has no single duration; say how many and
    // how long they run instead of inventing one number for all of them.
    const timing = concepts.length > 1
      ? `컨셉 ${concepts.length}개 · ${Math.min(...concepts.map((c) => c.duration))}–${Math.max(...concepts.map((c) => c.duration))}s`
      : spec.duration
        ? `${spec.duration}s${spec.durationSource === 'timeline' ? '(추정)' : ''}`
        : null;

    return [
      timing,
      spec.fps ? `${spec.fps}fps` : null,
      size,
      selected ? `Variant ${String(selected.number).padStart(2, '0')} ${selected.name}` : null,
      (spec.timeline || []).length ? `타임라인 ${spec.timeline.length}단계` : null,
    ].filter(Boolean).join(' · ');
  }

  function render() {
    els.empty.hidden = bundles.length > 0;
    els.list.innerHTML = bundles
      .map(
        (b) => `<article class="handoff-row" data-id="${esc(b.id)}">
          <div class="handoff-row__thumb">${
            b.thumbnailUrl ? `<img src="${esc(b.thumbnailUrl)}" alt="" />` : ''
          }</div>
          <div class="handoff-row__body">
            <h3 class="h-card">${esc(b.name)}</h3>
            <p class="caption">${esc(specSummary(b.spec)) || '스펙을 읽지 못했습니다'}</p>
            <p class="micro">${esc(b.filename)} · ${fmtBytes(b.byteSize)} · 파일 ${b.fileCount}개</p>
          </div>
          <div class="handoff-row__side cluster">
            <button type="button" class="btn btn--ghost btn--sm" data-action="adopt">작업실에 적용</button>
            <button type="button" class="btn btn--quiet" data-action="detail">내용</button>
            <button type="button" class="btn btn--quiet" data-action="preview">원본 재생</button>
            <button type="button" class="btn btn--quiet" data-action="reparse">스펙 다시 읽기</button>
            <button type="button" class="btn btn--quiet" data-action="delete">삭제</button>
          </div>
        </article>`
      )
      .join('');
  }

  /** The studio is a separate page now, so adoption is a navigation: the
   *  studio reads ?handoff=<id> and pulls the logo and spec itself. */
  function adopt(bundle) {
    if (!bundle.logoUrl) throw new Error('이 번들에서 로고 에셋을 찾지 못했습니다.');
    say(`“${bundle.name}” 을 작업실로 보냅니다…`, 'success');
    window.location.href = `/studio?handoff=${encodeURIComponent(bundle.id)}`;
  }

  async function showDetail(bundle) {
    const body = await fetch(`/api/handoffs/${encodeURIComponent(bundle.id)}`).then((r) => r.json());
    const h = body.handoff;
    const spec = h.spec || {};
    const groups = new Map();
    (spec.timeline || []).forEach((t) => {
      const key = t.section || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });
    const timeline = [...groups]
      .map(([section, phases]) => {
        const head = section && groups.size > 1
          ? `<tr><th colspan="3" class="handoff-timeline__section">${esc(section)}</th></tr>`
          : '';
        return head + phases
          .map((t) => `<tr><td>${esc(t.label || `${t.start}–${t.end}s`)}</td><td>${esc(t.frames || '')}</td><td>${esc(t.event)}</td></tr>`)
          .join('');
      })
      .join('');
    const files = (h.manifest || [])
      .map(
        (f) =>
          `<li><a href="/api/handoffs/${esc(h.id)}/files/${f.path.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener">${esc(f.path)}</a> <span>${fmtBytes(f.size)}</span></li>`
      )
      .join('');

    els.detail.hidden = false;
    els.detail.innerHTML = `
      <header><h3>${esc(h.name)}</h3><button type="button" class="btn btn--quiet" data-action="close-detail">닫기</button></header>
      <dl class="handoff-spec">
        ${[
          spec.duration ? ['Duration', `${spec.duration}s`] : null,
          spec.fps ? ['Frame rate', `${spec.fps}fps`] : null,
          ...Object.entries(spec.resolutions || {}).map(([k, v]) => [k, `${v.width} × ${v.height}`]),
          ...(spec.tokens || []).map((t) => [t.name, t.value]),
          ...Object.entries(spec.colors || {}).filter(([k]) => !(spec.tokens || []).some((t) => t.name.toLowerCase() === k)).map(([k, v]) => [k, v]),
        ]
          .filter(Boolean)
          .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
          .join('')}
      </dl>
      ${timeline ? `<table class="handoff-timeline"><thead><tr><th>시간</th><th>프레임</th><th>이벤트</th></tr></thead><tbody>${timeline}</tbody></table>` : ''}
      <details><summary>파일 ${(h.manifest || []).length}개</summary><ul class="handoff-files">${files}</ul></details>`;
    els.detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** Prototypes in a handoff are built at their own fixed canvas size — this
   *  bundle's is a hard 1920x1080 (or 1080x1920) with no viewport scaling. An
   *  iframe narrower than that clips the canvas instead of fitting it, which is
   *  why a portrait file showed nothing but background: its logo sits at 75%
   *  height, outside the band a 16:9 box happens to reveal.
   *
   *  So the frame is rendered at the prototype's natural size and scaled down
   *  with a transform. The bundle's own HTML is left untouched. */
  let previewFit = null;

  function previewSize(path) {
    return /9[x_-]?16|portrait|세로/i.test(path) ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
  }

  function previewLabel(path) {
    return path.split('/').pop().replace(/\.html$/i, '');
  }

  function renderPreviewFrame(bundle, path) {
    const { w, h } = previewSize(path);
    const src = `/api/handoffs/${encodeURIComponent(bundle.id)}/files/${path.split('/').map(encodeURIComponent).join('/')}`;
    const holder = els.detail.querySelector('.handoff-frame');
    if (!holder) return;
    // No allow-same-origin: the bundle is untrusted, and the server also sends
    // `Content-Security-Policy: sandbox` on these responses.
    holder.innerHTML = `<iframe class="handoff-preview" style="width:${w}px;height:${h}px" src="${esc(src)}" sandbox="allow-scripts" title="${esc(previewLabel(path))}"></iframe>`;

    // Fit both axes. Scaling by width alone leaves a 1080x1920 prototype
    // 1.8x taller than its box, which is what cropped the portrait concepts.
    const fit = () => {
      const availW = holder.clientWidth;
      if (!availW) return;
      const availH = Math.min(window.innerHeight * 0.72, (availW * h) / w);
      const k = Math.min(availW / w, availH / h);
      holder.style.height = `${Math.round(h * k)}px`;
      holder.style.setProperty('--frame-scale', String(k));
      const frame = holder.querySelector('.handoff-preview');
      if (frame) frame.style.left = `${Math.round((availW - w * k) / 2)}px`;
    };
    fit();
    previewFit?.disconnect();
    previewFit = new ResizeObserver(fit);
    previewFit.observe(holder);
  }

  function showPreview(bundle) {
    const previews = bundle.entrypoints?.previews || [];
    if (!previews.length) throw new Error('이 번들에는 HTML 미리보기가 없습니다.');

    // previews[] arrives in zip order, which put a 9:16 file first. Default to
    // a landscape one when the bundle ships both.
    const ordered = [...previews].sort(
      (a, b) => (previewSize(a).w < previewSize(a).h ? 1 : 0) - (previewSize(b).w < previewSize(b).h ? 1 : 0)
    );

    els.detail.hidden = false;
    els.detail.innerHTML = `
      <header>
        <h3>${esc(bundle.name)} · 원본 재생</h3>
        <button type="button" class="btn btn--quiet" data-action="close-detail">닫기</button>
      </header>
      <div class="field" style="max-width:420px;margin-bottom:16px">
        <label for="handoff-preview-pick">재생할 프로토타입 (${ordered.length}개)</label>
        <select id="handoff-preview-pick" class="select">
          ${ordered.map((p) => `<option value="${esc(p)}">${esc(previewLabel(p))}</option>`).join('')}
        </select>
      </div>
      <div class="handoff-frame"></div>
      <p class="micro" style="margin-top:10px">원본 캔버스 크기 그대로 재생한 뒤 화면에 맞춰 축소합니다.</p>`;

    renderPreviewFrame(bundle, ordered[0]);
    els.detail.querySelector('#handoff-preview-pick').addEventListener('change', (event) => {
      renderPreviewFrame(bundle, event.target.value);
    });
    els.detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function upload(file) {
    if (busy) return;
    if (!/\.zip$/i.test(file.name)) throw new Error('project.zip 파일 또는 압축을 푼 폴더를 선택해 주세요.');
    busy = true;
    say(`“${file.name}” 업로드 중… (${fmtBytes(file.size)})`);
    try {
      const form = new FormData();
      form.append('bundle', file);
      const body = await write('/api/handoffs', { method: 'POST', body: form });
      say(`“${body.handoff.name}” 가져오기 완료 · ${specSummary(body.handoff.spec) || '스펙 없음'}`, 'success');
      await refresh();
    } finally {
      busy = false;
    }
  }

  els.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropzone.classList.add('is-over');
  });
  els.dropzone.addEventListener('dragleave', () => els.dropzone.classList.remove('is-over'));
  els.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('is-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) upload(file).catch((err) => say(err.message, 'error'));
  });
  els.input.addEventListener('change', () => {
    const file = els.input.files?.[0];
    if (file) upload(file).catch((err) => say(err.message, 'error'));
    els.input.value = '';
  });

  els.folderBtn.addEventListener('click', () => {
    importFolder().catch((err) => say(err.message, 'error'));
  });
  els.folderInput.addEventListener('change', () => {
    importFolderInput(els.folderInput.files).catch((err) => say(err.message, 'error'));
    els.folderInput.value = '';
  });

  els.list.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.closest('.handoff-row')?.dataset.id;
    const bundle = bundles.find((b) => b.id === id);
    if (!bundle) return;
    try {
      if (button.dataset.action === 'adopt') adopt(bundle);
      if (button.dataset.action === 'detail') await showDetail(bundle);
      if (button.dataset.action === 'preview') showPreview(bundle);
      if (button.dataset.action === 'reparse') {
        const body = await write(`/api/handoffs/${encodeURIComponent(bundle.id)}/reparse`, { method: 'POST' });
        say(`“${bundle.name}” 스펙을 다시 읽었습니다 · ${specSummary(body.handoff.spec) || '읽을 스펙이 없습니다'}`, 'success');
        await refresh();
      }
      if (button.dataset.action === 'delete') {
        if (!window.confirm(`“${bundle.name}” 번들을 삭제할까요?`)) return;
        await write(`/api/handoffs/${encodeURIComponent(bundle.id)}`, { method: 'DELETE' });
        say('번들을 삭제했습니다.', 'success');
        await refresh();
      }
    } catch (err) {
      say(err.message, 'error');
    }
  });

  els.detail.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close-detail"]')) {
      previewFit?.disconnect();
      previewFit = null;
      els.detail.hidden = true;
      els.detail.innerHTML = '';
    }
  });

  refresh();
})();
