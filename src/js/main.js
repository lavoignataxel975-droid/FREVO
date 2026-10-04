/**
 * Socle commun à toutes les pages : polices, styles, header, navigation, révélations, réservation.
 */
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/archivo/wdth-italic.css';
import '../css/base.css';
import '../css/chrome.css';
import { initReserve } from './reserve.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Header : se retire en descendant, revient dès qu'on remonte ---------- */
function initHeader() {
  const hdr = document.querySelector('[data-header]');
  if (!hdr) return;
  // Le fond plein n'apparaît qu'une fois sorti de la photo d'ouverture
  const hero = document.querySelector('[data-hero], [data-page-hero]');
  let pastHero = !hero;
  if (hero) {
    new IntersectionObserver(([e]) => {
      pastHero = !e.isIntersecting;
      hdr.classList.toggle('is-solid', pastHero);
    }, { rootMargin: `-${hdr.offsetHeight}px 0px 0px 0px` }).observe(hero);
  } else hdr.classList.add('is-solid');

  // Un seul écouteur passif, regroupé par image (rAF) : il ne fait que basculer une classe.
  let lastY = scrollY, ticking = false;
  const update = () => {
    ticking = false;
    const y = scrollY;
    const dy = y - lastY;
    if (Math.abs(dy) < 6) return;
    const hide = dy > 0 && y > window.innerHeight * 0.6 && !document.documentElement.classList.contains('is-nav-open');
    hdr.classList.toggle('is-hidden', hide);
    document.body.classList.toggle('is-hdr-hidden', hide); // les barres accrochées (catégories du menu) remontent avec lui
    lastY = y;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  // le header revient aussi dès qu'un élément y prend le focus au clavier
  hdr.addEventListener('focusin', () => { hdr.classList.remove('is-hidden'); document.body.classList.remove('is-hdr-hidden'); });
}

/* ---------- Navigation plein écran ---------- */
function initNav() {
  const nav = document.querySelector('[data-nav]');
  const burger = document.querySelector('[data-burger]');
  if (!nav || !burger) return;
  const root = document.documentElement;
  const page = document.body.dataset.page;
  const main = document.querySelector('main');
  const footer = document.querySelector('.ftr');

  nav.querySelectorAll('[data-nav-link]').forEach((a) => {
    if (a.dataset.navLink === page) a.setAttribute('aria-current', 'page');
  });
  const pics = [...nav.querySelectorAll('[data-nav-pic]')];
  const show = (key) => pics.forEach((p) => p.classList.toggle('is-on', p.dataset.navPic === key));
  show(pics.some((p) => p.dataset.navPic === page) ? page : 'home');
  nav.querySelectorAll('[data-nav-link]').forEach((a) => {
    a.addEventListener('pointerenter', () => show(a.dataset.navLink));
    a.addEventListener('focus', () => show(a.dataset.navLink));
  });

  let closeTimer;
  const open = () => {
    clearTimeout(closeTimer);
    nav.hidden = false;
    nav.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
    requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.add('is-open')));
    root.classList.add('is-nav-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fermer la navigation');
    document.body.style.overflow = 'hidden';
    [main, footer].forEach((el) => el && (el.inert = true));
    nav.querySelector('a')?.focus({ preventScroll: true });
  };
  const close = ({ focus = true } = {}) => {
    nav.classList.remove('is-open');
    root.classList.remove('is-nav-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Ouvrir la navigation');
    document.body.style.overflow = '';
    [main, footer].forEach((el) => el && (el.inert = false));
    closeTimer = setTimeout(() => (nav.hidden = true), reduced.matches ? 0 : 900);
    if (focus) burger.focus({ preventScroll: true });
  };
  burger.addEventListener('click', () => (burger.getAttribute('aria-expanded') === 'true' ? close() : open()));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('is-nav-open')) close(); });
  // lien vers la page courante : on referme simplement
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[aria-current="page"]');
    if (a) { e.preventDefault(); close({ focus: false }); scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' }); }
  });
  // la réservation ouverte depuis la navigation la referme d'abord
  document.addEventListener('frevo:reserve', () => root.classList.contains('is-nav-open') && close({ focus: false }));
  // retour arrière (bfcache) : on repart d'un état propre
  addEventListener('pageshow', (e) => { if (e.persisted && root.classList.contains('is-nav-open')) close({ focus: false }); });
}

/* ---------- Révélations au défilement ---------- */
function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (reduced.matches || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  els.forEach((el) => io.observe(el));
}

/* ---------- Photos : fondu une fois chargées ---------- */
function initImages() {
  document.querySelectorAll('.ph img[loading="lazy"]').forEach((img) => {
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
  });
}

export function boot() {
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  initHeader();
  initNav();
  initImages();
  initReveal();
  initReserve();
}
