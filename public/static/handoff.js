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
  };
  if (!els.section) return;

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
        els.section.hidden = true;
        return;
      }
      els.section.hidden = false;
      bundles = body.handoffs || [];
      render();
    } catch {
      els.section.hidden = true;
    }
  }

  function specSummary(spec) {
    if (!spec) return '';
    const selected = (spec.variants || []).find((v) => v.selected);
    const land = spec.resolutions?.landscape;
    return [
      spec.duration ? `${spec.duration}s` : null,
      spec.fps ? `${spec.fps}fps` : null,
      land ? `${land.width}×${land.height}` : null,
      selected ? `Variant ${String(selected.number).padStart(2, '0')} ${selected.name}` : null,
      (spec.timeline || []).length ? `타임라인 ${spec.timeline.length}단계` : null,
    ].filter(Boolean).join(' · ');
  }

  function render() {
    els.empty.hidden = bundles.length > 0;
    els.list.innerHTML = bundles
      .map(
        (b) => `<article class="handoff-card" data-id="${esc(b.id)}">
          <div class="handoff-card__thumb">${
            b.thumbnailUrl
              ? `<img src="${esc(b.thumbnailUrl)}" alt="${esc(b.name)} 썸네일" />`
              : '<i class="fa-solid fa-box-archive"></i>'
          }</div>
          <div class="handoff-card__body">
            <h3>${esc(b.name)}</h3>
            <p class="handoff-card__spec">${esc(specSummary(b.spec))}</p>
            <p class="handoff-card__meta">${esc(b.filename)} · ${fmtBytes(b.byteSize)} · 파일 ${b.fileCount}개</p>
            <div class="handoff-card__actions">
              <button type="button" data-action="adopt"><i class="fa-solid fa-wand-magic-sparkles"></i> 작업실에 적용</button>
              <button type="button" data-action="detail"><i class="fa-solid fa-list"></i> 내용 보기</button>
              <button type="button" data-action="preview"><i class="fa-solid fa-play"></i> 원본 미리보기</button>
              <button type="button" class="danger" data-action="delete"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </article>`
      )
      .join('');
  }

  /** Push the bundle's logo and its spec-derived settings into the studio. */
  async function adopt(bundle) {
    const studio = window.PlazionStudio;
    if (!studio) throw new Error('작업실을 찾지 못했습니다.');
    if (!bundle.logoUrl) throw new Error('이 번들에서 로고 에셋을 찾지 못했습니다.');

    const response = await fetch(bundle.logoUrl);
    if (!response.ok) throw new Error('번들의 로고 파일을 가져오지 못했습니다.');
    const blob = await response.blob();
    const filename = bundle.entrypoints?.logo?.split('/').pop() || 'handoff-logo.png';
    await studio.setLogo(blob, filename, bundle.spec?.title || bundle.name);

    // Only the aspect is machine-applicable today: glow and energy are this
    // engine's own dials and the handoff has no equivalent value for them.
    const land = bundle.spec?.resolutions?.landscape;
    const port = bundle.spec?.resolutions?.portrait;
    if (land && port) studio.applySettings({ aspect: land.width >= land.height ? 'landscape' : 'portrait' });
    studio.setProjectName(bundle.spec?.title || bundle.name);

    say(`“${bundle.name}” 의 로고와 설정을 작업실에 적용했습니다. 저장하려면 2단계에서 프로젝트 저장을 누르세요.`, 'success');
  }

  async function showDetail(bundle) {
    const body = await fetch(`/api/handoffs/${encodeURIComponent(bundle.id)}`).then((r) => r.json());
    const h = body.handoff;
    const spec = h.spec || {};
    const timeline = (spec.timeline || [])
      .map((t) => `<tr><td>${esc(t.start)}–${esc(t.end)}s</td><td>${esc(t.frames || '')}</td><td>${esc(t.event)}</td></tr>`)
      .join('');
    const files = (h.manifest || [])
      .map(
        (f) =>
          `<li><a href="/api/handoffs/${esc(h.id)}/files/${f.path.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener">${esc(f.path)}</a> <span>${fmtBytes(f.size)}</span></li>`
      )
      .join('');

    els.detail.hidden = false;
    els.detail.innerHTML = `
      <header><h3>${esc(h.name)}</h3><button type="button" data-action="close-detail">닫기</button></header>
      <dl class="handoff-spec">
        ${Object.entries(spec.colors || {}).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      ${timeline ? `<table class="handoff-timeline"><thead><tr><th>시간</th><th>프레임</th><th>이벤트</th></tr></thead><tbody>${timeline}</tbody></table>` : ''}
      <details><summary>파일 ${(h.manifest || []).length}개</summary><ul class="handoff-files">${files}</ul></details>`;
    els.detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showPreview(bundle) {
    const preview = bundle.entrypoints?.previews?.[0];
    if (!preview) throw new Error('이 번들에는 HTML 미리보기가 없습니다.');
    const src = `/api/handoffs/${encodeURIComponent(bundle.id)}/files/${preview.split('/').map(encodeURIComponent).join('/')}`;
    els.detail.hidden = false;
    // No allow-same-origin: the bundle is untrusted, and the server also sends
    // `Content-Security-Policy: sandbox` on these responses.
    els.detail.innerHTML = `
      <header><h3>${esc(bundle.name)} · 원본 미리보기</h3><button type="button" data-action="close-detail">닫기</button></header>
      <iframe class="handoff-preview" src="${esc(src)}" sandbox="allow-scripts" title="${esc(bundle.name)} 원본 미리보기"></iframe>`;
    els.detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function upload(file) {
    if (busy) return;
    if (!/\.zip$/i.test(file.name)) throw new Error('project.zip 파일을 올려주세요.');
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

  els.list.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.closest('.handoff-card')?.dataset.id;
    const bundle = bundles.find((b) => b.id === id);
    if (!bundle) return;
    try {
      if (button.dataset.action === 'adopt') await adopt(bundle);
      if (button.dataset.action === 'detail') await showDetail(bundle);
      if (button.dataset.action === 'preview') showPreview(bundle);
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
      els.detail.hidden = true;
      els.detail.innerHTML = '';
    }
  });

  refresh();
})();
