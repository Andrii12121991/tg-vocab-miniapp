// -------- Review mode --------
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
      li.querySelector('.native').addEventListener('click', () => {
        li.classList.toggle('revealed');
      });
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

    // Пытаемся сохранить в облако; при ошибке — локально
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

    // Сначала пробуем удалить в облаке (если есть id от сервера)
    try { if (canUseCloud()) await apiDel(id); } catch(err){ console.warn('Cloud delete failed', err); }

    entries = entries.filter(x => x.id !== id);
    knownSet.delete(id);
    save();
    saveKnown();
    renderList();
  });

  searchEl.addEventListener('input', renderList);

  document.getElementById('shuffle').addEventListener('click', () => {
    renderReview(shuffle(entries));
  });

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




