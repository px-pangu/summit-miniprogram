const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action = 'login' } = event || {};
  const now = Date.now();

  try {
    if (action === 'login') {
      const res = await users.where({ openid: OPENID }).limit(1).get();
      if (res.data.length === 0) {
        await users.add({ data: { openid: OPENID, createdAt: now, lastLoginAt: now } });
        return { ok: true, openid: OPENID, profile: null, isNew: true };
      }
      const doc = res.data[0];
      await users.doc(doc._id).update({ data: { lastLoginAt: now } });
      return {
        ok: true,
        openid: OPENID,
        profile: {
          nickName: doc.nickName || '',
          school: doc.school || '',
          avatarFileID: doc.avatarFileID || ''
        },
        isNew: false
      };
    }

    if (action === 'saveProfile') {
      const p = event.profile || {};
      const patch = {};
      ['nickName', 'school', 'avatarFileID'].forEach(k => {
        if (typeof p[k] === 'string') patch[k] = p[k];
      });
      const res = await users.where({ openid: OPENID }).limit(1).get();
      if (res.data.length === 0) {
        await users.add({ data: Object.assign({ openid: OPENID, createdAt: now }, patch) });
      } else {
        await users.doc(res.data[0]._id).update({ data: patch });
      }
      return { ok: true };
    }

    return { ok: false, msg: '未知操作' };
  } catch (err) {
    console.error(err);
    return { ok: false, msg: '服务异常，请稍后重试' };
  }
};
