const api = require('../../utils/api.js');
const fmt = require('../../utils/format.js');

Page({
  data: {
    loading: true,
    a: null,
    meEnrolled: false,
    canEnroll: false,
    btnText: '立即报名',
    btnDisabled: false
  },

  onLoad(options) {
    this._id = options.id;
    this.fetch();
  },

  onShow() {
    if (this._loaded) this.fetch(true);
  },

  onShareAppMessage() {
    const a = this.data.a || {};
    return {
      title: a.title || api.config.summitName,
      path: '/pages/detail/detail?id=' + (this._id || '')
    };
  },

  fetch(silent) {
    if (!silent) this.setData({ loading: true });
    return api.activityDetail(this._id).then(res => {
      const a = fmt.decorate(res.activity);
      const meEnrolled = !!res.enrolled;
      const st = a._st;
      const canEnroll = st === 'enrolling' && !meEnrolled;
      let btnText = '立即报名';
      let btnDisabled = false;
      if (meEnrolled) btnText = '已报名 · 查看记录';
      else if (st === 'full') { btnText = '名额已满'; btnDisabled = true; }
      else if (st === 'ongoing') { btnText = '活动进行中'; btnDisabled = true; }
      else if (st === 'ended') { btnText = '活动已结束'; btnDisabled = true; }
      else if (st === 'closed') { btnText = '暂未开放报名'; btnDisabled = true; }

      this._loaded = true;
      this.setData({
        loading: false,
        a,
        meEnrolled,
        canEnroll,
        btnText,
        btnDisabled
      });
      wx.setNavigationBarTitle({ title: a.title || '活动详情' });
    }).catch(err => {
      console.error(err);
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '活动不存在或已下架', icon: 'none' });
    });
  },

  onEnroll() {
    if (this.data.meEnrolled) {
      wx.switchTab({ url: '/pages/records/records' });
      return;
    }
    if (!this.data.canEnroll) return;
    const app = getApp();
    const go = () => wx.navigateTo({ url: '/pages/enroll/enroll?id=' + this._id });
    if (!app.getProfile()) {
      wx.showModal({
        title: '提示',
        content: '报名前需要先完成微信授权登录',
        confirmText: '去登录',
        success: res => {
          if (res.confirm) wx.switchTab({ url: '/pages/mine/mine' });
        }
      });
      return;
    }
    go();
  },

  previewCover() {
    const a = this.data.a;
    if (a && a.cover) {
      wx.previewImage({ urls: [a.cover] });
    }
  }
});
