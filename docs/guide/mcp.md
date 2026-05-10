# MCP (Model Context Protocol)

## 概述

SakuraNav 支持 [MCP (Model Context Protocol)](https://modelcontextprotocol.io/)，允许外部 AI Agent（如 Claude Desktop、Cursor、Cline 等）通过标准协议对导航站进行完整的数据读写操作。

只要 Agent 拥有你在个人空间中配置的 API Token，并正确配置 MCP 连接，就可以对导航站进行标签管理、网站管理、卡片管理、快照管理等全部操作。

## 传输协议

SakuraNav 同时支持两种 MCP 传输协议，确保最大兼容性：

| 协议 | 端点 | 说明 |
|:-----|:-----|:-----|
| **Streamable HTTP（推荐）** | `POST /api/mcp` | 无状态，单端点处理所有请求，推荐现代客户端使用 |
| **SSE** | `GET /api/mcp/sse` + `POST /api/mcp/sse/messages` | 有状态长连接，兼容旧版 MCP 客户端 |

## 配置步骤

### 1. 创建 API Token

1. 登录 SakuraNav，进入 **个人空间** → **访问令牌** Tab
2. 点击「创建令牌」，输入名称（如 `MCP-Claude`），选择过期时间
3. **立即复制令牌** — 关闭弹窗后将无法再次查看

> ⚠️ 每个 MCP 客户端建议使用独立的 Token，便于管理和撤销。

### 2. 配置 MCP 客户端

根据你使用的 AI Agent 工具，选择对应的配置方式：

#### Claude Desktop

编辑 `claude_desktop_config.json`（通常位于 `~/.claude/` 目录）：

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

在 Cursor 设置中添加 MCP Server：

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

#### 其他支持 MCP 的客户端

通用配置参数：

- **URL**: `https://your-domain.com/api/mcp`（Streamable HTTP）或 `https://your-domain.com/api/mcp/sse`（SSE）
- **认证方式**: `Authorization: Bearer sak_xxx` 请求头
- **协议版本**: `2025-03-26`

## 可用工具

配置完成后，Agent 可以使用以下 MCP 工具：

### 标签管理

| 工具名 | 功能 |
|:-------|:-----|
| `list_tags` | 获取所有标签列表 |
| `create_tag` | 创建标签 |
| `update_tag` | 更新标签 |
| `delete_tag` | 删除标签 |
| `reorder_tags` | 重新排列标签顺序 |

### 网站管理

| 工具名 | 功能 |
|:-------|:-----|
| `list_site_cards` | 获取网站列表（支持分页和筛选） |
| `list_all_site_cards` | 获取全部网站（不分页） |
| `get_site_card` | 获取单个网站详情 |
| `create_site_card` | 创建网站 |
| `update_site_card` | 更新网站 |
| `delete_site_card` | 删除网站 |
| `batch_create_site_card_cards` | 批量创建网站（最多 50 个） |

### 社交卡片

| 工具名 | 功能 |
|:-------|:-----|
| `list_social_cards` | 获取所有社交卡片 |
| `create_social_card` | 创建社交卡片 |
| `update_social_card` | 更新社交卡片 |
| `delete_social_card` | 删除社交卡片 |

### 笔记卡片

| 工具名 | 功能 |
|:-------|:-----|
| `list_note_cards` | 获取所有笔记卡片 |
| `create_note_card` | 创建笔记卡片 |
| `update_note_card` | 更新笔记卡片 |
| `delete_note_card` | 删除笔记卡片 |

### 快照管理

| 工具名 | 功能 |
|:-------|:-----|
| `list_snapshots` | 获取所有快照列表 |
| `create_snapshot` | 创建数据快照 |
| `get_snapshot` | 获取快照详情 |
| `restore_snapshot` | 从快照恢复数据 |
| `delete_snapshot` | 删除快照 |

### 数据与搜索

| 工具名 | 功能 |
|:-------|:-----|
| `search_site_cards` | 搜索网站和标签 |
| `get_settings` | 获取应用设置（敏感信息已掩码） |
| `get_profile` | 获取当前 Token 对应的用户信息 |

## 使用示例

以下是 Agent 可以执行的操作示例：

```
用户: 帮我把 GitHub 添加到导航站的"开发工具"标签下

Agent 调用流程:
1. list_tags → 找到"开发工具"标签的 ID
2. create_site_card → 创建网站 { name: "GitHub", url: "https://github.com", tagIds: ["tag-xxx"] }
```

```
用户: 列出我导航站里所有不在线的网站

Agent 调用流程:
1. list_all_site_cards → 获取全部网站
2. 筛选 isOnline === false 的网站并展示给用户
```

## 安全注意事项

- **Token 等同用户权限**：通过 Token 认证的 MCP 请求具有与 Token 创建者相同的权限
- **建议使用专用 Token**：为每个 MCP 客户端创建独立的 Token，不再使用时及时删除
- **速率限制**：MCP 端点限制为每 IP 每分钟 300 次请求
- **Token 安全**：不要将 Token 提交到版本控制系统或公开分享
- **定期轮换**：建议定期删除旧 Token 并创建新 Token

## 技术细节

### 认证机制

MCP 端点强制要求 `Authorization: Bearer sak_xxx` 认证，复用现有的 API Token 系统：

```
MCP 请求 → Bearer Token → SHA-256 哈希 → 数据库匹配 → 用户身份验证
```

### 数据隔离

MCP 操作遵循多租户数据隔离规则：
- 管理员 Token 操作管理员数据空间
- 普通用户 Token 仅操作该用户自有数据

### SSE 会话管理

- SSE 模式维护内存中的 session 映射，适用于单实例部署
- Session 30 分钟无活动自动过期清理
- 多实例部署建议使用 Streamable HTTP（无状态）
