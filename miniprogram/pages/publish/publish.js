const api = require('../../utils/api.js');
const fmt = require('../../utils/format.js');

Page({
  data: {
    submitting: false,
    cover: '',          // 本地临时路径或云存储 fileID
    modes: ['线下', '线上'],
    modeIndex: 0,
    // 表单
    f: {
      title: '',
      subtitle: '',
      date: '',
      time: '',
      endDate: '',
      endTime: '',
      city: '上海',
      venue: '',
      address: '',
      quota: '',
      fee: '',
      desc: '',
      agenda: '',
      tags: ''
    }
  },

  /* ---------------- 封面：选择即上传云存储 ---------------- */
  onPickCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: res => {
        const filePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中', mask: true });
        api.uploadImage(filePath, 'draft')
          .then(fileID => {
            this._coverFileID = fileID;
            this.setData({ cover: filePath });
            wx.showToast({ title: '已上传云存储', icon: 'success' });
          })
          .catch(err => {
            console.error(err);
            wx.showToast({ title: err.message || '上传失败', icon: 'none' });
          })
          .finally(() => wx.hideLoading());
      }
    });
  },

  onRemoveCover() {
    this._coverFileID = '';
    this.setData({ cover: '' });
  },

  /* ---------------- 表单 ---------------- */
  onInput(e) {
    this.setData({ ['f.' + e.currentTarget.dataset.key]: e.detail.value });
  },
  onMode(e) {
    this.setData({ modeIndex: Number(e.detail.value) });
  },

  validate() {
    const f = this.data.f;
    if (!f.title.trim()) return '请填写活动标题';
    if (!f.date || !f.time) return '请选择开始时间';
    if (!f.endDate || !f.endTime) return '请选择结束时间';
    const startAt = new Date(f.date.replace(/\./g, '-') + 'T' + f.time).getTime();
    const endAt = new Date(f.endDate.replace(/\./g, '-') + 'T' + f.endTime).getTime();
    if (!(startAt > 0 && endAt > 0)) return '时间格式不正确';
    if (endAt <= startAt) return '结束时间需晚于开始时间';
    if (!f.city.trim()) return '请填写城市';
    if (!f.venue.trim()) return '请填写场馆';
    const quota = Number(f.quota);
    if (!quota || quota <= 0) return '请填写有效的名额上限';
    return null;
  },

  onSubmit() {
    if (this.data.submitting) return;
    const err = this.validate();
    if (err) {
      wx.showToast({ title: err, icon: 'none' });
      return;
    }
    const f = this.data.f;
    const startAt = new Date(f.date.replace(/\./g, '-') + 'T' + f.time).getTime();
    const endAt = new Date(f.endDate.replace(/\./g, '-') + 'T' + f.endTime).getTime();

    const payload = {
      title: f.title.trim(),
      subtitle: f.subtitle.trim(),
      cover: this._coverFileID || '',
      startAt,
      endAt,
      city: f.city.trim(),
      venue: f.venue.trim(),
      address: f.address.trim(),
      mode: this.data.modeIndex === 1 ? 'online' : 'offline',
      audience: '顶尖高校本科生与研究生',
      organizer: api.config.organizer,
      quota: Number(f.quota),
      fee: Number(f.fee) || 0,
      enrolled: 0,
      enrollOpen: true,
      desc: f.desc.trim(),
      // 议程：每行一条，格式「开始时间|标题|简介」
      agenda: f.agenda.trim().split('\n')
        .map(line => line.trim()).filter(Boolean)
        .map(line => {
          const parts = line.split('|').map(s => s.trim());
          return { time: parts[0] || '', title: parts[1] || '', desc: parts[2] || '' };
        }),
      tags: f.tags.trim() ? f.tags.trim().split(/[,，、\s]+/).filter(Boolean) : [],
      speakers: []
    };

    this.setData({ submitting: true });
    api.createActivity(payload).then(res => {
      wx.showToast({ title: '活动已发布', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/detail/detail?id=' + res.id });
      }, 900);
    }).catch(e => {
      console.error(e);
      wx.showToast({ title: e.message || '发布失败，请重试', icon: 'none' });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  }
});
