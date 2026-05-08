# Auth & Security

## Auth Module (`lib/base/auth.ts`)

**Tech Stack**: JWT (jose, HS256) + HTTP-Only Cookie + scrypt password hashing (OWASP recommended N=2^17)

**Multi-User Mechanism**: Admin and registered users are stored uniformly in the `users` table. The admin is created through the first-time setup wizard (`/setup`). The login entry point is fixed at `/login`.

**User Roles**:

| Role | Description | Source |
|:-----|:------------|:-------|
| `admin` | Administrator with all permissions | Setup wizard initialization (`users` table) |
| `user` | Regular user | User registration |

**Core Functions**:

```typescript
// Create session token (includes username, userId, role)
async function createSessionToken(username: string, userId: string, role: UserRole): Promise<string>

// Verify session token (returns iat issued-at time for token revocation check)
async function verifySessionToken(token: string): Promise<{ username?: string; userId?: string; role?: string; iat?: number }>

// Get current session (includes token revocation check: iat < tokens_valid_after is treated as invalid)
async function getSession(): Promise<SessionUser | null>

// Set session cookie (secure flag auto-set based on NODE_ENV)
async function setSessionCookie(username: string, userId: string, role: UserRole, rememberMe?: boolean): Promise<void>

// Clear session cookie
async function clearSessionCookie(): Promise<void>

// Require admin session (admin role only)
async function requireAdminSession(): Promise<SessionUser>

// Require privileged session (equivalent to requireAdminSession)
async function requirePrivilegedSession(): Promise<SessionUser>

// Require authenticated user session (any role)
async function requireUserSession(): Promise<SessionUser>

// Require admin secondary confirmation
async function requireAdminConfirmation(password: string | null): Promise<void>

// Get effective ownerId for appearance/data operations (admin → __admin__, regular user → own userId)
function getEffectiveOwnerId(session: { userId: string; role: UserRole }): string
```

**Auth Flow**:

```
Login request → Query users table uniformly (scrypt) → Create JWT session
   │
   ▼
Create JWT (with username/userId/role) → Set Cookie → Return success
   │
   ▼
Subsequent requests → Read Cookie → Verify JWT → Validate against users table
```

**OAuth Third-Party Login Flow**:

```
User clicks OAuth icon → GET /api/auth/oauth/{provider} → Generate state (CSRF) → Check login status → Redirect to third-party auth page
   │
   ▼
User authorizes → Third-party callback → GET /api/auth/oauth/{provider}/callback
   │
   ▼
Verify state → Exchange code for token → Get user info → Determine mode:
  ├─ Bind mode (oauth_bind_user cookie) → Bind to current user → Redirect to /profile
  └─ Login mode → Find/create binding → Create JWT session → Redirect to /login?oauth=success
```

> 💡 **Bind Mode**: When a logged-in user clicks "Bind" from their personal space to initiate OAuth, the startup route detects a valid `sakura-nav-session` and writes an `oauth_bind_user` cookie. On callback, detecting this cookie triggers bind mode, linking the third-party account to the currently logged-in user instead of creating a new user.

> 💡 **Session Validation**: Uses the `userId` (not `username`) from JWT to look up users, ensuring sessions remain valid after username changes.

Supported OAuth providers: GitHub, WeChat, WeCom, Feishu, DingTalk. Configuration is stored in the `app_settings` table (`oauth_providers` JSON), secrets are protected via `server-only`, and GET requests return masked values.

## Security Mechanisms

| Mechanism | Description |
|:----------|:------------|
| Cookie `secure` flag | Production environment (`NODE_ENV=production`) automatically enables `secure: true` |
| Token revocation | On logout/password change, writes `tokens_valid_after:<userId>` timestamp to `app_settings`; `getSession()` compares `iat` during validation |
| Rate limiting | IP-based rate limiting via `rate-limit.ts` to prevent brute force attacks |
| SSRF protection | DNS resolution + private IP filtering via `ssrf-protection.ts` to prevent internal network probing |
| File type validation | Upload endpoints validate MIME whitelist + file size limits by resource type |
| Security response headers | File download endpoints add `X-Content-Type-Options: nosniff` |
| API Key masking | Homepage SSR masks `aiApiKey` as `****xxxx` before passing to client components |
| Path traversal prevention | ZIP extraction and resource cleanup use `path.resolve` + prefix validation to prevent path escape |
| CSRF protection | Double Submit Cookie pattern: `csrf_token` cookie issued after login/OAuth success, client automatically includes `X-CSRF-Token` header in mutating requests |
| scrypt cost factor | Password hashing uses OWASP recommended `N = 2^17 (131072)` cost parameter |
| HTML input sanitization | Zod schemas sanitize user text input by removing HTML tags/event attributes/javascript: protocols |
| ZIP bomb protection | Import ZIP validates entry count, single file size, and cumulative total size limits |
| Registration enumeration prevention | Returns generic error message when username already exists during registration |
| OAuth provider whitelist | OAuth callback validates provider against allowed list |

## Security Tools

| Tool | File | Responsibility |
|:-----|:-----|:---------------|
| RateLimit | `utils/rate-limit.ts` | IP-based in-memory rate limiter with 5 preset strategies |
| SSRFProtection | `utils/ssrf-protection.ts` | DNS resolution + private IP filtering to prevent SSRF |
| CSRFProtection | `utils/csrf.ts` | Double Submit Cookie pattern CSRF protection |

**Rate Limiting Preset Strategies** (extensibility convention):

| Strategy | Limit | Applicable Endpoints |
|:---------|:------|:---------------------|
| `auth` | 10 requests/IP/minute | Login, registration |
| `upload` | 20 requests/IP/minute | Wallpaper upload, avatar upload |
| `onlineCheck` | 5 requests/IP/minute | Online check |
| `api` | 60 requests/IP/minute | General API |
| `import` | 3 requests/IP/minute | Data import |

> 💡 **Extensibility Convention** — To add a new rate limiting strategy, simply add a configuration entry in the `RateLimitPresets` object, then call `isRateLimited(ip, "strategy_name")` in the corresponding route.

> 💡 **CSRF Extensibility Convention** — CSRF protection uses the Double Submit Cookie pattern. When adding a new API route that requires CSRF protection:
> 1. Call `verifyCsrfToken(request)` in the route handler to validate
> 2. No client-side changes needed — `postJson()` and `deleteRequest()` automatically include the `X-CSRF-Token` header
> 3. CSRF token is automatically issued on login success and OAuth callback success, and cleared on logout
