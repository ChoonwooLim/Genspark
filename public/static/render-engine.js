/* Bare render surface for the built-in engine.
 *
 * Served at /render/engine and only ever loaded by the headless renderer. The
 * engine is canvas + requestAnimationFrame, so the Web Animations seeking the
 * renderer uses for imported prototypes cannot reach it. Instead it exposes a
 * seek hook the renderer calls per frame — the engine already draws any
 * timestamp deterministically, which is how the in-browser PNG export works. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const canvas = document.getElementById('render-canvas');
  const aspect = params.get('aspect') === 'portrait' ? 'portrait' : 'landscape';
  const transparent = params.get('transparent') === '1';
  const projectId = params.get('project');

  const logoSrc = projectId
    ? `/api/logos/${encodeURIComponent(projectId)}/image`
    : params.get('logo') || '/static/plazion_logo.png';

  if (transparent) document.body.style.background = 'transparent';

  const intro = new window.PlazionIntro(canvas, { logoSrc, aspect });

  intro.setVisualSettings({
    glow: (Number(params.get('glow')) || 100) / 100,
    energy: (Number(params.get('energy')) || 100) / 100,
  });

  intro.ready
    .then(() => {
      // Stop the live loop: every frame must come from an explicit seek, or the
      // clock would move underneath the capture the way it did for prototypes.
      intro.stop?.();
      if (intro.rafId) {
        cancelAnimationFrame(intro.rafId);
        intro.rafId = null;
      }
      window.__plazionSeek = (seconds) => {
        intro._draw(Number(seconds) || 0, { transparent });
      };
      window.__plazionSeek(0);
      window.__plazionReady = true;
    })
    .catch((error) => {
      window.__plazionError = String(error);
    });
})();
