/**
 * Prévisualisation responsive : iPhone 16 + tablette, même échelle pour les deux
 * (les tailles relatives restent réalistes), recalculée à chaque redimensionnement.
 */
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/archivo/wdth-italic.css';
import '../css/base.css';
import '../css/preview.css';

const stage = document.querySelector('[data-stage]');
const frames = [...document.querySelectorAll('[data-frame]')];
const views = Object.fromEntries([...document.querySelectorAll('[data-view]')].map((v) => [v.dataset.view, v]));
const pageBtns = [...document.querySelectorAll('[data-goto]')];
const rotate = document.querySelector('[data-rotate]');
const tablet = document.querySelector('[data-tablet]');
const tabletFrame = document.querySelector('[data-frame="tablet"]');

const dims = (f) => ({ w: +getComputedStyle(f).getPropertyValue('--w'), h: +getComputedStyle(f).getPropertyValue('--h') });

function fit() {
  const cs = getComputedStyle(stage);
  const W = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const H = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 44; // légende sous l'appareil
  const gap = parseFloat(cs.columnGap) || 48;
  const d = frames.map(dims);
  const stacked = innerWidth <= 900;
  const s = stacked
    ? Math.min(1, (W) / Math.max(...d.map((x) => x.w)))
    : Math.min(1, H / Math.max(...d.map((x) => x.h)), (W - gap) / d.reduce((a, x) => a + x.w, 0));
  frames.forEach((f) => f.style.setProperty('--s', s.toFixed(4)));
}
new ResizeObserver(fit).observe(stage);
fit();

/* Pages : ouvre la même page dans les deux appareils */
function go(path) {
  Object.values(views).forEach((v) => { v.src = path; });
  pageBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.goto === path)));
}
pageBtns.forEach((b) => b.addEventListener('click', () => go(b.dataset.goto)));
document.querySelector('[data-reload-all]').addEventListener('click', () => Object.values(views).forEach((v) => v.contentWindow?.location.reload()));

/* Chemin affiché sous chaque appareil (même origine : on peut lire l'URL du cadre) */
Object.entries(views).forEach(([key, v]) => {
  const label = document.querySelector(`[data-path="${key}"]`);
  const sync = () => {
    try {
      const loc = v.contentWindow.location;
      label.textContent = loc.pathname + loc.hash;
      v.contentWindow.addEventListener('hashchange', sync);
    } catch { label.textContent = ''; }
  };
  v.addEventListener('load', sync);
});

/* Tablette : portrait ou paysage */
rotate.addEventListener('click', () => {
  const land = !tablet.classList.contains('is-landscape');
  tablet.classList.toggle('is-landscape', land);
  tabletFrame.classList.toggle('is-landscape', land);
  rotate.setAttribute('aria-pressed', String(land));
  rotate.querySelector('span').textContent = land ? 'Tablette portrait' : 'Tablette paysage';
  document.querySelector('[data-tablet-size]').textContent = land ? '1180 × 820' : '820 × 1180';
  fit();
});

/* Heure de la barre d'état */
const clock = () => {
  const t = new Date().toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit' });
  document.querySelectorAll('[data-clock], [data-clock-long]').forEach((el) => (el.textContent = t));
};
clock();
setInterval(clock, 30000);
