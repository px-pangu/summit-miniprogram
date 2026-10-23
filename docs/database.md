# 云数据库设计

## 集合一：activities（活动）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| title / subtitle | string | 标题 / 副标题 |
| cover | string | 封面图云存储 fileID（可为空，前端用渐变占位） |
| startAt / endAt | number | 开始 / 结束时间戳（ms） |
| city / venue / address | string | 城市 / 场馆 / 详细地址 |
| mode | string | `offline` 线下 / `online` 线上 |
| audience | string | 面向人群 |
| organizer | string | 主办方 |
| quota / enrolled | number | 名额上限 / 已报名人数 |
| fee | number | 费用（0 为免费） |
| enrollOpen | boolean | 是否开放报名 |
| tags | string[] | 标签 |
| desc | string | 活动亮点（支持换行） |
| agenda | array | `[{ time, title, desc }]` 议程 |
| speakers | array | `[{ name, title }]` 嘉宾 |
| directions | string[] | 可选，报名分论坛方向（缺省用全局配置） |
| createdAt / createdBy | - | 审计字段 |

**权限**：自定义安全规则 —— 所有用户可读，写仅限云函数（云函数为管理员态，不受限）：

```json
{ "read": true, "write": false }
```

## 集合二：registrations（报名记录）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| activityId / activityTitle | string | 冗余活动信息便于列表展示 |
| openid | string | 报名人（服务端注入，防伪造） |
| name / phone / school / major | string | 姓名 / 手机 / 学校 / 学院专业 |
| degree | string | 本科 / 硕士 / 博士 / 其他 |
| direction | string | 参会方向 |
| email | string | 选填 |
| needHotel | boolean | 是否需要住宿协助 |
| remark | string | 备注 |
| status | string | `pending` 待审核 / `approved` 已通过 / `rejected` 未通过 / `cancelled` 已取消 |
| regNo / checkCode | string | 报名编号 / 6 位签到码 |
| createdAt / cancelledAt | number | 时间戳 |

**权限**：仅创建者可读写（端上只能读自己的记录；审核/全量查询走云函数）：

```json
{ "read": "doc._openid == auth.openid", "write": "doc._openid == auth.openid" }
```

建议索引：`openid + status`、`activityId + openid`。

## 集合三：users（用户档案）

| 字段 | 说明 |
| --- | --- |
| openid | 登录标识 |
| nickName / school | 昵称 / 学校（chooseAvatar 头像存云存储，fileID 记在 avatarFileID） |
| avatarFileID | 头像 fileID |
| createdAt / lastLoginAt | 审计字段 |

**权限**：自定义规则 `doc._openid == auth.openid`（读写均仅本人，服务端例外由云函数处理）。

## 审核流转

当前默认提交后为 `pending`（待审核）。主办方在云开发控制台将记录 `status` 改为 `approved` / `rejected` 即完成审核；后续可扩展管理端小程序或 Web 审核台。
