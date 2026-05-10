# Routes Reference

## Authentication Endpoints

| Method | Path | Description |
|:-------|:-----|:------------|
| `POST` | `/api/auth/login` | Login (supports admin and registered users) |
| `POST` | `/api/auth/logout` | Logout |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/switch` | Password-free user switch for logged-in users |
| `GET` | `/api/auth/session` | Get session state (includes userId and role) |
| `GET` | `/api/auth/oauth-providers` | Get enabled OAuth provider list (public, no secrets) |
| `GET` | `/api/auth/oauth/[provider]` | Initiate OAuth login (redirect to third-party auth page) |
| `GET` | `/api/auth/oauth/[provider]/callback` | OAuth callback handler |

<details>
<summary>Request/Response Examples</summary>

**POST /api/auth/login**

```json
// Request
{ "username": "admin", "password": "your-password", "rememberMe": true }

// Response
{ "ok": true, "username": "admin", "role": "admin" }
```

**POST /api/auth/register**

```json
// Request
{ "username": "newuser", "password": "123456", "confirmPassword": "123456" }

// Response
{ "ok": true, "username": "newuser" }
```

**GET /api/auth/session**

```json
{ "isAuthenticated": true, "username": "admin", "userId": "__admin__", "role": "admin" }
```

</details>

## Navigation Endpoints (Public)

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET` | `/api/navigation/site-cards` | Paginated site list |
| `GET` | `/api/navigation/tags` | Visible tags list |
| `GET` | `/api/navigation/note-cards` | Note card list (public) |

<details>
<summary>Query Parameters & Response Examples</summary>

**GET /api/navigation/site-cards**

| Parameter | Description |
|:----------|:------------|
| `scope` | `"all"` or `"tag"` |
| `tagId` | Tag ID (required when scope=tag) |
| `q` | Search keyword |
| `cursor` | Pagination cursor |

```json
{ "items": [Site], "total": 100, "nextCursor": "eyJvZmZzZXQiOjEyfQ==" }
```

</details>

## Management Endpoints (Auth Required)

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET / POST` | `/api/site-cards` | Get all / Create site |
| `PUT / DELETE` | `/api/site-cards` | Update / Delete site |
| `POST` | `/api/site-cards/batch` | Batch create sites (bookmark import) |
| `POST` | `/api/site-cards/check-online` | Batch online check |
| `POST` | `/api/site-cards/check-online-single` | Single site instant online check |
| `PATCH` | `/api/site-cards/memo` | Update site memo notes |
| `POST` | `/api/site-cards/reorder-global` | Global site reordering |
| `GET / POST` | `/api/tags` | Get all / Create tag |
| `PUT / DELETE` | `/api/tags` | Update / Delete tag |
| `POST` | `/api/tags/reorder` | Tag reordering |
| `POST` | `/api/tags/[tagId]/sites/reorder` | Reorder within tag |
| `PUT` | `/api/tags/[tagId]/sites/restore` | Restore tag-site association |
| `GET / PUT` | `/api/appearance` | Get / Update appearance config |
| `GET / PUT` | `/api/settings` | Get / Update app settings |
| `GET / PUT` | `/api/floating-buttons` | Get / Update floating button config |

## Admin Endpoints

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET` | `/api/admin/bootstrap` | Get all data needed for editor initialization |
| `GET / PUT` | `/api/admin/registration` | Get/Update registration toggle |
| `GET / PUT / DELETE` | `/api/admin/users` | User list/role update/user delete |
| `GET / PUT` | `/api/admin/oauth` | Get/Update OAuth provider config |
| `POST` | `/api/admin/oauth/test` | Test OAuth provider connectivity |

<details>
<summary>Request/Response Examples</summary>

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

## Asset Endpoints

| Method | Path | Description |
|:-------|:-----|:------------|
| `POST` | `/api/assets/wallpaper` | Upload wallpaper/Logo/Favicon/icon |
| `GET` | `/api/assets/[assetId]/file` | Get asset file |
| `POST` | `/api/assets/cleanup` | Batch cleanup orphan icon resources |

## Config Endpoints (Admin Global Level)

| Method | Path | Description |
|:-------|:-----|:------------|
| `POST` | `/api/config/export` | Export global config as ZIP |
| `POST` | `/api/config/import` | Import global config from ZIP |
| `POST` | `/api/config/detect` | Detect uploaded file type |
| `POST` | `/api/config/reset` | Reset global config to defaults (password confirmation required) |

## User Data Endpoints (Auth Required, User-Isolated)

| Method | Path | Description |
|:-------|:-----|:------------|
| `POST` | `/api/user/data/export` | Export current user data as ZIP |
| `POST` | `/api/user/data/import` | Import data from ZIP to current user space |
| `POST` | `/api/user/data/reset` | Reset current user data |
| `POST` | `/api/user/data/clear` | Clear current user's tags and sites |
| `POST` | `/api/user/data/detect` | Detect import file type |

## Search Endpoints

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET` | `/api/search/suggest?q=keyword` | Get search suggestions |

## AI Endpoints

| Method | Path | Description |
|:-------|:-----|:------------|
| `POST` | `/api/ai/recommend` | AI smart site recommendations |
| `POST` | `/api/ai/workflow` | AI workflow planning (needs → ordered steps) |
| `POST` | `/api/ai/analyze-site-card` | AI site analysis (scope: basic / full) |
| `POST` | `/api/ai/check` | AI connectivity check |
| `POST` | `/api/ai/import-bookmarks` | AI external bookmark file analysis |

<details>
<summary>Request/Response Examples</summary>

**POST /api/ai/recommend**

```json
// Request
{ "keyword": "design tools", "_draftAiConfig": { "aiApiKey": "sk-xxx", "aiBaseUrl": "https://api.example.com/v1", "aiModel": "deepseek-chat" } }

// Response
{ "recommendations": [{ "name": "Figma", "url": "https://figma.com", "reason": "..." }] }
```

> 💡 `_draftAiConfig` is an optional parameter. Admins can use it to temporarily override AI config for preview debugging.

**POST /api/ai/analyze-site-card**

```json
// Request (full analysis)
{ "url": "https://example.com", "siteId": "site-uuid", "scope": "full" }

// Response
{ "title": "Example Site", "description": "...", "matchedTagIds": [...], "siteRecommendContext": "...", "recommendations": [...] }
```

</details>

## Social Card Endpoints

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET` | `/api/social-cards` | Get all social cards (auth required) |
| `POST` | `/api/social-cards` | Create social card (auth required) |
| `PUT` | `/api/social-cards` | Update social card (auth required) |
| `DELETE` | `/api/social-cards?id=xxx` | Delete single card (auth required) |
| `DELETE` | `/api/social-cards` | Delete all social cards (auth required) |
| `PUT` | `/api/social-cards/reorder` | Card drag reordering |
| `GET` | `/api/social-cards/[id]` | Get single card (public) |

## Note Card Endpoints

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET` | `/api/note-cards` | Get all note cards (auth required) |
| `POST` | `/api/note-cards` | Create note card (auth required) |
| `PUT` | `/api/note-cards` | Update note card (auth required) |
| `DELETE` | `/api/note-cards?id=xxx` | Delete single note card |
| `POST` | `/api/note-cards/upload-image` | Upload note image (max 5MB) |
| `POST` | `/api/note-cards/upload-file` | Upload note file (max 10MB) |
| `GET` | `/api/note-cards/img/[imageId]` | Get note image (public) |
| `GET` | `/api/note-cards/file/[fileId]` | Download note file (public) |
| `GET` | `/api/note-cards/attachment?noteId=xxx` | Get attachment list for a note |
| `POST` | `/api/note-cards/attachment` | Upload note attachment (max 100MB) |
| `PUT` | `/api/note-cards/attachment` | Rename attachment |
| `DELETE` | `/api/note-cards/attachment?id=xxx` | Delete attachment |

## Snapshot Endpoints (Auth Required)

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET` | `/api/snapshots` | Get current user's snapshot list |
| `POST` | `/api/snapshots` | Create snapshot |
| `DELETE` | `/api/snapshots?id=xxx` | Delete single snapshot |
| `PATCH` | `/api/snapshots?id=xxx` | Rename snapshot |
| `POST` | `/api/snapshots?action=restore&id=xxx` | Restore snapshot |
| `POST` | `/api/snapshots?action=cleanup` | Cleanup expired snapshots (admin only) |

## Health Check

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET` | `/api/health` | Used by Docker HEALTHCHECK |

## User Endpoints (Auth Required)

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET` | `/api/user/profile` | Get current user profile |
| `PUT` | `/api/user/profile` | Update user nickname |
| `POST` | `/api/user/avatar` | Upload/update avatar |
| `DELETE` | `/api/user/avatar` | Delete avatar |
| `PUT` | `/api/user/password` | Change password |
| `PUT` | `/api/user/username` | Change username (once only) |
| `GET` | `/api/user/oauth-bind` | Get OAuth binding list |
| `DELETE` | `/api/user/oauth-bind` | Unbind OAuth account |
| `POST` | `/api/user/delete-account` | Delete account |

## Personal Space Pages

| Path | Description |
|:-----|:------------|
| `/profile` | Personal space page (view/edit profile, upload avatar, change password, OAuth bind/unbind, manage API tokens, delete account) |
