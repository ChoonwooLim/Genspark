/* Library page — saved projects and presets.
 *
 * Editing happens in the studio, so "불러오기" hands the project id over the
 * query string rather than trying to host the workspace here too. */
(function () {
  const core = window.PlazionCore;
  const grid = document.getElementById('library-grid');
  const empty = document.getElementById('library-empty');
  const search = document.getElementById('library-search');
  const refresh = document.getElementById('refresh-library-btn');
  const presetRows = document.getElementById('preset-rows');
  if (!core || !grid) return;

  function projectRow(project) {
    const settings = project.settings || {};
    const el = document.createElement('article');
    el.className = 'library-row';
    el.dataset.id = project.id;
    el.innerHTML = `
      <img class="library-row__thumb" src="${core.escapeHtml(core.projectLogoUrl(project))}" alt="" />
      <div class="library-row__body">
        <h3 class="h-card">${core.escapeHtml(project.name)}</h3>
        <p class="caption">${settings.aspect === 'portrait' ? '9:16 · 1080×1920' : '16:9 · 1920×1080'} · 30fps · 글로우 ${Math.round(settings.glow ?? 100)}% · 에너지 ${Math.round(settings.energy ?? 100)}%</p>
        <p class="micro">${core.escapeHtml(core.formatDate(project.updatedAt || project.createdAt))}</p>
      </div>
      <div class="library-row__side">
        <span class="chip ${project.source === 'local' ? 'chip--neutral' : 'chip--live'}">${project.source === 'local' ? '브라우저' : 'Orbitron'}</span>
        <div class="cluster">
          <a class="btn btn--ghost btn--sm" href="/studio?project=${encodeURIComponent(project.id)}">불러오기</a>
          <a class="btn btn--quiet" href="/preview?project=${encodeURIComponent(project.id)}">미리보기</a>
          <button type="button" class="btn btn--quiet" data-action="logo">원본</button>
          <button type="button" class="btn btn--quiet" data-action="delete">삭제</button>
        </div>
      </div>`;
    return el;
  }

  function presetRow(preset) {
    const el = document.createElement('div');
    el.className = 'preset-row';
    el.dataset.id = preset.id;
    el.innerHTML = `
      <div>
        <h3 class="h-card">${core.escapeHtml(preset.name)}</h3>
        <p class="caption">글로우 ${Math.round(preset.glow ?? 100)}% · 에너지 ${Math.round(preset.energy ?? 100)}% · ${preset.aspect === 'portrait' ? '9:16' : '16:9'}</p>
      </div>
      <span class="cluster">
        <a class="btn btn--ghost btn--sm" href="/studio?preset=${encodeURIComponent(preset.id)}">작업실에 적용</a>
        <a class="btn btn--quiet" href="/preview?preset=${encodeURIComponent(preset.id)}">미리보기</a>
        ${preset.isDefault ? '<span class="chip chip--neutral">기본</span>' : '<button type="button" class="btn btn--quiet" data-action="delete-preset">삭제</button>'}
      </span>`;
    return el;
  }

  function render() {
    const query = (search.value || '').trim().toLowerCase();
    const visible = core.state.projects.filter((p) => String(p.name || '').toLowerCase().includes(query));
    empty.hidden = visible.length > 0;
    grid.replaceChildren(...visible.map(projectRow));
    presetRows.replaceChildren(...core.state.presets.map(presetRow));
  }

  async function downloadLogo(project) {
    const blob =
      project.logoBlob instanceof Blob
        ? project.logoBlob
        : await fetch(core.projectLogoUrl(project)).then((r) => r.blob());
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project.name || 'logo'}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  grid.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.closest('.library-row')?.dataset.id;
    const project = core.state.projects.find((p) => p.id === id);
    if (!project) return;

    if (button.dataset.action === 'logo') {
      await downloadLogo(project);
      return;
    }
    if (button.dataset.action === 'delete') {
      if (!window.confirm(`“${project.name}” 프로젝트를 삭제할까요?`)) return;
      await core.deleteProject(project.id);
      render();
    }
  });

  presetRows.addEventListener('click', async (event) => {
    if (!event.target.closest('[data-action="delete-preset"]')) return;
    const id = event.target.closest('.preset-row')?.dataset.id;
    const preset = core.state.presets.find((p) => p.id === id);
    if (!preset || preset.isDefault) return;
    if (!window.confirm(`“${preset.name}” 프리셋을 삭제할까요?`)) return;
    await core.deletePreset(preset.id);
    render();
  });

  search.addEventListener('input', render);
  refresh.addEventListener('click', () => core.loadProjects().then(core.loadPresets).then(render));

  core.subscribe(render);
  Promise.all([core.loadProjects(), core.loadPresets()]).then(render).catch(render);
})();
