/* ===== data.js - Textbook data loader ===== */

const DataStore = {
  textbooks: [],
  _loaded: false,

  async load() {
    if (this._loaded) return this.textbooks;

    try {
      const files = ['data/wy-3a.json'];

      for (const file of files) {
        const resp = await fetch(file);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (data.textbooks) {
          this.textbooks.push(...data.textbooks);
        }
      }

      this._loaded = true;
      return this.textbooks;
    } catch (err) {
      console.error('Textbook data load failed:', err);
      return [];
    }
  },

  getAllTextbooks() { return this.textbooks; },

  filter({ stage, publisher, grade, semester }) {
    let list = this.textbooks;
    if (stage) list = list.filter(t => t.stage === stage);
    if (publisher) list = list.filter(t => t.publisher === publisher);
    if (grade) list = list.filter(t => t.grade === grade);
    if (semester) list = list.filter(t => t.semester === semester);
    return list;
  },

  getStages() {
    return [...new Set(this.textbooks.map(t => t.stage))];
  },

  getPublishers(stage) {
    const filtered = stage ? this.textbooks.filter(t => t.stage === stage) : this.textbooks;
    return [...new Set(filtered.map(t => t.publisher))];
  },

  getGrades(stage, publisher) {
    let list = this.textbooks;
    if (stage) list = list.filter(t => t.stage === stage);
    if (publisher) list = list.filter(t => t.publisher === publisher);
    return [...new Set(list.map(t => t.grade))].sort((a, b) => a - b);
  },

  getSemesters(stage, publisher, grade) {
    let list = this.textbooks;
    if (stage) list = list.filter(t => t.stage === stage);
    if (publisher) list = list.filter(t => t.publisher === publisher);
    if (grade) list = list.filter(t => t.grade === grade);
    return [...new Set(list.map(t => t.semester))];
  },

  findTextbook(id) {
    return this.textbooks.find(t => t.id === id);
  },

  findOne({ stage, publisher, grade, semester }) {
    return this.textbooks.find(t =>
      t.stage === stage && t.publisher === publisher &&
      t.grade === grade && t.semester === semester
    );
  },
};