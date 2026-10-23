const api = require('../../utils/api.js');
const fmt = require('../../utils/format.js');

const TABS = [
  { key: 'all', text: '全部' },
  { key: 'pending', text: '待审核' },
  { key: 'approved', text: '已通过' },
  { key: 'cancelled', text: '已取消' }
];

Page({
  data: {
    tabs: TABS,
    curTab: 'all',
    loading: true,
    list: []
  },

  onShow() {
    this.fetch();
  },

  onPullDownRefresh() {
    this.fetch().finally(() => wx.stopPullDownRefresh());
  },

  fetch() {
    const app = getApp();
    if (!app.getProfile()) {
      this.setData({ loading: false, list: [], needLogin: true });
      return Promise.resolve();
    }
    this.setData({ needLogin: false, loading: true });
    return api.myList().then(list => {
      const decorated = list.map(r => {
        const meta = fmt.regMeta(r.status);
        return Object.assign({}, r, {
          statusText: meta.text,
          statusCls: meta.cls,
          createdAtText: fmt.fmtDateTime(r.createdAt),
          activityTimeText: r.activity ? fmt.fmtDateTime(r.activity.startAt) : '',
          feeText: r.activity ? (r.activity.fee ? '¥' + r.activity.fee : '免费') : ''
        });
      });
      this._raw = decorated;
      this.applyFilter();
    }).catch(err => {
      console.error(err);
      this.setData({ loading: false, list: [] });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    });
  },

  applyFilter() {
    const { curTab } = this.data;
    const raw = this._raw || [];
    const list = curTab === 'all' ? raw : raw.filter(r => r.status === curTab);
    this.setData({ list, loading: false });
  },

  onTab(e) {
    this.setData({ curTab: e.currentTarget.dataset.key });
    this.applyFilter();
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  onCancel(e) {
    const { id, act } = e.currentTarget.dataset;
    wx.showModal({
      title: '取消报名',
      content: '确定取消该活动的报名吗？取消后名额将释放给其他同学。',
      confirmText: '取消报名',
      confirmColor: '#E5484D',
      success: res => {
        if (!res.confirm) return;
        api.cancelReg(id).then(() => {
          wx.showToast({ title: '已取消报名', icon: 'success' });
          this.fetch();
        }).catch(err => {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        });
      }
    });
  },

  goEnroll() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  goLogin() {
    wx.switchTab({ url: '/pages/mine/mine' });
  }
});
