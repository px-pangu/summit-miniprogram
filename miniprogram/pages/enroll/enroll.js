const api = require('../../utils/api.js');
const fmt = require('../../utils/format.js');

const DEGREES = ['本科', '硕士', '博士', '其他'];

Page({
  data: {
    a: null,
    degrees: DEGREES,
    degreeIndex: -1,
    directions: [],
    direction: '',
    needHotel: false,
    agreed: false,
    submitting: false,
    success: null,   // 提交成功后的回执
    form: {
      name: '',
      phone: '',
      school: '',
      major: '',
      email: '',
      remark: ''
    }
  },

  onLoad(options) {
    this._id = options.id;
    api.activityDetail(this._id).then(res => {
      const a = fmt.decorate(res.activity);
      this.setData({
        a,
        directions: (a.directions && a.directions.length)
          ? a.directions : api.config.defaultDirections
      });
      // 已报名则直接回记录页
      if (res.enrolled) {
        wx.showModal({
          title: '提示',
          content: '您已报名该活动，可在报名记录中查看',
          showCancel: false,
          confirmText: '查看记录',
          success: () => wx.switchTab({ url: '/pages/records/records' })
        });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '活动加载失败', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
    });
  },

  /* ---------------- 表单交互 ---------------- */
  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  onDegree(e) {
    this.setData({ degreeIndex: Number(e.detail.value) });
  },

  onDirection(e) {
    this.setData({ direction: e.currentTarget.dataset.d });
  },

  onHotel(e) {
    this.setData({ needHotel: e.detail.value });
  },

  onAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  /* ---------------- 校验与提交 ---------------- */
  validate() {
    const f = this.data.form;
    const rules = [
      [f.name.trim(), '请填写姓名'],
      [/^1\d{10}$/.test(f.phone.trim()), '请填写正确的 11 位手机号', f.phone.trim()],
      [f.school.trim(), '请填写所在学校'],
      [f.major.trim(), '请填写学院 / 专业'],
      [this.data.degreeIndex >= 0, '请选择学历'],
      [this.data.direction, '请选择参会方向']
    ];
    for (const r of rules) {
      if (!r[0]) {
        wx.showToast({ title: r[1], icon: 'none' });
        return false;
      }
    }
    const email = f.email.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      wx.showToast({ title: '邮箱格式不正确', icon: 'none' });
      return false;
    }
    return true;
  },

  onSubmit() {
    if (this.data.submitting) return;
    if (!this.validate()) return;
    if (!this.data.agreed) {
      wx.showToast({ title: '请先勾选同意报名须知', icon: 'none' });
      return;
    }
    const app = getApp();
    const profile = app.getProfile();
    if (!profile) {
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

    const f = this.data.form;
    this.setData({ submitting: true });
    api.submitReg({
      activityId: this._id,
      name: f.name.trim(),
      phone: f.phone.trim(),
      school: f.school.trim(),
      major: f.major.trim(),
      degree: this.data.degrees[this.data.degreeIndex],
      direction: this.data.direction,
      email: f.email.trim(),
      needHotel: this.data.needHotel,
      remark: f.remark.trim()
    }).then(res => {
      this.setData({ success: res.reg });
      wx.showToast({ title: '报名成功', icon: 'success' });
    }).catch(err => {
      wx.showToast({ title: err.message || '提交失败，请重试', icon: 'none' });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  },

  goRecords() {
    wx.switchTab({ url: '/pages/records/records' });
  },

  backHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
