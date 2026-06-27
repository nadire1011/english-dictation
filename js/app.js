/* ===== app.js - Main application controller ===== */

const App = {
  state: {
    panel: 'select', stage: null, publisher: null, grade: null,
    semester: null, textbook: null, unit: null, unitIdx: -1,
    words: [], isDictating: false, isPaused: false, wrongWords: [],
  },

  async init() {
    await DataStore.load();
    const saved = Storage.getSettings();
    if (saved.speed) TTS.config.speed = saved.speed;
    if (saved.interval) TTS.config.interval = saved.interval;
    if (saved.repeat) TTS.config.repeat = saved.repeat;
    if (saved.readChinese !== undefined) TTS.config.readChinese = saved.readChinese;
    this._bindTTSCallbacks();
    this.renderSelectPanel();
    const last = Storage.getLastSelection();
    if (last && last.textbookId && last.unitIdx >= 0) this._showContinueBar(last);
  },

  _bindTTSCallbacks() {
    TTS.onStart = () => { this.state.isDictating = true; this.state.isPaused = false; this._updateDictationUI(); };
    TTS.onWordStart = (idx, total, word) => { this.state.isDictating = true; this.state.isPaused = false; this._updateDictationProgress(idx, total, word); };
    TTS.onWordEnd = () => {};
    TTS.onPause = () => { this.state.isPaused = true; this._updateDictationUI(); };
    TTS.onResume = () => { this.state.isPaused = false; this._updateDictationUI(); };
    TTS.onComplete = () => { this.state.isDictating = false; this.state.isPaused = false; this._onDictationComplete(); };
    TTS.onStop = () => { this.state.isDictating = false; this.state.isPaused = false; this.renderSelectPanel(); };
  },

  renderSelectPanel() {
    this.state.panel = 'select';
    this._showPanel('panel-select');
    const container = document.getElementById('panel-select');
    if (!container) return;

    const stages = DataStore.getStages();
    let html = '';
    html += '<div class="section-label">📚 选择学段</div><div class="card-grid">';
    for (const s of stages) {
      const sel = this.state.stage === s ? ' selected' : '';
      html += `<div class="card${sel}" data-action="setStage" data-value="${s}"><div class="card-title">${s}</div><div class="card-desc">${s==='小学'?'3-6年级':'7-9年级'}</div></div>`;
    }
    html += '</div>';

    if (this.state.stage) {
      const publishers = DataStore.getPublishers(this.state.stage);
      html += '<div class="section-label">🏫 选择教材版本</div><div class="card-grid">';
      for (const p of publishers) {
        const sel = this.state.publisher === p ? ' selected' : '';
        html += `<div class="card${sel}" data-action="setPublisher" data-value="${p}"><div class="card-title">${p}</div></div>`;
      }
      html += '</div>';
    }

    if (this.state.publisher) {
      const grades = DataStore.getGrades(this.state.stage, this.state.publisher);
      html += '<div class="section-label">📖 选择年级</div><div class="card-grid col3">';
      for (const g of grades) {
        const sel = this.state.grade === g ? ' selected' : '';
        html += `<div class="card${sel}" data-action="setGrade" data-value="${g}"><div class="card-title">${g}年级</div></div>`;
      }
      html += '</div>';
    }

    if (this.state.grade) {
      const semesters = DataStore.getSemesters(this.state.stage, this.state.publisher, this.state.grade);
      html += '<div class="section-label">📅 选择册别</div><div class="card-grid">';
      for (const sem of semesters) {
        const sel = this.state.semester === sem ? ' selected' : '';
        html += `<div class="card${sel}" data-action="setSemester" data-value="${sem}"><div class="card-title">${sem}册</div></div>`;
      }
      html += '</div>';
    }

    if (this.state.semester) {
      const tb = DataStore.findOne({ stage: this.state.stage, publisher: this.state.publisher, grade: this.state.grade, semester: this.state.semester });
      if (tb) {
        html += '<div class="section-label">📝 选择单元</div><div class="card-grid">';
        for (let i = 0; i < tb.units.length; i++) {
          const u = tb.units[i];
          html += `<div class="card" data-action="startPreview" data-unit="${i}"><div class="card-title">${u.module}: ${u.title}</div><div class="card-desc">${u.words.length} 个单词</div></div>`;
        }
        html += '</div>';
      }
    }

    if (this.state.stage) {
      html += '<div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" data-action="reset">🔄 重新选择</button></div>';
    }

    container.innerHTML = html;

    container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => {
        const action = el.dataset.action;
        switch (action) {
          case 'setStage': this.state.stage = el.dataset.value; this.state.publisher = null; this.state.grade = null; this.state.semester = null; this.renderSelectPanel(); break;
          case 'setPublisher': this.state.publisher = el.dataset.value; this.state.grade = null; this.state.semester = null; this.renderSelectPanel(); break;
          case 'setGrade': this.state.grade = parseInt(el.dataset.value); this.state.semester = null; this.renderSelectPanel(); break;
          case 'setSemester': this.state.semester = el.dataset.value; this.renderSelectPanel(); break;
          case 'startPreview': this._startPreview(parseInt(el.dataset.unit)); break;
          case 'reset': this.state.stage = null; this.state.publisher = null; this.state.grade = null; this.state.semester = null; this.renderSelectPanel(); break;
        }
      });
    });
    this._renderBreadcrumb(container);
  },

  _showContinueBar(last) {
    const tb = DataStore.findTextbook(last.textbookId);
    if (!tb || last.unitIdx >= tb.units.length) return;
    const unit = tb.units[last.unitIdx];
    const container = document.getElementById('panel-select');
    if (!container) return;
    const bar = document.createElement('div');
    bar.className = 'continue-bar';
    bar.innerHTML = `<div class="continue-info"><div class="continue-label">📌 继续上次</div><div>${tb.name} · ${unit.module} ${unit.title}</div></div><span style="font-size:20px;">→</span>`;
    bar.addEventListener('click', () => {
      Object.assign(this.state, { stage: tb.stage, publisher: tb.publisher, grade: tb.grade, semester: tb.semester, textbook: tb, unit, unitIdx: last.unitIdx, words: unit.words });
      this.renderPreviewPanel();
    });
    container.insertBefore(bar, container.firstChild);
  },

  _renderBreadcrumb(container) {
    const parts = [];
    if (this.state.stage) parts.push(this.state.stage);
    if (this.state.publisher) parts.push(this.state.publisher);
    if (this.state.grade) parts.push(`${this.state.grade}年级`);
    if (this.state.semester) parts.push(`${this.state.semester}册`);
    if (parts.length > 0) {
      const bc = document.createElement('div');
      bc.className = 'breadcrumb';
      bc.innerHTML = '已选：' + parts.map(p => `<span>${p}</span>`).join(' › ');
      container.insertBefore(bc, container.firstChild);
    }
  },

  _startPreview(unitIdx) {
    const tb = DataStore.findOne({ stage: this.state.stage, publisher: this.state.publisher, grade: this.state.grade, semester: this.state.semester });
    if (!tb) return;
    const unit = tb.units[unitIdx];
    this.state.textbook = tb; this.state.unit = unit; this.state.unitIdx = unitIdx;
    this.state.words = unit.words;
    this.state.wrongWords = Storage.getWrongWordsForUnit(tb.id, unitIdx);
    Storage.saveLastSelection({ textbookId: tb.id, unitIdx, timestamp: Date.now() });
    this.renderPreviewPanel();
  },

  renderPreviewPanel() {
    this.state.panel = 'preview'; this._showPanel('panel-preview');
    const { unit, textbook: tb } = this.state;
    const container = document.getElementById('panel-preview');
    if (!container) return;
    const wrongSet = new Set(this.state.wrongWords);

    let html = `<div class="header-row" style="margin-bottom:16px;"><button class="btn-back" data-action="backToSelect">←</button><div class="header-title">${tb.name}</div><button class="btn-back" data-action="openSettings">⚙</button></div>`;
    html += `<div class="card" style="cursor:default;"><div class="card-title" style="font-size:18px;">${unit.module}: ${unit.title}</div><div class="card-desc">共 ${unit.words.length} 个单词</div></div>`;
    html += '<div style="margin-bottom:12px;"><button class="btn btn-primary btn-lg" data-action="startDictation">▶ 开始听写</button></div>';
    html += '<div class="section-label">📋 单词列表（预览）</div><div class="card" style="padding:0;cursor:default;"><ul class="word-list">';
    unit.words.forEach((w, i) => {
      html += `<li class="word-item${wrongSet.has(w.en)?' wrong':''}"><span class="word-num">${i+1}</span><span class="word-en">${w.en}</span><span class="word-zh">${w.zh}</span></li>`;
    });
    html += '</ul></div>';

    if (this.state.wrongWords.length > 0) {
      html += `<div class="card" style="cursor:pointer;border-color:var(--danger);" data-action="retryWrong"><div class="card-title" style="color:var(--danger);">🔁 重听错词 (${this.state.wrongWords.length}个)</div><div class="card-desc">只对之前标记的错词进行专项听写</div></div>`;
    }

    container.innerHTML = html;
    container.querySelector('[data-action="backToSelect"]').addEventListener('click', () => { TTS.stop(); this.renderSelectPanel(); });
    container.querySelector('[data-action="openSettings"]').addEventListener('click', () => this.openSettings());
    container.querySelector('[data-action="startDictation"]').addEventListener('click', () => this._startDictation(unit.words));
    const retryBtn = container.querySelector('[data-action="retryWrong"]');
    if (retryBtn) retryBtn.addEventListener('click', () => { this._startDictation(unit.words.filter(w => wrongSet.has(w.en))); });
  },

  _startDictation(words) {
    this.state.panel = 'dictation'; this.state.isDictating = false; this.state.isPaused = false;
    this._showPanel('panel-dictation');
    const { unit, textbook: tb } = this.state;
    const container = document.getElementById('panel-dictation');
    if (!container) return;
    const modeLabel = TTS.config.readChinese ? '英+中模式' : '纯英文模式';

    container.innerHTML = `<div class="header-row" style="margin-bottom:8px;"><button class="btn-back" data-action="stopDictation">✕</button><div class="header-title">听写中</div><button class="btn-back" data-action="dictSettings">⚙</button></div><div style="text-align:center;font-size:13px;color:var(--text-light);margin-bottom:16px;">${tb.name} · ${unit.module} · ${modeLabel}</div><div class="dictation-display"><div class="progress-ring"><svg width="140" height="140" viewBox="0 0 140 140"><circle class="bg-circle" cx="70" cy="70" r="62"/><circle class="fg-circle" id="progress-circle" cx="70" cy="70" r="62" stroke-dasharray="389.56" stroke-dashoffset="389.56"/></svg><div class="progress-text"><div class="progress-num" id="progress-num">0</div><div class="progress-total">/ ${words.length}</div></div></div><div class="status-text" id="status-text">准备开始…</div><div class="controls-row primary"><button class="btn btn-icon btn-outline" id="btn-prev" disabled>⏮</button><button class="btn btn-icon btn-primary" id="btn-play">▶</button><button class="btn btn-icon btn-outline" id="btn-next" disabled>⏭</button></div><div class="controls-row"><button class="btn btn-ghost btn-sm" id="btn-repeat" disabled>🔁 重读</button></div></div>`;
    this._bindDictationControls(words);
  },

  _bindDictationControls(words) {
    const btnPlay = document.getElementById('btn-play'), btnPrev = document.getElementById('btn-prev'), btnNext = document.getElementById('btn-next'), btnRepeat = document.getElementById('btn-repeat');
    let hasStarted = false;

    btnPlay.addEventListener('click', () => {
      if (!hasStarted) { hasStarted = true; TTS.setQueue(words); TTS.start(words); btnPlay.textContent = '⏸'; btnPrev.disabled = false; btnNext.disabled = false; btnRepeat.disabled = false; }
      else if (TTS.isPaused()) { TTS.resume(); btnPlay.textContent = '⏸'; }
      else if (TTS.isActive() || this.state.isDictating) { TTS.pause(); btnPlay.textContent = '▶'; }
    });

    btnPrev.addEventListener('click', () => {
      if (TTS.isActive() || TTS.isPaused()) TTS.pause();
      const idx = Math.max(0, TTS.getCurrentIndex() - 1);
      TTS.skipTo(idx); this._updateDictationProgress(idx, words.length, words[idx]); btnPlay.textContent = '▶';
    });

    btnNext.addEventListener('click', () => {
      if (TTS.isActive() || TTS.isPaused()) TTS.pause();
      const idx = Math.min(words.length - 1, TTS.getCurrentIndex() + 1);
      TTS.skipTo(idx); this._updateDictationProgress(idx, words.length, words[idx]); btnPlay.textContent = '▶';
    });

    btnRepeat.addEventListener('click', () => {
      if (TTS.isActive()) TTS.pause();
      const word = words[TTS.getCurrentIndex()];
      const u = new SpeechSynthesisUtterance(word.en);
      u.rate = TTS.config.speed; u.lang = 'en-US';
      const v = speechSynthesis.getVoices().find(x => x.lang.startsWith('en-US')) || speechSynthesis.getVoices().find(x => x.lang.startsWith('en-GB'));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    });

    document.querySelector('[data-action="stopDictation"]').addEventListener('click', () => { if (confirm('确定要结束听写吗？')) { TTS.stop(); this.renderPreviewPanel(); } });
    document.querySelector('[data-action="dictSettings"]').addEventListener('click', () => { TTS.pause(); btnPlay.textContent = '▶'; this.openSettings(); });
  },

  _updateDictationUI() {
    const st = document.getElementById('status-text');
    if (!st) return;
    if (this.state.isPaused) { st.textContent = '⏸ 已暂停'; st.className = 'status-text'; }
    else if (this.state.isDictating) { st.textContent = '🔊 正在朗读…'; st.className = 'status-text playing'; }
  },

  _updateDictationProgress(idx, total, word) {
    const pn = document.getElementById('progress-num'), pc = document.getElementById('progress-circle'), st = document.getElementById('status-text'), bp = document.getElementById('btn-play');
    if (pn) pn.textContent = idx + 1;
    if (pc) { const circ = 389.56; pc.setAttribute('stroke-dashoffset', circ * (1 - (idx + 1) / total)); }
    if (st) { st.textContent = '🔊 正在朗读…'; st.className = 'status-text playing'; }
    if (bp && this.state.isDictating) bp.textContent = '⏸';
  },

  _onDictationComplete() {
    ['status-text','btn-play','btn-prev','btn-next','btn-repeat'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'status-text') { el.textContent = '✅ 听写完成！'; el.className = 'status-text'; }
      else { el.disabled = true; if (id === 'btn-play') el.textContent = '✓'; }
    });
    setTimeout(() => this._showAnswerPanel(), 1500);
  },

  _showAnswerPanel() {
    this.state.panel = 'answer'; this._showPanel('panel-answer');
    const { unit, textbook: tb, words } = this.state;
    const container = document.getElementById('panel-answer');
    if (!container) return;
    const wrongSet = new Set(Storage.getWrongWordsForUnit(tb.id, this.state.unitIdx));

    let html = `<div class="header-row" style="margin-bottom:16px;"><button class="btn-back" data-action="backToPreview">←</button><div class="header-title">📋 答案对照</div><div style="width:36px;"></div></div>`;
    html += `<div class="answer-summary"><div class="word-count">${words.length}</div><div class="score-text">本单元单词总数</div>${wrongSet.size>0?`<div style="margin-top:8px;color:var(--danger);">已标记 ${wrongSet.size} 个错词</div>`:''}</div>`;
    html += '<div class="answer-actions"><button class="btn btn-outline btn-sm" data-action="showWrongOnly">❌ 只看错词</button><button class="btn btn-outline btn-sm" data-action="revealAll">👁 全部显示</button></div>';
    html += '<div class="section-label">📝 单词答案</div><div class="card" style="padding:0;cursor:default;"><ul class="word-list">';
    words.forEach((w, i) => {
      html += `<li class="word-item${wrongSet.has(w.en)?' wrong':''}" data-word="${w.en}"><span class="word-num">${i+1}</span><span class="word-en">${w.en}</span><span class="word-zh">${w.zh}</span><button class="mark-btn" data-action="toggleWrong" data-word="${w.en}">${wrongSet.has(w.en)?'✕':'○'}</button></li>`;
    });
    html += '</ul></div>';
    html += `<div style="margin-top:16px;display:flex;gap:10px;"><button class="btn btn-outline" data-action="retryAll" style="flex:1;">🔁 重新听写全部</button>${wrongSet.size>0?'<button class="btn btn-warning" data-action="retryWrong" style="flex:1;">❌ 只听错词</button>':''}</div>`;
    html += '<button class="btn btn-ghost btn-sm" data-action="backToSelect" style="margin-top:8px;width:100%;">📚 选择其他单元</button>';

    container.innerHTML = html;
    container.querySelector('[data-action="backToPreview"]').addEventListener('click', () => this.renderPreviewPanel());
    container.querySelector('[data-action="backToSelect"]').addEventListener('click', () => this.renderSelectPanel());
    container.querySelector('[data-action="retryAll"]').addEventListener('click', () => this._startDictation(words));
    const rw = container.querySelector('[data-action="retryWrong"]');
    if (rw) rw.addEventListener('click', () => { const ww = words.filter(w => wrongSet.has(w.en)); if (ww.length) this._startDictation(ww); });

    container.querySelectorAll('[data-action="toggleWrong"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = btn.dataset.word, item = btn.closest('.word-item'), isWrong = item.classList.contains('wrong');
        if (isWrong) { Storage.removeWrongWord(tb.id, this.state.unitIdx, word); item.classList.remove('wrong'); btn.textContent = '○'; }
        else { Storage.addWrongWord(tb.id, this.state.unitIdx, word); item.classList.add('wrong'); btn.textContent = '✕'; }
        const cnt = Storage.getWrongWordsForUnit(tb.id, this.state.unitIdx).length;
        const sumDiv = container.querySelector('.answer-summary');
        let el = sumDiv.querySelector('div[style]');
        if (cnt > 0) { if (el) el.textContent = `已标记 ${cnt} 个错词`; else { el = document.createElement('div'); el.style.cssText = 'margin-top:8px;color:var(--danger);'; el.textContent = `已标记 ${cnt} 个错词`; sumDiv.appendChild(el); } }
        else { if (el) el.remove(); }
      });
    });

    container.querySelector('[data-action="showWrongOnly"]').addEventListener('click', () => {
      container.querySelectorAll('.word-item').forEach(item => { if (!item.classList.contains('wrong')) item.style.display = 'none'; });
    });
    container.querySelector('[data-action="revealAll"]').addEventListener('click', () => {
      container.querySelectorAll('.word-item').forEach(item => { item.style.display = ''; });
    });
  },

  openSettings() {
    const existing = document.querySelector('.settings-sheet');
    if (existing) existing.remove();
    const sheet = document.createElement('div');
    sheet.className = 'modal-overlay settings-sheet';
    sheet.innerHTML = `<div class="modal-sheet"><h2>⚙ 听写设置</h2>
      <div class="settings-section"><h3>语速</h3><div class="setting-row"><span style="font-size:20px;">🐢</span><input type="range" id="set-speed" min="0.5" max="1.2" step="0.05" value="${TTS.config.speed}"><span style="font-size:20px;">🐇</span></div><div style="text-align:center;font-size:13px;color:var(--text-light);">当前: <span id="speed-val">${TTS.config.speed}x</span></div></div>
      <div class="settings-section"><h3>单词间隔</h3><div class="chip-group">${[3,5,8,10].map(s => `<button class="chip${TTS.config.interval===s?' active':''}" data-setting="interval" data-value="${s}">${s}秒</button>`).join('')}</div></div>
      <div class="settings-section"><h3>朗读次数</h3><div class="chip-group">${[1,2,3].map(n => `<button class="chip${TTS.config.repeat===n?' active':''}" data-setting="repeat" data-value="${n}">${n}遍</button>`).join('')}</div></div>
      <div class="settings-section"><h3>朗读模式</h3><div class="setting-row"><label>朗读中文释义</label><label class="toggle"><input type="checkbox" id="set-chinese" ${TTS.config.readChinese?'checked':''}><span class="slider"></span></label></div><div style="font-size:12px;color:var(--text-light);">${TTS.config.readChinese?'每个单词先读英文，再读中文':'只朗读英文单词'}</div></div>
      <button class="btn btn-primary" id="btn-save-settings" style="margin-top:20px;">✅ 保存设置</button>
      <button class="btn btn-ghost" id="btn-close-settings" style="width:100%;margin-top:8px;">取消</button></div>`;
    document.body.appendChild(sheet);

    const speedSlider = sheet.querySelector('#set-speed'), speedVal = sheet.querySelector('#speed-val');
    speedSlider.addEventListener('input', () => { speedVal.textContent = parseFloat(speedSlider.value).toFixed(2) + 'x'; });
    sheet.querySelector('#set-chinese').addEventListener('change', (e) => {
      sheet.querySelector('.settings-section:last-child div:last-child').textContent = e.target.checked ? '每个单词先读英文，再读中文' : '只朗读英文单词';
    });
    sheet.querySelectorAll('[data-setting]').forEach(chip => {
      chip.addEventListener('click', () => {
        sheet.querySelectorAll(`[data-setting="${chip.dataset.setting}"]`).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
    sheet.querySelector('#btn-save-settings').addEventListener('click', () => {
      const speed = parseFloat(speedSlider.value);
      const interval = parseInt(sheet.querySelector('[data-setting="interval"].active').dataset.value);
      const repeat = parseInt(sheet.querySelector('[data-setting="repeat"].active').dataset.value);
      const readChinese = sheet.querySelector('#set-chinese').checked;
      TTS.updateConfig({ speed, interval, repeat, readChinese });
      Storage.saveSettings({ speed, interval, repeat, readChinese });
      sheet.remove();
      this._showToast('设置已保存 ✓');
      if (this.state.panel === 'preview') this.renderPreviewPanel();
    });
    sheet.querySelector('#btn-close-settings').addEventListener('click', () => sheet.remove());
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
  },

  _showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');
  },

  _showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast'; toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());