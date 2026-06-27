/* ===== tts.js - TTS speech engine ===== */
/* Web SpeechSynthesis API, queue-based playback */

const TTS = {
  _queue: [], _index: 0, _paused: false, _stopped: false,

  config: { speed: 0.85, interval: 5, repeat: 2, readChinese: false },

  onStart: null, onWordStart: null, onWordEnd: null,
  onPause: null, onResume: null, onComplete: null, onStop: null,

  _getEnglishVoice() {
    const voices = speechSynthesis.getVoices();
    return voices.find(v => v.lang.startsWith('en-US'))
      || voices.find(v => v.lang.startsWith('en-GB'))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
  },

  _getChineseVoice() {
    const voices = speechSynthesis.getVoices();
    return voices.find(v => v.lang.startsWith('zh-CN'))
      || voices.find(v => v.lang.startsWith('zh'));
  },

  _speak(text, lang) {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = this.config.speed;
      u.pitch = 1;
      u.volume = 1;

      if (lang === 'en') {
        const v = this._getEnglishVoice();
        if (v) u.voice = v;
        u.lang = 'en-US';
      } else if (lang === 'zh') {
        const v = this._getChineseVoice();
        if (v) u.voice = v;
        u.lang = 'zh-CN';
      }

      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  },

  _wait(seconds) {
    return new Promise((resolve) => {
      let elapsed = 0;
      const step = 200;
      const timer = setInterval(() => {
        if (this._stopped) { clearInterval(timer); resolve(); return; }
        if (this._paused) return;
        elapsed += step;
        if (elapsed >= seconds * 1000) { clearInterval(timer); resolve(); }
      }, step);
    });
  },

  async _speakWord(word, index, total) {
    if (this._stopped) return;
    if (this.onWordStart) this.onWordStart(index, total, word);

    for (let i = 0; i < this.config.repeat; i++) {
      if (this._stopped) return;
      await this._speak(word.en, 'en');
      if (i < this.config.repeat - 1) await this._wait(0.8);
    }

    if (this.config.readChinese && word.zh) {
      if (this._stopped) return;
      await this._wait(0.3);
      await this._speak(word.zh, 'zh');
    }

    if (this.onWordEnd) this.onWordEnd(index, total, word);
  },

  async _runQueue(words) {
    this._stopped = false; this._paused = false;
    if (this.onStart) this.onStart();

    for (let i = 0; i < words.length; i++) {
      if (this._stopped) break;
      if (i > 0) await this._wait(this.config.interval);
      if (this._stopped) break;

      while (this._paused && !this._stopped) await this._wait(0.3);
      if (this._stopped) break;

      this._index = i;
      await this._speakWord(words[i], i, words.length);
    }

    if (!this._stopped && this.onComplete) this.onComplete();
  },

  start(words) {
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.onvoiceschanged = null;
        this._stopped = false; this._paused = false; this._index = 0;
        this._runQueue(words);
      };
    } else {
      this._stopped = false; this._paused = false; this._index = 0;
      this._runQueue(words);
    }
  },

  pause() {
    this._paused = true;
    speechSynthesis.cancel();
    if (this.onPause) this.onPause();
  },

  resume() {
    if (!this._paused) return;
    this._paused = false;
    if (this.onResume) this.onResume();
    const words = this._queue;
    if (words.length > 0 && this._index < words.length) {
      this._continueFrom(this._index);
    }
  },

  async _continueFrom(index) {
    const words = this._queue;
    for (let i = index; i < words.length; i++) {
      if (this._stopped) break;
      while (this._paused && !this._stopped) await this._wait(0.3);
      if (this._stopped) break;
      if (i > index) await this._wait(this.config.interval);
      if (this._stopped) break;
      this._index = i;
      await this._speakWord(words[i], i, words.length);
    }
    if (!this._stopped && this.onComplete) this.onComplete();
  },

  stop() {
    this._stopped = true; this._paused = false;
    speechSynthesis.cancel();
    this._index = 0; this._queue = [];
    if (this.onStop) this.onStop();
  },

  skipTo(index) { this._index = index; },
  getCurrentIndex() { return this._index; },
  setQueue(words) { this._queue = words; this._index = 0; },
  getQueue() { return this._queue; },
  isActive() { return !this._stopped && !this._paused; },
  isPaused() { return this._paused; },
  isStopped() { return this._stopped; },
  updateConfig(config) { Object.assign(this.config, config); },
};