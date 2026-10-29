/* RoboNest homepage — global project search. Self-contained: it only touches #rn-search and calls
   /api/search, which searches the whole project catalogue on the server. It never reaches into the 3D scene,
   Nesto or the scroll choreography. */
(() => {
  const root = document.getElementById('rn-search');
  if (!root) return;
  const input = root.querySelector('input');
  const clearBtn = root.querySelector('.rn-search-clear');
  const toggle = root.querySelector('.rn-search-toggle');
  const panel = root.querySelector('.rn-search-panel');
  const LIMIT = 6;
  const cache = new Map();
  let items = [], active = -1, timer = 0, ctrl = null, shown = null, reqId = 0;

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const searchUrl = (q) => '/search' + (q ? '?q=' + encodeURIComponent(q) : '');

  // highlight the typed words inside a piece of text (built with text nodes: nothing is parsed as HTML)
  function marked(text, q) {
    const frag = document.createDocumentFragment();
    const words = norm(q).split(' ').filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!words.length) { frag.append(text); return frag; }
    const re = new RegExp('(' + words.join('|') + ')', 'ig');
    let last = 0;
    text.replace(re, (m, _g, i) => { frag.append(text.slice(last, i), el('mark', '', m)); last = i + m.length; return m; });
    frag.append(text.slice(last));
    return frag;
  }

  function open() { panel.hidden = false; input.setAttribute('aria-expanded', 'true'); }
  function close() { panel.hidden = true; input.setAttribute('aria-expanded', 'false'); setActive(-1); }
  function collapse() { close(); root.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }

  function setActive(i) {
    active = i;
    items.forEach((n, k) => n.setAttribute('aria-selected', k === i ? 'true' : 'false'));
    if (i >= 0 && items[i]) { input.setAttribute('aria-activedescendant', items[i].id); items[i].scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  }

  function message(text, link) {
    panel.replaceChildren();
    const m = el('div', 'rn-search-msg', text);
    if (link) { m.append(' '); const a = el('a', '', link.text); a.href = link.href; m.append(a); }
    panel.append(m);
    items = []; active = -1; open();
  }

  function render(q, data) {
    shown = norm(q);
    panel.replaceChildren();
    items = [];
    const head = el('div', 'rn-search-head');
    head.append(el('span', '', q ? 'Projects' : 'Featured projects'), el('span', '', q ? (data.total === 1 ? '1 result' : data.total + ' results') : ''));
    if (!data.results.length) {
      panel.append(head);
      const m = el('div', 'rn-search-msg', 'No projects match “' + q + '”. Try a robot type (drone, arm, line follower), a part (Arduino, IR sensor) or a level (beginner).');
      m.append(' '); const a = el('a', '', 'Browse all projects'); a.href = '/projects'; m.append(a);
      panel.append(m); active = -1; open(); return;
    }
    const list = el('ul', 'rn-search-list'); list.id = 'rn-search-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Matching projects');
    data.results.forEach((r, i) => {
      const li = el('li', 'rn-search-item'); li.id = 'rn-search-opt-' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
      const a = el('a'); a.href = r.href; a.tabIndex = -1;
      const img = el('img', 'rn-search-thumb'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      if (r.image) img.src = r.image;
      img.onerror = () => { img.removeAttribute('src'); };
      const body = el('span');
      const title = el('span', 'rn-search-title'); title.append(marked(r.title, q));
      const desc = el('span', 'rn-search-desc'); desc.append(marked(r.description || '', q));
      const tags = el('span', 'rn-search-tags');
      if (r.level) tags.append(el('span', 'lv', r.level));
      if (r.category) tags.append(el('span', '', r.category));
      body.append(title, desc, tags);
      a.append(img, body); li.append(a); list.append(li); items.push(li);
      li.addEventListener('mousemove', () => { if (active !== i) setActive(i); });
    });
    panel.append(head, list);
    if (q && data.total > data.results.length) {
      const all = el('a', 'rn-search-all'); all.href = searchUrl(q); all.id = 'rn-search-opt-all'; all.setAttribute('role', 'option'); all.setAttribute('aria-selected', 'false');
      all.append(el('span', '', 'View all ' + data.total + ' results'), el('span', '', '→'));
      panel.append(all); items.push(all);
    }
    active = -1; open();
  }

  async function run(qRaw) {
    const q = qRaw.trim().slice(0, 120);
    const key = norm(q);
    if (key === shown && !panel.hidden) return; // these results are already on screen
    if (cache.has(key)) { render(q, cache.get(key)); return; }
    if (ctrl) ctrl.abort();
    const c = (ctrl = new AbortController()), id = ++reqId;
    const giveUp = setTimeout(() => c.abort(), 8000);
    if (panel.hidden || !panel.childElementCount) { message('Searching…'); shown = null; }
    try {
      const res = await fetch('/api/search?limit=' + LIMIT + '&q=' + encodeURIComponent(q), { signal: c.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (cache.size > 60) cache.delete(cache.keys().next().value);
      cache.set(key, data);
      if (id === reqId) render(q, data); // only the latest request updates the list
    } catch (e) {
      if (id !== reqId) return; // superseded by a newer search
      shown = null;
      message('Search isn’t available right now.', { text: 'Browse all projects', href: '/projects' });
    } finally { clearTimeout(giveUp); }
  }

  input.addEventListener('input', () => {
    clearBtn.hidden = !input.value;
    clearTimeout(timer);
    timer = setTimeout(() => run(input.value), 140);
  });
  input.addEventListener('focus', () => run(input.value));
  input.addEventListener('keydown', (e) => {
    // keep typing inside the search: the page's own shortcuts (intro skip, menu) never see these keys
    e.stopPropagation();
    if (e.key === 'ArrowDown') { e.preventDefault(); if (panel.hidden) run(input.value); else setActive(items.length ? (active + 1) % items.length : -1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) setActive(active <= 0 ? items.length - 1 : active - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const target = active >= 0 ? items[active] : null;
      const href = target ? (target.tagName === 'A' ? target.href : target.querySelector('a').href) : (input.value.trim() ? searchUrl(input.value.trim()) : null);
      if (href) location.href = href;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (!panel.hidden) close(); else if (input.value) { input.value = ''; clearBtn.hidden = true; shown = null; } else { collapse(); toggle.focus(); }
    } else if (e.key === 'Tab') close();
  });
  clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.hidden = true; shown = null; input.focus(); run(''); });
  toggle.addEventListener('click', () => {
    const on = !root.classList.contains('is-open');
    root.classList.toggle('is-open', on);
    toggle.setAttribute('aria-expanded', String(on));
    if (on) setTimeout(() => input.focus(), 30); else close();
  });
  // clicking anywhere else closes the dropdown (and the compact field)
  document.addEventListener('pointerdown', (e) => { if (!root.contains(e.target)) { if (root.classList.contains('is-open')) collapse(); else close(); } });
})();
