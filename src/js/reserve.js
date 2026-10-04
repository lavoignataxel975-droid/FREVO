/**
 * Réservation en cinq temps : date, convives, heure, coordonnées, confirmation.
 * Démonstration locale : les disponibilités sont simulées (déterministes selon la date), rien n'est envoyé.
 * S'ouvre depuis tout élément [data-reserve], ou directement avec l'ancre #reserver.
 */
const OPEN_DAYS = [2, 3, 4, 5, 6];      // mardi → samedi
const DINNER = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
const LUNCH = ['12:30', '13:00', '13:30']; // samedi uniquement
const BOOKING_WINDOW = 42;              // jours
const MAX_GUESTS = 8;

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const fmtDay = (s) => fromIso(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtTime = (t) => t.replace(':', ' h ').replace(' h 00', ' h');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function initReserve() {
  const dlg = document.querySelector('[data-rsv]');
  if (!dlg) return;
  const $ = (s) => dlg.querySelector(s);
  const form = $('[data-rsv-form]');
  const steps = [...dlg.querySelectorAll('[data-rsv-step]')];
  const tabs = [...dlg.querySelectorAll('[data-rsv-tab]')];
  const next = $('[data-rsv-next]');
  const back = $('[data-rsv-back]');
  const summary = $('[data-rsv-summary]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last = new Date(today); last.setDate(today.getDate() + BOOKING_WINDOW);
  const state = { step: 0, date: null, guests: null, time: null, sending: false, month: new Date(today.getFullYear(), today.getMonth(), 1) };

  const isOpenDay = (d) => d >= today && d <= last && OPEN_DAYS.includes(d.getDay()) && hash(iso(d)) % 9 !== 0; // ~1 soir sur 9 complet
  const slotsFor = (dateIso) => {
    const d = fromIso(dateIso);
    const list = [...(d.getDay() === 6 ? LUNCH : []), ...DINNER];
    const now = new Date();
    return list.map((t) => {
      const [h, m] = t.split(':').map(Number);
      const past = iso(now) === dateIso && (h * 60 + m) < now.getHours() * 60 + now.getMinutes() + 60;
      const full = hash(dateIso + t + (state.guests ?? 2)) % 4 === 0;
      return { t, lunch: h < 15, available: !past && !full };
    });
  };

  /* ---------- Calendrier ---------- */
  const grid = $('[data-cal-grid]');
  function renderCal() {
    const m = state.month;
    $('[data-cal-month]').textContent = m.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    $('[data-cal-prev]').disabled = m <= new Date(today.getFullYear(), today.getMonth(), 1);
    $('[data-cal-next]').disabled = new Date(m.getFullYear(), m.getMonth() + 1, 1) > last;
    const offset = (m.getDay() + 6) % 7;
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    let html = '<span></span>'.repeat(offset);
    for (let n = 1; n <= days; n++) {
      const d = new Date(m.getFullYear(), m.getMonth(), n);
      const key = iso(d);
      const ok = isOpenDay(d);
      const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + (ok ? '' : ', indisponible');
      html += `<button type="button" class="cal__day${key === iso(today) ? ' is-today' : ''}" data-day="${key}" aria-label="${label}" aria-pressed="${state.date === key}" ${ok ? '' : 'disabled'}>${n}</button>`;
    }
    grid.innerHTML = html;
  }
  $('[data-cal-prev]').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); renderCal(); });
  $('[data-cal-next]').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); renderCal(); });
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]');
    if (!b) return;
    if (state.date !== b.dataset.day) state.time = null;
    state.date = b.dataset.day;
    renderCal();
    sync();
    advanceSoon();
  });

  /* ---------- Convives ---------- */
  const guests = $('[data-guests]');
  function renderGuests() {
    guests.innerHTML = Array.from({ length: MAX_GUESTS }, (_, i) => i + 1)
      .map((n) => `<button type="button" role="radio" aria-checked="${state.guests === n}" aria-label="${n} convive${n > 1 ? 's' : ''}" data-guest="${n}">${n}</button>`).join('');
  }
  guests.addEventListener('click', (e) => {
    const b = e.target.closest('[data-guest]');
    if (!b) return;
    const n = Number(b.dataset.guest);
    if (state.guests !== n) state.time = null;
    state.guests = n;
    renderGuests();
    sync();
    advanceSoon();
  });

  /* ---------- Heures ---------- */
  const times = $('[data-times]');
  function renderTimes() {
    if (!state.date) { times.innerHTML = ''; return; }
    const slots = slotsFor(state.date);
    const group = (lunch) => slots.filter((s) => s.lunch === lunch)
      .map((s) => `<button type="button" role="radio" aria-checked="${state.time === s.t}" data-time="${s.t}" ${s.available ? '' : 'disabled aria-disabled="true"'} aria-label="${fmtTime(s.t)}${s.available ? '' : ', complet'}">${fmtTime(s.t)}</button>`).join('');
    const hasLunch = slots.some((s) => s.lunch);
    times.innerHTML = (hasLunch ? `<p class="pick__group label">Déjeuner</p>${group(true)}<p class="pick__group label">Dîner</p>` : '') + group(false);
  }
  times.addEventListener('click', (e) => {
    const b = e.target.closest('[data-time]');
    if (!b || b.disabled) return;
    state.time = b.dataset.time;
    renderTimes();
    sync();
    advanceSoon();
  });

  // Après un choix, on passe à l'étape suivante (le temps de voir la sélection)
  let advanceTimer;
  const advanceSoon = () => { clearTimeout(advanceTimer); advanceTimer = setTimeout(() => valid(state.step) && go(state.step + 1), reduced.matches ? 0 : 420); };

  /* ---------- Coordonnées ---------- */
  const fields = {
    first: (v) => (v.trim() ? '' : 'Indiquez votre prénom.'),
    last: (v) => (v.trim() ? '' : 'Indiquez votre nom.'),
    email: (v) => (!v.trim() ? 'Indiquez votre email.' : EMAIL.test(v.trim()) ? '' : 'Cet email ne semble pas valide.'),
    tel: (v) => (!v.trim() ? 'Indiquez un numéro pour vous joindre.' : v.replace(/\D/g, '').length >= 9 ? '' : 'Ce numéro semble incomplet.'),
  };
  const touched = new Set();
  function checkField(name, show = touched.has(name)) {
    const input = form.elements[name];
    const msg = fields[name](input.value);
    const wrap = input.closest('.field');
    wrap.classList.toggle('is-error', show && !!msg);
    wrap.classList.toggle('is-ok', show && !msg);
    input.setAttribute('aria-invalid', String(show && !!msg));
    const err = form.querySelector(`[data-err-for="${name}"]`);
    err.textContent = show ? msg : '';
    err.id ||= `rsv-err-${name}`;
    input.setAttribute('aria-describedby', err.id);
    return !msg;
  }
  Object.keys(fields).forEach((name) => {
    const input = form.elements[name];
    input.addEventListener('blur', () => { if (input.value) touched.add(name); checkField(name); });
    input.addEventListener('input', () => { if (touched.has(name)) checkField(name); sync(); });
  });

  /* ---------- Navigation entre étapes ---------- */
  const valid = (i) => [!!state.date, !!state.guests, !!state.time, Object.keys(fields).every((n) => !fields[n](form.elements[n].value)), true][i];

  function sync() {
    tabs.forEach((t, i) => {
      t.classList.toggle('is-on', i === state.step);
      t.classList.toggle('is-done', i < state.step);
      t.style.cursor = i < state.step && state.step < 4 ? 'pointer' : '';
    });
    const parts = [state.date && fmtDay(state.date), state.guests && `${state.guests} convive${state.guests > 1 ? 's' : ''}`, state.time && fmtTime(state.time)].filter(Boolean);
    summary.textContent = state.step < 4 ? parts.join(', ') : '';
    back.hidden = state.step === 0 || state.step === 4;
    next.textContent = state.step === 3 ? 'Confirmer' : state.step === 4 ? 'Fermer' : 'Continuer';
    next.disabled = state.sending || (state.step < 3 && !valid(state.step));
    next.closest('.rsv__foot').style.justifyContent = back.hidden ? 'flex-end' : '';
  }

  function go(i, { focus = true } = {}) {
    clearTimeout(advanceTimer);
    state.step = i;
    if (i === 2) renderTimes();
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    sync();
    $('.rsv__panel').scrollTop = 0;
    if (focus) steps[i].querySelector('.rsv__h').focus({ preventScroll: true });
  }

  async function confirm() {
    Object.keys(fields).forEach((n) => touched.add(n));
    const ok = Object.keys(fields).map((n) => checkField(n, true)).every(Boolean);
    if (!ok) { form.querySelector('.field.is-error input')?.focus(); return; }
    state.sending = true;
    next.innerHTML = 'Envoi…';
    sync(); next.innerHTML = 'Envoi…';
    await new Promise((r) => setTimeout(r, reduced.matches ? 200 : 900));
    state.sending = false;
    const ref = `FRV-${(hash(state.date + state.time + form.elements.email.value) % 90000 + 10000)}`;
    $('[data-rsv-recap]').innerHTML = [
      ['Date', fmtDay(state.date)], ['Heure', fmtTime(state.time)],
      ['Convives', String(state.guests)], ['Au nom de', `${form.elements.first.value.trim()} ${form.elements.last.value.trim()}`, true],
      ['Référence', ref, true],
    ].map(([k, v, plain]) => `<div><dt>${k}</dt><dd${plain ? ' class="is-plain"' : ''}>${v.replace(/[<>&]/g, '')}</dd></div>`).join('');
    go(4);
  }

  next.addEventListener('click', () => {
    if (state.step === 4) return close();
    if (state.step === 3) return confirm();
    if (valid(state.step)) go(state.step + 1);
  });
  back.addEventListener('click', () => go(Math.max(0, state.step - 1)));
  tabs.forEach((t, i) => t.addEventListener('click', () => { if (i < state.step && state.step < 4) go(i); }));
  form.addEventListener('submit', (e) => { e.preventDefault(); next.click(); });

  /* ---------- Ouverture / fermeture ---------- */
  let opener = null;
  const outside = () => [...document.body.children].filter((el) => el !== dlg && el.tagName !== 'SCRIPT');
  function open(trigger) {
    if (!dlg.hidden) return;
    opener = trigger || document.activeElement;
    document.dispatchEvent(new CustomEvent('frevo:reserve'));
    dlg.hidden = false;
    dlg.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
    outside().forEach((el) => (el.inert = true));
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-open')));
    renderCal(); renderGuests();
    go(state.step === 4 ? 0 : state.step);
  }
  function close() {
    dlg.classList.remove('is-open');
    outside().forEach((el) => (el.inert = false));
    document.body.style.overflow = '';
    setTimeout(() => {
      dlg.hidden = true;
      if (state.step === 4) reset();
    }, reduced.matches ? 0 : 500);
    if (location.hash === '#reserver') history.replaceState(null, '', location.pathname + location.search);
    opener?.focus?.({ preventScroll: true });
  }
  function reset() {
    Object.assign(state, { step: 0, date: null, guests: null, time: null });
    form.reset(); touched.clear();
    Object.keys(fields).forEach((n) => checkField(n, false));
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-reserve], a[href$="#reserver"]');
    if (!t) return;
    e.preventDefault();
    open(t);
  });
  $('[data-rsv-close]').addEventListener('click', close);
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key !== 'Tab') return;
    const focusables = [...dlg.querySelectorAll('button:not([disabled]), a[href], input, textarea, [tabindex="0"]')].filter((el) => el.offsetParent !== null);
    const first = focusables[0], lastEl = focusables.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
  if (location.hash === '#reserver') open();
}
