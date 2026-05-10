# API Token 认证

## 概述

API Token（访问令牌）是一种基于 Bearer Token 的认证方式，允许你通过 API 远程管理 SakuraNav 中的数据，适用于以下场景：

- 脚本自动化（批量导入/导出、定时备份）
- 第三方工具集成
- CI/CD 流程

## 创建令牌

1. 登录后进入 **个人空间** → **访问令牌** Tab
2. 点击「创建令牌」按钮
3. 输入令牌名称，选择过期时间（1个月 / 90天 / 1年 / 永不过期）
4. 创建成功后，**请立即复制并妥善保存令牌** — 关闭弹窗后将无法再次查看

> ⚠️ 每个用户最多创建 10 个令牌。令牌权限等同于创建者用户的权限。

## 使用方式

在 API 请求头中携带 `Authorization: Bearer <token>`：

```bash
curl -H "Authorization: Bearer sak_your_token_here" \
     https://your-domain.com/api/tags
```

## 支持的端点

以下端点支持 Token 认证：

| 分类 | 方法 | 路径 | 说明 |
|:-----|:-----|:-----|:-----|
| **标签** | `GET/POST` | `/api/tags` | 获取/创建标签 |
| | `PUT/DELETE` | `/api/tags` | 更新/删除标签 |
| | `POST` | `/api/tags/reorder` | 标签排序 |
| | `PUT` | `/api/tags/[tagId]/sites/reorder` | 标签内网站排序 |
| | `PUT` | `/api/tags/[tagId]/sites/restore` | 恢复标签关联 |
| **网站** | `GET/POST` | `/api/site-cards` | 获取/创建网站 |
| | `PUT/DELETE` | `/api/site-cards` | 更新/删除网站 |
| | `POST` | `/api/site-cards/batch` | 批量创建网站 |
| | `POST` | `/api/site-cards/reorder-global` | 全局网站排序 |
| | `POST` | `/api/site-cards/check-online` | 批量在线检测 |
| | `POST` | `/api/site-cards/check-online-single` | 单站点在线检测 |
| | `PATCH` | `/api/site-cards/memo` | 更新网站备忘 |
| **社交卡片** | `GET/POST` | `/api/social-cards` | 获取/创建卡片 |
| | `PUT/DELETE` | `/api/social-cards` | 更新/删除卡片 |
| | `PUT` | `/api/social-cards/reorder` | 卡片排序 |
| **笔记卡片** | `GET/POST` | `/api/note-cards` | 获取/创建笔记 |
| | `PUT/DELETE` | `/api/note-cards` | 更新/删除笔记 |
| | `POST` | `/api/note-cards/upload-image` | 上传笔记图片 |
| | `POST` | `/api/note-cards/upload-file` | 上传笔记文件 |
| | `GET/POST/PATCH/DELETE` | `/api/note-cards/attachment` | 附件管理 |
| **快照** | `GET/POST` | `/api/snapshots` | 快照列表/创建 |
| | `DELETE/PATCH` | `/api/snapshots` | 删除/重命名快照 |
| **导航数据** | `GET` | `/api/navigation/tags` | 获取标签（Token 认证返回用户自有数据） |
| | `GET` | `/api/navigation/cards` | 获取全部卡片（网站 + 社交 + 笔记） |
| | `GET` | `/api/navigation/site-cards` | 获取网站卡片（仅 card_type 为空） |
| | `GET` | `/api/navigation/social-cards` | 获取社交卡片 |
| | `GET` | `/api/navigation/note-cards` | 获取笔记卡片 |
| **搜索** | `GET` | `/api/search/suggest` | 搜索建议 |
| **用户数据** | `POST` | `/api/user/data/export` | 导出用户数据 |
| | `POST` | `/api/user/data/import` | 导入用户数据 |
| | `POST` | `/api/user/data/detect` | 检测导入文件类型 |
| | `POST` | `/api/user/data/clear` | 清除用户标签和站点 |
| | `POST` | `/api/user/data/reset` | 重置用户数据 |
| **用户资料** | `GET` | `/api/user/profile` | 获取用户资料 |
| **令牌管理** | `GET/POST` | `/api/user/tokens` | 令牌列表/创建 |
| | `DELETE` | `/api/user/tokens/[id]` | 删除令牌 |

## 不支持 Token 的端点

以下操作必须通过浏览器 Cookie 会话完成（出于安全考虑）：

- 认证相关（登录/登出/注册/OAuth）
- 管理后台（用户管理/全局设置/OAuth 配置）
- 密码修改、用户名修改
- 头像上传/删除
- OAuth 绑定/解绑
- 注销账号
- 外观配置、悬浮按钮
- 通知配置
- AI 功能
- 资源文件上传
- 系统配置导入/导出/重置

## 请求示例

**获取标签列表：**

```bash
curl -H "Authorization: Bearer sak_xxx" \
     https://your-domain.com/api/tags
```

**创建网站：**

```bash
curl -X POST \
     -H "Authorization: Bearer sak_xxx" \
     -H "Content-Type: application/json" \
     -d '{"name":"GitHub","url":"https://github.com","tagIds":["tag-1"]}' \
     https://your-domain.com/api/site-cards
```

**导出用户数据：**

```bash
curl -X POST \
     -H "Authorization: Bearer sak_xxx" \
     -o backup.zip \
     https://your-domain.com/api/user/data/export
```

## 安全注意事项

- **令牌仅展示一次**：创建后请立即保存，数据库不存储明文
- **不要泄露令牌**：不要将令牌提交到版本控制或公开分享
- **定期轮换**：建议定期删除旧令牌并创建新令牌
- **最小权限**：令牌权限等同创建者用户，创建专用账号可限制权限范围
- **及时删除**：不再使用的令牌应立即删除
