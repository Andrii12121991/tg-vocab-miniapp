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

  const modeAddBtn = document.getElementById('mode-add');
  const modeReviewBtn = document.getElementById('mode-review');
  const addSection = document.getElementById('add-section');
  const reviewSection = document.getElementById('review-section');

  const addForm = document.getElementById('add-form');
  const foreignInput = document.getElementById('foreign');
  const nativeInput = document.getElementById('native');
  const listEl = document.getElementById('list');
  const searchEl = document.getElementById('search');
  const clearAllBtn = document.getElementById('clear-all');
  const exportBtn = document.getElementById('export-json');
  const importBtn = document.getElementById('import-json');
  const importFile = document.getElementById('import-file');

  const reviewListEl = document.getElementById('review-list');
  const shuffleBtn = document.getElementById('shuffle');
  const hideKnownEl = document.getElementById('hide-known');

  const STORAGE_KEY = 'tg_vocab_entries_v1';
  const KNOWN_KEY = 'tg_vocab_known_v1';
  let entries = readJson(STORAGE_KEY, []);
  let knownSet = new Set(readJson(KNOWN_KEY, []));

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
  function saveKnown(){ localStorage.setItem(KNOWN_KEY, JSON.stringify(Array.from(knownSet))); }
  function readJson(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key)) || fallback }catch{ return fallback }
  }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

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
          <button class="del" data-id="${e.id}">Удалить</button>
        `;
        listEl.appendChild(li);
      });
  }

  function renderReview(){
    reviewListEl.innerHTML = '';
    entries.forEach(e => {
      if (hideKnownEl.checked && knownSet.has(e.id)) return;
      const li = document.createElement('li');
      li.className = 'review-row';
      li.dataset.id = e.id;
      li.innerHTML = `
        <span class="native">${escapeHtml(e.n)}</span>
        <span class="foreign">${escapeHtml(e.f)}</span>
      `;
      li.querySelector('.native').addEventListener('click', () => {
        li.classList.toggle('revealed');
      });
      li.querySelector('.foreign').addEventListener('dblclick', () => {
        if (knownSet.has(e.id)) knownSet.delete(e.id); else knownSet.add(e.id);
        saveKnown();
        renderReview();
      });
      reviewListEl.appendChild(li);
    });
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

  modeAddBtn.addEventListener('click', () => setMode('add'));
  modeReviewBtn.addEventListener('click', () => setMode('review'));

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = foreignInput.value.trim();
    const n = nativeInput.value.trim();
    if (!f || !n) return;
    entries.unshift({ id: uid(), f, n });
    foreignInput.value = '';
    nativeInput.value = '';
    save();
    renderList();
    foreignInput.focus();
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button.del');
    if (!btn) return;
    const id = btn.dataset.id;
    entries = entries.filter(x => x.id !== id);
    knownSet.delete(id);
    save();
    saveKnown();
    renderList();
  });

  searchEl.addEventListener('input', renderList);

  clearAllBtn.addEventListener('click', () => {
    if (!confirm('Точно очистить все слова?')) return;
    entries = [];
    knownSet = new Set();
    save();
    saveKnown();
    renderList();
  });

  shuffleBtn.addEventListener('click', () => {
    for (let i = entries.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    renderReview();
  });

  hideKnownEl.addEventListener('change', renderReview);

  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vocab.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try{
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Неверный формат файла');
      const normalized = data.map(x => ({ id: x.id || uid(), f: String(x.f||'').trim(), n: String(x.n||'').trim() }))
        .filter(x => x.f && x.n);
      entries = normalized.concat(entries);
      save();
      renderList();
    } catch(err){
      alert('Ошибка импорта: ' + err.message);
    } finally {
      importFile.value = '';
    }
  });

  function escapeHtml(s){
    return s.replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  renderList();
})();