/* Home page — the loop runs as the hero image. No sound, no export controls:
 * the point here is to show what the tool makes, not to operate it. */
(function () {
  const canvas = document.getElementById('intro-canvas');
  const wrap = document.getElementById('canvas-wrap');
  const gate = document.getElementById('sound-gate');
  const gateBtn = document.getElementById('sound-gate-btn');
  const loopCount = document.getElementById('loop-count');
  const aspectBtns = document.querySelectorAll('.aspect-btn');
  if (!canvas || !window.PlazionIntro) return;

  let loops = 0;
  const intro = new window.PlazionIntro(canvas, {
    logoSrc: '/static/plazion_logo.png',
    aspect: 'landscape',
    onLoop: () => {
      loops += 1;
      loopCount.textContent = String(loops);
    },
  });

  // The gate exists to unlock audio; here it is just a play affordance that
  // gets out of the way, because the loop is already running underneath.
  const dismiss = () => gate.classList.add('hidden');
  gateBtn.addEventListener('click', (event) => {
    event.preventDefault();
    dismiss();
  });
  gate.addEventListener('click', (event) => {
    if (event.target === gate) dismiss();
  });

  aspectBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const aspect = btn.getAttribute('data-aspect');
      aspectBtns.forEach((other) => {
        other.classList.toggle('is-active', other === btn);
        other.setAttribute('aria-selected', other === btn ? 'true' : 'false');
      });
      wrap.classList.toggle('canvas-wrap--landscape', aspect === 'landscape');
      wrap.classList.toggle('canvas-wrap--portrait', aspect === 'portrait');
      loops = 0;
      loopCount.textContent = '0';
      intro.setAspect(aspect);
    });
  });
})();
