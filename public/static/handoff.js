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
      <header><h3>${esc(h.name)}</h3><button type="button" class="btn btn--quiet" data-action="close-detail">닫기</button></header>
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
      <header><h3>${esc(bundle.name)} · 원본 미리보기</h3><button type="button" class="btn btn--quiet" data-action="close-detail">닫기</button></header>
      <iframe class="handoff-preview" src="${esc(src)}" sandbox="allow-scripts" title="${esc(bundle.name)} 원본 미리보기"></iframe>`;
    els.detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Directories that are never part of a handoff and would balloon the upload.
  const SKIP_DIR = /^(node_modules|\.git|\.next|dist|build|\.cache)$/i;
  const MAX_ENTRY_BYTES = 64 * 1024 * 1024;

  /** Walk a FileSystemDirectoryHandle into [{path, file}]. */
  async function walkDirectory(handle, prefix = '', out = []) {
    for await (const [name, child] of handle.entries()) {
      if (child.kind === 'directory') {
        if (SKIP_DIR.test(name)) continue;
        await walkDirectory(child, `${prefix}${name}/`, out);
      } else {
        const file = await child.getFile();
        if (file.size <= MAX_ENTRY_BYTES) out.push({ path: `${prefix}${name}`, file });
      }
    }
    return out;
  }

  /** Zip the picked files in the browser and hand the archive to the existing
   *  import endpoint, so folder and .zip imports share one server path and one
   *  set of validation rules. */
  async function zipEntries(entries, rootName) {
    if (!window.JSZip) throw new Error('ZIP 모듈을 불러오지 못했습니다.');
    const zip = new window.JSZip();
    entries.forEach(({ path, file }) => zip.file(path, file));
    say(`폴더 압축 중… 파일 ${entries.length}개`);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    return new File([blob], `${rootName || 'handoff'}.zip`, { type: 'application/zip' });
  }

  async function importFolder() {
    if (busy) return;
    if (!('showDirectoryPicker' in window)) {
      els.folderInput.click();
      return;
    }
    let handle;
    try {
      handle = await window.showDirectoryPicker({ id: 'plazion-handoff', mode: 'read' });
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      throw error;
    }
    say(`“${handle.name}” 폴더를 읽는 중…`);
    const entries = await walkDirectory(handle, `${handle.name}/`);
    if (!entries.length) throw new Error('폴더에서 파일을 찾지 못했습니다.');
    await upload(await zipEntries(entries, handle.name));
  }

  async function importFolderInput(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;
    const entries = files
      .map((file) => ({ path: file.webkitRelativePath || file.name, file }))
      .filter(({ path, file }) =>
        file.size <= MAX_ENTRY_BYTES && !path.split('/').some((part) => SKIP_DIR.test(part))
      );
    if (!entries.length) throw new Error('가져올 수 있는 파일이 없습니다.');
    const rootName = entries[0].path.split('/')[0] || 'handoff';
    await upload(await zipEntries(entries, rootName));
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
    const id = button.closest('.handoff-card')?.dataset.id;
    const bundle = bundles.find((b) => b.id === id);
    if (!bundle) return;
    try {
      if (button.dataset.action === 'adopt') adopt(bundle);
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
