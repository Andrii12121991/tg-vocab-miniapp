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

  // State
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
  // Справа — native (виден). Слева — foreign (скрыт до клика).
  function renderReview(order = entries){
    reviewListEl.innerHTML = '';
    order.forEach(e => {
      const li = document.createElement('li');
      li.className = 'review-row';
      li.dataset.id = e.id;
      li.innerHTML = `
        <span class="foreign">${escapeHtml(e.f)}</span>
        <span class="native">${escapeHtml(e.n)}</span>
      `;
      // клик по правому — показать/скрыть левый
      li.querySelector('.native').addEventListener('click', () => {
        li.classList.toggle('revealed');
      });
      // dblclick по левому — отметить как выученное (на будущее)
      li.querySelector('.foreign').addEventListener('dblclick', () => {
        if (knownSet.has(e.id)) knownSet.delete(e.id); else knownSet.add(e.id);
        saveKnown();
      });
      reviewListEl.appendChild(li);
    });
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

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let f = foreignInput.value.trim();
    let n = nativeInput.value.trim();
    if (!f || !n) return;

    // защита от дублей
    const fKey = f.toLowerCase();
    const nKey = n.toLowerCase();
    const isDup = entries.some(x => x.f.trim().toLowerCase() === fKey && x.n.trim().toLowerCase() === nKey);
    if (isDup) { alert('Такая пара уже есть в списке.'); return; }

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

  // Перемешивание — каждый клик даёт новый порядок
  document.getElementById('shuffle').addEventListener('click', () => {
    renderReview(shuffle(entries));
  });

  function escapeHtml(s){
    return s.replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  }

  // Initial paint
  renderList();
})();



