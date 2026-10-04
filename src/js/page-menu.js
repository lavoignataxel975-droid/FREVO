import { boot } from './main.js';
import '../css/pages.css';

boot();

/* Catégories : onglets accessibles (flèches gauche/droite), une seule catégorie affichée à la fois */
const tabs = [...document.querySelectorAll('[data-tab]')];
const panels = [...document.querySelectorAll('[data-panel]')];
const pics = [...document.querySelectorAll('[data-pic]')];
const ink = document.querySelector('[data-ink]');
const bar = document.querySelector('[data-carte-bar]');

// décalage des plats pour l'apparition en cascade
panels.forEach((p) => p.querySelectorAll('.dish').forEach((d, k) => d.style.setProperty('--k', k)));

function moveInk(tab) {
  ink.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth})`;
}

function select(key, { focus = false, scroll = false, hash = true } = {}) {
  tabs.forEach((t) => {
    const on = t.dataset.tab === key;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on) {
      moveInk(t);
      if (focus) t.focus({ preventScroll: true });
      // onglet hors champ sur petit écran : on fait défiler la barre seule, jamais la page
      const box = t.parentElement;
      if (t.offsetLeft < box.scrollLeft || t.offsetLeft + t.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollTo({ left: t.offsetLeft - 16, behavior: 'smooth' });
    }
  });
  panels.forEach((p) => {
    const on = p.dataset.panel === key;
    p.hidden = !on;
    p.classList.toggle('is-on', on);
  });
  pics.forEach((p) => p.classList.toggle('is-on', p.dataset.pic === key));
  if (scroll) {
    // si la liste a défilé hors de vue, on revient au début de la carte
    const top = bar.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.6) bar.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  if (hash) history.replaceState(null, '', `#${key}`);
}

tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t.dataset.tab, { scroll: true }));
  t.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -i : e.key === 'End' ? tabs.length - 1 - i : 0;
    if (!d) return;
    e.preventDefault();
    select(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, { focus: true });
  });
});

const initial = tabs.find((t) => `#${t.dataset.tab}` === location.hash)?.dataset.tab ?? 'entrees';
select(initial, { hash: false });
new ResizeObserver(() => moveInk(tabs.find((t) => t.getAttribute('aria-selected') === 'true'))).observe(bar);
document.fonts?.ready.then(() => moveInk(tabs.find((t) => t.getAttribute('aria-selected') === 'true')));
