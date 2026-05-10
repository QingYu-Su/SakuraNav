# MCP (Model Context Protocol)

## Overview

SakuraNav supports [MCP (Model Context Protocol)](https://modelcontextprotocol.io/), allowing external AI agents (such as Claude Desktop, Cursor, Cline, etc.) to perform full data read/write operations on your navigation site through the standard protocol.

As long as the agent has an API Token configured in your personal space and correctly sets up the MCP connection, it can perform all operations including tag management, site management, card management, snapshot management, and more.

## Transport Protocols

SakuraNav supports two MCP transport protocols for maximum compatibility:

| Protocol | Endpoint | Description |
|:---------|:---------|:------------|
| **Streamable HTTP (Recommended)** | `POST /api/mcp` | Stateless, single endpoint for all requests, recommended for modern clients |
| **SSE** | `GET /api/mcp/sse` + `POST /api/mcp/sse/messages` | Stateful long connection, compatible with legacy MCP clients |

## Configuration

### 1. Create an API Token

1. Log in to SakuraNav, navigate to **Profile** → **Access Tokens** tab
2. Click "Create Token", enter a name (e.g., `MCP-Claude`), select expiration
3. **Copy the token immediately** — it cannot be viewed again after closing the dialog

> ⚠️ It's recommended to use a separate Token for each MCP client for easier management and revocation.

### 2. Configure Your MCP Client

Choose the appropriate configuration based on your AI agent tool:

#### Claude Desktop

Edit `claude_desktop_config.json` (usually located in `~/.claude/` directory):

```json
{
  "mcpServers": {
    "sakuranav": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer sak_your_token_here"
      }
    }
  }
}
```

#### Cursor

Add MCP Server in Cursor settings:

```json
{
  "mcpServers": {
    "sakuranav": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer sak_your_token_here"
      }
    }
  }
}
```

#### Other MCP-Capable Clients

General configuration parameters:

- **URL**: `https://your-domain.com/api/mcp` (Streamable HTTP) or `https://your-domain.com/api/mcp/sse` (SSE)
- **Authentication**: `Authorization: Bearer sak_xxx` request header
- **Protocol Version**: `2025-03-26`

## Available Tools

Once configured, the agent can use the following MCP tools:

### Tag Management

| Tool | Description |
|:-----|:------------|
| `list_tags` | Get all tags (including virtual tags for social/note cards, with `_note` annotations) |
| `list_site_tags` | Get site tags only (real tags, no virtual tags) |
| `create_tag` | Create a tag |
| `update_tag` | Update a tag |
| `delete_tag` | Delete a tag (deleting a virtual tag triggers batch cleanup of that card type) |
| `reorder_tags` | Reorder tags |

### Site Management

| Tool | Description |
|:-----|:------------|
| `list_site_cards` | Get sites (with pagination and filtering) |
| `list_all_site_cards` | Get all sites (no pagination) |
| `get_site_card` | Get a single site |
| `create_site_card` | Create a site |
| `update_site_card` | Update a site |
| `delete_site_card` | Delete a site |
| `batch_create_site_card_cards` | Batch create sites (up to 50) |

### Social Cards

| Tool | Description |
|:-----|:------------|
| `list_social_cards` | Get all social cards |
| `create_social_card` | Create a social card |
| `update_social_card` | Update a social card |
| `delete_social_card` | Delete a social card |

### Note Cards

| Tool | Description |
|:-----|:------------|
| `list_note_cards` | Get all note cards |
| `create_note_card` | Create a note card |
| `update_note_card` | Update a note card |
| `delete_note_card` | Delete a note card |

### Snapshot Management

| Tool | Description |
|:-----|:------------|
| `list_snapshots` | Get all snapshots |
| `create_snapshot` | Create a snapshot |
| `get_snapshot` | Get snapshot details |
| `restore_snapshot` | Restore from a snapshot |
| `delete_snapshot` | Delete a snapshot |

### Search

| Tool | Description |
|:-----|:------------|
| `search_site_cards` | Search sites and tags |

## Usage Examples

Here are examples of operations an agent can perform:

```
User: Add GitHub to the "Dev Tools" tag in my navigation site

Agent flow:
1. list_tags → Find the "Dev Tools" tag ID
2. create_site_card → Create site { name: "GitHub", url: "https://github.com", tagIds: ["tag-xxx"] }
```

```
User: List all offline sites in my navigation

Agent flow:
1. list_all_site_cards → Get all sites
2. Filter sites where siteIsOnline === false and present to user
```

## Security Notes

- **Token equals user permissions**: MCP requests authenticated via Token have the same permissions as the Token creator
- **Use dedicated tokens**: Create a separate Token for each MCP client; delete unused ones promptly
- **Rate limiting**: MCP endpoints are limited to 300 requests per IP per minute
- **Token security**: Never commit Tokens to version control or share them publicly
- **Regular rotation**: Periodically delete old Tokens and create new ones

## Technical Details

### Authentication

MCP endpoints require `Authorization: Bearer sak_xxx` authentication, using the existing API Token system:

```
MCP Request → Bearer Token → SHA-256 Hash → Database Match → User Verification
```

### Data Isolation

MCP operations follow multi-tenant data isolation rules:
- Admin tokens operate on admin data space
- Regular user tokens only operate on that user's own data

### SSE Session Management

- SSE mode maintains in-memory session mapping, suitable for single-instance deployment
- Sessions expire and are cleaned up after 30 minutes of inactivity
- For multi-instance deployment, Streamable HTTP (stateless) is recommended
