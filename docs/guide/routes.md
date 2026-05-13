# 路由参考

## 认证接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/auth/login` | 登录（支持管理员和注册用户） |
| `POST` | `/api/auth/logout` | 登出 |
| `POST` | `/api/auth/register` | 注册新用户 |
| `POST` | `/api/auth/switch` | 已登录用户免密码切换到其他用户 |
| `GET` | `/api/auth/session` | 获取会话状态（含 userId 和 role） |
| `GET` | `/api/auth/oauth-providers` | 获取已启用的 OAuth 供应商列表（公开，不含密钥） |
| `GET` | `/api/auth/oauth/[provider]` | 发起 OAuth 登录（重定向到第三方授权页） |
| `GET` | `/api/auth/oauth/[provider]/callback` | OAuth 回调处理 |

<details>
<summary>请求/响应示例</summary>

**POST /api/auth/login**

```json
// 请求
{ "username": "admin", "password": "your-password", "rememberMe": true }

// 响应
{ "ok": true, "username": "admin", "role": "admin" }
```

**POST /api/auth/register**

```json
// 请求
{ "username": "newuser", "password": "123456", "confirmPassword": "123456" }

// 响应
{ "ok": true, "username": "newuser" }
```

**GET /api/auth/session**

```json
{ "isAuthenticated": true, "username": "admin", "userId": "__admin__", "role": "admin" }
```

</details>

## 导航接口（公开）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/navigation/cards` | 分页全部卡片列表（网站 + 社交 + 笔记） |
| `GET` | `/api/navigation/site-cards` | 分页网站卡片列表（仅 card_type 为空的网站） |
| `GET` | `/api/navigation/tags` | 可见标签列表 |
| `GET` | `/api/navigation/social-cards` | 社交卡片列表（公开） |
| `GET` | `/api/navigation/note-cards` | 笔记卡片列表（公开） |

<details>
<summary>查询参数与响应示例</summary>

**GET /api/navigation/cards** 和 **GET /api/navigation/site-cards**

| 参数 | 说明 |
|:-----|:-----|
| `scope` | `"all"` 或 `"tag"` |
| `tagId` | 标签ID（scope=tag 时必需） |
| `q` | 搜索关键词 |
| `cursor` | 分页游标 |

```json
{ "items": [Card], "total": 100, "nextCursor": "eyJvZmZzZXQiOjEyfQ==" }
```

> `/api/navigation/cards` 返回全部类型卡片，`/api/navigation/site-cards` 仅返回网站卡片（card_type 为空）。

</details>

## 管理接口（需认证）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET / POST` | `/api/site-cards` | 获取所有 / 创建网站 |
| `PUT / DELETE` | `/api/site-cards` | 更新 / 删除网站 |
| `POST` | `/api/site-cards/batch` | 批量创建网站（书签导入） |
| `POST` | `/api/site-cards/check-online` | 批量在线检测 |
| `POST` | `/api/site-cards/check-online-single` | 单站点即时在线检测 |
| `PATCH` | `/api/site-cards/memo` | 更新网站备忘便签 |
| `POST` | `/api/site-cards/reorder-global` | 全局网站排序 |
| `GET / POST` | `/api/tags` | 获取所有 / 创建标签 |
| `PUT / DELETE` | `/api/tags` | 更新 / 删除标签 |
| `POST` | `/api/tags/reorder` | 标签排序 |
| `POST` | `/api/tags/[tagId]/sites/reorder` | 标签内排序 |
| `PUT` | `/api/tags/[tagId]/sites/restore` | 恢复标签与站点的关联 |
| `GET / PUT` | `/api/appearance` | 获取 / 更新外观配置 |
| `GET / PUT` | `/api/settings` | 获取 / 更新应用设置 |
| `GET / PUT` | `/api/floating-buttons` | 获取 / 更新悬浮按钮配置 |

## 管理员接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/admin/bootstrap` | 获取编辑器初始化所需的所有数据 |
| `GET / PUT` | `/api/admin/registration` | 获取/更新注册开关 |
| `GET / PUT / DELETE` | `/api/admin/users` | 用户列表/角色更新/用户删除 |
| `GET / PUT` | `/api/admin/oauth` | 获取/更新 OAuth 供应商配置 |
| `POST` | `/api/admin/oauth/test` | 测试指定 OAuth 供应商连通性 |

<details>
<summary>请求/响应示例</summary>

**GET /api/admin/bootstrap**

```json
{
  "tags": [Tag],
  "sites": [Site],
  "appearances": { "light": {...}, "dark": {...} },
  "settings": AppSettings
}
```

</details>

## 资源接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/assets/wallpaper` | 上传壁纸/Logo/Favicon/图标 |
| `GET` | `/api/assets/[assetId]/file` | 获取资源文件 |
| `POST` | `/api/assets/cleanup` | 批量清理孤立的 icon 资源 |

## 配置接口（管理员全局级）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/config/export` | 导出全局配置为 ZIP |
| `POST` | `/api/config/import` | 从 ZIP 导入全局配置 |
| `POST` | `/api/config/detect` | 检测上传文件类型 |
| `POST` | `/api/config/reset` | 重置全局配置到默认（需密码确认） |

## 用户数据接口（需认证，按用户隔离）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/user/data/export` | 导出当前用户数据为 ZIP |
| `POST` | `/api/user/data/import` | 从 ZIP 导入数据到当前用户空间 |
| `POST` | `/api/user/data/reset` | 重置当前用户数据 |
| `POST` | `/api/user/data/clear` | 清除当前用户的标签和站点 |
| `POST` | `/api/user/data/detect` | 检测导入文件类型 |

## 搜索接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/search/suggest?q=keyword` | 获取搜索建议 |

## AI 接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/ai/recommend` | AI 智能推荐网站 |
| `POST` | `/api/ai/workflow` | AI 工作流规划（需求 → 有序步骤） |
| `POST` | `/api/ai/analyze-site-card` | AI 分析网站（scope: basic / full） |
| `POST` | `/api/ai/check` | AI 连通性检查 |
| `POST` | `/api/ai/import-bookmarks` | AI 分析外部书签文件 |

<details>
<summary>请求/响应示例</summary>

**POST /api/ai/recommend**

```json
// 请求
{ "keyword": "设计工具", "_draftAiConfig": { "aiApiKey": "sk-xxx", "aiBaseUrl": "https://api.example.com/v1", "aiModel": "deepseek-chat" } }

// 响应
{ "recommendations": [{ "name": "Figma", "url": "https://figma.com", "reason": "..." }] }
```

> 💡 `_draftAiConfig` 为可选参数，管理员可通过此字段临时覆盖 AI 配置进行预览调试。

**POST /api/ai/analyze-site-card**

```json
// 请求（全部分析）
{ "url": "https://example.com", "siteId": "site-uuid", "scope": "full" }

// 响应
{ "title": "Example Site", "description": "...", "matchedTags": [...], "siteRecommendContext": "...", "recommendations": [...] }
```

</details>

## 社交卡片接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/social-cards` | 获取所有社交卡片（需认证） |
| `POST` | `/api/social-cards` | 创建社交卡片（需认证） |
| `PUT` | `/api/social-cards` | 更新社交卡片（需认证） |
| `DELETE` | `/api/social-cards?id=xxx` | 删除单张卡片（需认证） |
| `DELETE` | `/api/social-cards` | 删除全部社交卡片（需认证） |
| `PUT` | `/api/social-cards/reorder` | 卡片拖拽排序 |
| `GET` | `/api/social-cards/[id]` | 获取单张卡片（公开） |

## 笔记卡片接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/note-cards` | 获取所有笔记卡片（需认证） |
| `POST` | `/api/note-cards` | 创建笔记卡片（需认证） |
| `PUT` | `/api/note-cards` | 更新笔记卡片（需认证） |
| `DELETE` | `/api/note-cards?id=xxx` | 删除单张笔记卡片 |
| `POST` | `/api/note-cards/upload-image` | 上传笔记图片（最大 5MB） |
| `POST` | `/api/note-cards/upload-file` | 上传笔记文件（最大 10MB） |
| `GET` | `/api/note-cards/img/[imageId]` | 获取笔记图片（公开） |
| `GET` | `/api/note-cards/file/[fileId]` | 下载笔记文件（公开） |
| `GET` | `/api/note-cards/attachment?noteId=xxx` | 获取指定笔记的附件列表 |
| `POST` | `/api/note-cards/attachment` | 上传笔记附件（最大 100MB） |
| `PUT` | `/api/note-cards/attachment` | 重命名附件 |
| `DELETE` | `/api/note-cards/attachment?id=xxx` | 删除附件 |

## 快照接口（需认证）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/snapshots` | 获取当前用户的快照列表 |
| `POST` | `/api/snapshots` | 创建快照 |
| `DELETE` | `/api/snapshots?id=xxx` | 删除单个快照 |
| `PATCH` | `/api/snapshots?id=xxx` | 重命名快照 |
| `POST` | `/api/snapshots?action=restore&id=xxx` | 恢复快照 |
| `POST` | `/api/snapshots?action=cleanup` | 清理过期快照（仅管理员） |

## 健康检查

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/health` | Docker HEALTHCHECK 使用 |

## 用户接口（需认证）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/user/profile` | 获取当前用户资料 |
| `PUT` | `/api/user/profile` | 更新用户昵称 |
| `POST` | `/api/user/avatar` | 上传/更新头像 |
| `DELETE` | `/api/user/avatar` | 删除头像 |
| `PUT` | `/api/user/password` | 修改密码 |
| `PUT` | `/api/user/username` | 修改用户名（仅一次） |
| `GET` | `/api/user/oauth-bind` | 获取 OAuth 绑定列表 |
| `DELETE` | `/api/user/oauth-bind` | 解绑 OAuth 账号 |
| `POST` | `/api/user/delete-account` | 注销账号 |

## 个人空间页面

| 路径 | 说明 |
|:-----|:-----|
| `/profile` | 个人空间页面（查看/编辑资料、上传头像、修改密码、OAuth 绑定/解绑、管理访问令牌、注销账号） |
