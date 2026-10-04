import { boot } from './main.js';
import '../css/home.css';

boot();

/* « Cet automne » : le plat dont la photo traverse le milieu de l'écran s'allume dans la liste */
const items = [...document.querySelectorAll('[data-season-name]')];
const pics = document.querySelectorAll('[data-season-pic]');
if (items.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const k = e.target.dataset.seasonPic;
      items.forEach((li) => li.classList.toggle('is-on', li.dataset.seasonName === k));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  pics.forEach((p) => io.observe(p));
}
