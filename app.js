(function(){
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

  // --------- Cloud API (через Vercel serverless) ---------
  const INIT_DATA = tg?.initData || ""; // Telegram WebApp initData
  async function apiGet(){
    const r = await fetch('/api/words', { headers:{ 'X-Telegram-Init-Data': INIT_DATA }});
    if (!r.ok) throw new Error('GET failed');
    return await r.json(); // [{id,f,n,created_at},...]
  }
  async function apiAdd(f,n){
    const r = await fetch('/api/words', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'X-Telegram-Init-Data': INIT_DATA },
      body: JSON.stringify({ f, n })
    });
    if (!r.ok) throw new Error('POST failed');
    return await r.json(); // {id,f,n,created_at}
  }
  async function apiDel(id){
    const r = await fetch('/api/words/'+id, {
      method:'DELETE',
      headers:{ 'X-Telegram-Init-Data': INIT_DATA }
    });
    if (!r.ok && r.status !== 204) throw new Error('DELETE failed');
  }
  function canUseCloud(){ return Boolean(INIT_DATA); }

  // Elements
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
  const reviewToggleBtn = document.getElementById('review-toggle'); // кнопка «Режим: …»

  // State
  const STORAGE_KEY = 'tg_vocab_entries_v1';
  const KNOWN_KEY = 'tg_vocab_known_v1';
  let entries = readJson(STORAGE_KEY, []);
  let knownSet = new Set(readJson(KNOWN_KEY, []));

  // режим показа в «Проверке»:
  // 'right'  — виден только перевод (справа). Клик по правому — подсвечивает/показывает левую часть (иностранное).
  // 'left'   — видны только иностранные слова (слева). Клик по левому — показывает перевод справа.
  let reviewMode = 'right'; // по умолчанию как было раньше — «Перевод»

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
  function saveKnown(){ localStorage.setItem(KNOWN_KEY, JSON.stringify(Array.from(knownSet))); }
  function readJson(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key)) || fallback }catch{ return fallback }
  }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  // -------- Add mode --------
  function renderList(){
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

  // -------- Review mode --------
  function updateReviewToggleLabel() {
    // просто меняем текст, без стилей
    reviewToggleBtn.textContent = reviewMode === 'right' ? 'Режим: Перевод' : 'Режим: Значение';
    reviewToggleBtn.setAttribute('aria-pressed', reviewMode === 'left' ? 'true' : 'false');
  }

  function renderReview(order = entries){
    reviewListEl.innerHTML = '';
    order.forEach(e => {
      const li = document.createElement('li');
      li.className = 'review-row';
      li.dataset.id = e.id;

      // создаём 2 ячейки
      const left = document.createElement('span');   // левая колонка (иностранное)
      left.className = 'foreign';
      const right = document.createElement('span');  // правая колонка (перевод)
      right.className = 'native';

      if (reviewMode === 'right') {
        // показываем только ПРАВУЮ колонку (переводы)
        left.textContent  = '\u00A0';               // пусто (не ломаем высоту строки)
        right.textContent = e.n;

        // клик по правой стороне — показать/скрыть левую (иностранное)
        right.addEventListener('click', () => {
          if (left.textContent.trim()) {
            left.textContent = '\u00A0';
          } else {
            left.textContent = e.f;
          }
        });
      } else {
        // reviewMode === 'left'
        // показываем только ЛЕВУЮ колонку (иностранные слова)
        left.textContent  = e.f;
        right.textContent = '\u00A0';

        // клик по левой стороне — показать/скрыть правую (перевод)
        left.addEventListener('click', () => {
          if (right.textContent.trim()) {
            right.textContent = '\u00A0';
          } else {
            right.textContent = e.n;
          }
        });
      }

      // двойной клик по левой колонке — помечаем/снимаем «знаю» (как было)
      left.addEventListener('dblclick', () => {
        if (knownSet.has(e.id)) knownSet.delete(e.id); else knownSet.add(e.id);
        saveKnown();
      });

      li.append(left, right);
      reviewListEl.appendChild(li);
    });
    updateReviewToggleLabel();
  }

  function shuffle(arr){
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setMode(mode){
    if (mode === 'review'){
      addSection.classList.add('hidden');
      reviewSection.classList.remove('hidden');
      modeAddBtn.classList.remove('active');
      modeReviewBtn.classList.add('active');
      renderReview();
      if (tg){ tg.BackButton.show(); }
    } else {
      reviewSection.classList.add('hidden');
      addSection.classList.remove('hidden');
      modeReviewBtn.classList.remove('active');
      modeAddBtn.classList.add('active');
      renderList();
      if (tg){ tg.BackButton.hide(); }
    }
    window.scrollTo({top:0, behavior:'smooth'});
  }

  // -------- Events --------
  modeAddBtn.addEventListener('click', () => setMode('add'));
  modeReviewBtn.addEventListener('click', () => setMode('review'));

  // Переключатель «Режим: Значение/Перевод»
  if (reviewToggleBtn) {
    reviewToggleBtn.addEventListener('click', () => {
      reviewMode = (reviewMode === 'right') ? 'left' : 'right';
      renderReview();
    });
  }

  // Перемешать
  shuffleBtn.addEventListener('click', () => {
    renderReview(shuffle(entries));
  });

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let f = foreignInput.value.trim();
    let n = nativeInput.value.trim();
    if (!f || !n) return;

    // защита от дублей
    const fKey = f.toLowerCase();
    const nKey = n.toLowerCase();
    const isDup = entries.some(x => x.f.trim().toLowerCase() === fKey && x.n.trim().toLowerCase() === nKey);
    if (isDup) { alert('Такая пара уже есть в списке.'); return; }

    try {
      if (canUseCloud()){
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

    try { if (canUseCloud()) await apiDel(id); } catch(err){ console.warn('Cloud delete failed', err); }

    entries = entries.filter(x => x.id !== id);
    knownSet.delete(id);
    save();
    saveKnown();
    renderList();
  });

  searchEl.addEventListener('input', renderList);

  function escapeHtml(s){
    return s.replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  }

  // -------- Initial load --------
  (async () => {
    try {
      if (canUseCloud()){
        const remote = await apiGet();
        if (Array.isArray(remote)) {
          entries = remote.map(r => ({ id:r.id, f:r.f, n:r.n }));
          save();
        }
      }
    } catch (e) {
      console.warn('Cloud load failed, keep local cache.', e);
    }
    renderList();
  })();
})();





