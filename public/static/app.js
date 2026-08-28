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

  let loops = 0;
  let soundEnabled = false;
  let userMuted = false;

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

  updateMuteUI();
})();
