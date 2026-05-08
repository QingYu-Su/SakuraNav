# 认证与安全

## 认证模块 (`lib/base/auth.ts`)

**技术栈**: JWT (jose, HS256) + HTTP-Only Cookie + scrypt 密码哈希（OWASP 推荐 N=2^17）

**多用户机制**: 管理员和注册用户统一存储在 `users` 表中。管理员通过首次启动引导页（`/setup`）创建。登录入口固定为 `/login`。

**用户角色**:

| 角色 | 说明 | 来源 |
|:-----|:-----|:-----|
| `admin` | 管理员，拥有所有权限 | 引导页初始化（`users` 表） |
| `user` | 普通用户 | 注册用户 |

**核心函数**:

```typescript
// 创建会话令牌（含用户名、用户ID、角色）
async function createSessionToken(username: string, userId: string, role: UserRole): Promise<string>

// 验证会话令牌（返回 iat 签发时间，用于 Token 吊销检查）
async function verifySessionToken(token: string): Promise<{ username?: string; userId?: string; role?: string; iat?: number }>

// 获取当前会话（含 Token 吊销检查：iat < tokens_valid_after 则视为无效）
async function getSession(): Promise<SessionUser | null>

// 设置会话 Cookie（secure 标志根据 NODE_ENV 自动设置）
async function setSessionCookie(username: string, userId: string, role: UserRole, rememberMe?: boolean): Promise<void>

// 清除会话 Cookie
async function clearSessionCookie(): Promise<void>

// 要求管理员会话（仅 admin 角色）
async function requireAdminSession(): Promise<SessionUser>

// 要求特权用户会话（与 requireAdminSession 等价）
async function requirePrivilegedSession(): Promise<SessionUser>

// 要求已登录用户会话（任意角色，支持 Cookie 和 Bearer Token）
async function requireUserSession(): Promise<SessionUser>

// 获取可选会话（同时支持 Cookie 和 Bearer Token，用于公开路由）
async function getOptionalSession(): Promise<SessionUser | null>

// 要求管理员二次确认
async function requireAdminConfirmation(password: string | null): Promise<void>

// 获取外观/数据操作的有效 ownerId（admin → __admin__，普通用户 → 自身 userId）
function getEffectiveOwnerId(session: { userId: string; role: UserRole }): string
```

**认证流程**:

```
登录请求 → 统一查 users 表(scrypt) → 创建 JWT 会话
   │
   ▼
创建 JWT (含 username/userId/role) → 设置 Cookie → 返回成功
   │
   ▼
后续请求 → 读取 Cookie → 验证 JWT → 从 users 表验证
```

**OAuth 第三方登录流程**:

```
用户点击 OAuth 图标 → GET /api/auth/oauth/{provider} → 生成 state(CSRF) → 检测登录状态 → 重定向到第三方授权页
   │
   ▼
用户授权 → 第三方回调 → GET /api/auth/oauth/{provider}/callback
   │
   ▼
验证 state → 交换 code 获取 Token → 获取用户信息 → 判断模式：
  ├─ 绑定模式（oauth_bind_user cookie）→ 绑定到当前用户 → 重定向到 /profile
  └─ 登录模式 → 查找/创建绑定 → 创建 JWT 会话 → 重定向到 /login?oauth=success
```

> 💡 **绑定模式**: 已登录用户从个人空间点击"绑定"按钮发起 OAuth 时，启动路由会检测 `sakura-nav-session` 有效并写入 `oauth_bind_user` cookie。回调时检测到该 cookie 则进入绑定模式，将第三方账号绑定到当前登录用户而非创建新用户。

> 💡 **Session 验证**: 使用 JWT 中的 `userId`（而非 `username`）查找用户，确保用户名变更后 session 仍然有效。

**API Token 认证流程**:

```
请求头携带 Authorization: Bearer sak_xxx → 提取 rawToken → SHA-256 哈希
   │
   ▼
查 api_tokens 表（token_hash 匹配）→ 检查过期 → 检查吊销 → 查用户信息
   │
   ▼
返回 SessionUser（等同于 Cookie 会话的身份）→ 异步更新 last_used_at
```

> 💡 **双重认证**：`requireUserSession()` 先尝试 Bearer Token 认证，失败则回退到 Cookie 会话。`getOptionalSession()` 同理，用于公开路由——Token 认证后返回用户自有数据。

> 💡 **可扩展性约定** — 新增需要 Token 认证的路由，只需调用 `requireUserSession()` 或 `getOptionalSession()`，无需额外配置。Token 的 CRUD 和验证逻辑集中在 `token-repository.ts` 和 `auth.ts` 的 `getApiTokenSession()` 中。

支持的 OAuth 供应商：GitHub、微信、企业微信、飞书、钉钉。配置存储在 `app_settings` 表（`oauth_providers` JSON），密钥通过 `server-only` 保护，GET 请求返回掩码值。

## 安全机制

| 机制 | 说明 |
|:-----|:-----|
| Cookie `secure` 标志 | 生产环境 (`NODE_ENV=production`) 自动启用 `secure: true` |
| Token 吊销 | 登出/改密时在 `app_settings` 写入 `tokens_valid_after:<userId>` 时间戳，`getSession()` 验证时比对 `iat` |
| 速率限制 | 通过 `rate-limit.ts` 的 IP 限流策略防护暴力破解 |
| SSRF 防护 | 通过 `ssrf-protection.ts` 的 DNS 解析 + 私有 IP 过滤防止内网探测 |
| 文件类型校验 | 上传接口按资源类型校验 MIME 白名单 + 文件大小限制 |
| 安全响应头 | 文件下载接口添加 `X-Content-Type-Options: nosniff` |
| API Key 掩码 | 首页 SSR 对 `aiApiKey` 掩码为 `****xxxx` 后传递给客户端组件 |
| 路径遍历防护 | ZIP 解压和资源清理接口使用 `path.resolve` + 前缀校验防止路径逃逸 |
| CSRF 防护 | Double Submit Cookie 模式：登录/OAuth 成功后下发 `csrf_token` cookie，客户端自动在 mutating 请求中携带 `X-CSRF-Token` header |
| scrypt 成本因子 | 密码哈希使用 OWASP 推荐的 `N = 2^17 (131072)` 成本参数 |
| HTML 输入消毒 | Zod schema 中对用户文本输入进行 HTML 标签/事件属性/javascript: 协议清理 |
| ZIP 炸弹防护 | 导入 ZIP 时校验条目数、单文件大小、累计总大小限制 |
| 注册枚举防护 | 注册时用户名已存在返回泛化错误信息 |
| OAuth provider 白名单 | OAuth 回调校验 provider 是否在合法列表中 |

## 安全工具

| 工具 | 文件 | 职责 |
|:-----|:-----|:-----|
| RateLimit | `utils/rate-limit.ts` | 基于 IP 的内存速率限制器，5 种预设策略 |
| SSRFProtection | `utils/ssrf-protection.ts` | DNS 解析 + 私有 IP 过滤，防止服务端请求伪造 |
| CSRFProtection | `utils/csrf.ts` | Double Submit Cookie 模式 CSRF 防护 |

**速率限制预设策略**（可扩展性约定）：

| 策略名 | 限制 | 适用接口 |
|:-------|:-----|:---------|
| `auth` | 10 次/IP/分钟 | 登录、注册 |
| `upload` | 20 次/IP/分钟 | 壁纸上传、头像上传 |
| `onlineCheck` | 5 次/IP/分钟 | 在线检测 |
| `api` | 60 次/IP/分钟 | 通用 API |
| `import` | 3 次/IP/分钟 | 数据导入 |

> 💡 **可扩展性约定** — 新增速率限制策略只需在 `RateLimitPresets` 对象中添加一条配置，然后在对应路由中调用 `isRateLimited(ip, "策略名")` 即可。

> 💡 **CSRF 可扩展性约定** — CSRF 防护采用 Double Submit Cookie 模式，新增需要 CSRF 保护的 API 路由时：
> 1. 在路由处理函数中调用 `verifyCsrfToken(request)` 校验
> 2. 客户端无需额外操作，`postJson()` 和 `deleteRequest()` 已自动携带 `X-CSRF-Token` header
> 3. CSRF token 在登录成功和 OAuth 回调成功时自动下发，登出时自动清除
