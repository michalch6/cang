/* CAN · cang.pl — „karta techniczna z placu budowy”
   GSAP + ScrollTrigger + Lenis (CDN jsDelivr). Efekty przeniesione z react-bits na zwykły JS:
   SplitFlapText (tablica z klapkami), Topography (warstwice WebGL), ScrollVelocity (pasek),
   ScrollStack (stos kart), DecryptedText (nagłówki), Counter (licznik bębnowy),
   SlideCommit (przesuń, aby wysłać), ScrubField (przeciąganie liczby).
   Przy „ogranicz ruch” albo bez skryptów z CDN strona działa normalnie, bez animacji. */
(() => {
  const html = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
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

  /* ---------- Tablica z klapkami (port SplitFlapText) ---------- */
  const AZ = 'ABCDEFGHIJKLMNOPRSTUWYZ';
  const DIG = '0123456789';
  const nb = (ch) => (ch === ' ' ? ' ' : ch);
  function makeFlap(el, pad, align) {
    el.textContent = '';
    el.classList.add('built');
    const tiles = [];
    for (let i = 0; i < pad; i++) {
      const t = document.createElement('span');
      t.className = 't';
      t.innerHTML = '<span class="h up"><span class="c"></span></span><span class="h dn"><span class="c"></span></span>';
      el.appendChild(t);
      tiles.push({ el: t, up: t.firstChild.firstChild, dn: t.lastChild.firstChild, cur: ' ' });
    }
    const norm = (w) => (align === 'right' ? String(w).padStart(pad, ' ') : String(w).padEnd(pad, ' ')).slice(0, pad);
    const setStatic = (tile, ch) => { tile.cur = ch; tile.up.textContent = tile.dn.textContent = nb(ch); };
    const clearFlaps = (tile) => tile.el.querySelectorAll('.f').forEach((f) => f.remove());
    const flipOnce = (tile, next) => {
      clearFlaps(tile);
      const cur = tile.cur;
      tile.up.textContent = nb(next);
      tile.dn.textContent = nb(cur);
      const front = document.createElement('span'); front.className = 'f front'; front.innerHTML = '<span class="c"></span>'; front.firstChild.textContent = nb(cur);
      const back = document.createElement('span'); back.className = 'f back'; back.innerHTML = '<span class="c"></span>'; back.firstChild.textContent = nb(next);
      tile.el.append(front, back);
      tile.cur = next;
    };
    return {
      set(word) { const w = norm(word); tiles.forEach((t, i) => { clearFlaps(t); setStatic(t, w[i]); }); },
      to(word, charset, flips = 5, stepMs = 70, stagger = 45) {
        el.style.setProperty('--fd', stepMs / 1000 + 's');
        const w = norm(word);
        tiles.forEach((tile, i) => {
          const goal = w[i];
          if (tile.cur === goal) return;
          const seq = [];
          for (let k = 0; k < flips; k++) seq.push(charset[(Math.random() * charset.length) | 0]);
          seq.push(goal);
          let s = 0;
          setTimeout(function step() {
            flipOnce(tile, seq[s]);
            s++;
            if (s < seq.length) setTimeout(step, stepMs);
            else setTimeout(() => { clearFlaps(tile); setStatic(tile, goal); }, stepMs);
          }, i * stagger);
        });
      }
    };
  }
  // hero: zmieniające się słowa
  const heroFlap = $('flap');
  if (heroFlap && !reduce) {
    const words = heroFlap.dataset.words.split('|');
    const pad = Math.max(...words.map((w) => w.length));
    const f = makeFlap(heroFlap, pad, 'left');
    f.set('');
    let wi = 0, timer = null;
    const next = () => { f.to(words[wi], AZ); wi = (wi + 1) % words.length; };
    const start = () => { if (!timer) { next(); timer = setInterval(next, 2600); } };
    const stop = () => { clearInterval(timer); timer = null; };
    setTimeout(() => new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(heroFlap), motion ? 1100 : 0);
  } else if (heroFlap) {
    const words = heroFlap.dataset.words.split('|');
    makeFlap(heroFlap, Math.max(...words.map((w) => w.length)), 'left').set(words[0]);
  }
  // ceny: klapki przeskakują, gdy cena pojawi się na ekranie
  document.querySelectorAll('.flap[data-to]').forEach((el) => {
    const goal = el.dataset.to;
    const isNum = /^\d+$/.test(goal);
    const f = makeFlap(el, Number(el.dataset.pad) || goal.length, isNum ? 'right' : 'left');
    if (!motion) { f.set(goal); return; }
    f.set(isNum ? '-'.repeat(goal.length) : '');
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => f.to(goal, isNum ? DIG : AZ, 7, 60, 70) });
  });

  /* ---------- Warstwice (port Topography, WebGL2) ---------- */
  const canvas = $('topo');
  let topoMouse = null;
  if (canvas) (() => {
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return;
    const vs = '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `#version 300 es
precision highp float;
uniform vec2 R;uniform vec2 M;uniform float MA;uniform vec4 A;uniform vec4 B;uniform vec4 C;uniform vec4 D;
out vec4 o;
float bez(float t,vec4 c){float w=6.2831853*t;return .5*(c.x*sin(w)+c.y*cos(w)+c.z*sin(2.*w)+c.w*cos(2.*w));}
float field(vec2 uv){vec2 a=vec2(bez(uv.x,A),bez(uv.x,B));vec2 b=vec2(bez(uv.y,C),bez(uv.y,D));return distance(a,b);}
void main(){
  vec2 uv=gl_FragCoord.xy/R;
  float fv=field((uv-.5)*.85+.5);
  vec2 d=uv-M;d.x*=R.x/R.y;
  float bump=exp(-dot(d,d)/.03)*.45*MA;
  fv+=bump;
  float f=fv*2.4;
  float fr=fract(f);float ld=min(fr,1.-fr);
  float fw=fwidth(f)+1e-5;
  float major=1.-step(.5,mod(floor(f+.5),5.));
  float px=mix(.55,1.15,major);
  float m=1.-smoothstep(px*fw,(px+1.)*fw,ld);
  float a=m*mix(.09,.2,major);
  vec3 col=mix(vec3(.07,.07,.066),vec3(.96,.70,.08),clamp(bump*2.6,0.,1.));
  a=max(a,m*clamp(bump*1.6,0.,.85));
  o=vec4(col*a,a);
}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const v = sh(gl.VERTEX_SHADER, vs), fr = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !fr) return;
    const pr = gl.createProgram();
    gl.attachShader(pr, v); gl.attachShader(pr, fr); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['R', 'M', 'MA', 'A', 'B', 'C', 'D'].forEach((n) => { U[n] = gl.getUniformLocation(pr, n); });
    const IDX = [[1, -2, 3, -4], [9, -8, 7, -6], [5, 2, 5, -5], [-1, -3, 8, 9]];
    const ctrl = [new Float32Array(4), new Float32Array(4), new Float32Array(4), new Float32Array(4)];
    const mouse = { x: .5, y: .5, tx: .5, ty: .5, a: 0, ta: 0 };
    topoMouse = mouse;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const draw = (time) => {
      for (let g = 0; g < 4; g++) for (let j = 0; j < 4; j++) { const i = IDX[g][j]; ctrl[g][j] = 2.7 * Math.sin(time * 0.2 * Math.sin(i * 0.05) + i); }
      mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06; mouse.a += (mouse.ta - mouse.a) * 0.05;
      gl.uniform2f(U.R, canvas.width, canvas.height);
      gl.uniform2f(U.M, mouse.x, mouse.y);
      gl.uniform1f(U.MA, mouse.a);
      gl.uniform4fv(U.A, ctrl[0]); gl.uniform4fv(U.B, ctrl[1]); gl.uniform4fv(U.C, ctrl[2]); gl.uniform4fv(U.D, ctrl[3]);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    new ResizeObserver(() => { resize(); if (reduce) draw(6); }).observe(canvas);
    resize();
    if (reduce) { draw(6); return; }
    let raf = 0, visible = true;
    const t0 = performance.now();
    const loop = (t) => { draw((t - t0) / 1000 + 6); raf = requestAnimationFrame(loop); };
    const go = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    const halt = () => { cancelAnimationFrame(raf); raf = 0; };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? go() : halt(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? halt() : go()));
    go();
  })();

  /* ---------- Celownik z współrzędnymi (komputer) ---------- */
  const hero = document.querySelector('.hero');
  const cross = $('cross');
  if (hero && cross && fine && !reduce) {
    const cx = cross.querySelector('.cx'), cy = cross.querySelector('.cy'), lab = cross.querySelector('span');
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      cross.classList.add('on');
      cx.style.transform = 'translateY(' + y + 'px)';
      cy.style.transform = 'translateX(' + x + 'px)';
      lab.style.transform = 'translate(' + (x + 12) + 'px,' + (y + 12) + 'px)';
      lab.textContent = 'X ' + String(Math.round(x)).padStart(4, '0') + ' · Y ' + String(Math.round(y)).padStart(4, '0');
      if (topoMouse) { topoMouse.tx = x / r.width; topoMouse.ty = 1 - y / r.height; topoMouse.ta = 1; }
    });
    hero.addEventListener('pointerleave', () => { cross.classList.remove('on'); if (topoMouse) topoMouse.ta = 0; });
  }

  /* ---------- Wejście ---------- */
  if (motion && introPending && hero) {
    const lines = hero.querySelectorAll('.h1 .ln > span');
    const hls = hero.querySelectorAll('.h1 .hl > span');
    const fades = hero.querySelectorAll('[data-i]');
    gsap.set('.top', { opacity: 0 });
    gsap.set(lines, { opacity: 1, clipPath: 'inset(0 100% 0 0)' });
    gsap.set(hls, { '--hx': 0 });
    gsap.set(fades, { opacity: 0, y: 20 });
    gsap.set('#heroHt', { '--r': '5px' });
    gsap.set(canvas, { opacity: 0 });
    html.classList.remove('intro');
    gsap.timeline()
      .to('.top', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
      .to(fades[0], { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.05)
      .to(lines, { clipPath: 'inset(0 0% 0 0)', duration: 0.75, stagger: 0.09, ease: 'power4.inOut', clearProps: 'clipPath' }, 0.1)
      .to(hls, { '--hx': 1, duration: 0.55, stagger: 0.1, ease: 'power3.out' }, 0.6)
      .to(Array.prototype.slice.call(fades, 1), { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.45)
      .to('#heroHt', { '--r': '0px', duration: 1.3, ease: 'power2.inOut' }, 0.7)
      .to(canvas, { opacity: 1, duration: 1.6, ease: 'power1.out' }, 0.3);
  }

  /* ---------- Pasek reagujący na prędkość przewijania (port ScrollVelocity) ---------- */
  const rows = Array.from(document.querySelectorAll('.ticker .row'));
  if (motion && rows.length) {
    rows.forEach((r) => { const s = r.firstElementChild; for (let i = 0; i < 3; i++) r.appendChild(s.cloneNode(true)); });
    const st = rows.map((r) => ({ r, x: 0, dir: Number(r.dataset.vel) || 1, df: 1, w: r.firstElementChild.offsetWidth }));
    window.addEventListener('resize', () => st.forEach((s) => { s.w = s.r.firstElementChild.offsetWidth; }));
    let vel = 0, target = 0, last = 0;
    ScrollTrigger.create({ onUpdate: (self) => { target = self.getVelocity(); last = performance.now(); } });
    const wrap = (min, max, v) => { const rg = max - min; return ((((v - min) % rg) + rg) % rg) + min; };
    let on = true;
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(rows[0].parentElement);
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

  /* ---------- Nagłówki „odszyfrowują się” (port DecryptedText) ---------- */
  if (motion) {
    const CH = 'ABCDEFGHIJKLMNOPRSTUWYZ0123456789/#';
    document.querySelectorAll('[data-scr]').forEach((el) => {
      const nodes = [];
      const walk = (n) => n.childNodes.forEach((c) => (c.nodeType === 3 ? nodes.push(c) : walk(c)));
      walk(el);
      const orig = nodes.map((n) => n.textContent);
      const total = orig.join('').length;
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => {
          const t0 = performance.now();
          const frame = (now) => {
            const p = Math.min(1, (now - t0) / 750);
            let idx = 0;
            nodes.forEach((n, k) => {
              let s = '';
              for (const ch of orig[k]) { s += (ch === ' ' || idx / total < p) ? ch : CH[(Math.random() * CH.length) | 0]; idx++; }
              n.textContent = s;
            });
            if (p < 1) requestAnimationFrame(frame); else nodes.forEach((n, k) => { n.textContent = orig[k]; });
          };
          requestAnimationFrame(frame);
        }
      });
    });
  }

  /* ---------- Wejścia sekcji: „rolowana brama” (clip-path) ---------- */
  if (motion) {
    const els = gsap.utils.toArray('[data-w]');
    gsap.set(els, { clipPath: 'inset(0 0 100% 0)', y: 18 });
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

  /* ---------- Stos kart sprzętu (port ScrollStack) ---------- */
  if (motion) {
    const cards = gsap.utils.toArray('.sc');
    cards.forEach((c, i) => {
      if (i === cards.length - 1) return;
      gsap.to(c, { scale: 0.93, '--dim': 0.35, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 25%', scrub: true } });
    });
  }

  /* ---------- Zdjęcia nabierają koloru na środku ekranu (telefon) ---------- */
  if (!fine) {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('on', e.isIntersecting)), { rootMargin: '-30% 0px -30% 0px' });
    document.querySelectorAll('.sheet button, .mat').forEach((el) => io.observe(el));
  }

  /* ---------- Aktywne menu ---------- */
  if (motion) {
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
    ['.slip', '#kontakt'].forEach((s) => { const el = document.querySelector(s); if (el) io.observe(el); });
  }

  /* ---------- Karta zlecenia ---------- */
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
  const sDate = $('slipDate');
  if (sDate) sDate.textContent = new Date().toLocaleDateString('pl-PL');

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
      else if (km === '20+') { tr = 'do ustalenia'; unknown.push('transport'); }
      else if (matN > 1) { tr = 'do ustalenia'; unknown.push('transport'); }
      else if (matT > 25) tr = 'gratis';
      else if (matT <= 4) { tr = '250 zł'; total += 250; }
      else { tr = 'do ustalenia'; unknown.push('transport'); }
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
    // liczniki pozycji i przyciski „Dodaj do zlecenia”
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

  // toast
  const toast = $('toast');
  let tt;
  const say = (t) => { $('toastTxt').textContent = t; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2600); };

  // „Dodaj do zlecenia” w sekcjach
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
  const slide = $('slide');
  const knob = slide.querySelector('.slide-knob');
  const sTxt = $('slideTxt');
  const sLabel = sTxt.textContent;
  let x = 0, travel = 1, grab = null, busy = false;
  const measure = () => { travel = Math.max(1, slide.clientWidth - knob.offsetWidth - 8); };
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
    $('lb-cap').textContent = it.querySelector('.meta').textContent.replace(/^(\d+A)/, '$1 · ');
    $('lb-count').textContent = 'Klatka ' + (li + 1) + ' / ' + shots.length;
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
