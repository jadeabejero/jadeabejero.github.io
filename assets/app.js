(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Reveal on scroll (content is visible without JS) */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => io.observe(el));
    // Rail: mark the section in view
    const links = $$('.rail nav a');
    const secIO = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false'));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => secIO.observe(s));
  } else reveals.forEach((el) => el.classList.add('in'));

  /* Proof viewer */
  const viewer = $('#viewer');
  if (viewer && viewer.showModal) {
    const img = document.createElement('img');
    viewer.prepend(img);
    $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
      img.src = b.dataset.view; img.alt = b.querySelector('img') ? b.querySelector('img').alt : '';
      $('#viewer-cap').textContent = b.dataset.caption || '';
      viewer.showModal();
    }));
    $('#viewer-close').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
  } else $$('[data-view]').forEach((b) => b.addEventListener('click', () => window.open(b.dataset.view, '_blank')));

  /* Tabs (roving focus, arrow keys) */
  const tabs = $$('.tabs [role="tab"]');
  function select(tab, focus) {
    tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
    if (focus) tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const k = e.key; let n = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
      if (k === 'ArrowLeft' || k === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });

  function copyButton(getText) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn copy'; b.textContent = 'Copy';
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(getText()); b.textContent = 'Copied'; }
      catch (e) { b.textContent = 'Select and copy manually'; }
      setTimeout(() => { b.textContent = 'Copy'; }, 1800);
    });
    return b;
  }

  /* Tool 1: Calm a customer */
  const ISSUES = [
    { key: 'billing', label: 'Billing', re: /charg|bill|refund|overcharg|double|twice|payment|invoice|fee/i,
      ack: 'Being charged incorrectly is stressful, and I understand why you are upset.',
      act: 'I am reviewing your account now to confirm the extra charge. Once it is confirmed, I will reverse it and send you the confirmation in writing.' },
    { key: 'delivery', label: 'Delivery', re: /deliver|ship|package|parcel|arriv|tracking|late order|never came|missing item/i,
      ack: 'Waiting on an order that does not show up is frustrating, especially when you planned around it.',
      act: 'I am checking the tracking and the warehouse record now. If it is lost, I will send a replacement or refund, whichever you prefer.' },
    { key: 'service', label: 'Service down', re: /not working|broken|down\b|outage|internet|signal|error|crash|dropp|slow|no service|disconnect(?:ing|s)\b/i,
      ack: 'Losing service when you need it is a real problem, not a small inconvenience.',
      act: 'I am checking your line and our outage records now, and I will run the fix from my side so you do not have to troubleshoot alone.' },
    { key: 'wait', label: 'Long wait', re: /hold|waited|waiting|no one|nobody|no reply|disconnected|called .{0,20}(times|again|last week)|ignored/i,
      ack: 'I am sorry you had to wait and explain this more than once. That is on us, and you should not have to do it again.',
      act: '' }
  ];
  const TRIGGERS = /ridiculous|unacceptable|worst|terrible|awful|angry|furious|scam|joke|disgust|never again|lawyer|lawsuit|sue|fed up|sick of|useless|incompetent|cancel/gi;

  function calm() {
    const raw = $('#calm-in').value.trim();
    const out = $('#calm-out');
    if (raw.length < 12) { out.innerHTML = '<p class="error">Paste a customer message of at least one sentence, then press Draft a calm reply.</p>'; return; }
    const words = raw.match(/[A-Za-z']+/g) || [];
    const caps = words.filter((w) => w.length > 2 && w === w.toUpperCase()).length;
    const bangs = (raw.match(/!/g) || []).length;
    const trig = Array.from(new Set((raw.match(TRIGGERS) || []).map((t) => t.toLowerCase())));
    const heat = Math.min(100, caps * 12 + bangs * 7 + trig.length * 14 + (raw.length > 280 ? 8 : 0));
    const nameM = raw.match(/(?:[—–-]\s*|thanks,?\s*|regards,?\s*|my name is\s+|this is\s+)([A-Z][a-z]{1,15})\s*\.?$/m) || raw.match(/my name is\s+([A-Z][a-z]{1,15})/i);
    const name = nameM ? nameM[1] : 'there';
    const found = ISSUES.filter((i) => i.re.test(raw));
    const cancel = /cancel|close (my )?account|switch(ing)? to|leave/i.test(raw);

    const lines = [`Hi ${name},`, ''];
    const acks = found.map((f) => f.ack);
    lines.push(acks.length ? acks.join(' ') : 'Thank you for telling me exactly what happened. I understand this has been frustrating.');
    lines.push('', 'I am taking this on personally, so you will not need to call in again.');
    const acts = found.map((f) => f.act).filter(Boolean);
    if (acts.length) lines.push(acts.join(' '));
    else lines.push('I am looking into your account now to find out what went wrong.');
    if (cancel) lines.push('', 'I would hate to lose you over this. Let me fix it first. If you still want to cancel afterwards, I will make that simple too.');
    lines.push('', heat >= 50 ? 'You will hear from me before the end of today with an update, even if it is not fully solved yet.' : 'You will hear from me within 24 hours with an update.');
    lines.push('', 'Thank you for your patience,', 'Xyrus');
    const reply = lines.join('\n');

    out.innerHTML = `
      <h4>How upset they are</h4>
      <div class="meter"><span>Calm</span><i style="--v:0%"></i><span>Furious</span></div>
      <p style="margin:8px 0 0;font-size:.88rem">${caps} all-caps words · ${bangs} exclamation marks${trig.length ? ' · trigger words: ' + esc(trig.join(', ')) : ''}</p>
      <h4>What the issue is</h4>
      <div class="chips">${(found.length ? found.map((f) => f.label) : ['General complaint']).concat(cancel ? ['Wants to cancel'] : []).map((l) => `<span>${esc(l)}</span>`).join('')}</div>
      <h4>Draft reply</h4>
      <div class="reply">${esc(reply)}</div>
      <h4>Why it's written this way</h4>
      <ul>
        <li>It starts with their exact problem, not a script line, so they feel heard.</li>
        <li>It says "I", not "we": one person owns it, so they don't have to call again.</li>
        <li>It gives a specific action and a deadline${heat >= 50 ? ' (same day, because they are very upset)' : ''}.</li>
        ${cancel ? '<li>It answers the cancel threat calmly: fix it first, then respect their choice.</li>' : ''}
      </ul>`;
    out.appendChild(copyButton(() => reply));
    requestAnimationFrame(() => { const m = $('.meter i', out); if (m) m.style.setProperty('--v', heat + '%'); });
    if (window.inkBasin) window.inkBasin.still();
  }

  /* Tool 2: Summarize a call */
  function ticket() {
    const raw = $('#ticket-in').value.trim();
    const out = $('#ticket-out');
    if (raw.length < 20) { out.innerHTML = '<p class="error">Paste a few lines of notes (who called, what happened, what you did), then press Make the ticket.</p>'; return; }
    const nm = raw.match(/\b(?:cust(?:omer)?|client|caller|member)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/) || raw.match(/\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/);
    const name = nm ? nm[1] : 'Customer';
    const ids = Array.from(new Set((raw.match(/(?:#\s?\d{3,}|\b(?:order|account|acct|ticket|case)\s*(?:no\.?|number)?\s*#?\s*\d{3,})/gi) || []).map((s) => s.replace(/\s+/g, ' ').trim())));
    const money = Array.from(new Set(raw.match(/\$\s?\d[\d,]*(?:\.\d{2})?/g) || []));
    const dates = Array.from(new Set(raw.match(/\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s\d{1,2}|(?:mon|tues|wednes|thurs|fri|satur|sun)day|today|tomorrow|tonight|\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/gi) || []));
    const clauses = raw.split(/[.\n;!?]+|,\s+(?=(?:and\s+)?(?:i|we|he|she|they|need|will|checked|reset|applied)\b)/i).map((s) => s.trim()).filter((s) => s.length > 3);
    const done = [], next = [], issue = [];
    clauses.forEach((c) => {
      if (/\b(need to|needs to|will|should|follow ?up|call (?:him|her|them)? ?back|schedule|to confirm|pending|waiting on)\b/i.test(c)) next.push(c);
      else if (/\b(i|we)\s+(?:\w+\s){0,2}?(checked|reset|applied|sent|refunded|escalated|updated|confirmed|verified|ran|replaced|issued|credited|transferred|rebooted|fixed|explained|saw)\b|^(checked|reset|applied|sent|refunded|escalated|updated|verified|saw|ran)\b/i.test(c)) done.push(c);
      else if (/\b(says?|said|report|complain|issue|problem|not working|dropping|down|wants?|asking|called re|re:?|charged|missing|broken)\b/i.test(c)) issue.push(c);
    });
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const clean = (s) => cap(s.replace(/^(and|but|so)\s+/i, '').replace(/\bcust\b/gi, 'customer'));
    const churn = /cancel|leave|switch/i.test(raw);
    const high = churn || /outage|urgent|asap|legal|lawyer|again|escalat/i.test(raw);
    const summary = issue.length ? clean(issue[0]) : clean(clauses[0] || raw.slice(0, 120));
    const text = [
      `TICKET: ${name}`,
      `Priority: ${high ? 'High' : 'Normal'}${churn ? ' (churn risk)' : ''}`,
      `Issue: ${summary}`,
      ids.length ? `References: ${ids.join(', ')}` : '',
      money.length ? `Amounts: ${money.join(', ')}` : '',
      dates.length ? `Dates/times: ${dates.join(', ')}` : '',
      'Done so far:', ...(done.length ? done.map((d) => '- ' + clean(d)) : ['- Nothing recorded yet']),
      'Next steps:', ...(next.length ? next.map((d) => '- ' + clean(d)) : ['- Add the next step and an owner'])
    ].filter(Boolean).join('\n');

    out.innerHTML = `
      <h4>Ticket</h4>
      <p style="margin:0;font-size:1.25rem;font-weight:400">${esc(name)} · ${esc(summary)}</p>
      <div class="chips" style="margin-top:12px"><span>${high ? 'High priority' : 'Normal priority'}</span>${churn ? '<span>Churn risk: mentioned cancelling</span>' : ''}${ids.map((i) => `<span>${esc(i)}</span>`).join('')}${money.map((m) => `<span>${esc(m)}</span>`).join('')}${dates.map((d) => `<span>${esc(d)}</span>`).join('')}</div>
      <h4>Done so far</h4><ul>${(done.length ? done : ['Nothing recorded yet']).map((d) => `<li>${esc(clean(d))}</li>`).join('')}</ul>
      <h4>Next steps</h4><ul>${(next.length ? next : ['Add the next step and an owner']).map((d) => `<li>${esc(clean(d))}</li>`).join('')}</ul>
      <h4>Plain-text version</h4><div class="reply">${esc(text)}</div>`;
    out.appendChild(copyButton(() => text));
  }

  /* Tool 3: Plan the day */
  function tzOffset(ms, tz) {
    const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
  }
  function plan() {
    const tz = $('#plan-tz').value, start = $('#plan-start').value || '09:00';
    const out = $('#plan-out');
    const rows = $('#plan-in').value.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!rows.length) { out.innerHTML = '<p class="error">Add at least one task, one per line, like "Inbox sweep 30m".</p>'; return; }
    let guessed = 0;
    const tasks = rows.map((l, i) => {
      const urgent = /^!|!$/.test(l);
      let mins = 0;
      l.replace(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?)\b/gi, (_, n) => { mins += parseFloat(n) * 60; return ''; })
       .replace(/(\d+)\s*(m|min|mins|minutes?)\b/gi, (_, n) => { mins += parseInt(n, 10); return ''; });
      if (!mins) { mins = 30; guessed++; }
      const name = l.replace(/^!\s*|\s*!$/g, '').replace(/\s*\d+(?:\.\d+)?\s*(h|hr|hrs|hours?|m|min|mins|minutes?)\b/gi, '').trim() || 'Task';
      return { name, mins: Math.round(mins), urgent, i };
    }).sort((a, b) => (b.urgent - a.urgent) || (a.i - b.i));

    // Start instant in the client's time zone, today
    const now = new Date();
    const dp = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).forEach((x) => { dp[x.type] = x.value; });
    const [hh, mm] = start.split(':').map(Number);
    const guess = Date.UTC(+dp.year, +dp.month - 1, +dp.day, hh, mm);
    let t = guess - tzOffset(guess, tz);
    t = guess - tzOffset(t, tz);

    const fmt = (ms, zone) => new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
    const blocks = []; let worked = 0, sinceBreak = 0, lunch = false;
    tasks.forEach((k) => {
      blocks.push({ name: k.name, mins: k.mins, urgent: k.urgent, s: t }); t += k.mins * 60000; worked += k.mins; sinceBreak += k.mins;
      if (!lunch && worked >= 240) { blocks.push({ name: 'Lunch break', mins: 30, brk: true, s: t }); t += 30 * 60000; lunch = true; sinceBreak = 0; }
      else if (sinceBreak >= 120) { blocks.push({ name: 'Short break', mins: 15, brk: true, s: t }); t += 15 * 60000; sinceBreak = 0; }
    });
    if (blocks.length && blocks[blocks.length - 1].brk) { t -= blocks.pop().mins * 60000; }
    const startMs = blocks[0].s, endMs = t;
    const manilaStartH = +new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hourCycle: 'h23' }).format(new Date(startMs));
    const night = manilaStartH >= 18 || manilaStartH < 6;
    const zoneName = $('#plan-tz').selectedOptions[0].textContent.replace(/\s*\(.*\)/, '');
    const text = blocks.map((b) => `${fmt(b.s, tz)} (${fmt(b.s, 'Asia/Manila')} Manila)  ${b.name}${b.urgent ? ' [urgent]' : ''}  ${b.mins}m`).join('\n');

    out.innerHTML = `
      <h4>Schedule</h4>
      <table class="plan num"><thead><tr><th>${esc(zoneName)}</th><th>Manila</th><th>Task</th><th>Time</th></tr></thead>
      <tbody>${blocks.map((b) => `<tr class="${b.brk ? 'brk' : ''}"><td>${fmt(b.s, tz)}</td><td>${fmt(b.s, 'Asia/Manila')}</td><td>${esc(b.name)}${b.urgent ? ' <span class="label">Urgent</span>' : ''}</td><td>${b.mins}m</td></tr>`).join('')}</tbody></table>
      <h4>Summary</h4>
      <ul>
        <li>${Math.round(worked / 6) / 10} hours of work, done by ${fmt(endMs, tz)} ${esc(zoneName)} time.</li>
        <li>In Manila that's ${fmt(startMs, 'Asia/Manila')} to ${fmt(endMs, 'Asia/Manila')}${night ? ', a night shift' : ''}.</li>
        <li>Urgent tasks go first. A short break comes after every 2 hours, and lunch after 4.</li>
        ${guessed ? `<li>${guessed} task${guessed > 1 ? 's had' : ' had'} no duration, so I assumed 30 minutes.</li>` : ''}
      </ul>`;
    out.appendChild(copyButton(() => text));
  }

  const on = (id, fn) => { const b = $(id); if (b) b.addEventListener('click', fn); };
  on('#calm-run', calm); on('#ticket-run', ticket); on('#plan-run', plan);

  /* Case files */
  const CASES = [
    { code: 'EM-01', file: 'email-management', title: 'Inbox Management Sprint', skill: 'Email management',
      lede: 'A demonstration inbox taken to zero and kept there: triage rules, pre-drafted replies, and a daily sweep routine an executive can rely on without checking in.',
      steps: ['The starting mess', 'Triage rules I set up', 'Draft replies written to sound like the executive', 'Daily sweep checklist'] },
    { code: 'CM-02', file: 'calendar-management', title: 'Executive Calendar Rebuild', skill: 'Calendar management',
      lede: 'A chaotic executive week rebuilt into a protected, color-coded schedule: meeting intake, conflict resolution, focus blocks, and a briefing sheet delivered every morning.',
      steps: ['Problems found in the audit', 'The weekly template I designed', 'How I handle conflicts', 'Morning briefing sheet, delivered 07:00 daily'] },
    { code: 'TM-03', file: 'travel-management', title: 'Travel Package: Cebu Client Trip', skill: 'Travel management',
      lede: 'Flights, hotel, ground transport and a minute-by-minute itinerary for a 3-day client visit, with price options, contingency plans and a backup for every moving part.',
      steps: ['Options presented: the founder picks, I book', 'Day-by-day itinerary', 'Booked and confirmed checklist'] },
    { code: 'RM-04', file: 'research-management', title: 'Research Brief: Co-working Space Shortlist', skill: 'Research',
      lede: 'An open question turned into a decision-ready shortlist: 12 providers scanned, 6 evaluated in depth, one clear recommendation with the math shown.',
      steps: ['The question, sharpened', 'Comparison matrix', 'Recommendation', 'Verification trail'] },
    { code: 'HM-05', file: 'household-management', title: 'Household Bills & Services Tracker', skill: 'Household management',
      lede: 'A private-client system for running a household the way an office is run: every bill on a schedule, every provider on file, every renewal caught before it lapses.',
      steps: ['Monthly bills schedule', 'The three rules that keep this safe', 'Provider directory', 'Renewal and maintenance radar'] },
    { code: 'SM-06', file: 'social-media-management', title: '30-Day Content Calendar: Real Estate Agent', skill: 'Social media',
      lede: 'A month of posts planned, drafted and scheduled for a solo realtor: 4 posts a week, Canva templates that stay on-brand, and a monthly analytics report that decides next month’s plan.',
      steps: ['Content pillars', 'Week 1 of the calendar', 'Monthly analytics report', 'The working system'] },
    { code: 'OC-07', file: 'online-course-creation', title: 'Course Build-Out: “Call Handling That Closes”', skill: 'Online course creation',
      lede: 'Taking a course from idea, through content build-out, to launch, using what I learned on the phones.',
      steps: ['From idea to course promise', 'Curriculum map: 6 modules, 18 lessons', 'Assets produced per module', 'Launch timeline'] },
    { code: 'LG-08', file: 'lead-generation', title: 'Lead Gen Sprint: Dental Clinic Outreach', skill: 'Lead generation',
      lede: 'A one-week prospecting sprint for a dental-supply vendor: 40 qualified clinics researched, a personalized email sequence written, and a tracked pipeline.',
      steps: ['Qualifying rules: who makes the list', 'The lead sheet format', 'The outreach sequence: 3 touches, 8 days', 'Pipeline after one week'] }
  ];
  const list = $('#case-list'), pane = $('#case');
  if (list && pane) {
    let frameReady = false;
    list.innerHTML = CASES.map((c, i) => `<li><button role="tab" id="case-${c.code}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}"><span class="num">${c.code}</span><b>${esc(c.skill)}</b></button></li>`).join('');
    const btns = $$('button', list);
    function show(i, focus) {
      const c = CASES[i];
      btns.forEach((b, j) => { b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; });
      if (focus) btns[i].focus();
      pane.setAttribute('aria-labelledby', 'case-' + c.code);
      const url = `samples/${c.file}.html`;
      pane.innerHTML = `
        <h3>${esc(c.title)}</h3>
        <p class="sample-tag">Sample work · ${esc(c.code)} · built on a realistic client scenario</p>
        <p class="lede">${esc(c.lede)}</p>
        <ol class="steps">${c.steps.map((s, k) => `<li><button type="button" aria-pressed="${k === 0}" data-k="${k}">${esc(s)}</button></li>`).join('')}</ol>
        <div class="peek"><iframe title="Preview of ${esc(c.title)}" tabindex="-1" loading="lazy" ${frameReady ? `src="${url}"` : `data-src="${url}"`}></iframe></div>
        <a class="btn solid open" href="${url}">Open the full sample <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg></a>`;
      const frame = $('iframe', pane);
      $$('.steps button', pane).forEach((b) => b.addEventListener('click', () => {
        $$('.steps button', pane).forEach((x) => x.setAttribute('aria-pressed', x === b));
        // Scroll the live preview to that step's section (same-origin pages only)
        try {
          const hs = frame.contentDocument.querySelectorAll('h2');
          const h = hs[+b.dataset.k]; if (h) frame.contentWindow.scrollTo({ top: h.getBoundingClientRect().top + frame.contentWindow.scrollY - 24, behavior: 'smooth' });
        } catch (e) { /* preview stays at the top */ }
      }));
    }
    btns.forEach((b, i) => {
      b.addEventListener('click', () => show(i));
      b.addEventListener('keydown', (e) => {
        const k = e.key; let n = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') n = (i + 1) % btns.length;
        if (k === 'ArrowUp' || k === 'ArrowLeft') n = (i - 1 + btns.length) % btns.length;
        if (n !== null) { e.preventDefault(); show(n, true); }
      });
    });
    show(0);
    // Load the preview only when the section is near
    const loadFrame = () => { frameReady = true; const f = $('iframe[data-src]', pane); if (f) { f.src = f.dataset.src; f.removeAttribute('data-src'); } };
    if ('IntersectionObserver' in window) {
      const fio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { loadFrame(); fio.disconnect(); } }, { rootMargin: '400px' });
      fio.observe(pane);
    } else loadFrame();
  }
})();
