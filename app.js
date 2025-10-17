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
  const reviewListEl = document.getElementById('review-list');
  const shuffleBtn = document.getElementById('shuffle');
  const revMode = document.getElementById('rev-mode'); // ← новый тумблер

  const STORAGE_KEY = 'tg_vocab_entries_v1';
  let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }

  function renderList(){
    const q = (searchEl.value || '').toLowerCase();
    listEl.innerHTML = '';
    entries
      .filter(e => e.f.toLowerCase().includes(q) || e.n.toLowerCase().includes(q))
      .forEach(e => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${e.f}</span>
          <span>${e.n}</span>
        `;
        listEl.appendChild(li);
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

  // === Новый универсальный рендер проверки ===
  let lastReviewOrder = null;

  function renderReview(order = entries){
    const showTranslations = !!(revMode && revMode.checked);
    reviewListEl.innerHTML = '';

    order.forEach(e => {
      const li = document.createElement('li');
      const foreignEl = document.createElement('span');
      foreignEl.className = 'foreign';
      foreignEl.textContent = showTranslations ? '' : e.f;

      const nativeEl = document.createElement('span');
      nativeEl.className = 'native';
      nativeEl.textContent = showTranslations ? e.n : '';

      li.appendChild(foreignEl);
      li.appendChild(nativeEl);

      li.addEventListener('click', () => {
        if (showTranslations){
          foreignEl.textContent = foreignEl.textContent ? '' : e.f;
        } else {
          nativeEl.textContent = nativeEl.textContent ? '' : e.n;
        }
      });

      reviewListEl.appendChild(li);
    });
  }

  // === Обработчики ===
  addForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = foreignInput.value.trim();
    const n = nativeInput.value.trim();
    if (!f || !n) return;
    entries.unshift({ id: Date.now(), f, n });
    save();
    renderList();
    foreignInput.value = '';
    nativeInput.value = '';
  });

  searchEl.addEventListener('input', renderList);

  shuffleBtn.addEventListener('click', () => {
    lastReviewOrder = shuffle(entries);
    renderReview(lastReviewOrder);
  });

  if (revMode) {
    revMode.addEventListener('change', () => {
      renderReview(lastReviewOrder || entries);
    });
  }

  function setMode(mode){
    if (mode === 'review'){
      addSection.classList.add('hidden');
      reviewSection.classList.remove('hidden');
      modeAddBtn.classList.remove('active');
      modeReviewBtn.classList.add('active');
      renderReview(lastReviewOrder || entries);
    } else {
      reviewSection.classList.add('hidden');
      addSection.classList.remove('hidden');
      modeReviewBtn.classList.remove('active');
      modeAddBtn.classList.add('active');
      renderList();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  modeAddBtn.addEventListener('click', () => setMode('add'));
  modeReviewBtn.addEventListener('click', () => setMode('review'));

  // initial
  renderList();
})();






