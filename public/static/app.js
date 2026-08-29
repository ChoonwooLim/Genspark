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

  let loops = 0;
  let soundEnabled = false;
  let userMuted = false;
  let isExporting = false;

  const intro = new window.PlazionIntro(canvas, {
    logoSrc: '/static/plazion_logo.png',
    aspect: 'landscape',
    onLoop: () => {
      loops += 1;
      loopCountEl.textContent = String(loops);
    },
  });

  function updateMuteUI() {
    const icon = muteToggle.querySelector('i');
    if (userMuted || !soundEnabled) {
      icon.className = 'fa-solid fa-volume-xmark';
      muteLabel.textContent = soundEnabled ? '사운드 꺼짐' : '사운드 대기';
      muteToggle.setAttribute('aria-pressed', 'false');
    } else {
      icon.className = 'fa-solid fa-volume-high';
      muteLabel.textContent = '사운드 켜짐';
      muteToggle.setAttribute('aria-pressed', 'true');
    }
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

  downloadSequenceBtn.addEventListener('click', async () => {
    if (isExporting) return;
    if (!window.JSZip) {
      exportStatus.hidden = false;
      exportStatus.classList.add('is-error');
      exportStatusText.textContent = 'ZIP 모듈을 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.';
      return;
    }

    isExporting = true;
    exportStatus.hidden = false;
    exportStatus.classList.remove('is-error', 'is-complete');
    downloadSequenceBtn.disabled = true;
    aspectBtns.forEach((btn) => { btn.disabled = true; });
    sequenceLabel.textContent = 'PNG 렌더링 중…';
    setExportProgress(0, 90, 'PNG 프레임 준비 중');

    try {
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
        const frameNumber = String(index).padStart(4, '0');
        folder.file(`plazion_${frameNumber}.png`, blob);
      });
      folder.file('sequence-info.txt', [
        'PLAZION VFX Intro — Transparent PNG Sequence',
        `Aspect: ${result.aspect}`,
        `Resolution: ${canvas.width}x${canvas.height}`,
        `Frame rate: ${result.fps} fps`,
        `Frames: ${result.frames.length}`,
        `Duration: ${result.duration.toFixed(1)} seconds`,
        'Alpha: transparent RGBA',
      ].join('\n'));

      setExportProgress(85, 100, 'ZIP 패키징 중');
      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'STORE' },
        (metadata) => {
          const progress = 85 + Math.round(metadata.percent * 0.15);
          setExportProgress(progress, 100, 'ZIP 패키징 중');
        }
      );
      const dimensions = `${canvas.width}x${canvas.height}`;
      downloadBlob(zipBlob, `plazion_transparent_${dimensions}_30fps.zip`);
      exportStatus.classList.add('is-complete');
      setExportProgress(100, 100, `완료 · PNG ${result.frames.length}장 다운로드`);
    } catch (error) {
      console.error(error);
      exportStatus.classList.add('is-error');
      exportStatusText.textContent = error instanceof Error ? error.message : 'PNG 시퀀스 생성에 실패했습니다.';
      exportProgressValue.textContent = '오류';
    } finally {
      isExporting = false;
      downloadSequenceBtn.disabled = false;
      aspectBtns.forEach((btn) => { btn.disabled = false; });
      sequenceLabel.textContent = '투명 PNG 시퀀스';
    }
  });

  updateMuteUI();
})();
