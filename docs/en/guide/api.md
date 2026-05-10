# API Token Authentication

## Overview

API Tokens are a Bearer Token-based authentication method that allows you to remotely manage data in SakuraNav via API. Suitable for:

- Script automation (batch import/export, scheduled backups)
- Third-party tool integration
- CI/CD pipelines

## Creating a Token

1. Log in and navigate to **Personal Space** → **API Tokens** tab
2. Click the "Create Token" button
3. Enter a token name and select an expiration time (1 month / 90 days / 1 year / Never expire)
4. After creation, **copy and save the token immediately** — it cannot be viewed again after closing the dialog

> ⚠️ Each user can create up to 10 tokens. Token permissions are equivalent to the creator's permissions.

## Usage

Include `Authorization: Bearer <token>` in the API request header:

```bash
curl -H "Authorization: Bearer sak_your_token_here" \
     https://your-domain.com/api/tags
```

## Supported Endpoints

The following endpoints support Token authentication:

| Category | Method | Path | Description |
|:---------|:-------|:-----|:------------|
| **Tags** | `GET/POST` | `/api/tags` | List/Create tags |
| | `PUT/DELETE` | `/api/tags` | Update/Delete tags |
| | `POST` | `/api/tags/reorder` | Reorder tags |
| | `PUT` | `/api/tags/[tagId]/sites/reorder` | Reorder sites in tag |
| | `PUT` | `/api/tags/[tagId]/sites/restore` | Restore tag associations |
| **Sites** | `GET/POST` | `/api/site-cards` | List/Create sites |
| | `PUT/DELETE` | `/api/site-cards` | Update/Delete sites |
| | `POST` | `/api/site-cards/batch` | Batch create sites |
| | `POST` | `/api/site-cards/reorder-global` | Global site reorder |
| | `POST` | `/api/site-cards/check-online` | Batch online check |
| | `POST` | `/api/site-cards/check-online-single` | Single site online check |
| | `PATCH` | `/api/site-cards/memo` | Update site memo |
| **Social Cards** | `GET/POST` | `/api/social-cards` | List/Create cards |
| | `PUT/DELETE` | `/api/social-cards` | Update/Delete cards |
| | `PUT` | `/api/social-cards/reorder` | Reorder cards |
| **Note Cards** | `GET/POST` | `/api/note-cards` | List/Create notes |
| | `PUT/DELETE` | `/api/note-cards` | Update/Delete notes |
| | `POST` | `/api/note-cards/upload-image` | Upload note image |
| | `POST` | `/api/note-cards/upload-file` | Upload note file |
| | `GET/POST/PATCH/DELETE` | `/api/note-cards/attachment` | Attachment management |
| **Snapshots** | `GET/POST` | `/api/snapshots` | List/Create snapshots |
| | `DELETE/PATCH` | `/api/snapshots` | Delete/Rename snapshots |
| **Navigation** | `GET` | `/api/navigation/tags` | Get tags (returns user's own data with Token) |
| | `GET` | `/api/navigation/site-cards` | Get sites (returns user's own data with Token) |
| | `GET` | `/api/navigation/social-cards` | Get social cards |
| | `GET` | `/api/navigation/note-cards` | Get note cards |
| **Search** | `GET` | `/api/search/suggest` | Search suggestions |
| **User Data** | `POST` | `/api/user/data/export` | Export user data |
| | `POST` | `/api/user/data/import` | Import user data |
| | `POST` | `/api/user/data/detect` | Detect import file type |
| | `POST` | `/api/user/data/clear` | Clear user tags and sites |
| | `POST` | `/api/user/data/reset` | Reset user data |
| **User Profile** | `GET` | `/api/user/profile` | Get user profile |
| **Token Management** | `GET/POST` | `/api/user/tokens` | List/Create tokens |
| | `DELETE` | `/api/user/tokens/[id]` | Delete token |

## Unsupported Endpoints

The following operations must be performed via browser Cookie session (for security):

- Authentication (login/logout/register/OAuth)
- Admin panel (user management/global settings/OAuth config)
- Password change, username change
- Avatar upload/delete
- OAuth bind/unbind
- Account deletion
- Appearance config, floating buttons
- Notification config
- AI features
- Asset file uploads
- System config import/export/reset

## Request Examples

**Get tag list:**

```bash
curl -H "Authorization: Bearer sak_xxx" \
     https://your-domain.com/api/tags
```

**Create a site:**

```bash
curl -X POST \
     -H "Authorization: Bearer sak_xxx" \
     -H "Content-Type: application/json" \
     -d '{"name":"GitHub","url":"https://github.com","tagIds":["tag-1"]}' \
     https://your-domain.com/api/site-cards
```

**Export user data:**

```bash
curl -X POST \
     -H "Authorization: Bearer sak_xxx" \
     -o backup.zip \
     https://your-domain.com/api/user/data/export
```

## Security Notes

- **Token is shown only once**: Save it immediately after creation; the database does not store plaintext
- **Do not leak tokens**: Never commit tokens to version control or share them publicly
- **Rotate regularly**: Periodically delete old tokens and create new ones
- **Least privilege**: Token permissions equal the creator's; create dedicated accounts to limit access
- **Delete promptly**: Delete tokens that are no longer in use
