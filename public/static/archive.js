/* Archive page — everything stored on the Orbitron volume.
 *
 * Two sources end up here and both are the same thing to whoever is looking:
 * PNG sequences uploaded from the browser, and MP4/PNG renders produced on the
 * server. They are listed together, newest first, with a running total so the
 * disk this shares with every other project stays visible. */
(function () {
  const core = window.PlazionCore;
  const list = document.getElementById('library-list');
  const empty = document.getElementById('archive-empty');
  const note = document.getElementById('library-note');
  const status = document.getElementById('archive-note');
  if (!list || !core) return;

  let items = [];

  const KIND_LABEL = {
    sequence: 'PNG 시퀀스 · 업로드',
    'render-mp4': 'MP4 · 서버 렌더',
    'render-png': 'PNG 시퀀스 · 서버 렌더',
  };

  async function studioDelete(url) {
    const send = () => {
      const token = sessionStorage.getItem('plazionStudioToken') || '';
      return fetch(url, {
        method: 'DELETE',
        headers: token ? { 'X-Studio-Token': token } : {},
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
      throw new Error(body.error || `삭제 실패 (${response.status})`);
    }
  }

  function row(item) {
    const el = document.createElement('article');
    el.className = 'archive-row';
    el.dataset.id = item.id;
    el.dataset.endpoint = item.endpoint;

    const spec = [
      `${item.width}×${item.height}`,
      item.frameCount ? `${item.frameCount}프레임` : null,
      item.fps ? `${item.fps}fps` : null,
      core.formatBytes(item.byteSize),
    ]
      .filter(Boolean)
      .join(' · ');

    el.innerHTML = `
      <span class="archive-row__name">${core.escapeHtml(item.name)}</span>
      <span class="archive-row__meta caption">
        <span class="chip chip--neutral">${core.escapeHtml(KIND_LABEL[item.kind] || item.kind)}</span>
        ${core.escapeHtml(spec)}
      </span>
      <span class="archive-row__date micro">${core.escapeHtml(core.formatDate(item.createdAt))}</span>`;

    const actions = document.createElement('span');
    actions.className = 'cluster';

    if (item.downloadUrl) {
      const link = document.createElement('a');
      link.className = 'btn btn--ghost btn--sm';
      link.href = item.downloadUrl;
      link.textContent = '다운로드';
      link.setAttribute('download', '');
      actions.appendChild(link);
    } else {
      const pending = document.createElement('span');
      pending.className = 'micro';
      pending.textContent = item.status === 'failed' ? '실패' : '렌더 중…';
      actions.appendChild(pending);
    }

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn--quiet';
    remove.dataset.action = 'delete';
    remove.textContent = '삭제';
    actions.appendChild(remove);

    el.appendChild(actions);
    return el;
  }

  function render() {
    empty.hidden = items.length > 0;
    list.replaceChildren(...items.map(row));
    const total = items.reduce((sum, item) => sum + (item.byteSize || 0), 0);
    status.textContent = items.length
      ? `${items.length}개 · 합계 ${core.formatBytes(total)}`
      : '';
  }

  async function load() {
    const collected = [];

    try {
      const info = await fetch('/api/sequences/status').then((r) => r.json());
      if (info.enabled) {
        note.textContent = `최근 ${info.retention}개 보관 · 항목당 최대 ${core.formatBytes(info.maxBytes)}`;
        const body = await fetch('/api/sequences').then((r) => r.json());
        for (const seq of body.sequences || []) {
          collected.push({
            id: seq.id,
            endpoint: '/api/sequences',
            kind: 'sequence',
            name: seq.filename,
            width: seq.width,
            height: seq.height,
            fps: seq.fps,
            frameCount: seq.frameCount,
            byteSize: seq.byteSize,
            createdAt: seq.createdAt,
            downloadUrl: seq.downloadUrl,
          });
        }
      }
    } catch {
      /* sequences unavailable — renders may still be there */
    }

    try {
      const body = await fetch('/api/renders').then((r) => r.json());
      for (const r of body.renders || []) {
        collected.push({
          id: r.id,
          endpoint: '/api/renders',
          kind: `render-${r.format}`,
          name: `${r.label}.${r.format === 'mp4' ? 'mp4' : 'zip'}`,
          width: r.width,
          height: r.height,
          fps: r.fps,
          frameCount: r.frameCount,
          byteSize: r.byteSize,
          createdAt: r.createdAt,
          status: r.status,
          downloadUrl: r.status === 'done' ? r.downloadUrl : null,
        });
      }
    } catch {
      /* render service unavailable */
    }

    if (!collected.length && !note.textContent) {
      status.textContent = '서버 보관함이 아직 활성화되지 않았습니다.';
      status.dataset.type = 'error';
    }

    collected.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    items = collected;
    render();
  }

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action="delete"]');
    if (!button) return;
    const el = button.closest('.archive-row');
    const item = items.find((i) => i.id === el?.dataset.id);
    if (!item) return;
    if (!window.confirm(`“${item.name}” 을 삭제할까요? 되돌릴 수 없습니다.`)) return;

    button.disabled = true;
    try {
      await studioDelete(`${item.endpoint}/${encodeURIComponent(item.id)}`);
      items = items.filter((i) => i.id !== item.id);
      render();
    } catch (error) {
      button.disabled = false;
      status.textContent = error.message;
      status.dataset.type = 'error';
    }
  });

  load();
})();
