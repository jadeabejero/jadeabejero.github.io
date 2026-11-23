// Motion layer: custom cursor, hero node network, Three.js laptop dolly and card ring, live knowledge graph.
// Every effect checks reduced motion and falls back to the plain layout already in the HTML.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const INK = css('--ink') || '#13233F', PAPER = css('--paper') || '#F7F5F0', OK = css('--ok') || '#1E6B47';
const mouse = { x: -9999, y: -9999, active: false };
addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
document.addEventListener('pointerleave', () => { mouse.active = false; });

/* 1. Cursor: 8px dot locked to the pointer, 38px ring on a spring */
if (fine && !reduce) {
  const dot = $('.cur-dot'), ring = $('.cur-ring');
  document.documentElement.classList.add('has-cursor');
  let rx = 0, ry = 0, vx = 0, vy = 0;
  const step = () => {
    dot.style.transform = `translate(${mouse.x}px,${mouse.y}px)`;
    // spring: stiffness 0.12, damping 0.72 gives a soft lag that settles without wobble
    vx = (vx + (mouse.x - rx) * 0.12) * 0.72; vy = (vy + (mouse.y - ry) * 0.12) * 0.72;
    rx += vx; ry += vy;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  document.addEventListener('pointerover', (e) => ring.classList.toggle('hot', !!e.target.closest('a,button,summary,[role="tab"],.ring-canvas')));
}

/* 2. Hero: 45-78 drifting nodes linked by fading lines; the cursor is one more node */
(() => {
  const c = $('.hero-net'); if (!c) return;
  const ctx = c.getContext('2d'); const hero = c.parentElement;
  let w = 0, h = 0, dpr = 1, nodes = [], visible = true;
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); w = hero.clientWidth; h = hero.clientHeight;
    c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.max(45, Math.min(78, Math.round((w * h) / 20000))); // a few more stars than before
    nodes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 }));
  };
  const LINK = 140;
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const r = hero.getBoundingClientRect();
    const pts = nodes.slice();
    if (mouse.active && mouse.y >= r.top && mouse.y <= r.bottom) pts.push({ x: mouse.x - r.left, y: mouse.y - r.top, cursor: true });
    for (const p of nodes) {
      if (!reduce) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      const lim = a.cursor || b.cursor ? LINK * 1.3 : LINK;
      if (d < lim) { ctx.strokeStyle = `rgba(242,240,234,${(1 - d / lim) * (a.cursor || b.cursor ? .35 : .18)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(242,240,234,.35)';
    for (const p of nodes) { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 6.283); ctx.fill(); }
    if (visible && !reduce) requestAnimationFrame(draw);
  };
  size(); draw();
  addEventListener('resize', () => { size(); if (reduce) draw(); });
  new IntersectionObserver((es) => { const was = visible; visible = es[0].isIntersecting; if (visible && !was && !reduce) requestAnimationFrame(draw); }).observe(hero);
})();

/* 3. Live knowledge graph (2D canvas), drawn in once when it scrolls into view */
(() => {
  const c = $('.graph-canvas'); if (!c) return;
  const COLORS = ['rgba(180,192,214,.55)', '#7FB3D5', '#E8B04B', '#7CC6A4', '#E58F7B', '#B9A3E3', '#F2E6C9'];
  let data = null;
  const render = (upto) => {
    const s = c.clientWidth, dpr = Math.min(devicePixelRatio || 1, 2);
    if (c.width !== s * dpr) { c.width = c.height = s * dpr; }
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, s, s);
    const k = (s - 24) / 1000, P = data.p, E = data.e;
    ctx.strokeStyle = 'rgba(247,245,240,.07)'; ctx.lineWidth = .5; ctx.beginPath();
    const le = Math.floor((E.length / 2) * upto);
    for (let i = 0; i < le; i++) { const a = E[i * 2] * 3, b = E[i * 2 + 1] * 3; ctx.moveTo(12 + P[a] * k, 12 + P[a + 1] * k); ctx.lineTo(12 + P[b] * k, 12 + P[b + 1] * k); }
    ctx.stroke();
    const ln = Math.floor(data.n * upto);
    for (let i = 0; i < ln; i++) { ctx.fillStyle = COLORS[P[i * 3 + 2]] || COLORS[0]; ctx.fillRect(12 + P[i * 3] * k - .9, 12 + P[i * 3 + 1] * k - .9, 1.8, 1.8); }
  };
  const start = async () => {
    try { data = await (await fetch('assets/builds/workspace-graph.json')).json(); } catch (e) { return; }
    const fmt = (n) => n.toLocaleString('en-US');
    const set = (k, v) => { const el = $(`[data-g="${k}"]`); if (el) el.textContent = fmt(v); };
    set('n', data.n); set('l', data.l); set('c', data.communities);
    if (reduce) return render(1);
    const t0 = performance.now(), D = 2600;
    const tick = (t) => { const p = Math.min(1, (t - t0) / D); render(1 - Math.pow(1 - p, 3)); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); start(); } }, { rootMargin: '200px' }).observe(c);
  addEventListener('resize', () => data && render(1));
})();

/* 4 + 5. Three.js scenes (laptop dolly, card ring). Fall back to plain layouts on failure or reduced motion. */
const services = $('.services'), builds = $('.builds'), proof3d = $('.proof3d');
$$('.svc-cards li').forEach((li, i) => li.style.setProperty('--i', i));
const fallback = () => { const sf = $('.stack'); sf && sf.classList.add('stack-static'); services && services.classList.add('static'); builds && builds.classList.add('ring-off'); proof3d && proof3d.classList.add('pf-static'); };
let THREE = null;
const webgl = (() => { try { const t = document.createElement('canvas'); return !!(t.getContext('webgl2') || t.getContext('webgl')); } catch (e) { return false; } })();
if (reduce || !webgl) fallback();
else {
  try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'); }
  catch (e) { fallback(); }
  if (THREE) { try { laptop(); } catch (e) { services.classList.add('static'); } try { ring(); } catch (e) { builds.classList.add('ring-off'); } try { if (proof3d) proofDepth(); } catch (e) { proof3d.classList.add('pf-static'); } stackFly().catch(() => { const f = $('.stack'); f && f.classList.add('stack-static'); }); }
}

function renderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

function textTexture(lines, w = 1024, h = 640, bg = '#141414') {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = INK; x.font = '800 56px Archivo, system-ui, sans-serif'; x.fillText(lines[0], 64, 120);
  x.font = '400 30px "Public Sans", system-ui, sans-serif'; x.fillStyle = '#9C988E';
  lines.slice(1).forEach((l, i) => x.fillText(l, 64, 200 + i * 56));
  x.fillStyle = OK; x.fillRect(64, h - 90, 220, 8);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* 4. Camera along a path: scroll moves the camera down a curved rail past eight service cards on
   alternating sides, with a dotted route line in the accent below the rail. */
function laptop() {
  const canvas = $('.svc-canvas'), items = $$('.svc-cards li');
  const r = renderer(canvas), scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b0b, 5, 16);
  const cam = new THREE.PerspectiveCamera(55, 1, 0.05, 60);
  const N = items.length, LEN = 6 * N;
  // rail: gentle S-curve heading away from the viewer
  const pts = [];
  for (let i = 0; i <= N + 1; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.9) * 1.6, Math.sin(i * 0.55) * 0.3, -i * 4.2));  // compact: 4.2 units between stops
  const rail = new THREE.CatmullRomCurve3(pts);
  // dotted route line just below the rail
  const DOTS = 420, pos = new Float32Array(DOTS * 3);
  for (let i = 0; i < DOTS; i++) { const p = rail.getPointAt(i / (DOTS - 1)); pos[i * 3] = p.x; pos[i * 3 + 1] = p.y - 1.15; pos[i * 3 + 2] = p.z; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dc = document.createElement('canvas'); dc.width = dc.height = 64; const dx = dc.getContext('2d'); dx.fillStyle = '#fff'; dx.beginPath(); dx.arc(32, 32, 28, 0, 6.283); dx.fill();
  const dotTex = new THREE.CanvasTexture(dc);
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xff5a1f, size: 0.055, sizeAttenuation: true, map: dotTex, transparent: true, alphaTest: 0.4 })));
  // eight UI cards, alternating left and right of the rail
  const cards = items.map((li, i) => {
    const title = li.querySelector('h3').textContent, body = li.querySelector('p').textContent;
    const W = 1200, H = 800;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    // word-wrap helper that never cuts a word off the card
    const wrap = (text, font, maxW, maxLines) => {
      x.font = font; const out = []; let line = '';
      for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
      if (line) out.push(line); return out.slice(0, maxLines);
    };
    x.fillStyle = '#141414'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#FF5A1F'; x.fillRect(0, 0, 14, H);
    x.strokeStyle = '#2E2E2E'; x.lineWidth = 4; x.strokeRect(2, 2, W - 4, H - 4);
    x.fillStyle = '#FF5A1F'; x.font = '800 40px Archivo, system-ui, sans-serif';
    x.fillText(String(i + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0'), 80, 110);
    // title: largest size (96 down to 60px) that fits in two lines
    let size = 96, tl;
    do { tl = wrap(title.toUpperCase(), `800 ${size}px Archivo, system-ui, sans-serif`, W - 160, 3); size -= 6; } while ((tl.length > 2 || tl.some((l) => x.measureText(l).width > W - 160)) && size >= 60);
    x.fillStyle = '#F2F0EA'; x.font = `800 ${size + 6}px Archivo, system-ui, sans-serif`;
    tl.slice(0, 2).forEach((l, k) => x.fillText(l, 80, 230 + k * (size + 12)));
    const bodyTop = 230 + Math.min(tl.length, 2) * (size + 12) + 40;
    x.fillStyle = '#C9C5BB';
    wrap(body, '400 40px "Public Sans", system-ui, sans-serif', W - 160, 5).forEach((l, k) => x.fillText(l, 80, bodyTop + k * 56));
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    const t = (i + 1.5) / (N + 2), p = rail.getPointAt(t), tan = rail.getTangentAt(t); // card 01 starts fully in view
    const side = i % 2 ? 1 : -1, norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    m.position.copy(p).addScaledVector(norm, side * 2.25); m.position.y += 0.2;
    m.lookAt(p.x - tan.x * 4, p.y + 0.2, p.z - tan.z * 4); m.rotateY(side * 0.5);
    scene.add(m); return m;
  });
  // final card at the end of the rail, facing the arriving camera
  const ec = document.createElement('canvas'); ec.width = 1000; ec.height = 620; const ex = ec.getContext('2d');
  // closing card: hands off to the next section instead of ending the page
  ex.fillStyle = '#141414'; ex.fillRect(0, 0, 1000, 620);
  ex.strokeStyle = '#FF5A1F'; ex.lineWidth = 6; ex.strokeRect(3, 3, 994, 614);
  ex.fillStyle = '#FF5A1F'; ex.font = '800 34px Archivo, system-ui, sans-serif'; ex.fillText(String(N).padStart(2, '0') + ' STOPS · ONE PERSON', 64, 100);
  ex.fillStyle = '#F2F0EA'; ex.font = '800 104px Archivo, system-ui, sans-serif'; ex.fillText('ALL OF THIS,', 64, 250); ex.fillText('HANDLED.', 64, 360);
  ex.fillStyle = '#C9C5BB'; ex.font = '500 36px "Public Sans", system-ui, sans-serif'; ex.fillText('Keep scrolling: next is where I learned it.', 64, 460);
  ex.fillStyle = '#FF5A1F'; ex.beginPath(); ex.moveTo(64, 520); ex.lineTo(104, 520); ex.lineTo(84, 548); ex.closePath(); ex.fill();
  const eTex = new THREE.CanvasTexture(ec); eTex.colorSpace = THREE.SRGBColorSpace;
  const endCard = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.11), new THREE.MeshBasicMaterial({ map: eTex, transparent: true }));
  const ep = rail.getPointAt(1), et = rail.getTangentAt(0.99);
  // face the camera's final resting point squarely, a little low so the heading stays clear
  const camEnd = rail.getPointAt(0.88);
  endCard.position.set(ep.x, ep.y - 0.35, ep.z);
  endCard.lookAt(camEnd.x, ep.y - 0.35, camEnd.z);
  scene.add(endCard); cards.push(endCard);
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.8 ? 82 : w / h < 1.3 ? 68 : 55; cam.updateProjectionMatrix(); cards.forEach((m) => m.scale.setScalar(w < 640 ? 0.6 : w / h < 1.3 ? 0.78 : 1)); };
  size(); addEventListener('resize', size);
  let shown = true, cur = 0;
  const look = new THREE.Vector3();
  const frame = () => {
    const rect = services.getBoundingClientRect();
    const target = Math.min(1, Math.max(0, -rect.top / (rect.height - innerHeight)));
    cur += (target - cur) * 0.12;
    const t = cur * 0.88;
    cam.position.copy(rail.getPointAt(t));
    look.copy(rail.getPointAt(Math.min(1, t + 0.03)));
    cam.lookAt(look);
    cards.forEach((m) => { const d = m.position.distanceTo(cam.position); m.material.opacity = Math.min(1, Math.max(0, (15 - d) / 4)) * Math.min(1, Math.max(0, (d - 3.6) / 1.2)); }); // fade in from far, out when passing
    r.render(scene, cam);
    if (shown) requestAnimationFrame(frame);
  };
  new IntersectionObserver((es) => { const was = shown; shown = es[0].isIntersecting; if (shown && !was) requestAnimationFrame(frame); }).observe(services);
  requestAnimationFrame(frame);
}

/* 5. Ring of 8 cards: drag with momentum, snaps to a card, the front one is largest */
function ring() {
  const canvas = $('.ring-canvas'), items = $$('.build-list li'), detail = $('.build-detail'), dotsBox = $('.ring-dots');
  const N = items.length, R = 3.1, STEP = (Math.PI * 2) / N;
  const r = renderer(canvas), scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 50); cam.position.set(0, 0.9, 8.6); cam.lookAt(0, 0, 0);
  const group = new THREE.Group(); scene.add(group);
  const cards = items.map((li, i) => {
    const title = li.querySelector('h3').textContent, kind = li.querySelector('.kind').textContent, glow = li.dataset.logo;
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 840; const x = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const paint = (img) => {
      x.fillStyle = '#141414'; x.fillRect(0, 0, 640, 840);
      x.fillStyle = '#0B0B0B'; x.fillRect(0, 0, 640, 540);
      if (img && glow) {
        // app card: the real app logo on a soft glow in its own color
        const g = x.createRadialGradient(320, 270, 10, 320, 270, 300); g.addColorStop(0, glow + '55'); g.addColorStop(1, 'rgba(11,11,11,0)');
        x.fillStyle = g; x.fillRect(0, 0, 640, 540);
        x.drawImage(img, 160, 110, 320, 320);
      } else if (img) { const s = Math.min(600 / img.width, 500 / img.height); const w = img.width * s, h = img.height * s; x.drawImage(img, (640 - w) / 2, (540 - h) / 2, w, h); }
      x.fillStyle = '#FF5A1F'; x.fillRect(36, 572, 56, 6);
      x.fillStyle = INK; x.font = '800 50px Archivo, system-ui, sans-serif'; x.fillText(title.toUpperCase(), 36, 642);
      x.fillStyle = '#9C988E'; x.font = '600 26px "Public Sans", system-ui, sans-serif'; x.fillText(kind, 36, 690);
      x.strokeStyle = '#2A2A2A'; x.lineWidth = 4; x.strokeRect(2, 2, 636, 836);
      tex.needsUpdate = true;
    };
    paint(null);
    const src = li.dataset.img;
    if (src === 'graph') { fetch('assets/builds/workspace-graph.json').then((r) => r.json()).then((d) => { const gc = document.createElement('canvas'); gc.width = gc.height = 500; const gx = gc.getContext('2d'); gx.fillStyle = '#0B0B0B'; gx.fillRect(0, 0, 500, 500); gx.fillStyle = '#FF5A1F'; for (let k = 0; k < d.n; k++) gx.fillRect(10 + d.p[k * 3] * .48, 10 + d.p[k * 3 + 1] * .48, 1.2, 1.2); paint(gc); }).catch(() => {}); }
    else { const im = new Image(); im.onload = () => paint(im); im.src = src; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    group.add(m); return m;
  });
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.position.z = w < 640 ? 11 : 8.6; cam.updateProjectionMatrix(); };
  size(); addEventListener('resize', size);

  // Active-dot indicator (replaces the arrow buttons). Clicking a dot stops on that build.
  const dots = items.map((li, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', li.querySelector('h3').textContent);
    b.addEventListener('click', () => { const cur = Math.round(-angle / STEP); const k = ((cur % N) + N) % N; let d = i - k; if (d > N / 2) d -= N; if (d < -N / 2) d += N; target = -(cur + d) * STEP; hold(5000); });
    dotsBox && dotsBox.appendChild(b); return b;
  });

  // Auto-spin: slow constant turn; pauses while dragging, on hover, and for a few seconds after a choice.
  const SPIN = 0.16; // radians per second
  let angle = 0, vel = 0, target = 0, drag = false, lastX = 0, front = -1, hover = false, holdUntil = 0;
  const hold = (ms) => { holdUntil = performance.now() + ms; };
  const show = (i) => {
    if (i === front) return; front = i; const li = items[i];
    detail.innerHTML = `<h3>${li.querySelector('h3').textContent}</h3><p class="kind">${li.querySelector('.kind').textContent}</p><p>${li.querySelector('p:last-child').textContent}</p>`;
    dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-selected', String(k === i)); });
  };
  canvas.addEventListener('pointerenter', () => { hover = true; });
  canvas.addEventListener('pointerleave', () => { hover = false; });
  canvas.addEventListener('pointerdown', (e) => { drag = true; lastX = e.clientX; vel = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!drag) return; const dx = (e.clientX - lastX) / canvas.clientWidth * 4; lastX = e.clientX; angle += dx; vel = dx; });
  const release = () => { if (!drag) return; drag = false; target = Math.round((angle + vel * 8) / STEP) * STEP; hold(4000); };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); target = Math.round(target / STEP) * STEP - (e.key === 'ArrowRight' ? 1 : -1) * STEP; hold(5000); } });
  let shown = true, last = performance.now();
  const frame = (now = performance.now()) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const spinning = !drag && !hover && now > holdUntil;
    if (spinning) { angle -= SPIN * dt; target = angle; }
    else if (!drag) { angle += (target - angle) * (1 - Math.pow(0.91, dt * 60)); }
    cards.forEach((m, i) => {
      const a = i * STEP + angle;
      m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      m.lookAt(cam.position.x, 0, cam.position.z);
      const f = (Math.cos(a) + 1) / 2; // 1 at the front, 0 at the back
      const s = 0.62 + f * f * 0.6; m.scale.set(s, s, s);
      m.material.opacity = 0.35 + f * 0.65;
      m.renderOrder = Math.round(f * 100);
    });
    const idx = ((Math.round(-angle / STEP) % N) + N) % N; show(idx);
    r.render(scene, cam);
    if (shown) requestAnimationFrame(frame);
  };
  new IntersectionObserver((es) => { const was = shown; shown = es[0].isIntersecting; if (shown && !was) { last = performance.now(); requestAnimationFrame(frame); } }).observe(canvas);
  requestAnimationFrame(frame);
}

/* 6. Proof: depth-parallax planes. Five proof cards at increasing depth, alternating sides, with soft
   shadows and glossy accent spheres for foreground parallax. Scroll dollies the camera past them; the
   caption (the real list item) follows the card in front. */
function proofDepth() {
  const sec = proof3d, canvas = $('.pf-canvas', sec), lis = $$('.proofs > li', sec), N = lis.length, num = $('.pf-count b', sec);
  const r = renderer(canvas), scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b0b, 3.5, 13);
  const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 60);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-2, 3, 4); scene.add(key);
  const GAP = 3.4, W = 1200, H = 760;
  // soft contact shadow shared by every card
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d');
  const g = sx.createRadialGradient(64, 64, 6, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = g; sx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(sc);
  const cards = lis.map((li, i) => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const title = li.querySelector('h3').childNodes[0].textContent.trim();
    const paint = (img) => {
      x.fillStyle = '#141414'; x.fillRect(0, 0, W, H);
      x.strokeStyle = '#2E2E2E'; x.lineWidth = 4; x.strokeRect(2, 2, W - 4, H - 4);
      x.fillStyle = '#FF5A1F'; x.font = '800 34px Archivo, system-ui, sans-serif';
      x.fillText('PROOF ' + String(i + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0'), 64, 84);
      x.fillStyle = '#F2F0EA'; x.font = '800 62px Archivo, system-ui, sans-serif'; x.fillText(title.toUpperCase(), 64, 158);
      const bx = 64, by = 200, bw = W - 128, bh = H - 264;
      if (img) {
        const k = Math.min(bw / img.width, bh / img.height), w = img.width * k, h = img.height * k;
        x.drawImage(img, bx + (bw - w) / 2, by + (bh - h) / 2, w, h);
      } else {
        // no screenshot: draw the four live tools as UI rows
        ['Inbox triage', 'Calm a customer', 'Summarize a call', 'Plan the day'].forEach((t, k) => {
          const y = by + k * (bh / 4); x.fillStyle = '#1C1C1C'; x.fillRect(bx, y + 8, bw, bh / 4 - 16);
          x.fillStyle = '#FF5A1F'; x.fillRect(bx, y + 8, 10, bh / 4 - 16);
          x.fillStyle = '#F2F0EA'; x.font = '700 40px Archivo, system-ui, sans-serif'; x.fillText(t.toUpperCase(), bx + 44, y + bh / 8 + 14);
          x.fillStyle = '#9C988E'; x.font = '500 28px "Public Sans", system-ui, sans-serif'; x.fillText('LIVE', bx + bw - 120, y + bh / 8 + 12);
        });
      }
      tex.needsUpdate = true;
    };
    paint(null);
    if (li.dataset.img) { const im = new Image(); im.onload = () => paint(im); im.src = li.dataset.img; }
    const last = i === N - 1, side = i % 2 ? 1 : -1;
    const grp = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1 * H / W), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.0), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    // explicit order: transparent sorting would otherwise sometimes draw the shadow over its card
    sh.position.set(0.08, -0.12, -0.06); sh.renderOrder = 1; m.renderOrder = 2; grp.add(sh, m);
    grp.position.set(last ? 0 : side * 1.25, last ? 0 : (i % 3 - 1) * 0.16, -i * GAP);
    grp.rotation.y = last ? 0 : -side * 0.22;
    scene.add(grp); return { grp, m, sh, side, last };
  });
  // glossy accent spheres near the path: they pass fastest, which sells the depth
  const ball = new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.22, metalness: 0.15 });
  [[-2.1, .7, -1.6, .12], [1.9, -.8, -4.6, .09], [-1.5, -1, -7.4, .07], [2.3, .9, -9.2, .13], [-2.4, .2, -11.6, .08], [1.2, 1.2, -12.8, .05], [.6, -1.3, -2.8, .05]]
    .forEach(([px, py, pz, rad]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(rad, 32, 16), ball); s.position.set(px, py, pz); scene.add(s); });
  const z0 = 4.2, z1 = -(N - 1) * GAP + 3.2;
  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; r.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w / h < 0.8 ? 72 : 50; cam.updateProjectionMatrix();
    const narrow = w < 720; cards.forEach((c) => { c.grp.scale.setScalar(narrow ? 0.7 : 1); if (!c.last) c.grp.position.x = c.side * (narrow ? 0.5 : 1.25); });
  };
  size(); addEventListener('resize', size);
  let shown = true, cur = 0, active = -1, prev = performance.now();
  const look = new THREE.Vector3();
  const frame = (now = performance.now()) => {
    const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    const rect = sec.getBoundingClientRect();
    const target = Math.min(1, Math.max(0, -rect.top / (rect.height - innerHeight)));
    cur += (target - cur) * (1 - Math.pow(0.88, dt * 60));
    const z = z0 + (z1 - z0) * cur;
    cam.position.set(Math.sin(cur * 6.3) * 0.22, Math.cos(cur * 5.1) * 0.1, z);
    look.set(cam.position.x * 0.3, 0, z - 5); cam.lookAt(look);
    cards.forEach((c) => { const d = c.grp.position.z - z; const o = d > -0.6 ? 0 : Math.min(1, (-d - 0.6) / 1.2); c.m.material.opacity = o; c.sh.material.opacity = o; });
    const idx = Math.min(N - 1, Math.max(0, Math.round(cur * (N - 1))));
    if (idx !== active) { active = idx; lis.forEach((li, k) => li.classList.toggle('on', k === idx)); if (num) num.textContent = String(idx + 1).padStart(2, '0'); }
    r.render(scene, cam);
    if (shown) requestAnimationFrame(frame);
  };
  new IntersectionObserver((es) => { const was = shown; shown = es[0].isIntersecting; if (shown && !was) { prev = performance.now(); requestAnimationFrame(frame); } }).observe(sec);
  requestAnimationFrame(frame);
}

/* 7. My stack: DNA helix (three-particles-helix). Two beaded strands (accent and ink) with rungs turn
   slowly while a bright pulse climbs; the tool logos ride the rung ends as real 3D extruded shapes
   (official full-color logo PNGs in assets/icons). The pointer adds spin and tilt. */
async function stackFly() {
  const canvas = $('.stack-canvas'); if (!canvas) return;
  // official full-color logos (lobehub icons, assets/icons/*.png): drawn as-is, no recoloring
  const TOOLS = ['claude-code', 'chatgpt', 'opencode', 'hermes', 'gemini', 'obsidian', 'n8n', 'cloudflare', 'github', 'google-workspace'];
  const r = renderer(canvas), scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 50); cam.position.set(0, 0, 8.2);
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.8); key.position.set(3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff5a1f, 1.6); rim.position.set(-4, -2, -3); scene.add(rim);
  const helix = new THREE.Group(); helix.rotation.z = 0.4; helix.position.x = 0.1; scene.add(helix);
  const HEIGHT = 6.2, TURNS = 2.2, RAD = 1.05;
  const at = (t, strand) => { const a = t * TURNS * Math.PI * 2 + strand * Math.PI; return new THREE.Vector3(Math.cos(a) * RAD, (t - 0.5) * HEIGHT, Math.sin(a) * RAD); };
  // beaded strands + rungs as one Points object with per-point size
  const SN = 700, RUNGS = 22, RP = 12;
  const count = SN * 2 + RUNGS * RP;
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count), base = new Float32Array(count), tt = new Float32Array(count);
  const cA = new THREE.Color(0xff5a1f), cB = new THREE.Color(0xf2f0ea), cR = new THREE.Color(0x232120);
  let k = 0;
  for (let s = 0; s < 2; s++) for (let i = 0; i < SN; i++) {
    const t = i / (SN - 1), p = at(t, s); pos.set([p.x + (Math.random() - .5) * .03, p.y, p.z + (Math.random() - .5) * .03], k * 3);
    (s ? cB : cA).toArray(col, k * 3); base[k] = s ? 4.4 : 5.4; tt[k] = t; k++;
  }
  for (let j = 0; j < RUNGS; j++) {
    const t = (j + 0.5) / RUNGS, a = at(t, 0), b = at(t, 1);
    for (let q = 0; q < RP; q++) { const p = a.clone().lerp(b, q / (RP - 1)); pos.set([p.x, p.y, p.z], k * 3); cR.toArray(col, k * 3); base[k] = 3.2; tt[k] = -1; k++; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sizeAttr = new THREE.BufferAttribute(size, 1); g.setAttribute('size', sizeAttr);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, vertexColors: true,
    uniforms: { px: { value: Math.min(devicePixelRatio || 1, 2) } },
    vertexShader: 'attribute float size; varying vec3 vC; varying float vD; uniform float px; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = clamp((-mv.z - 5.0) / 6.0, 0.0, 1.0); gl_PointSize = size * px * (7.0 / -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vC; varying float vD; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.15, d) * (1.0 - vD * 0.65); gl_FragColor = vec4(vC, a); }',
  });
  helix.add(new THREE.Points(g, mat));
  // solid strands: thick tubes under the beads so the helix reads as a real structure
  const strandMat = [
    new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff5a1f, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: 0xf2f0ea, emissive: 0xf2f0ea, emissiveIntensity: 0.18, roughness: 0.4, metalness: 0.1 }),
  ];
  [0, 1].forEach((sIdx) => {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 160 }, (_, i) => at(i / 159, sIdx)));
    helix.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 420, 0.055, 12, false), strandMat[sIdx]));
  });
  // rungs as rods between the strands
  const rungMat = new THREE.MeshStandardMaterial({ color: 0x6b6660, roughness: 0.6, transparent: true, opacity: 0.1, depthWrite: false });
  const up = new THREE.Vector3(0, 1, 0);
  const rod = (a, b, r, mat) => {
    const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize()); return m;
  };
  for (let j = 0; j < RUNGS; j++) { const t = (j + 0.5) / RUNGS; helix.add(rod(at(t, 0), at(t, 1), 0.022, rungMat)); }
  // 3D logos on rung ends
  const icons = [], texLoader = new THREE.TextureLoader();
  TOOLS.forEach((name, i) => {
    const t = 0.07 + (i / (TOOLS.length - 1)) * 0.86, strand = i % 2;
    // thin black border: black silhouette of the logo drawn in a ring behind it, then the logo on top
    const cv = document.createElement('canvas'); cv.width = cv.height = 288; const cx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const img = new Image();
    img.onload = () => {
      const sil = document.createElement('canvas'); sil.width = sil.height = 256; const sx = sil.getContext('2d');
      sx.drawImage(img, 0, 0, 256, 256); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#000'; sx.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 16; k++) { const ang = (k / 16) * Math.PI * 2; cx.drawImage(sil, 16 + Math.cos(ang) * 5, 16 + Math.sin(ang) * 5); }
      cx.drawImage(img, 16, 16, 256, 256); tex.needsUpdate = true;
    };
    img.src = `assets/icons/${name}.png`;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const holder = new THREE.Group(); holder.add(m); helix.add(holder);
    const base = at(t, strand), out = new THREE.Vector3(base.x, 0, base.z).normalize();
    holder.position.copy(base.clone().addScaledVector(out, 0.55)); // logos float just outside their strand (no connector)
    icons.push({ holder, m, t, strand, ph: Math.random() * 6.28 });
  });
  const size2 = () => { const w = canvas.clientWidth, h = canvas.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.position.z = w / h < 0.9 ? 12 : 9.8; cam.updateProjectionMatrix(); };
  size2(); new ResizeObserver(size2).observe(canvas);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tx = 0, ty = 0, px = 0, py = 0, spin = 0, extra = 0;
  canvas.addEventListener('pointermove', (e) => { const b = canvas.getBoundingClientRect(); tx = ((e.clientX - b.left) / b.width - 0.5) * 2; ty = ((e.clientY - b.top) / b.height - 0.5) * 2; });
  canvas.addEventListener('pointerleave', () => { tx = ty = 0; });
  let shown = true, last = performance.now(), time = 0;
  const tmp = new THREE.Vector3();
  const frame = (now = performance.now()) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
    px += (tx - px) * 0.06; py += (ty - py) * 0.06;
    extra += (px * 0.9 - extra) * 0.06;
    if (!reduce) spin += (0.42 + extra) * dt;
    helix.rotation.y = spin; helix.rotation.x = py * 0.25; helix.rotation.z = 0.4 + px * 0.08;
    // pulse climbs the strands
    const pulse = ((time * 0.11) % 1.3) - 0.15;
    for (let i = 0; i < count; i++) { const t = tt[i]; size[i] = base[i] * (t < 0 ? 1 : 1 + 1.6 * Math.exp(-((t - pulse) ** 2) / 0.003)); }
    sizeAttr.needsUpdate = true;
    // icons sit just outside the strand and always turn their face to the camera, with a slow sway so
    // the extrusion depth reads as 3D
    icons.forEach((ic) => {
      
      const glow = 1 + 0.35 * Math.exp(-((ic.t - pulse) ** 2) / 0.004);
      ic.holder.scale.setScalar(glow);
      ic.holder.quaternion.copy(helix.quaternion).invert();
      ic.m.rotation.y = Math.sin(time * 0.9 + ic.ph) * 0.25; ic.m.rotation.x = Math.sin(time * 0.7 + ic.ph) * 0.08;
    });
    r.render(scene, cam);
    if (shown) requestAnimationFrame(frame);
  };
  new IntersectionObserver((es) => { const was = shown; shown = es[0].isIntersecting; if (shown && !was) { last = performance.now(); requestAnimationFrame(frame); } }).observe(canvas);
  requestAnimationFrame(frame);
}
