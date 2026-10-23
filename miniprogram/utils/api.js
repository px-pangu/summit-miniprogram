// 云函数调用与数据访问封装
const config = require('../config.js');

function call(name, data) {
  return wx.cloud.callFunction({ name, data }).then(res => {
    const r = res.result;
    if (r && r.ok === false) {
      return Promise.reject(new Error(r.msg || '服务暂不可用'));
    }
    return r;
  });
}

module.exports = {
  config,

  // 登录：换取 openid 并拉取/创建用户档案
  login() {
    return call('login', { action: 'login' });
  },

  // 保存昵称 / 头像 / 学校
  saveProfile(profile) {
    return call('login', { action: 'saveProfile', profile });
  },

  // 活动列表
  activityList() {
    return call('activity', { action: 'list' }).then(r => r.list || []);
  },

  // 活动详情（附带我的报名状态）
  activityDetail(id) {
    return call('activity', { action: 'detail', id });
  },

  // 提交报名
  submitReg(payload) {
    return call('register', { action: 'submit', payload });
  },

  // 我的报名记录
  myList() {
    return call('register', { action: 'myList' }).then(r => r.list || []);
  },

  // 取消报名
  cancelReg(id) {
    return call('register', { action: 'cancel', id });
  },

  // 创建活动（管理端）
  createActivity(payload) {
    return call('admin', { action: 'createActivity', payload });
  },

  // 上传活动图片到云存储，返回 fileID
  uploadImage(filePath, activityId) {
    const cloudPath = `activities/${activityId || 'temp'}/cover-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
    return wx.cloud.uploadFile({ cloudPath, filePath }).then(res => res.fileID);
  }
};
