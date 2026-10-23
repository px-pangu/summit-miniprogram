const api = require('../../utils/api.js');

Page({
  data: {
    profile: null,     // { openid, nickName, avatarFileID, avatarUrl, school }
    editing: false,
    nickName: '',
    school: ''
  },

  onShow() {
    const app = getApp();
    const p = app.getProfile();
    this.setData({ profile: p });
    if (p && !p.nickName && !this._triedLogin) {
      this._triedLogin = true;
      this.silentLogin();
    }
  },

  // 静默登录：换取 openid（不会弹出授权窗口）
  silentLogin() {
    wx.showLoading({ title: '登录中', mask: true });
    api.login().then(res => {
      const app = getApp();
      const profile = Object.assign({ openid: res.openid }, res.profile || {});
      app.setProfile(profile);
      this.setData({ profile });
    }).catch(err => {
      console.error(err);
      wx.showToast({ title: err.message || '登录失败，请检查云环境', icon: 'none' });
    }).finally(() => wx.hideLoading());
  },

  onLogin() {
    this.silentLogin();
  },

  /* ---------------- 头像昵称授权填写 ---------------- */
  onChooseAvatar(e) {
    const filePath = e.detail.avatarUrl;
    if (!this.data.profile) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '上传中', mask: true });
    api.uploadImage(filePath, 'avatar')
      .then(fileID => api.saveProfile({ avatarFileID: fileID }))
      .then(() => {
        const app = getApp();
        const p = Object.assign({}, this.data.profile, {
          avatarFileID: fileID,
          avatarUrl: filePath
        });
        app.setProfile(p);
        this.setData({ profile: p });
        wx.showToast({ title: '头像已更新', icon: 'success' });
      })
      .catch(err => {
        console.error(err);
        wx.showToast({ title: err.message || '上传失败', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  },

  onStartEdit() {
    const p = this.data.profile || {};
    this.setData({ editing: true, nickName: p.nickName || '', school: p.school || '' });
  },

  onNickInput(e) { this.setData({ nickName: e.detail.value }); },
  onSchoolInput(e) { this.setData({ school: e.detail.value }); },

  onCancelEdit() {
    this.setData({ editing: false });
  },

  onSaveProfile() {
    const nickName = this.data.nickName.trim();
    if (!nickName) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    const patch = { nickName, school: this.data.school.trim() };
    api.saveProfile(patch).then(() => {
      const app = getApp();
      const p = Object.assign({}, this.data.profile, patch);
      app.setProfile(p);
      this.setData({ profile: p, editing: false });
      wx.showToast({ title: '已保存', icon: 'success' });
    }).catch(err => {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },

  /* ---------------- 菜单 ---------------- */
  goRecords() {
    wx.switchTab({ url: '/pages/records/records' });
  },

  goPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' });
  },

  onAbout() {
    const c = api.config;
    wx.showModal({
      title: c.summitName,
      content: `${c.slogan}\n主办：${c.organizer}\n时间：${c.date}\n地点：${c.venue}\n\n如需帮助请联系 ${c.contactPhone}`,
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清除本地登录档案，云端报名数据不受影响。',
      confirmText: '清除',
      confirmColor: '#E5484D',
      success: res => {
        if (!res.confirm) return;
        getApp().clearProfile();
        this._triedLogin = false;
        this.setData({ profile: null });
        wx.showToast({ title: '已清除', icon: 'success' });
      }
    });
  }
});
