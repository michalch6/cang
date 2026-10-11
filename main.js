/* CAN · cang.pl — ciemna, wyraźna wersja
   GSAP + ScrollTrigger + Lenis (CDN jsDelivr). Efekty przeniesione z react-bits na zwykły JS:
   ScrollExpand (rosnące zdjęcie), ScrollStack (stos kart), ScrollVelocity (pasek),
   CountUp (ceny), Counter (licznik bębnowy), SlideCommit (przesuń, aby wysłać), ScrubField.
   Przy „ogranicz ruch” albo bez skryptów z CDN strona działa normalnie, bez animacji. */
(() => {
  const html = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = !reduce && !!(window.gsap && window.ScrollTrigger);
  const introPending = html.classList.contains('intro');
  clearTimeout(window.__introT);
  const $ = (id) => document.getElementById(id);
  const PHONE = '48504409208';
  const zl = (n) => Math.round(n).toLocaleString('pl-PL') + ' zł';

  /* ---------- Lenis + GSAP ---------- */
  let lenis = null;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ anchors: true, stopInertiaOnNavigate: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  } else {
    html.classList.remove('intro');
    html.classList.add('no-ex');
  }

  /* ---------- Nagłówek chowa się przy przewijaniu w dół ---------- */
  const top = $('top');
  let lastY = window.scrollY, ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y > lastY + 6 && y > 420) top.classList.add('hide');
      else if (y < lastY - 6 || y < 120) top.classList.remove('hide');
      lastY = y;
      ticking = false;
    });
  }, { passive: true });
  top.addEventListener('focusin', () => top.classList.remove('hide'));

  /* ---------- Wejście: zdjęcie się odsłania, taśma wjeżdża, napis się wysuwa ---------- */
  const hero = document.querySelector('.hero');
  if (motion && introPending && hero) {
    const desk = window.matchMedia('(min-width: 1000px)').matches;
    const lines = hero.querySelectorAll('.h1 .ln > span');
    const fades = hero.querySelectorAll('[data-i]');
    const media = hero.querySelector('.hero-media');
    const img = media.querySelector('img');
    const tape = hero.querySelector('.tape');
    gsap.set('.top', { opacity: 0 });
    gsap.set(media, { clipPath: desk ? 'inset(0 0 0 100%)' : 'inset(0 0 100% 0)' });
    gsap.set(img, { opacity: 1, scale: 1.25 });
    gsap.set(lines, { opacity: 1, clipPath: 'inset(0 100% 0 0)' });
    gsap.set(fades, { opacity: 0, y: 20 });
    gsap.set(tape, { opacity: 1, xPercent: -110 });
    html.classList.remove('intro');
    gsap.timeline()
      .to('.top', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
      .to(media, { clipPath: 'inset(0 0 0% 0%)', duration: 1.1, ease: 'power4.inOut', clearProps: 'clipPath' }, 0)
      .to(img, { scale: 1, duration: 2, ease: 'power2.out' }, 0)
      .to(fades[0], { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.25)
      .to(lines, { clipPath: 'inset(0 0% 0 0)', duration: 0.75, stagger: 0.09, ease: 'power4.inOut', clearProps: 'clipPath' }, 0.3)
      .to(Array.prototype.slice.call(fades, 1), { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.7)
      .to(tape, { xPercent: 0, duration: 1, ease: 'power3.out' }, 0.85);
  }

  /* ---------- Liczniki cen (port CountUp) ---------- */
  if (motion) {
    document.querySelectorAll('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count);
      const o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.2, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } })
      });
    });
  }

  /* ---------- Pasek reagujący na prędkość przewijania (port ScrollVelocity) ---------- */
  const rows = Array.from(document.querySelectorAll('.ticker .row'));
  if (motion && rows.length) {
    rows.forEach((r) => { const s = r.firstElementChild; for (let i = 0; i < 3; i++) r.appendChild(s.cloneNode(true)); });
    const st = rows.map((r) => ({ r, x: 0, dir: Number(r.dataset.vel) || 1, df: 1, w: r.firstElementChild.offsetWidth }));
    window.addEventListener('resize', () => st.forEach((s) => { s.w = s.r.firstElementChild.offsetWidth; }));
    let vel = 0, target = 0, last = 0, on = true;
    ScrollTrigger.create({ onUpdate: (self) => { target = self.getVelocity(); last = performance.now(); } });
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(rows[0].parentElement);
    const wrap = (min, max, v) => { const rg = max - min; return ((((v - min) % rg) + rg) % rg) + min; };
    gsap.ticker.add((t, dt) => {
      if (performance.now() - last > 120) target = 0;
      vel += (target - vel) * 0.1;
      if (!on) return;
      const vf = Math.max(-5, Math.min(5, (vel / 1000) * 2.5));
      st.forEach((s) => {
        if (vf < 0) s.df = -1; else if (vf > 0) s.df = 1;
        let mv = s.df * s.dir * 55 * (dt / 1000);
        mv += s.df * mv * vf;
        s.x = wrap(-s.w, 0, s.x - mv);
        s.r.style.transform = 'translate3d(' + s.x + 'px,0,0)';
      });
    });
  }

  /* ---------- Wejścia elementów: odsłonięcie od dołu ---------- */
  if (motion) {
    const els = gsap.utils.toArray('[data-w]');
    gsap.set(els, { clipPath: 'inset(0 0 100% 0)', y: 22 });
    ScrollTrigger.batch(els, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => {
        const h = window.innerHeight;
        const seen = batch.filter((el) => el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < h * 1.1);
        gsap.set(batch.filter((el) => !seen.includes(el)), { clearProps: 'clipPath,transform' });
        gsap.to(seen, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'clipPath,transform' });
      }
    });
  }

  /* ---------- Zdjęcie rośnie do pełnego ekranu (port ScrollExpand) ---------- */
  const ex = document.querySelector('.expand');
  if (ex && motion) {
    const frame = $('exFrame'), img = frame.querySelector('img'), txt = $('exTxt');
    const small = window.innerWidth < 700;
    const ix = small ? 7 : 20, iy = small ? 14 : 16;
    gsap.set(frame, { clipPath: 'inset(' + iy + '% ' + ix + '% ' + iy + '% ' + ix + '%)' });
    gsap.set(img, { scale: 1.25 });
    gsap.set(txt, { opacity: 0, y: 40 });
    gsap.timeline({ scrollTrigger: { trigger: ex, start: 'top top', end: 'bottom bottom', scrub: true } })
      .to(frame, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 }, 0)
      .to(img, { scale: 1, ease: 'none', duration: 1 }, 0)
      .to(txt, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.35 }, 0.55);
  }

  /* ---------- Stos kart sprzętu (port ScrollStack) + paralaksa w hero ---------- */
  if (motion) {
    const cards = gsap.utils.toArray('.sc');
    cards.forEach((c, i) => {
      if (i === cards.length - 1) return;
      gsap.to(c, { scale: 0.93, '--dim': 0.45, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 25%', scrub: true } });
    });
    gsap.to('.hero-media img', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    document.querySelectorAll('.nav .nl').forEach((a) => {
      const sec = document.querySelector(a.getAttribute('href'));
      if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', toggleClass: { targets: a, className: 'on' } });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- Pasek na dole (telefon) ---------- */
  const bar = document.querySelector('.bar');
  const heroCtas = document.querySelector('.hero .ctas');
  if (bar && heroCtas) {
    let past = false;
    const inView = new Set();
    const upd = () => bar.classList.toggle('on', past && inView.size === 0);
    new IntersectionObserver(([e]) => { past = !e.isIntersecting && e.boundingClientRect.top < 0; upd(); }).observe(heroCtas);
    const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? inView.add(e.target) : inView.delete(e.target))); upd(); }, { rootMargin: '0px 0px -25% 0px' });
    ['.sum', '#kontakt'].forEach((s) => { const el = document.querySelector(s); if (el) io.observe(el); });
  }

  /* ---------- Zlecenie ---------- */
  const form = $('cfg');
  if (!form) return;
  const ITEMS = {
    ziemia: { n: 'Ziemia przesiana (czarnoziem)', s: 'Ziemia przesiana', p: 80, kind: 'mat', inp: 't-ziemia' },
    m031: { n: 'Mieszanka 0/31 (granit)', s: 'Mieszanka 0/31', p: 45, kind: 'mat', inp: 't-m031' },
    k1631: { n: 'Kamień drenażowy 16/31 (granit)', s: 'Kamień 16/31', p: 60, kind: 'mat', inp: 't-k1631' },
    koparka: { n: 'Koparko-ładowarka', s: 'Koparko-ładowarka', p: 200, kind: 'mach', inp: 'h-koparka' },
    mini: { n: 'Minikoparka', s: 'Minikoparka', p: 120, kind: 'mach', inp: 'h-mini' },
    ekipa: { n: 'Ekipa budowlana', s: 'Ekipa budowlana', p: 70, kind: 'crew', inp: 'h-ekipa' }
  };
  const val = (name) => { const el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; };
  const vals = (name) => Array.from(form.querySelectorAll('input[name="' + name + '"]:checked')).map((i) => i.value);
  const num = (id) => { const el = $(id); let n = parseInt(el.value, 10); if (!(n > 0)) n = 1; return Math.min(n, Number(el.max) || 999); };
  const counters = document.querySelectorAll('[data-count-items]');
  const slide = $('slide');

  // licznik bębnowy (port Counter)
  const odoEl = $('odo');
  let odoStr = '', odoVer = 0;
  const odo = (n) => {
    const s = Math.round(n).toLocaleString('pl-PL').replace(/\s/g, ' ');
    const ver = ++odoVer;
    const fresh = s.length !== odoStr.length;
    if (fresh) {
      odoEl.textContent = '';
      for (const ch of s) {
        if (/\d/.test(ch)) {
          const d = document.createElement('span'); d.className = 'odo-d';
          const col = document.createElement('span'); col.className = 'odo-col';
          for (let i = 0; i < 10; i++) { const x = document.createElement('span'); x.textContent = i; col.appendChild(x); }
          d.appendChild(col); odoEl.appendChild(d);
        } else { const sp = document.createElement('span'); sp.className = 'odo-s'; odoEl.appendChild(sp); }
      }
    }
    const apply = () => {
      if (ver !== odoVer) return; // nowsza cena już ustawiona
      let k = 0;
      Array.from(odoEl.children).forEach((c) => {
        const ch = s[k++];
        if (c.classList.contains('odo-d')) c.firstChild.style.transform = 'translateY(' + -Number(ch) + 'em)';
      });
    };
    fresh ? requestAnimationFrame(() => requestAnimationFrame(apply)) : apply();
    odoStr = s;
    $('odoSr').textContent = s + ' zł';
  };

  let message = '';
  let count = 0;
  const compute = () => {
    const sel = vals('it');
    form.querySelectorAll('.it').forEach((it) => {
      const on = sel.includes(it.dataset.k);
      it.classList.toggle('on', on);
      it.querySelector('.it-opts').hidden = !on;
    });
    const hasMat = sel.some((k) => ITEMS[k].kind === 'mat');
    const hasWork = sel.some((k) => ITEMS[k].kind !== 'mat');
    $('woMat').hidden = !hasMat;
    $('woWork').hidden = !hasWork;
    form.querySelectorAll('[data-show-rozl]').forEach((b) => { b.hidden = val('rozl') !== b.dataset.showRozl; });
    form.querySelectorAll('[data-show-dost]').forEach((b) => { b.hidden = val('dost') !== b.dataset.showDost; });
    form.querySelectorAll('[data-show-termin]').forEach((b) => { b.hidden = val('termin') !== b.dataset.showTermin; });

    const lines = [];
    const msg = ['Dzień dobry! Piszę ze strony cang.pl.', 'ZLECENIE:'];
    const unknown = [];
    let total = 0, matT = 0, matN = 0;
    sel.forEach((k) => {
      const it = ITEMS[k];
      if (it.kind === 'mat') {
        const t = num(it.inp); const c = t * it.p;
        total += c; matT += t; matN++;
        lines.push([it.s + ' · ' + t + ' t', zl(c)]);
        msg.push('• ' + it.n + ' – ' + t + ' t');
      } else if (it.kind === 'mach') {
        const h = num(it.inp); const c = h * it.p;
        total += c;
        lines.push([it.s + ' · ' + h + ' h', zl(c)]);
        msg.push('• ' + it.n + ' – ok. ' + h + ' godz.');
      } else {
        const o = Number(val('osoby'));
        const who = o === 3 ? 'Ekipa 3-osobowa' : (o === 1 ? '1 pracownik' : '2 pracowników');
        if (val('rozl') === 'h') {
          const h = num(it.inp); const c = h * o * it.p;
          total += c;
          lines.push([who + ' · ' + h + ' h', zl(c)]);
          msg.push('• ' + who + ' – ok. ' + h + ' godz.');
        } else {
          lines.push([who + ' · za całość', 'wycena']);
          msg.push('• ' + who + ' – rozliczenie za całość');
          unknown.push('ekipa za całość');
        }
      }
    });
    if (hasMat) {
      const dost = val('dost'), km = val('km');
      let tr;
      if (dost === 'odbior') tr = 'odbiór własny';
      else if (km === '20+') { tr = 'dopłata – ustalimy'; unknown.push('transport'); }
      else if (matT >= 25) tr = 'gratis';
      else if (matT > 4) { tr = 'dopłata – ustalimy'; unknown.push('transport'); }
      else if (matN > 1) { tr = 'do ustalenia'; unknown.push('transport'); }
      else { tr = '250 zł'; total += 250; }
      lines.push(['Transport', tr]);
      msg.push('Dostawa: ' + (dost === 'odbior' ? 'odbiór własny' : 'z dowozem (' + (km === '20+' ? 'powyżej 20 km' : 'do 20 km') + ')'));
    }
    const pr = hasWork ? vals('prace') : [];
    if (pr.length) msg.push('Rodzaj prac: ' + pr.join(', '));
    const miejsce = $('miejsce').value.trim();
    if (miejsce) { lines.push(['Miejscowość', miejsce]); msg.push('Miejscowość: ' + miejsce); }
    let termin = val('termin');
    if (termin === 'data') { const d = $('data').value; termin = d ? d.split('-').reverse().join('.') : 'konkretny dzień (do ustalenia)'; }
    if (sel.length) { lines.push(['Termin', termin]); msg.push('Termin: ' + termin); }
    const un = unknown.length ? unknown.join(' i ') + ' do ustalenia' : '';
    if (sel.length) msg.push(total ? 'Orientacyjny koszt z cennika: ' + zl(total) + (un ? ' + ' + un : '') : 'Koszt: wycena indywidualna (' + unknown.join(', ') + ')');
    const uw = $('uwagi').value.trim();
    if (uw) msg.push('Uwagi: ' + uw);
    const imie = $('imie').value.trim();
    if (imie) msg.push('Pozdrawiam, ' + imie);

    const ul = $('lines');
    ul.textContent = '';
    if (!sel.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Nic jeszcze nie zaznaczono.'; ul.appendChild(li); }
    lines.forEach(([a, b]) => { const li = document.createElement('li'); const x = document.createElement('span'); x.textContent = a; const y = document.createElement('span'); y.textContent = b; li.append(x, y); ul.appendChild(li); });
    odo(total);
    $('totNote').textContent = !sel.length ? 'Zaznacz co najmniej jedną pozycję.' : (!total ? 'Wycena indywidualna – dogadamy przez telefon.' : (un ? '+ ' + un + '. Dogadamy przez telefon.' : 'Wszystko według cennika.'));
    message = msg.join('\n');
    $('bubble').textContent = sel.length ? message : 'Tu pojawi się gotowa wiadomość.';
    if (sel.length !== count) counters.forEach((c) => { c.textContent = sel.length; if (sel.length > count) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } });
    count = sel.length;
    document.querySelectorAll('[data-add]').forEach((b) => b.setAttribute('aria-pressed', String(sel.includes(b.dataset.add))));
    slide.setAttribute('aria-disabled', String(!sel.length));
  };

  form.addEventListener('input', compute);
  form.addEventListener('change', compute);
  form.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const el = $(b.dataset.t);
    el.value = Math.max(Number(el.min) || 1, Math.min(Number(el.max) || 999, (parseInt(el.value, 10) || 0) + Number(b.dataset.step)));
    compute();
  }));

  // przeciąganie liczby w bok (port ScrubField)
  form.querySelectorAll('.num input').forEach((inp) => {
    let sx = null, sv = 0, drag = false;
    inp.addEventListener('pointerdown', (e) => { sx = e.clientX; sv = parseInt(inp.value, 10) || 1; drag = false; });
    window.addEventListener('pointermove', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      if (!drag && Math.abs(dx) > 8) { drag = true; inp.blur(); }
      if (drag) {
        const n = Math.max(Number(inp.min) || 1, Math.min(Number(inp.max) || 999, sv + Math.round(dx / 14)));
        if (String(n) !== inp.value) { inp.value = n; compute(); }
      }
    });
    window.addEventListener('pointerup', () => { sx = null; });
    window.addEventListener('pointercancel', () => { sx = null; });
  });

  // komunikat
  const toast = $('toast');
  let tt;
  const say = (t) => { $('toastTxt').textContent = t; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2600); };

  // „Dodaj do zlecenia”
  document.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
    const cb = form.querySelector('input[name="it"][value="' + b.dataset.add + '"]');
    cb.checked = !cb.checked;
    compute();
    say((cb.checked ? 'Dodano do zlecenia: ' : 'Usunięto ze zlecenia: ') + ITEMS[b.dataset.add].s);
  }));

  // wysyłka
  const send = () => { compute(); if (!count) return false; window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(message), '_blank', 'noopener'); return true; };
  form.addEventListener('submit', (e) => { e.preventDefault(); if (!send()) say('Najpierw zaznacz, co zamawiasz.'); });

  // przesuń, aby wysłać (port SlideCommit)
  const knob = slide.querySelector('.slide-knob');
  const sTxt = $('slideTxt');
  const sLabel = sTxt.textContent;
  let x = 0, travel = 1, grab = null, busy = false;
  const measure = () => { travel = Math.max(1, slide.clientWidth - knob.offsetWidth - 10); };
  const setX = (v) => {
    x = Math.max(0, Math.min(travel, v));
    slide.style.setProperty('--k', x + 'px');
    slide.setAttribute('aria-valuenow', String(Math.round((x / travel) * 100)));
    if (!busy) sTxt.style.opacity = String(Math.max(0, 1 - (x / travel) * 1.6));
  };
  const home = () => { slide.classList.add('back'); setX(0); setTimeout(() => slide.classList.remove('back'), 460); };
  const commit = () => {
    busy = true;
    setX(travel);
    slide.classList.add('done');
    sTxt.style.opacity = '1';
    sTxt.textContent = send() ? 'Otwieram WhatsApp…' : 'Najpierw zaznacz pozycję';
    setTimeout(() => { slide.classList.remove('done'); sTxt.textContent = sLabel; busy = false; home(); }, 1800);
  };
  const off = () => slide.getAttribute('aria-disabled') === 'true';
  slide.addEventListener('pointerdown', (e) => {
    if (off() || busy || e.button > 0) return;
    measure();
    grab = { id: e.pointerId, sx: e.clientX - x };
    slide.classList.remove('back');
    try { slide.setPointerCapture(e.pointerId); } catch (err) { /* nic */ }
  });
  slide.addEventListener('pointermove', (e) => { if (grab && e.pointerId === grab.id) setX(e.clientX - grab.sx); });
  const release = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    grab = null;
    if (x >= travel * 0.9) commit(); else home();
  };
  slide.addEventListener('pointerup', release);
  slide.addEventListener('pointercancel', release);
  slide.addEventListener('keydown', (e) => {
    if (off() || busy) return;
    measure();
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'End') { e.preventDefault(); commit(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setX(x + travel / 8); if (x >= travel) commit(); }
    else if (e.key === 'ArrowLeft' || e.key === 'Home') { e.preventDefault(); setX(0); }
  });
  window.addEventListener('resize', () => { measure(); if (!busy) setX(0); });

  compute();

  /* ---------- Okna: zdjęcia i polityka prywatności ---------- */
  const openDialog = (d) => { if (!d.open) { d.showModal(); if (lenis) lenis.stop(); } };
  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('close', () => { if (lenis) lenis.start(); });
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });
  const pp = $('pp');
  document.querySelectorAll('[data-pp]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openDialog(pp); }));

  const lb = $('lb');
  const shots = Array.from(document.querySelectorAll('#gal [data-full]'));
  const lbImg = $('lb-img');
  let li = 0;
  const show = (i) => {
    li = (i + shots.length) % shots.length;
    const it = shots[li];
    const img = it.querySelector('img');
    lbImg.src = img.getAttribute('src');
    const full = new Image();
    full.onload = () => { if (shots[li] === it) lbImg.src = it.dataset.full; };
    full.src = it.dataset.full;
    lbImg.alt = img.alt;
    $('lb-cap').textContent = it.querySelector('span').textContent;
    $('lb-count').textContent = (li + 1) + ' / ' + shots.length;
  };
  shots.forEach((s, i) => s.addEventListener('click', () => { show(i); openDialog(lb); }));
  lb.querySelector('.lb-prev').addEventListener('click', () => show(li - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(li + 1));
  lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(li - 1); if (e.key === 'ArrowRight') show(li + 1); });
  let sx = null;
  const stage = $('lb-stage');
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  stage.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) show(li + (dx < 0 ? 1 : -1)); });
})();
