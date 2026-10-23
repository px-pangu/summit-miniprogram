const api = require('../../utils/api.js');
const fmt = require('../../utils/format.js');

const TABS = [
  { key: 'all', text: '全部' },
  { key: 'enrolling', text: '报名中' },
  { key: 'ongoing', text: '进行中' },
  { key: 'ended', text: '已结束' }
];

Page({
  data: {
    cfg: api.config,
    tabs: TABS,
    curTab: 'all',
    keyword: '',
    loading: true,
    list: [],
    stats: { total: 0, people: 0 }
  },

  onLoad() {
    this.fetch();
  },

  onPullDownRefresh() {
    this.fetch().finally(() => wx.stopPullDownRefresh());
  },

  onShow() {
    // 从报名/管理页返回时刷新名额进度
    if (this._loaded) this.fetch(true);
  },

  fetch(silent) {
    if (!silent) this.setData({ loading: true });
    return api.activityList().then(list => {
      const now = Date.now();
      const decorated = list.map(a => fmt.decorate(a));
      let people = 0;
      list.forEach(a => { people += a.enrolled || 0; });
      this._raw = decorated;
      this._stats = {
        total: list.length,
        people
      };
      this._loaded = true;
      this.setData({ stats: this._stats });
      this.applyFilter();
    }).catch(err => {
      console.error(err);
      this._raw = [];
      this.setData({ list: [], loading: false, stats: { total: 0, people: 0 } });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    });
  },

  applyFilter() {
    const { curTab, keyword } = this.data;
    const raw = this._raw || [];
    const kw = keyword.trim().toLowerCase();
    const list = raw.filter(a => {
      const okTab = curTab === 'all' ||
        (curTab === 'enrolling' && (a._st === 'enrolling' || a._st === 'full')) ||
        a._st === curTab;
      const okKw = !kw ||
        (a.title || '').toLowerCase().indexOf(kw) >= 0 ||
        (a.city || '').indexOf(kw) >= 0;
      return okTab && okKw;
    });
    this.setData({ list, loading: false });
  },

  onTab(e) {
    this.setData({ curTab: e.currentTarget.dataset.key });
    this.applyFilter();
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id });
  }
});
