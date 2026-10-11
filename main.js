/* CAN · cang.pl
   Animacje: GSAP + ScrollTrigger, płynne przewijanie: Lenis (CDN jsDelivr).
   Przy „ogranicz ruch” albo bez skryptów z CDN strona działa normalnie, tylko bez animacji. */
(() => {
  const html = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const motion = !reduce && !!(window.gsap && window.ScrollTrigger);
  const introPending = html.classList.contains('intro');
  clearTimeout(window.__introT);

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
  }

  /* ---------- Wejście ---------- */
  const hero = document.querySelector('.hero');
  if (motion && introPending && hero) {
    const lines = hero.querySelectorAll('.h1 .ln > span');
    const fades = hero.querySelectorAll('[data-i]');
    const img = hero.querySelector('.hero-media img');
    gsap.set('.top', { opacity: 0, y: -14 });
    gsap.set(lines, { yPercent: 110 });
    gsap.set(fades, { opacity: 0, y: 18 });
    gsap.set(img, { scale: 1.18 });
    html.classList.remove('intro');
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .to(img, { scale: 1, duration: 2.2, ease: 'power2.out' }, 0)
      .to('.top', { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 0)
      .to(fades[0], { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.05)
      .to(lines, { yPercent: 0, duration: 1, stagger: 0.08 }, 0.12)
      .to(Array.prototype.slice.call(fades, 1), { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, 0.5);
  }

  /* ---------- Zmieniające się słowo (port RotatingText z react-bits) ---------- */
  const rot = document.querySelector('.rot');
  if (rot && motion) {
    const words = rot.dataset.words.split('|');
    const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter('pl', { granularity: 'grapheme' }) : null;
    const chars = (s) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));
    const build = (word) => {
      const w = document.createElement('span');
      w.className = 'rot-w';
      chars(word).forEach((c) => { const s = document.createElement('span'); s.className = 'rot-c'; s.textContent = c; w.appendChild(s); });
      return w;
    };
    let idx = 0;
    let cur = build(words[0]);
    rot.textContent = '';
    rot.appendChild(cur);
    let timer = null;
    const swap = () => {
      idx = (idx + 1) % words.length;
      const old = cur;
      cur = build(words[idx]);
      gsap.set(old, { position: 'absolute', left: 0, top: 0 });
      rot.appendChild(cur);
      gsap.to(old.children, { yPercent: -120, opacity: 0, duration: 0.4, stagger: 0.014, ease: 'power3.in', onComplete: () => old.remove() });
      gsap.fromTo(cur.children, { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.65, stagger: 0.018, ease: 'power4.out', delay: 0.15 });
    };
    const start = () => { if (!timer) timer = setInterval(swap, 2200); };
    const stop = () => { clearInterval(timer); timer = null; };
    setTimeout(() => {
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(rot);
    }, 1600);
  }

  /* ---------- Tekst odsłaniany słowo po słowie (port ScrollReveal) ---------- */
  const splitWords = (el) => {
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) splitWords(n);
    });
  };
  if (motion) {
    document.querySelectorAll('[data-words]').forEach((el) => {
      splitWords(el);
      gsap.fromTo(el.querySelectorAll('.w'), { opacity: 0.12 }, {
        opacity: 1, ease: 'none', stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 55%', scrub: 0.6 }
      });
    });
  }

  /* ---------- Pojawianie się sekcji ---------- */
  if (motion) {
    const els = gsap.utils.toArray('[data-r]');
    gsap.set(els, { opacity: 0, y: 30 });
    ScrollTrigger.batch(els, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => {
        const h = window.innerHeight;
        const seen = batch.filter((el) => el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < h * 1.1);
        gsap.set(batch.filter((el) => !seen.includes(el)), { opacity: 1, y: 0 });
        gsap.to(seen, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', overwrite: true });
      }
    });
  }

  /* ---------- Liczniki cen (port CountUp) ---------- */
  if (motion) {
    document.querySelectorAll('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count);
      const o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.3, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } })
      });
    });
  }

  /* ---------- Paralaksa, aktywne menu ---------- */
  if (motion) {
    gsap.to('.hero-media img', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1000px)', () => {
      gsap.utils.toArray('.mcard > img').forEach((im) => {
        gsap.fromTo(im, { yPercent: -6, scale: 1.12 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
    document.querySelectorAll('.nav .nl').forEach((a) => {
      const sec = document.querySelector(a.getAttribute('href'));
      if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', toggleClass: { targets: a, className: 'on' } });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- Magnes (port Magnet) i światło na kartach (port SpotlightCard) ---------- */
  if (motion && fine) {
    document.querySelectorAll('.magnet').forEach((m) => {
      const xTo = gsap.quickTo(m, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(m, 'y', { duration: 0.5, ease: 'power3.out' });
      m.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.12);
        yTo((e.clientY - r.top - r.height / 2) * 0.22);
      });
      m.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }
  if (fine && !reduce) {
    document.querySelectorAll('[data-spot]').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- Pasek kontaktu na telefonie ---------- */
  const bar = document.querySelector('.bar');
  const heroCtas = document.querySelector('.hero .ctas');
  if (bar && heroCtas) {
    let pastHero = false;
    const inView = new Set();
    const upd = () => bar.classList.toggle('on', pastHero && inView.size === 0);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; upd(); }).observe(heroCtas);
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? inView.add(e.target) : inView.delete(e.target)));
      upd();
    }, { rootMargin: '0px 0px -30% 0px' });
    ['.sum', '#kontakt'].forEach((s) => { const el = document.querySelector(s); if (el) io.observe(el); });
  }

  /* ---------- Konfigurator zamówienia na WhatsApp ---------- */
  const form = document.getElementById('cfg');
  if (form) {
    const MAT = {
      ziemia: { n: 'Ziemia przesiana (czarnoziem)', p: 80 },
      m031: { n: 'Mieszanka 0/31 (granit)', p: 45 },
      k1631: { n: 'Kamień drenażowy 16/31 (granit)', p: 60 }
    };
    const RATE = { koparka: 200, mini: 120, osoba: 70 };
    const $ = (id) => document.getElementById(id);
    const val = (name) => { const el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; };
    const vals = (name) => Array.from(form.querySelectorAll('input[name="' + name + '"]:checked')).map((i) => i.value);
    const num = (id) => {
      const el = $(id);
      let n = parseInt(el.value, 10);
      if (!(n > 0)) n = 1;
      return Math.min(n, Number(el.max) || 999);
    };
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const estEl = $('est');
    const shown = { v: 0 };
    let message = '';

    const toggle = () => {
      const typ = val('typ');
      form.querySelectorAll('[data-for]').forEach((b) => { b.hidden = !b.dataset.for.split(' ').includes(typ); });
      form.querySelectorAll('[data-for-dost]').forEach((b) => { b.hidden = val('dost') !== b.dataset.forDost; });
      form.querySelectorAll('[data-for-rozl]').forEach((b) => { b.hidden = val('rozl') !== b.dataset.forRozl; });
      form.querySelectorAll('[data-for-termin]').forEach((b) => { b.hidden = val('termin') !== b.dataset.forTermin; });
    };

    const showEst = (n, suffix, text) => {
      if (n === null) { estEl.textContent = text; shown.v = 0; return; }
      if (motion) {
        gsap.to(shown, { v: n, duration: 0.6, ease: 'power3.out', overwrite: true, onUpdate: () => { estEl.textContent = zl(shown.v) + suffix; } });
      } else {
        estEl.textContent = zl(n) + suffix;
      }
    };

    const compute = () => {
      toggle();
      const typ = val('typ');
      const lines = [];
      const msg = ['Dzień dobry! Piszę ze strony cang.pl.'];
      let estN = null, estSuffix = '', estText = '', note = '';

      if (typ === 'material') {
        const m = MAT[val('mat')];
        const t = num('tony');
        const dost = val('dost');
        const km = val('km');
        const cost = t * m.p;
        let tr = null, trTxt;
        if (dost === 'odbior') { tr = 0; trTxt = 'odbiór własny'; }
        else if (km === '20+') trTxt = 'do ustalenia (powyżej 20 km)';
        else if (t > 25) { tr = 0; trTxt = 'gratis (powyżej 25 t)'; }
        else if (t <= 4) { tr = 250; trTxt = '250 zł (1–4 t, do 20 km)'; }
        else trTxt = 'do ustalenia (5–25 t)';
        lines.push([m.n, t + ' t × ' + m.p + ' zł']);
        lines.push(['Transport', trTxt]);
        if (tr === null) { estN = cost; estSuffix = ' + transport'; note = 'Materiał według cennika. Transport wycenimy przez telefon.'; }
        else { estN = cost + tr; note = dost === 'odbior' ? 'Materiał przy odbiorze własnym.' : (tr === 0 ? 'Materiał z darmowym transportem.' : 'Materiał razem z transportem.'); }
        msg.push('Zamówienie: ' + m.n + ' – ' + t + ' t');
        msg.push('Dostawa: ' + (dost === 'odbior' ? 'odbiór własny' : 'z dowozem (' + (km === '20+' ? 'powyżej 20 km' : 'do 20 km') + ')'));
      } else if (typ === 'koparka' || typ === 'mini') {
        const r = RATE[typ];
        const h = num('godz');
        const pr = vals('prace');
        const name = typ === 'koparka' ? 'Koparko-ładowarka' : 'Minikoparka';
        lines.push([name, h + ' godz. × ' + r + ' zł']);
        if (pr.length) lines.push(['Prace', pr.join(', ')]);
        estN = h * r; note = 'Za podaną liczbę godzin pracy maszyny.';
        msg.push('Zamówienie: ' + name + ', ok. ' + h + ' godz.');
        if (pr.length) msg.push('Prace: ' + pr.join(', '));
      } else {
        const o = Number(val('osoby'));
        const who = o === 3 ? 'ekipa 3-osobowa' : (o === 1 ? '1 pracownik' : '2 pracowników');
        const z = vals('zakres');
        if (val('rozl') === 'h') {
          const h = num('godzE');
          lines.push([cap(who), h + ' godz. × ' + (o * RATE.osoba) + ' zł']);
          estN = h * o * RATE.osoba; note = o + ' × 70 zł za godzinę pracy.';
          msg.push('Zamówienie: ' + who + ', ok. ' + h + ' godz.');
        } else {
          lines.push([cap(who), 'rozliczenie za całość']);
          estText = 'Wycena indywidualna'; note = 'Cenę za całą pracę ustalimy po rozmowie.';
          msg.push('Zamówienie: ' + who + ', rozliczenie za całość');
        }
        if (z.length) { lines.push(['Zakres', z.join(', ')]); msg.push('Zakres: ' + z.join(', ')); }
      }

      const miejsce = $('miejsce').value.trim();
      if (miejsce) { lines.push(['Miejscowość', miejsce]); msg.push('Miejscowość: ' + miejsce); }
      let termin = val('termin');
      if (termin === 'data') {
        const d = $('data').value;
        termin = d ? d.split('-').reverse().join('.') : 'konkretny dzień (do ustalenia)';
      }
      lines.push(['Termin', termin]);
      msg.push('Termin: ' + termin);
      if (estN !== null) msg.push('Orientacyjny koszt z cennika: ' + zl(estN) + estSuffix);
      const uwagi = $('uwagi').value.trim();
      if (uwagi) msg.push('Uwagi: ' + uwagi);
      const imie = $('imie').value.trim();
      if (imie) msg.push('Pozdrawiam, ' + imie);

      showEst(estN, estSuffix, estText);
      $('estNote').textContent = note;
      $('lines').innerHTML = '';
      lines.forEach(([k, v]) => {
        const li = document.createElement('li');
        const a = document.createElement('span'); a.textContent = k;
        const b = document.createElement('span'); b.textContent = v;
        li.append(a, b);
        $('lines').appendChild(li);
      });
      message = msg.join('\n');
      $('bubble').textContent = message;
    };

    form.addEventListener('input', compute);
    form.addEventListener('change', compute);
    form.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const el = $(b.dataset.target);
      const n = (parseInt(el.value, 10) || 0) + Number(b.dataset.step);
      el.value = Math.max(Number(el.min) || 1, Math.min(Number(el.max) || 999, n));
      compute();
    }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      compute();
      window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(message), '_blank', 'noopener');
    });
    // Przyciski „Zamów…” w sekcjach ustawiają konfigurator
    document.querySelectorAll('[data-pick]').forEach((a) => a.addEventListener('click', () => {
      const t = form.querySelector('input[name="typ"][value="' + a.dataset.pick + '"]');
      if (t) t.checked = true;
      if (a.dataset.mat) { const m = form.querySelector('input[name="mat"][value="' + a.dataset.mat + '"]'); if (m) m.checked = true; }
      compute();
    }));
    compute();
  }

  /* ---------- Okna: galeria i polityka prywatności ---------- */
  const openDialog = (d) => { if (!d.open) { d.showModal(); if (lenis) lenis.stop(); } };
  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('close', () => { if (lenis) lenis.start(); });
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });
  const pp = document.getElementById('pp');
  document.querySelectorAll('[data-pp]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openDialog(pp); }));

  const lb = document.getElementById('lb');
  const shots = Array.from(document.querySelectorAll('#gal [data-full]'));
  const lbImg = document.getElementById('lb-img');
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
    document.getElementById('lb-cap').textContent = it.querySelector('span').textContent;
    document.getElementById('lb-count').textContent = (li + 1) + ' / ' + shots.length;
  };
  shots.forEach((s, i) => s.addEventListener('click', () => { show(i); openDialog(lb); }));
  lb.querySelector('.lb-prev').addEventListener('click', () => show(li - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(li + 1));
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(li - 1);
    if (e.key === 'ArrowRight') show(li + 1);
  });
  let sx = null;
  const stage = document.getElementById('lb-stage');
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) show(li + (dx < 0 ? 1 : -1));
  });
})();
