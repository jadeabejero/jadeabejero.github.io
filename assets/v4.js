// v4 motion-library pieces: preloader, pill nav, split chars, magnetic buttons, count-up, scroll ink,
// spotlight borders, timeline line draw, wordmark rise. All respect prefers-reduced-motion.
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  if (reduce) root.classList.add('no-motion');

  /* Split chars: build letter spans, rise in once the preloader leaves */
  const h1 = $('.split-h');
  if (h1) {
    h1.setAttribute('aria-label', h1.dataset.t.replace(/\|/g, ' '));
    let n = 0;
    h1.dataset.t.split('|').forEach((line) => {
      const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
      // chars grouped per word so a line never breaks inside a word
      line.split(' ').forEach((word, wi) => {
        if (wi) w.appendChild(document.createTextNode(' '));
        const wd = document.createElement('span'); wd.className = 'wd';
        for (const ch of word) { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; c.style.setProperty('--i', n++); wd.appendChild(c); }
        w.appendChild(wd);
      });
      h1.appendChild(w);
    });
  }
  const revealHero = () => h1 && h1.classList.add('in');

  /* JXA intro: once per browser session, ~3.4s, then the screen splits open (timing lives in v4.css) */
  const pre = $('.pre');
  let seen = false; try { seen = sessionStorage.getItem('jxa-intro') === '1'; } catch (e) {}
  if (!pre || reduce || seen || /[?&]shot(&|$)/.test(location.search)) { root.classList.add('no-pre'); revealHero(); }
  else {
    try { sessionStorage.setItem('jxa-intro', '1'); } catch (e) {}
    const open = () => { if (pre.classList.contains('done')) return; pre.classList.add('done'); setTimeout(revealHero, 250); setTimeout(() => root.classList.add('no-pre'), 900); };
    const t0 = performance.now();
    const go = () => setTimeout(open, Math.max(0, 3100 - (performance.now() - t0)));
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
    setTimeout(open, 5500); // never hold a slow page longer than this
  }

  /* Nav shrinks into a floating pill after the first scroll */
  const top = $('.top');
  const onScroll = () => top && top.classList.toggle('pill', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Magnetic buttons: spring toward the pointer within the button's box */
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.mag').forEach((b) => {
      let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, raf = 0;
      const loop = () => {
        vx = (vx + (tx - x) * 0.2) * 0.65; vy = (vy + (ty - y) * 0.2) * 0.65; x += vx; y += vy;
        b.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`;
        raf = Math.abs(x - tx) + Math.abs(y - ty) + Math.abs(vx) + Math.abs(vy) > 0.05 ? requestAnimationFrame(loop) : 0;
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); tx = (e.clientX - r.left - r.width / 2) * 0.3; ty = (e.clientY - r.top - r.height / 2) * 0.4; kick(); });
      b.addEventListener('pointerleave', () => { tx = ty = 0; kick(); });
    });
  }

  /* Count-up stats when they scroll into view */
  const counts = $$('.count');
  const run = (el) => {
    const to = +el.dataset.to, suf = el.dataset.suffix || '', plain = el.dataset.plain, D = 1600; let t0 = null;
    const fmt = (v) => (plain ? String(v) : v.toLocaleString('en-US')) + suf;
    if (reduce) { el.textContent = fmt(to); return; }
    const from = plain ? Math.max(0, to - 60) : 0;
    const step = (t) => { t0 = t0 || t; const p = Math.min((t - t0) / D, 1); el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 4)))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    // count every time the row comes into view, and again every 7.77 s while it stays visible
    const row = counts[0] && counts[0].closest('section'); let timer = 0;
    const all = () => { if (document.documentElement.classList.contains('no-pre') || !document.querySelector('.pre')) counts.forEach(run); };
    if (row) new IntersectionObserver((es) => {
      if (es[0].isIntersecting) { all(); clearInterval(timer); timer = setInterval(all, 7770); }
      else clearInterval(timer);
    }, { threshold: 0.4 }).observe(row);
  }

  /* Scroll ink: words light up as the paragraph moves through the viewport */
  const ink = $('.ink');
  let inkWords = [];
  if (ink && !reduce) {
    const words = ink.textContent.trim().split(/\s+/);
    ink.setAttribute('aria-label', ink.textContent.trim());
    ink.innerHTML = words.map((w) => `<span aria-hidden="true">${w.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>`).join(' ');
    inkWords = $$('span', ink);
  }

  /* Timeline line + wordmark rise + ink progress, all from one scroll handler */
  const cv = $('.cv'), wm = $('.wordmark'), foot = $('.foot');
  const prog = (el, start, end) => { const r = el.getBoundingClientRect(); const a = innerHeight * start, b = innerHeight * end; return Math.min(1, Math.max(0, (a - r.top) / (r.height + a - b))); };
  const tick = () => {
    if (cv) {
      const tl = reduce ? 1 : prog(cv, 0.75, 0.35); cv.style.setProperty('--tl', tl.toFixed(3));
      // a dot "pops" the moment the drawing line reaches it
      const tip = tl * (cv.offsetHeight - 6);
      cv.querySelectorAll(':scope>li').forEach((li, i) => li.classList.toggle('hit', tip >= li.offsetTop + (i ? 34 : 6) - 4));
    }
    if (inkWords.length) {
      const r = ink.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (innerHeight * 0.6)));
      const k = Math.round(p * inkWords.length);
      inkWords.forEach((w, i) => { w.classList.toggle('on', i < k - 1); w.classList.toggle('cur', i === k - 1 && p < 1); });
    }
    if (wm && foot) { const r = foot.getBoundingClientRect(); const p = reduce ? 1 : Math.min(1, Math.max(0, (innerHeight - r.top) / Math.max(1, r.height * 0.9))); wm.style.setProperty('--wm', p.toFixed(3)); }
  };
  let pending = false;
  addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; tick(); }); } }, { passive: true });
  addEventListener('resize', tick); tick();

  /* Spotlight border follows the pointer on cards */
  $$('.proofs, .tools, .cases, .skills>div, .svc-cards li, .build-detail').forEach((el) => {
    el.classList.add('spot');
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`); });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '-500px'); el.style.setProperty('--my', '-500px'); });
  });
})();

/* Links to the second brain open it first */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-open-brain]'); if (!a) return;
  const d = document.getElementById('graph'); if (d) d.open = true;
});


/* Capability line: cursor proximity lights words up */
(() => {
  const sec = document.querySelector('.capline'); if (!sec || !matchMedia('(hover: hover)').matches) return;
  const items = [...sec.querySelectorAll('li')];
  sec.addEventListener('pointermove', (e) => {
    const r = sec.getBoundingClientRect(); sec.style.setProperty('--gx', `${e.clientX - r.left}px`);
    let best = null, bd = 1e9;
    items.forEach((li) => {
      const b = li.getBoundingClientRect(), d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
      li.style.setProperty('--p', Math.max(0, 1 - d / 240).toFixed(3)); if (d < bd) { bd = d; best = li; }
    });
    items.forEach((li) => li.classList.toggle('near', li === best && bd < 140));
  });
  sec.addEventListener('pointerleave', () => { sec.style.setProperty('--gx', '-400px'); items.forEach((li) => { li.style.setProperty('--p', 0); li.classList.remove('near'); }); });
})();

/* Sample work: sticky product steps. The step whose middle crosses 50% of the viewport is active. */
(() => {
  const steps = [...document.querySelectorAll('.stp')]; if (!steps.length) return;
  const panels = [...document.querySelectorAll('.vz')], pills = [...document.querySelectorAll('[data-pill]')], num = document.querySelector('.stp-count b');
  let active = -1;
  const set = (i) => {
    if (i === active) return; active = i;
    steps.forEach((s, k) => s.classList.toggle('on', k === i));
    panels.forEach((p, k) => p.classList.toggle('on', k === i));
    pills.forEach((p, k) => p.classList.toggle('on', k === i));
    if (num) num.textContent = String(i + 1).padStart(2, '0');
  };
  const pick = () => {
    const mid = innerHeight * 0.5; let best = 0, bd = Infinity;
    steps.forEach((s, k) => { const r = s.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = k; } });
    set(best);
  };
  let q = false;
  addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; pick(); }); } }, { passive: true });
  addEventListener('resize', pick); pick();
})();

/* Hero: headline letters react to the cursor; portrait drifts slightly; "I handle your ___" decodes words */
(() => {
  const hero = document.querySelector('.hero'), h1 = document.querySelector('.split-h');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hero && h1 && fine && !reduce) {
    // switch to live mode once the rise-in has finished
    const goLive = () => setTimeout(() => h1.classList.add('live'), 1400);
    if (h1.classList.contains('in')) goLive(); else new MutationObserver((m, o) => { if (h1.classList.contains('in')) { o.disconnect(); goLive(); } }).observe(h1, { attributes: true });
    const chars = () => [...h1.querySelectorAll('.c')];
    let raf = 0, mx = -1e4, my = -1e4;
    const paint = () => {
      raf = 0;
      chars().forEach((c) => { const r = c.getBoundingClientRect(); const d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2)); c.style.setProperty('--h', Math.max(0, 1 - d / 170).toFixed(3)); });
    };
    hero.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(paint);
      const r = hero.getBoundingClientRect(); hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    hero.addEventListener('pointerleave', () => { mx = my = -1e4; if (!raf) raf = requestAnimationFrame(paint); hero.style.setProperty('--px', 0); hero.style.setProperty('--py', 0); });
  }
  const hw = document.querySelector('.handle .hw'); if (!hw) return;
  const words = (hw.dataset.words || '').split('|'); if (words.length < 2) return;
  if (reduce) return;
  const GLYPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=/<>';
  let wi = 0;
  const decode = (word) => {
    let f = 0; const total = 18 + word.length * 2;
    const tick = () => {
      f++;
      const settled = Math.floor((f / total) * word.length * 1.15);
      let out = '';
      for (let k = 0; k < word.length; k++) {
        if (word[k] === ' ') { out += ' '; continue; }
        out += k < settled ? word[k] : '<i>' + GLYPH[(Math.random() * GLYPH.length) | 0] + '</i>';
      }
      hw.innerHTML = out;
      if (settled < word.length) requestAnimationFrame(tick); else hw.textContent = word;
    };
    requestAnimationFrame(tick);
  };
  setInterval(() => { wi = (wi + 1) % words.length; decode(words[wi]); }, 2600);
})();

/* Letter rise for highlighted text (role titles, section headings, about title): same motion as the hero
   headline, triggered when each one scrolls into view. Screen readers get the plain text via aria-label. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const targets = [...document.querySelectorAll('main h2:not(.split-h), .about h2')]; // role titles stay static (Jade's call)
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  targets.forEach((el) => {
    if (el.dataset.splitDone) return; el.dataset.splitDone = '1';
    const text = el.textContent.replace(/\s+/g, ' ').trim(); if (!text) return;
    el.setAttribute('aria-label', text);
    // keep inline children like <small> out of the effect: split only plain text nodes
    let n = 0;
    [...el.childNodes].forEach((node) => {
      if (node.nodeType !== 3 || !node.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const wd = document.createElement('span'); wd.className = 'spw'; wd.setAttribute('aria-hidden', 'true');
        for (const ch of part) { const c = document.createElement('span'); c.className = 'spc'; c.textContent = ch; c.style.setProperty('--i', n++); wd.appendChild(c); }
        frag.appendChild(wd);
      });
      node.replaceWith(frag);
    });
    el.classList.add('sp');
    if (!el.closest('.cv')) io.observe(el); // role titles rise when their timeline dot pops (li.hit), not on their own
  });
})();

/* About v5: journey line draws with scroll and pops each stop; ghost 2026 drifts; spec cards spotlight */
(() => {
  const sec = document.querySelector('.about-v5'); if (!sec) return;
  const j = sec.querySelector('.journey'), stops = j ? [...j.children] : [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = () => {
    const r = sec.getBoundingClientRect(), vh = innerHeight;
    sec.style.setProperty('--ag', Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh)).toFixed(3));
    if (!j) return;
    const jr = j.getBoundingClientRect();
    const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.7 - jr.top) / (jr.height || 1)));
    j.style.setProperty('--jp', p.toFixed(3));
    const tip = p * jr.height;
    stops.forEach((li) => li.classList.toggle('hit', tip >= li.offsetTop + 6));
  };
  let q = false;
  addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; tick(); }); } }, { passive: true });
  addEventListener('resize', tick); tick();
  sec.querySelectorAll('.spec').forEach((el) => {
    el.addEventListener('pointermove', (e) => { const b = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - b.left}px`); el.style.setProperty('--my', `${e.clientY - b.top}px`); });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '-300px'); el.style.setProperty('--my', '-300px'); });
  });
})();

/* Shoulder buddy v3: Claude-mascot style pixel sprite with a soft dark-brown outline, top highlight,
   bottom shade, blush cheeks and slit eyes that snap toward the cursor while visible. Every 2.5 s it
   does one action (jump, think, play, cute) with a pixel speech bubble (?, !, note, heart). */
(() => {
  const b = document.querySelector('.buddy'); if (!b) return;
  const px = (grid, colors) => { let s = ''; grid.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) s += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${colors[ch]}"/>`; })); return s; };
  const BODY = [
    '...DDDDDDDDDDDD...',
    '..DLLLLLLLLLLLLD..',
    '..DOOOOOOOOOOOOD..',
    'DDDOOOOOOOOOOOODDD',
    'DOOOOOOOOOOOOOOOOD',
    'DDDOPOOOOOOOOPODDD',
    '..DOOOOOOOOOOOOD..',
    '..DSSSSSSSSSSSSD..',
    '...DDDDDDDDDDDD...',
    '...DODOD...DODOD..',
    '...DDDDD...DDDDD..',
  ];
  const COL = { D: '#5A2410', L: '#EE9A78', O: '#D97757', S: '#B95D3E', P: '#E9867A' };
  b.innerHTML = `<span class="bub" aria-hidden="true"></span><svg viewBox="0 0 18 11" shape-rendering="crispEdges">${px(BODY, COL)}
    <rect class="pupil" data-x="6" x="6" y="3" width="1.02" height="2.02" fill="#1A0C06"/><rect class="pupil" data-x="11" x="11" y="3" width="1.02" height="2.02" fill="#1A0C06"/>
    <rect class="mouth" x="8" y="5" width="2.02" height="1.02" fill="#1A0C06"/></svg>`;
  // pixel speech bubble: stepped corners, thin dark border, orange fill, 5x5 glyph
  const GLYPH = {
    '?': ['.###.', '....#', '..##.', '.....', '..#..'],
    '!': ['..#..', '..#..', '..#..', '.....', '..#..'],
    '♪': ['..##.', '..#.#', '..#..', '###..', '##...'],
    '♥': ['.#.#.', '#####', '#####', '.###.', '..#..'],
  };
  const bubble = (g) => {
    const grid = ['.DDDDDDD.', 'DFFFFFFFD', 'DFFFFFFFD', 'DFFFFFFFD', 'DFFFFFFFD', 'DFFFFFFFD', 'DFFFFFFFD', '.DDDDDDD.', '...DFD...', '....D....'];
    let s = px(grid, { D: '#5A2410', F: '#D97757' });
    GLYPH[g].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') s += `<rect x="${x + 2}" y="${y + 1.5}" width="1.02" height="1.02" fill="#1A0C06"/>`; }));
    return `<svg viewBox="0 0 9 10" shape-rendering="crispEdges">${s}</svg>`;
  };
  const pupils = [...b.querySelectorAll('.pupil')], bub = b.querySelector('.bub');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = false, mx = innerWidth / 2, my = innerHeight / 2, raf = 0, busy = false;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(b);
  const setEyes = (ox, oy) => pupils.forEach((p) => { p.setAttribute('x', +p.dataset.x + ox); p.setAttribute('y', 3 + oy); });
  const aim = () => {
    raf = 0; if (!visible || busy) return;
    const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.4;
    const dx = mx - cx, dy = my - cy, far = Math.hypot(dx, dy) > 40;
    setEyes(far && Math.abs(dx) > Math.abs(dy) * 0.4 ? Math.sign(dx) : 0, far && dy < 0 && Math.abs(dy) > Math.abs(dx) * 0.4 ? -1 : 0);
  };
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(aim); }, { passive: true });
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(aim); }, { passive: true });
  if (reduce) return;
  const ACTS = [
    { cls: 'a-jump', g: '!', ms: 900 },
    { cls: 'a-think', g: '?', ms: 1600, look: [1, -1] },
    { cls: 'a-play', g: '♪', ms: 1500 },
    { cls: 'a-cute', g: '♥', ms: 1300 },
  ];
  let i = 0;
  const blink = () => { b.classList.add('blink'); setTimeout(() => b.classList.remove('blink'), 140); };
  setInterval(() => {
    if (!visible) return;
    const a = ACTS[i++ % ACTS.length];
    if (a.look) { busy = true; setEyes(a.look[0], a.look[1]); }
    bub.innerHTML = bubble(a.g); b.classList.add(a.cls, 'talk');
    setTimeout(() => { b.classList.remove(a.cls, 'talk'); busy = false; aim(); if (Math.random() < 0.6) blink(); }, a.ms);
  }, 2500);
})();

/* Second-brain stats: count up from zero when visible, and again every 7.77 s */
(() => {
  const els = [...document.querySelectorAll('.graph-stats dd')]; if (!els.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) return;
  const target = (el) => +(el.dataset.to || (el.dataset.to = el.textContent.replace(/\D/g, '')));
  let visible = false, timer = 0;
  const run = () => {
    const t0 = performance.now(), D = 1600;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3);
      els.forEach((el) => { el.textContent = Math.round(target(el) * e).toLocaleString('en-US'); });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  new IntersectionObserver((es) => {
    const v = es.some((e) => e.isIntersecting);
    if (v && !visible) { run(); timer = setInterval(run, 7770); }
    if (!v && visible) clearInterval(timer);
    visible = v;
  }).observe(els[0].closest('.graph-stats'));
})();

/* XYRUS wordmark glitches briefly every 3 s */
(() => {
  const wm = document.querySelector('.wordmark'); if (!wm || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => { wm.classList.add('glitch'); setTimeout(() => wm.classList.remove('glitch'), 430); }, 3000);
})();
