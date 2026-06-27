/* ===== data.js - Textbook data (embedded for offline use) ===== */

const TEXTBOOK_DATA = {"textbooks":[{"id":"wy-3a","name":"外研版三年级上册","stage":"小学","publisher":"外研版","version":"三年级起点","grade":3,"semester":"上","units":[{"unit":1,"module":"Module 1","title":"问候与寒暄","words":[{"en":"I","zh":"我"},{"en":"am","zh":"是"},{"en":"hello","zh":"你好"},{"en":"goodbye","zh":"再见"},{"en":"are","zh":"是"},{"en":"good","zh":"好的"},{"en":"morning","zh":"早晨，上午"},{"en":"fine","zh":"健康的"},{"en":"thank","zh":"谢谢"},{"en":"you","zh":"你；你们"}]},{"unit":2,"module":"Module 2","title":"介绍与询问","words":[{"en":"Ms","zh":"女士"},{"en":"boy","zh":"男孩"},{"en":"girl","zh":"女孩"},{"en":"and","zh":"那么；和"},{"en":"too","zh":"也"},{"en":"what","zh":"什么"},{"en":"your","zh":"你的；你们的"},{"en":"name","zh":"名字"},{"en":"please","zh":"请"},{"en":"afternoon","zh":"下午"},{"en":"Mr","zh":"先生"}]},{"unit":3,"module":"Module 3","title":"教室指令与物品","words":[{"en":"point","zh":"指"},{"en":"to","zh":"向……"},{"en":"the","zh":"这（那）个，这（那）些"},{"en":"door","zh":"门"},{"en":"sit","zh":"坐"},{"en":"down","zh":"向下"},{"en":"stand","zh":"站"},{"en":"up","zh":"向上"},{"en":"window","zh":"窗户"},{"en":"blackboard","zh":"黑板"},{"en":"bird","zh":"鸟"},{"en":"desk","zh":"书桌"},{"en":"chair","zh":"椅子"}]},{"unit":4,"module":"Module 4","title":"颜色","words":[{"en":"it","zh":"它"},{"en":"red","zh":"红色的"},{"en":"look","zh":"看"},{"en":"yellow","zh":"黄色的"},{"en":"blue","zh":"蓝色的"},{"en":"my","zh":"我的"},{"en":"panda","zh":"熊猫"},{"en":"now","zh":"现在"},{"en":"green","zh":"绿色的"},{"en":"black","zh":"黑色的"},{"en":"dog","zh":"狗"},{"en":"cat","zh":"猫"},{"en":"cap","zh":"帽子"}]},{"unit":5,"module":"Module 5","title":"数字1-12","words":[{"en":"one","zh":"一"},{"en":"two","zh":"二"},{"en":"three","zh":"三"},{"en":"four","zh":"四"},{"en":"five","zh":"五"},{"en":"six","zh":"六"},{"en":"seven","zh":"七"},{"en":"eight","zh":"八"},{"en":"nine","zh":"九"},{"en":"ten","zh":"十"},{"en":"eleven","zh":"十一"},{"en":"twelve","zh":"十二"}]},{"unit":6,"module":"Module 6","title":"生日与学习用品","words":[{"en":"happy","zh":"快乐的"},{"en":"birthday","zh":"生日"},{"en":"present","zh":"礼物"},{"en":"this","zh":"这个"},{"en":"pencil","zh":"铅笔"},{"en":"pen","zh":"钢笔"},{"en":"cake","zh":"蛋糕"},{"en":"old","zh":"……岁的"},{"en":"yes","zh":"是的"}]},{"unit":7,"module":"Module 7","title":"学校相关","words":[{"en":"teacher","zh":"教师"},{"en":"pupil","zh":"小学生"},{"en":"school","zh":"学校"},{"en":"classroom","zh":"教室"},{"en":"English","zh":"英语"},{"en":"that","zh":"那个"},{"en":"say","zh":"说"},{"en":"again","zh":"再一次"},{"en":"schoolbag","zh":"书包"},{"en":"ball","zh":"球"},{"en":"book","zh":"书"}]},{"unit":8,"module":"Module 8","title":"物品与位置","words":[{"en":"monster","zh":"怪物"},{"en":"new","zh":"新的"},{"en":"kite","zh":"风筝"},{"en":"or","zh":"或者"},{"en":"know","zh":"知道"},{"en":"no","zh":"不"},{"en":"help","zh":"救命"},{"en":"where","zh":"哪里"},{"en":"in","zh":"在……里"},{"en":"bag","zh":"包"}]},{"unit":9,"module":"Module 9","title":"家人与职业","words":[{"en":"mother","zh":"母亲"},{"en":"father","zh":"父亲"},{"en":"sister","zh":"姐妹"},{"en":"brother","zh":"兄弟"},{"en":"she","zh":"她"},{"en":"grandpa","zh":"祖父；外祖父"},{"en":"grandma","zh":"祖母；外祖母"},{"en":"me","zh":"我"},{"en":"he","zh":"他"},{"en":"doctor","zh":"医生"},{"en":"policeman","zh":"警察"},{"en":"nurse","zh":"护士"},{"en":"driver","zh":"司机"},{"en":"farmer","zh":"农民"}]},{"unit":10,"module":"Module 10","title":"身体部位","words":[{"en":"his","zh":"他的"},{"en":"head","zh":"头"},{"en":"leg","zh":"腿"},{"en":"foot","zh":"脚"},{"en":"on","zh":"在……上"},{"en":"arm","zh":"胳膊"},{"en":"hand","zh":"手"},{"en":"her","zh":"她的"},{"en":"nose","zh":"鼻子"},{"en":"eye","zh":"眼睛"},{"en":"mouth","zh":"嘴"},{"en":"ear","zh":"耳朵"}]}]}]};

const DataStore = {
  textbooks: [],
  _loaded: false,

  async load() {
    if (this._loaded) return this.textbooks;
    if (TEXTBOOK_DATA.textbooks) { this.textbooks = TEXTBOOK_DATA.textbooks; }
    try {
      const files = ['data/wy-3a.json'];
      for (const file of files) {
        const resp = await fetch(file);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (data.textbooks) {
          const existingIds = new Set(this.textbooks.map(t => t.id));
          for (const tb of data.textbooks) { if (!existingIds.has(tb.id)) this.textbooks.push(tb); }
        }
      }
    } catch (err) { /* offline mode, embedded data works fine */ }
    this._loaded = true;
    return this.textbooks;
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
  getStages() { return [...new Set(this.textbooks.map(t => t.stage))]; },
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
  findTextbook(id) { return this.textbooks.find(t => t.id === id); },
  findOne({ stage, publisher, grade, semester }) {
    return this.textbooks.find(t => t.stage === stage && t.publisher === publisher && t.grade === grade && t.semester === semester);
  },
};