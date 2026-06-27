/* ===== storage.js - LocalStorage management ===== */

const Storage = {
  KEYS: {
    LAST_SELECTION: 'dict_last_selection',
    WRONG_WORDS: 'dict_wrong_words',
    SETTINGS: 'dict_settings',
  },

  getLastSelection() {
    try {
      const raw = localStorage.getItem(this.KEYS.LAST_SELECTION);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  saveLastSelection(sel) {
    try {
      localStorage.setItem(this.KEYS.LAST_SELECTION, JSON.stringify(sel));
    } catch { }
  },

  getWrongWords() {
    try {
      const raw = localStorage.getItem(this.KEYS.WRONG_WORDS);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  },

  saveWrongWords(data) {
    try {
      localStorage.setItem(this.KEYS.WRONG_WORDS, JSON.stringify(data));
    } catch { }
  },

  addWrongWord(textbookId, unitIdx, word) {
    const key = `${textbookId}::${unitIdx}`;
    const all = this.getWrongWords();
    if (!all[key]) all[key] = [];
    if (!all[key].includes(word)) {
      all[key].push(word);
    }
    this.saveWrongWords(all);
  },

  removeWrongWord(textbookId, unitIdx, word) {
    const key = `${textbookId}::${unitIdx}`;
    const all = this.getWrongWords();
    if (all[key]) {
      all[key] = all[key].filter(w => w !== word);
      if (all[key].length === 0) delete all[key];
    }
    this.saveWrongWords(all);
  },

  getWrongWordsForUnit(textbookId, unitIdx) {
    const key = `${textbookId}::${unitIdx}`;
    const all = this.getWrongWords();
    return all[key] || [];
  },

  getSettings() {
    try {
      const raw = localStorage.getItem(this.KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    } catch { }
  },
};