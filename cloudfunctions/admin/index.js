const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 管理端操作鉴权：把允许创建活动的小程序 openid 填在这里（可在「我的」页控制台日志中查看）
const ADMIN_OPENIDS = [];

function isAllowed(openid) {
  // 未配置名单时视为开放（开发阶段）；上线前务必填入管理员 openid
  return ADMIN_OPENIDS.length === 0 || ADMIN_OPENIDS.indexOf(openid) >= 0;
}

function demoActivities() {
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  return [
    {
      title: '主论坛 · 大模型与未来产业',
      subtitle: '院士领衔，共话通用人工智能时代的人才机遇',
      startAt: now + 30 * DAY, endAt: now + 30 * DAY + 9 * 3600 * 1000,
      city: '上海', venue: '上海国际会议中心', address: '浦东新区滨江大道2727号',
      mode: 'offline', audience: '顶尖高校本科生与研究生',
      organizer: '青年科创人才发展中心',
      quota: 300, enrolled: 0, fee: 0, enrollOpen: true,
      tags: ['峰会', '主论坛', '人工智能'],
      desc: '汇聚院士学者与头部企业科学家，围绕大模型技术演进、产业落地与青年人才培养展开深度研讨。\n参会收获：\n1. 与行业顶尖学者面对面交流\n2. 获取峰会专属学习资料包\n3. 优秀学子可进入企业人才库',
      agenda: [
        { time: '09:00', title: '签到入场', desc: '凭签到码入场，领取会议资料' },
        { time: '09:30', title: '开幕致辞', desc: '主办方致辞' },
        { time: '10:00', title: '主旨演讲：大模型技术趋势', desc: '特邀院士' },
        { time: '14:00', title: '圆桌对话：青年人才与产业未来', desc: '企业科学家 × 高校学者' },
        { time: '17:00', title: '自由交流', desc: '人才对接与合影' }
      ],
      speakers: [
        { name: '林远航', title: '中国科学院院士 · 计算机体系结构' },
        { name: '陈曦', title: '头部大模型企业首席科学家' },
        { name: '苏黎', title: '某顶尖高校教授 · 博士生导师' }
      ]
    },
    {
      title: '分论坛 · 集成电路与硬科技',
      subtitle: '从器件前沿到国产化生态',
      startAt: now + 30 * DAY + DAY, endAt: now + 30 * DAY + DAY + 7 * 3600 * 1000,
      city: '上海', venue: '上海国际会议中心 3F 珠海厅', address: '',
      mode: 'offline', audience: '微电子、物理、材料相关专业学生',
      organizer: '青年科创人才发展中心',
      quota: 120, enrolled: 0, fee: 0, enrollOpen: true,
      tags: ['峰会', '分论坛', '集成电路'],
      desc: '聚焦芯片设计与先进制造，邀请产业一线专家分享技术路线与职业成长路径。',
      agenda: [
        { time: '13:30', title: '签到入场', desc: '' },
        { time: '14:00', title: '主题报告：先进制程进展', desc: '晶圆厂技术总监' },
        { time: '16:00', title: '学生海报展示', desc: '优秀课题评选' }
      ],
      speakers: [
        { name: '顾清川', title: '晶圆代工企业技术总监' },
        { name: '何昕然', title: 'EDA 独角兽公司研发副总裁' }
      ]
    },
    {
      title: '线上公开课 · 科研入门与论文写作',
      subtitle: '峰会预热场，面向全国高校直播',
      startAt: now + 10 * DAY, endAt: now + 10 * DAY + 2 * 3600 * 1000,
      city: '线上', venue: '峰会直播间', address: '',
      mode: 'online', audience: '全体在校学生',
      organizer: '青年科创人才发展中心',
      quota: 1000, enrolled: 0, fee: 0, enrollOpen: true,
      tags: ['线上', '科研入门'],
      desc: '峰会前的线上预热公开课，手把手讲解科研选题、文献阅读与论文写作方法论。',
      agenda: [
        { time: '19:00', title: '科研选题方法', desc: '' },
        { time: '19:45', title: '论文写作实战', desc: '' },
        { time: '20:30', title: '答疑互动', desc: '' }
      ],
      speakers: [
        { name: '沈亦舟', title: '国家优秀青年科学基金获得者' }
      ]
    },
    {
      title: '往届回顾 · 2025 青年科创峰会',
      subtitle: '已于 2025 年 12 月圆满举办',
      startAt: now - 320 * DAY, endAt: now - 320 * DAY + 8 * 3600 * 1000,
      city: '上海', venue: '上海国际会议中心', address: '',
      mode: 'offline', audience: '顶尖高校本科生与研究生',
      organizer: '青年科创人才发展中心',
      quota: 260, enrolled: 260, fee: 0, enrollOpen: true,
      tags: ['往届', '回顾'],
      desc: '2025 届峰会吸引全国 60 余所高校学子参与，本条为历史数据示例。',
      agenda: [],
      speakers: []
    }
  ];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event || {};

  try {
    /* ---------------- 发布活动 ---------------- */
    if (action === 'createActivity') {
      if (!isAllowed(OPENID)) return { ok: false, msg: '无发布权限，请配置管理员 openid' };
      const p = event.payload || {};
      if (!p.title || !p.startAt || !p.endAt) {
        return { ok: false, msg: '参数不完整' };
      }
      p.createdAt = Date.now();
      p.createdBy = OPENID;
      const res = await db.collection('activities').add({ data: p });
      return { ok: true, id: res._id };
    }

    /* ---------------- 一键初始化示例数据（在开发者工具「云端运行」中执行） ---------------- */
    if (action === 'initDemo') {
      const existed = await db.collection('activities').count();
      if (existed.total > 0) {
        return { ok: true, msg: `activities 已有 ${existed.total} 条数据，跳过初始化` };
      }
      for (const a of demoActivities()) {
        await db.collection('activities').add({ data: a });
      }
      return { ok: true, msg: '已写入 4 条示例活动' };
    }

    return { ok: false, msg: '未知操作' };
  } catch (err) {
    console.error(err);
    return { ok: false, msg: '服务异常，请稍后重试' };
  }
};
