// ===== tg-vocab miniapp: front-end =====
(function () {
  // --- Telegram theme + helpers ---
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    tg.expand();
    tg.ready();
    const theme = tg.themeParams || {};
    if (theme.bg_color) document.documentElement.style.setProperty('--bg', theme.bg_color);
    if (theme.text_color) document.documentElement.style.setProperty('--text', theme.text_color);
    if (theme.secondary_bg_color) document.documentElement.style.setProperty('--card', theme.secondary_bg_color);
    if (theme.button_color) document.documentElement.style.setProperty('--accent', theme.button_color);
    tg.BackButton.onClick(() => setMode('add'));
  }

  // --- Cloud API (Vercel serverless) ---
  const INIT_DATA = tg?.initData || "";

  function canUseCloud() { return Boolean(INIT_DATA); }

  async function apiGet() {
    const r = await fetch('/api/words', { headers: { 'X-Telegram-Init-Data': INIT_DATA } });
    if (!r.ok) throw new Error('GET failed');
    return await r.json();
  }

  async function apiAdd(f, n) {
    const r = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': INIT_DATA },
      body: JSON.stringify({ f, n })
    });
    if (!r.ok) throw new Error('POST failed');
    return await r.json();
  }

  async function apiDel(id) {
    const r = await fetch('/api/words/' + id, {
      method: 'DELETE',
      headers: { 'X-Telegram-Init-Data': INIT_DATA }
    });
    if (!r.ok && r.status !== 204) throw new Error('DELETE failed');
  }

  // --- Elements ---
  const modeAddBtn = document.getElementById('mode-add');
  const modeReviewBtn = document.getElementById('mode-review');
  const addSection = document.getElementById('add-section');
  const reviewSection = document.getElementById('review-section');

  const addForm = document.getElementById('add-form');
  const foreignInput = document.getElementById('foreign');
  const nativeInput = document.getElementById('native');
  const listEl = document.getElementById('list');
  const searchEl = document.getElementById('search');

  const reviewListEl = document.getElementById('review-list');
  const shuffleBtn = document.getElementById('shuffle');

  // --- Small UI: toggle button near "shuffle" (no HTML changes needed) ---
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'review-toggle';
  toggleBtn.className = 'small'; // использую имеющийся маленький стиль кнопки (если он есть); иначе будет как обычная
  // Режимы: 'byNative' = как сейчас (список переводов; клик по правому показывает левое)
  //         'byForeign' = новый режим (список иностранных; клик по левому показывает правое)
  let reviewMode = 'byNative';

  function updateToggleCaption() {
    // Показываем текущий режим в кнопке, чтобы было понятно
    toggleBtn.textContent = reviewMode === 'byNative' ? 'Режим: Перевод' : 'Режим: Значение';
  }
  updateToggleCaption();

  // Вставим кнопку сразу после "Перемешать"
  if (shuffleBtn && shuffleBtn.parentNode) {
    shuffleBtn.parentNode.insertBefore(toggleBtn, shuffleBtn.nextSibling);
  }

  toggleBtn.addEventListener('click', () => {
    reviewMode = (reviewMode === 'byNative') ? 'byForeign' : 'byNative';
    updateToggleCaption();
    renderReview(); // перерисовать с тем же порядком
  });

  // --- State + local storage ---
  const STORAGE_KEY = 'tg_vocab_entries_v1';
  const KNOWN_KEY = 'tg_vocab_known_v1';
  let entries = readJson(STORAGE_KEY, []);
  let knownSet = new Set(readJson(KNOWN_KEY, []));

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
  function saveKnown() { localStorage.setItem(KNOWN_KEY, JSON.stringify(Array.from(knownSet))); }
  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // --- Add mode list ---
  function renderList() {
    const q = (searchEl.value || '').toLowerCase();
    listEl.innerHTML = '';
    entries
      .filter(e => e.f.toLowerCase().includes(q) || e.n.toLowerCase().includes(q))
      .forEach(e => {
        const li = document.createElement('li');
        li.className = 'item';
        li.innerHTML = `
          <span>${escapeHtml(e.f)}</span>
          <span>${escapeHtml(e.n)}</span>
          <button class="del" data-id="${e.id}" title="Удалить">✖</button>
        `;
        listEl.appendChild(li);
      });
  }

  // --- Review mode ---
  // вспомогательная отрисовка одной строки под конкретный режим
  function buildReviewRow(e) {
    const li = document.createElement('li');
    li.className = 'review-row';
    li.dataset.id = e.id;

    const left = document.createElement('span');
    left.className = 'foreign';
    left.textContent = e.f;

    const right = document.createElement('span');
    right.className = 'native';
    right.textContent = e.n;

    li.appendChild(left);
    li.appendChild(right);

    // Две зеркальные логики (без правки CSS):
    if (reviewMode === 'byNative') {
      // показываем список ПРАВЫХ слов; ЛЕВАЯ часть скрыта, показывается по клику на правую
      left.style.visibility = 'hidden';
      right.style.visibility = 'visible';

      right.addEventListener('click', () => {
        const hidden = left.style.visibility !== 'visible';
        left.style.visibility = hidden ? 'visible' : 'hidden';
      });
    } else {
      // показываем список ЛЕВЫХ слов; ПРАВАЯ часть скрыта, показывается по клику на левую
      left.style.visibility = 'visible';
      right.style.visibility = 'hidden';

      left.addEventListener('click', () => {
        const hidden = right.style.visibility !== 'visible';
        right.style.visibility = hidden ? 'visible' : 'hidden';
      });
    }

    // двойной клик по левому, как и раньше — отметить известное слово
    left.addEventListener('dblclick', () => {
      if (knownSet.has(e.id)) knownSet.delete(e.id); else knownSet.add(e.id);
      saveKnown();
    });

    return li;
  }

  function renderReview(order = entries) {
    reviewListEl.innerHTML = '';
    order.forEach(e => {
      reviewListEl.appendChild(buildReviewRow(e));
    });
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setMode(mode) {
    if (mode === 'review') {
      addSection.classList.add('hidden');
      reviewSection.classList.remove('hidden');
      modeAddBtn.classList.remove('active');
      modeReviewBtn.classList.add('active');
      renderReview();
      if (tg) { tg.BackButton.show(); }
    } else {
      reviewSection.classList.add('hidden');
      addSection.classList.remove('hidden');
      modeReviewBtn.classList.remove('active');
      modeAddBtn.classList.add('active');
      renderList();
      if (tg) { tg.BackButton.hide(); }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Events ---
  modeAddBtn.addEventListener('click', () => setMode('add'));
  modeReviewBtn.addEventListener('click', () => setMode('review'));

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let f = foreignInput.value.trim();
    let n = nativeInput.value.trim();
    if (!f || !n) return;

    // антидубликаты
    const fKey = f.toLowerCase();
    const nKey = n.toLowerCase();
    const isDup = entries.some(x => x.f.trim().toLowerCase() === fKey && x.n.trim().toLowerCase() === nKey);
    if (isDup) { alert('Такая пара уже есть в списке.'); return; }

    try {
      if (canUseCloud()) {
        const created = await apiAdd(f, n);
        entries.unshift({ id: created.id, f: created.f, n: created.n });
      } else {
        entries.unshift({ id: uid(), f, n });
      }
    } catch (err) {
      console.warn('Cloud save failed, fallback to local:', err);
      entries.unshift({ id: uid(), f, n });
    }

    foreignInput.value = '';
    nativeInput.value = '';
    save();
    renderList();
    foreignInput.focus();
  });

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button.del');
    if (!btn) return;
    const id = btn.dataset.id;

    try { if (canUseCloud()) await apiDel(id); } catch (err) { console.warn('Cloud delete failed', err); }

    entries = entries.filter(x => x.id !== id);
    knownSet.delete(id);
    save();
    saveKnown();
    renderList();
  });

  searchEl.addEventListener('input', renderList);

  shuffleBtn.addEventListener('click', () => {
    renderReview(shuffle(entries));
  });

  function escapeHtml(s) {
    return s.replace(/[&<>"]+/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // --- Initial load ---
  (async () => {
    try {
      if (canUseCloud()) {
        const remote = await apiGet();
        if (Array.isArray(remote)) {
          entries = remote.map(r => ({ id: r.id, f: r.f, n: r.n }));
          save();
        }
      }
    } catch (e) {
      console.warn('Cloud load failed, keep local cache.', e);
    }
    renderList();
  })();
})();




