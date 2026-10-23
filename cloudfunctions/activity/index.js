const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event || {};

  try {
    if (action === 'list') {
      const res = await db.collection('activities')
        .orderBy('startAt', 'asc')
        .limit(50)
        .get();
      return { ok: true, list: res.data };
    }

    if (action === 'detail') {
      const res = await db.collection('activities').doc(event.id).get();
      // 我在该活动下的有效报名（未取消）
      const my = await db.collection('registrations')
        .where({ activityId: event.id, openid: OPENID, status: db.command.neq('cancelled') })
        .count();
      return { ok: true, activity: res.data, enrolled: my.total > 0 };
    }

    return { ok: false, msg: '未知操作' };
  } catch (err) {
    console.error(err);
    return { ok: false, msg: '活动不存在或已下架' };
  }
};
