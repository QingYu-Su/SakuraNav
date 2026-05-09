# 项目架构

SakuraNav 是一个基于 **Next.js 16 + React 19** 的全栈导航页应用。

## 技术架构

```
┌──────────────────────────────────────────────────────────┐
│                    🖥 前端层 (Client)                      │
│      React 19 · TypeScript · Tailwind CSS 4 · @dnd-kit   │
└──────────────────────────────────────────────────────────┘
                              │  HTTP / JSON
                              ▼
┌──────────────────────────────────────────────────────────┐
│               ⚙️ 后端层 (Next.js App Router)               │
│          Route Handlers · Server Actions · API            │
│          Vercel AI SDK (智能分析 / 智能推荐 / AI 助手)       │
└──────────────────────────────────────────────────────────┘
                              │  SQL Queries
                              ▼
┌──────────────────────────────────────────────────────────┐
│              💾 数据层 (SQLite/MySQL/PostgreSQL)              │
│         DatabaseAdapter Pattern · SQL Dialect Translation   │
└──────────────────────────────────────────────────────────┘
```

## 核心设计原则

| 原则 | 说明 |
|:-----|:-----|
| **DatabaseAdapter** | 数据访问层通过统一的 `DatabaseAdapter` 接口支持多种数据库 |
| **Server-Only Config** | 敏感配置使用 `server-only` 包保护，仅在服务端可访问 |
| **Progressive Enhancement** | 渐进式加载和增强 |
| **Type Safety** | 全栈 TypeScript 类型安全 |
| **React Compiler** | 启用 `reactCompiler: true` 自动优化渲染性能 |
| **Standalone Output** | 使用 `output: "standalone"` 模式构建，适配 Docker 部署 |
| **Zod Validation** | API 请求参数使用 Zod 进行运行时校验 |
