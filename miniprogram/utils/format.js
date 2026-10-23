// 格式化与状态计算工具
const pad = n => (n < 10 ? '0' + n : '' + n);

function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function fmtDateTime(ts) {
  const d = new Date(ts);
  return `${fmtDate(ts)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtTime(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 活动状态：enrolling 报名中 / full 已满员 / ongoing 进行中 / ended 已结束 / closed 未开放
function activityStatus(a, now) {
  now = now || Date.now();
  if (a.enrollOpen === false) return 'closed';
  if (now > a.endAt) return 'ended';
  if (now >= a.startAt) return 'ongoing';
  if ((a.enrolled || 0) >= (a.quota || 0)) return 'full';
  return 'enrolling';
}

const STATUS_META = {
  enrolling: { text: '报名中', cls: 'tag-p' },
  full: { text: '名额已满', cls: 'tag-a' },
  ongoing: { text: '进行中', cls: 'tag-g' },
  ended: { text: '已结束', cls: 'tag-n' },
  closed: { text: '未开放', cls: 'tag-n' }
};

// 报名单状态
const REG_META = {
  pending: { text: '待审核', cls: 'tag-a' },
  approved: { text: '已通过', cls: 'tag-g' },
  cancelled: { text: '已取消', cls: 'tag-n' },
  rejected: { text: '未通过', cls: 'tag-r' }
};

module.exports = {
  fmtDate,
  fmtDateTime,
  fmtTime,
  activityStatus,
  statusMeta: s => STATUS_META[s] || STATUS_META.closed,
  regMeta: s => REG_META[s] || REG_META.pending,
  // 活动列表展示需要的冗余字段
  decorate(a) {
    const st = activityStatus(a);
    return Object.assign({}, a, {
      _st: st,
      startAtText: fmtDateTime(a.startAt),
      endAtText: fmtDateTime(a.endAt),
      statusText: (STATUS_META[st] || {}).text || '',
      statusCls: (STATUS_META[st] || {}).cls || 'tag-n',
      percent: a.quota ? Math.min(100, Math.round((a.enrolled || 0) / a.quota * 100)) : 0,
      free: !a.fee
    });
  }
};
