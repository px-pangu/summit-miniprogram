const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 报名编号：YSC + 月日 + 4 位随机
function makeRegNo() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return 'YSC' + mm + dd + rand;
}

// 签到码：6 位大写字母数字（去除易混淆字符）
function makeCheckCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event || {};
  const now = Date.now();

  try {
    /* ---------------- 提交报名（事务） ---------------- */
    if (action === 'submit') {
      const p = event.payload || {};
      const activityId = p.activityId;

      const result = await db.runTransaction(async transaction => {
        const actRes = await transaction.collection('activities').doc(activityId).get();
        const act = actRes.data;
        if (!act) throw new Error('活动不存在');
        if (act.enrollOpen === false) throw new Error('该活动暂未开放报名');
        if (now > act.endAt) throw new Error('活动已结束，无法报名');
        if ((act.enrolled || 0) >= (act.quota || 0)) throw new Error('名额已满');

        const dup = await transaction.collection('registrations').where({
          activityId, openid: OPENID, status: _.neq('cancelled')
        }).count();
        if (dup.total > 0) throw new Error('您已报名该活动，请勿重复提交');

        const regNo = makeRegNo();
        const checkCode = makeCheckCode();
        const addRes = await transaction.collection('registrations').add({
          data: {
            activityId,
            activityTitle: act.title || '',
            openid: OPENID,
            name: p.name, phone: p.phone, school: p.school,
            major: p.major, degree: p.degree, direction: p.direction,
            email: p.email || '', needHotel: !!p.needHotel,
            remark: p.remark || '',
            status: 'pending',
            regNo, checkCode,
            createdAt: now
          }
        });
        await transaction.collection('activities').doc(activityId).update({
          data: { enrolled: _.inc(1) }
        });
        return { regId: addRes._id, regNo, checkCode };
      });

      return { ok: true, reg: result };
    }

    /* ---------------- 我的报名列表 ---------------- */
    if (action === 'myList') {
      const res = await db.collection('registrations')
        .where({ openid: OPENID })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return { ok: true, list: res.data };
    }

    /* ---------------- 取消报名 ---------------- */
    if (action === 'cancel') {
      const regRes = await db.collection('registrations').doc(event.id).get();
      const reg = regRes.data;
      if (!reg || reg.openid !== OPENID) return { ok: false, msg: '记录不存在' };
      if (reg.status === 'cancelled') return { ok: true };

      await db.runTransaction(async transaction => {
        await transaction.collection('registrations').doc(event.id).update({
          data: { status: 'cancelled', cancelledAt: Date.now() }
        });
        await transaction.collection('activities').doc(reg.activityId).update({
          data: { enrolled: _.inc(-1) }
        });
      });
      return { ok: true };
    }

    return { ok: false, msg: '未知操作' };
  } catch (err) {
    console.error(err);
    return { ok: false, msg: err.message && err.message.indexOf('Error:') === 0
      ? err.message.replace(/^Error:\s*/, '')
      : '服务异常，请稍后重试' };
  }
};
