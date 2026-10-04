import { boot } from './main.js';
import '../css/pages.css';

boot();

/* Formulaire de contact : validation en direct, états erreur / envoi / succès. Démonstration locale. */
const form = document.querySelector('[data-contact-form]');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const rules = {
  prenom: (v) => (v.trim() ? '' : 'Indiquez votre prénom.'),
  nom: (v) => (v.trim() ? '' : 'Indiquez votre nom.'),
  telephone: (v) => (!v.trim() || v.replace(/\D/g, '').length >= 9 ? '' : 'Ce numéro semble incomplet.'),
  email: (v) => (!v.trim() ? 'Indiquez votre email pour que nous puissions répondre.' : EMAIL.test(v.trim()) ? '' : 'Cet email ne semble pas valide.'),
  message: (v) => (v.trim().length >= 10 ? '' : v.trim() ? 'Quelques mots de plus, s’il vous plaît.' : 'Écrivez votre message.'),
};
const touched = new Set();

// Arrivée depuis la page Events : message pré-rempli
const params = new URLSearchParams(location.search);
if (params.get('objet') === 'evenement') {
  form.elements.message.value = 'Bonjour, nous souhaitons organiser un événement chez FREVO.\n\nDate envisagée :\nNombre d’invités :\nType d’événement :\n';
}

function check(name, show = touched.has(name)) {
  const input = form.elements[name];
  const msg = rules[name](input.value);
  const field = input.closest('.field');
  field.classList.toggle('is-error', show && !!msg);
  field.classList.toggle('is-ok', show && !msg && !!input.value.trim());
  input.setAttribute('aria-invalid', String(show && !!msg));
  const err = form.querySelector(`[data-err-for="${name}"]`);
  input.setAttribute('aria-describedby', err.id);
  err.textContent = show ? msg : '';
  return !msg;
}

Object.keys(rules).forEach((name) => {
  const input = form.elements[name];
  input.addEventListener('blur', () => { if (input.value.trim()) touched.add(name); check(name); });
  input.addEventListener('input', () => { if (touched.has(name)) check(name); status.textContent = ''; });
});

const send = form.querySelector('[data-send]');
const status = form.querySelector('[data-status]');
const ok = form.querySelector('[data-ok]');
const fieldsEls = form.querySelectorAll('[data-contact-fields]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  Object.keys(rules).forEach((n) => touched.add(n));
  const results = Object.keys(rules).map((n) => check(n, true));
  if (!results.every(Boolean)) {
    const count = results.filter((r) => !r).length;
    status.textContent = count > 1 ? `${count} champs sont à compléter.` : 'Un champ est à compléter.';
    form.querySelector('.field.is-error input, .field.is-error textarea')?.focus();
    return;
  }
  status.textContent = '';
  const label = send.innerHTML;
  send.setAttribute('aria-busy', 'true');
  send.innerHTML = 'Envoi en cours <span class="spin" aria-hidden="true"></span>';
  await new Promise((r) => setTimeout(r, 1100));
  send.removeAttribute('aria-busy');
  send.innerHTML = label;
  fieldsEls.forEach((el) => (el.hidden = true));
  form.querySelector('[data-ok-text]').textContent = `Merci ${form.elements.prenom.value.trim()}, votre message est bien arrivé. Nous vous répondons sous vingt-quatre heures, à l’adresse ${form.elements.email.value.trim()}.`;
  ok.hidden = false;
  ok.focus({ preventScroll: true });
  ok.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

form.querySelector('[data-again]').addEventListener('click', () => {
  form.reset(); touched.clear();
  Object.keys(rules).forEach((n) => check(n, false));
  ok.hidden = true;
  fieldsEls.forEach((el) => (el.hidden = false));
  form.elements.prenom.focus();
});
