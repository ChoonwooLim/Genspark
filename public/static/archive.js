/* Archive page — PNG sequence bundles stored on the Orbitron volume.
 * Read-only: uploads happen on the preview page, where the frames are made. */
(function () {
  const core = window.PlazionCore;
  const list = document.getElementById('library-list');
  const empty = document.getElementById('archive-empty');
  const note = document.getElementById('library-note');
  const status = document.getElementById('archive-note');
  if (!list || !core) return;

  function row(seq) {
    const el = document.createElement('div');
    el.className = 'archive-row';
    el.innerHTML = `
      <span class="archive-row__name">${core.escapeHtml(seq.filename)}</span>
      <span class="archive-row__meta caption">${seq.width}×${seq.height} · ${seq.frameCount}프레임 · ${seq.fps}fps · ${core.formatBytes(seq.byteSize)}</span>
      <span class="archive-row__date micro">${core.escapeHtml(core.formatDate(seq.createdAt))}</span>`;

    const link = document.createElement('a');
    link.className = 'btn btn--ghost btn--sm';
    link.href = seq.downloadUrl;
    link.textContent = '다운로드';
    link.setAttribute('download', '');
    el.appendChild(link);
    return el;
  }

  async function load() {
    try {
      const info = await fetch('/api/sequences/status').then((r) => r.json());
      if (!info.enabled) {
        status.textContent = '서버 보관함이 아직 활성화되지 않았습니다.';
        status.dataset.type = 'error';
        return;
      }
      note.textContent = `최근 ${info.retention}개 보관 · 항목당 최대 ${core.formatBytes(info.maxBytes)}`;

      const body = await fetch('/api/sequences').then((r) => r.json());
      const sequences = body.sequences || [];
      empty.hidden = sequences.length > 0;
      list.replaceChildren(...sequences.map(row));
      status.textContent = sequences.length ? `${sequences.length}개 보관 중` : '';
    } catch (error) {
      status.textContent = '보관함을 불러오지 못했습니다.';
      status.dataset.type = 'error';
    }
  }

  load();
})();
