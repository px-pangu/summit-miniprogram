App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库过低，无法使用云开发能力，请升级基础库 >= 2.2.3');
      return;
    }
    // 使用动态当前环境：无需手写环境 ID，跟随开发者工具中选择的云环境
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true
    });
  },

  globalData: {
    // 登录后的用户档案（openid、昵称、头像 fileID、学校）
    profile: null
  },

  // 读取本地缓存的用户档案
  getProfile() {
    if (this.globalData.profile) return this.globalData.profile;
    try {
      const cached = wx.getStorageSync('profile');
      if (cached && cached.openid) {
        this.globalData.profile = cached;
        return cached;
      }
    } catch (e) { /* ignore */ }
    return null;
  },

  setProfile(profile) {
    this.globalData.profile = profile;
    try {
      wx.setStorageSync('profile', profile);
    } catch (e) { /* ignore */ }
  },

  clearProfile() {
    this.globalData.profile = null;
    try {
      wx.removeStorageSync('profile');
    } catch (e) { /* ignore */ }
  }
});
