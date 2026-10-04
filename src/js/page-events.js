import { boot } from './main.js';
import '../css/pages.css';

boot();

/* Formats : un seul ouvert à la fois ; la photo de gauche suit le format ouvert ou survolé */
const items = [...document.querySelectorAll('[data-fmt]')];
const pics = [...document.querySelectorAll('[data-fpic]')];
const show = (k) => pics.forEach((p) => p.classList.toggle('is-on', p.dataset.fpic === k));

items.forEach((item) => {
  const head = item.querySelector('.fmt__head');
  head.addEventListener('click', () => {
    const open = !item.classList.contains('is-open');
    items.forEach((it) => {
      const on = it === item && open;
      it.classList.toggle('is-open', on);
      it.querySelector('.fmt__head').setAttribute('aria-expanded', String(on));
    });
    if (open) show(item.dataset.fmt);
  });
  item.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(item.dataset.fmt); });
});
document.querySelector('[data-formats]')?.addEventListener('pointerleave', () => {
  const open = items.find((it) => it.classList.contains('is-open'));
  show(open ? open.dataset.fmt : '0');
});
