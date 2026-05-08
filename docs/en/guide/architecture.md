# Architecture

SakuraNav is a full-stack navigation page application built on **Next.js 16 + React 19**.

## Technical Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    🖥 Frontend (Client)                    │
│      React 19 · TypeScript · Tailwind CSS 4 · @dnd-kit   │
└──────────────────────────────────────────────────────────┘
                              │  HTTP / JSON
                              ▼
┌──────────────────────────────────────────────────────────┐
│               ⚙️ Backend (Next.js App Router)              │
│          Route Handlers · Server Actions · API            │
│          Vercel AI SDK (Smart Analysis / Recommendations)  │
└──────────────────────────────────────────────────────────┘
                              │  SQL Queries
                              ▼
┌──────────────────────────────────────────────────────────┐
│              💾 Data Layer (SQLite/MySQL/PostgreSQL)         │
│         DatabaseAdapter Pattern · SQL Dialect Translation   │
└──────────────────────────────────────────────────────────┘
```

## Core Design Principles

| Principle | Description |
|:----------|:------------|
| **DatabaseAdapter** | Data access layer supports multiple databases through a unified `DatabaseAdapter` interface |
| **Server-Only Config** | Sensitive configuration protected by the `server-only` package, accessible only on the server |
| **Progressive Enhancement** | Progressive loading and enhancement |
| **Type Safety** | Full-stack TypeScript type safety |
| **React Compiler** | Enabled `reactCompiler: true` for automatic render performance optimization |
| **Standalone Output** | Uses `output: "standalone"` build mode, optimized for Docker deployment |
| **Zod Validation** | API request parameters validated at runtime using Zod |
