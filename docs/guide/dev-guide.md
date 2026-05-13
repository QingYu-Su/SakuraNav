# 开发指南

## 本地开发

```bash
# 安装依赖
npm install

# 复制配置文件
cp config.example.yml config.yml

# 启动开发服务器
npm run dev
```

## 代码规范

| 规范 | 说明 |
|:-----|:-----|
| TypeScript | 全栈使用，确保类型安全 |
| ESLint | Next.js 推荐配置（core-web-vitals + typescript） |
| Zod | API 请求参数运行时校验 |

**命名规范**:

| 类型 | 风格 | 示例 |
|:-----|:-----|:-----|
| 组件 | PascalCase | `SiteCard` |
| 函数 | camelCase | `getSiteById` |
| 文件 | kebab-case | `site-repository.ts` |
| 常量 | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |

## 添加新功能

### 前端架构扩展约定

前端采用 **Composition Root** 模式，新增/删除/修改导航站功能时遵循以下扩展规则：

```
sakura-nav-app.tsx          ← 固定骨架，无需修改
  └→ useSakuraNavOrchestrator  ← 编排 Hook：新增 hook 调用 + 组装 Context 值
      └→ SakuraNavContext      ← 类型定义：新增字段
          ├→ SakuraNavLayout   ← 布局组件：新增 UI 组件的渲染
          └→ SakuraDialogLayer ← 弹窗层：新增弹窗的渲染
```

> 💡 **扩展步骤** — 新增前端功能时：
> 1. `sakura-nav-context.ts` — 在 `SakuraNavContextValue` 接口中添加新字段
> 2. `use-sakura-nav-orchestrator.ts` — 调用新 hook 并将返回值注入 Context
> 3. `sakura-nav-layout.tsx` 或 `sakura-dialog-layer.tsx` — 在对应的渲染层消费新 Context 字段
> 4. `sakura-nav-app.tsx` — **无需修改**（固定骨架）

### 完整开发流程

```
1. src/lib/base/types.ts          → 定义类型
2. src/lib/config/schemas.ts      → 添加 Zod 验证模式
3. src/lib/services/              → 添加数据访问层（Repository）
4. src/app/api/                   → 添加 API 路由
5. src/components/                → 添加 UI 组件
6. src/hooks/                     → 添加自定义 Hook
```

## 数据库迁移

修改表结构时（`schema.ts` 和 `migrations.ts` 中的 SQL 需兼容 SQLite/MySQL/PostgreSQL）：

```
1. src/lib/database/schema.ts     → 更新表结构定义（使用标准 SQL）
2. src/lib/database/migrations.ts → 添加迁移逻辑（使用 adapter.hasColumn/hasTable 检测）
3. 相关 Repository                → 更新数据访问层
```

## 测试脚本

项目提供了 Python 编写的自动化测试脚本，用于验证 API 和 MCP 接口的正确性。脚本仅使用 Python 标准库，无需安装额外依赖。

### 前提条件

- Python 3.7+
- 有效的 API Token（在个人空间 → 访问令牌中创建）

### API 测试

```bash
# 测试所有 API
python scripts/test_api.py --url https://your-site.com --token sak_xxx

# 测试单个 API
python scripts/test_api.py --url http://localhost:3000 --token sak_xxx --api "GET /api/health"
python scripts/test_api.py --url http://localhost:3000 --token sak_xxx --api "POST /api/tags"

# 测试指定分组
python scripts/test_api.py --url http://localhost:3000 --token sak_xxx --group tags
```

**可用分组**: `health`、`tags`、`site-cards`、`social-cards`、`note-cards`、`snapshots`、`navigation`、`search`、`user`、`tokens`

### MCP 测试

```bash
# 测试所有 MCP 工具
python scripts/test_mcp.py --url https://your-site.com --token sak_xxx

# 测试单个 MCP 工具
python scripts/test_mcp.py --url http://localhost:3000 --token sak_xxx --tool list_tags

# 测试指定分组
python scripts/test_mcp.py --url http://localhost:3000 --token sak_xxx --group tags
```

**可用分组**: `tags`、`site-cards`、`social-cards`、`note-cards`、`snapshots`、`data`、`cards`

### 输出说明

脚本会逐条输出每个测试的结果，格式如下：

```
[PASS] GET     /api/health                              200  OK (45ms)
[FAIL] POST    /api/tags                                500  → 预期状态码 200，实际 500
```

测试完成后会输出汇总报告，包括通过数、失败数和失败列表。如果存在失败的测试，脚本以非零退出码退出。

### 测试策略

- **只读操作**：直接调用并验证响应格式
- **写操作**：执行完整的 CRUD 生命周期（创建 → 读取 → 更新 → 删除），确保数据不留残余
- **破坏性操作**（数据清除、重置、导入等）：**不测试**
- 测试数据统一以 `[API-Test]` 或 `[MCP-Test]` 前缀命名，便于识别

## 移动端适配约定

项目中所有涉及「移动端与桌面端行为差异」的场景，统一使用 `src/lib/utils/utils.ts` 中的工具函数：

| 函数 | 用途 |
|:-----|:-----|
| `isMobileViewport()` | 检测当前视口是否为移动端（< 1024px），SSR 安全（`typeof window` 守卫） |
| `openUrl(url)` | 移动端当前页跳转，桌面端新标签页打开 |

> 💡 **扩展约定** — 新增需要跳转外部链接或打开页面的功能时，**必须**使用 `openUrl()` 而非直接调用 `window.open()`，确保移动端体验一致。检测移动端时使用 `isMobileViewport()` 而非硬编码 `window.innerWidth < 1024`。

### 移动端搜索栏布局

主页搜索栏和悬浮搜索栏遵循统一的响应式断点约定：
- **内嵌按钮**（站内搜索、搜索提交）：`hidden sm:inline-flex`，< 640px 时隐藏
- **独立按钮行**（站内搜索、普通搜索）：`sm:hidden`，仅 < 640px 时显示

新增搜索相关 UI 时应保持此断点一致。

## 构建 & 部署

```bash
# 生产构建并启动
npm run build:start

# 跳过 lint 的快速构建
npm run build:start:skip-lint

# 跳过构建（使用已有产物）
npm run build:start:skip-build
```
