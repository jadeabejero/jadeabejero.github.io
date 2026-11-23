// Sample work pages: contents rail with scroll-spy, reading progress, tickable checklists (saved per
// page in this browser), copy buttons on email drafts, scrollable tables and section reveals.
// Everything degrades to the plain document if this file fails.
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const doc = $('main.doc'); if (!doc) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  // 1. Layout: document body + contents rail built from the section headings
  const heads = $$('h2.sect', doc);
  const grid = document.createElement('div'); grid.className = 'doc-grid';
  const body = document.createElement('div'); body.className = 'doc-body';
  while (doc.firstChild) body.appendChild(doc.firstChild);
  grid.appendChild(body); doc.appendChild(grid);
  let links = [];
  if (heads.length > 1) {
    const toc = document.createElement('aside'); toc.className = 'toc'; toc.setAttribute('aria-label', 'On this page');
    toc.innerHTML = '<p>On this page</p><ol></ol>';
    heads.forEach((h, i) => {
      h.id = h.id || 'sec-' + (i + 1);
      const a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent.replace(/^\s*\d+\s*[·.]\s*/, '');
      const li = document.createElement('li'); li.appendChild(a); $('ol', toc).appendChild(li); links.push(a);
    });
    grid.appendChild(toc);
  }

  // 2. Reading progress line under the top bar + scroll-spy
  const bar = $('nav.docbar'); let prog = null;
  if (bar) { prog = document.createElement('i'); prog.className = 'progress'; prog.setAttribute('aria-hidden', 'true'); bar.appendChild(prog); }
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.setProperty('--read', max > 0 ? (scrollY / max).toFixed(4) : 1);
    let cur = 0; heads.forEach((h, i) => { if (h.getBoundingClientRect().top < innerHeight * 0.35) cur = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
  };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

  // 3. Checklists: items shown done in the original start done; click or Enter/Space toggles; saved per page
  const key = 'jx-sample:' + location.pathname;
  const saved = store.get(key) || {};
  let total = 0, done = 0; const tallies = [];
  const tallyEl = document.createElement('div'); tallyEl.className = 'tally';
  const recount = () => {
    total = 0; done = 0;
    $$('ul.checks[data-tick]').forEach((ul) => { const items = $$('li', ul), d = items.filter((li) => li.classList.contains('done')).length; total += items.length; done += d; });
    tallies.forEach(({ ul, el }) => { const items = $$('li', ul), d = items.filter((li) => li.classList.contains('done')).length; el.querySelector('span').textContent = `${d} of ${items.length} done`; el.style.setProperty('--p', items.length ? d / items.length : 0); el.querySelector('i').style.setProperty('--p', items.length ? d / items.length : 0); });
    tallyEl.innerHTML = `<b>${done}/${total}</b>checklist items done`;
  };
  $$('ul.checks', doc).forEach((ul, u) => {
    ul.setAttribute('data-tick', '');
    $$('li', ul).forEach((li, k) => {
      const id = u + '-' + k;
      const isDone = id in saved ? saved[id] : !li.classList.contains('todo');
      li.classList.remove('todo'); li.classList.toggle('done', isDone);
      li.tabIndex = 0; li.setAttribute('role', 'checkbox'); li.setAttribute('aria-checked', String(isDone));
      const flip = () => { const v = !li.classList.contains('done'); li.classList.toggle('done', v); li.setAttribute('aria-checked', String(v)); saved[id] = v; store.set(key, saved); recount(); };
      li.addEventListener('click', (e) => { if (!e.target.closest('a')) flip(); });
      li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    });
    const el = document.createElement('div'); el.className = 'tick-bar'; el.innerHTML = '<span></span><i></i>';
    ul.parentNode.insertBefore(el, ul); tallies.push({ ul, el });
  });
  if (tallies.length) { const toc = $('.toc'); if (toc) toc.appendChild(tallyEl); recount(); }

  // 4. Copy buttons on emails (drafts and sent replies are templates people reuse)
  $$('.email', doc).forEach((em) => {
    const b = em.querySelector('.body'); if (!b) return;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'copy'; btn.textContent = 'Copy text';
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.innerText.trim()); btn.textContent = 'Copied'; } catch (e) { btn.textContent = 'Select to copy'; }
      setTimeout(() => { btn.textContent = 'Copy text'; }, 1600);
    });
    em.appendChild(btn);
  });

  // 5. Tables scroll inside their own box on small screens
  $$('table.grid', doc).forEach((t) => { if (t.parentNode.classList.contains('tbl')) return; const w = document.createElement('div'); w.className = 'tbl'; t.parentNode.insertBefore(w, t); w.appendChild(t); });

  // 6. Section reveal
  if (!reduce && 'IntersectionObserver' in window) {
    const els = $$('.doc-body > :not(.doc-head)', doc);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => { el.classList.add('rv'); io.observe(el); });
  }
})();
