# 📖 SakuraNav 开发文档

本文档详细介绍 SakuraNav 项目的架构设计、数据存储和开发指南。

## 目录

- [项目架构](#项目架构)
- [目录结构](#目录结构)
- [数据存储](#数据存储)
- [核心模块](#核心模块)
  - [撤销系统](#5-撤销系统-use-undo-stackts)
- [API 接口](#api-接口)
- [开发指南](#开发指南)
- [常见问题](#常见问题)

---

## 项目架构

SakuraNav 是一个基于 **Next.js 16 + React 19** 的全栈导航页应用。

### 技术架构

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
│          Vercel AI SDK (智能分析 / 智能推荐)                │
└──────────────────────────────────────────────────────────┘
                              │  SQL Queries
                              ▼
┌──────────────────────────────────────────────────────────┐
│              💾 数据层 (SQLite + better-sqlite3)            │
│              Repository Pattern · WAL Mode                │
└──────────────────────────────────────────────────────────┘
```

### 核心设计原则

| 原则 | 说明 |
|:-----|:-----|
| **Repository Pattern** | 数据访问层采用 Repository 模式封装 |
| **Server-Only Config** | 敏感配置使用 `server-only` 包保护，仅在服务端可访问 |
| **Progressive Enhancement** | 渐进式加载和增强 |
| **Type Safety** | 全栈 TypeScript 类型安全 |
| **React Compiler** | 启用 `reactCompiler: true` 自动优化渲染性能 |
| **Standalone Output** | 使用 `output: "standalone"` 模式构建，适配 Docker 部署 |
| **Zod Validation** | API 请求参数使用 Zod 进行运行时校验 |

---

## 目录结构

```
SakuraNav/
├── public/                          # 静态资源
│   ├── browser-tab-logo.png         # 浏览器标签 Logo
│   └── default-site-logo.png        # 站点默认 Logo
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── page.tsx                 # 首页（SSR 初始数据加载）
│   │   ├── layout.tsx               # 根布局（3 种 Google 字体、主题初始化脚本）
│   │   ├── not-found.tsx            # 404 页面（复用登录页背景和 UI 风格）
│   │   ├── globals.css              # 全局样式（Tailwind CSS 4、自定义动画）
│   │   ├── icon.png                 # App Icon
│   │   ├── editor/page.tsx          # 编辑器管理后台（需管理员认证）
│   │   ├── card/[id]/page.tsx       # 社交卡片详情页（通用，支持所有 ID+二维码类型及邮箱）
│   │   ├── [...slug]/page.tsx       # 兜底路由（未匹配路径返回 404）
│   │   ├── login/page.tsx           # 登录/注册页面（固定路由，支持 OAuth 第三方登录）
│   │   ├── profile/                 # 个人空间
│   │   │   ├── page.tsx             # 页面入口（认证检查）
│   │   │   ├── profile-client.tsx   # 个人空间客户端组件（主逻辑 + UI）
│   │   │   └── profile-dialogs.tsx  # 弹窗组件集合（密码/解绑/注销/用户名等）
│   │   ├── register-switch/         # 切换用户场景专用注册页
│   │   │   └── page.tsx             # 注册后返回主页（非登录页）
│   │   ├── setup/                   # 管理员初始化引导（首次启动）
│   │   │   └── page.tsx             # 引导页面（创建管理员账号）
│   │   └── api/                     # 后端接口
│   │       ├── health/              # 健康检查
│   │       ├── auth/                # 认证接口
│   │       │   ├── login/           # 登录
│   │       │   ├── logout/          # 登出
│   │       │   ├── register/        # 注册
│   │       │   ├── switch/          # 免密码切换用户
│   │       │   ├── session/         # 会话状态
│   │       │   ├── oauth-providers/ # 公开 OAuth 供应商列表
│   │       │   └── oauth/[provider]/ # OAuth 登录（重定向 + 回调）
│   │       ├── sites/               # 网站管理
│   │       │   ├── route.ts         # CRUD
│   │       │   ├── batch/           # 批量创建网站（书签导入）
│   │       │   ├── check-online/      # 批量在线检测
│   │       │   ├── check-online-single/ # 单站点在线检测（即时检测）
│   │       │   ├── memo/              # 备忘便签更新（PATCH notes/todos）
│   │       │   └── reorder-global/  # 全局排序
│   │       ├── tags/                # 标签管理
│   │       │   ├── route.ts         # CRUD
│   │       │   ├── reorder/         # 标签排序
│   │       │   └── [tagId]/sites/   # 标签下站点操作
│   │       │       ├── reorder/     # 标签内排序
│   │       │       └── restore/     # 恢复标签站点关联（撤销删除）
│   │       ├── appearance/          # 外观配置
│   │       ├── settings/            # 应用设置
│   │       ├── navigation/          # 导航数据（公开接口）
│   │       │   ├── sites/           # 分页网站列表
│   │       │   ├── tags/            # 可见标签列表
│   │       │   └── cards/           # 公开社交卡片列表
│   │       ├── assets/              # 资源管理
│   │       │   ├── wallpaper/       # 壁纸上传
│   │       │   ├── cleanup/        # 孤立 icon 资源清理（延迟删除）
│   │       │   └── [assetId]/file/  # 资源文件访问
│   │       ├── config/              # 配置导入导出（管理员全局级）
│   │       │   ├── detect/          # 导入文件类型检测
│   │       │   ├── export/          # 导出 ZIP
│   │       │   ├── import/          # 导入 ZIP
│   │       │   └── reset/           # 重置默认
│   │       ├── search/              # 搜索功能
│   │       │   └── suggest/         # 搜索建议
│   │       ├── cards/               # 社交卡片管理
│   │       │   ├── route.ts         # CRUD（GET / POST / PUT / DELETE）
│   │       │   ├── [id]/route.ts    # 单卡片公开接口（无需认证）
│   │       │   ├── note/            # 笔记卡片管理（CRUD，存储在 sites 表 card_type='note'）
│   │       │   │   ├── img/         # 笔记图片访问（伪装 URL，不暴露 asset 系统）
│   │       │   │   ├── file/        # 笔记文件下载（伪装 URL，Content-Disposition: attachment）
│   │       │   │   ├── upload-image/  # 笔记图片上传（剪贴板粘贴，最大 5MB）
│   │       │   │   └── upload-file/   # 笔记文件上传（剪贴板粘贴非图片，最大 10MB）
│   │       │   └── reorder/         # 卡片排序
│   │       ├── admin/               # 管理员接口
│   │       │   ├── bootstrap/       # 初始化引导数据
│   │       │   ├── registration/    # 注册开关管理
│   │       │   ├── users/           # 用户管理（列表/角色/删除）
│   │       │   └── oauth/           # OAuth 配置管理
│   │       │       ├── route.ts     # GET/PUT 供应商配置
│   │       │       └── test/        # POST 测试连通性
│   │       ├── user/                # 用户接口（需认证）
│   │       │   ├── profile/         # 获取/更新用户资料（昵称）
│   │       │   ├── avatar/          # 上传/删除头像
│   │       │   ├── password/        # 修改密码
│   │       │   ├── username/        # 修改用户名（仅一次）
│   │       │   ├── oauth-bind/      # OAuth 绑定管理（GET/DELETE）
│   │       │   ├── data/            # 用户级数据操作（导入/导出/重置/检测）
│   │       │   │   ├── export/      # 导出用户数据为 ZIP
│   │       │   │   ├── import/      # 从 ZIP 导入用户数据
│   │       │   │   ├── reset/       # 重置用户数据
│   │       │   │   ├── clear/       # 清除用户标签和站点
│   │       │   │   └── detect/      # 检测导入文件类型
│   │       │   └── delete-account/  # 注销账号
│   │       ├── setup/               # 管理员初始化引导（首次启动）
│   │       ├── floating-buttons/    # 悬浮按钮配置（GET/PUT）
│   │       └── ai/                  # AI 接口
│   │           ├── recommend/       # AI 智能推荐
│   │           ├── workflow/        # AI 工作流规划（根据用户需求串联网站步骤）
│   │           ├── analyze-site/    # AI 网站分析
│   │           ├── check/           # AI 连通性检查
│   │           └── import-bookmarks/ # AI 书签分析
│   │
│   ├── components/                  # React 组件
│   │   ├── sakura-nav/              # 主应用组件（Composition Root 架构）
│   │   │   ├── index.ts             # 统一导出
│   │   │   ├── sakura-nav-app.tsx   # Composition Root（固定骨架：调用 Hook → 提供 Context → 渲染布局）
│   │   │   ├── sakura-nav-context.ts # 应用级 Context 定义（SakuraNavContext + useSakuraNavContext）
│   │   │   ├── sakura-nav-layout.tsx # 布局组件（消费 Context，渲染所有 UI 子组件）
│   │   │   ├── sakura-dialog-layer.tsx # 弹窗统一渲染层（消费 Context，内聚拆分为 Settings/Editor/Admin 三组）
│   │   │   ├── app-header.tsx       # 顶部导航栏（响应式桌面/移动布局）
│   │   │   ├── background-layer.tsx # 动态背景（樱花/星星）
│   │   │   ├── sidebar-tags.tsx     # 侧边栏（标签列表、DnD 排序）
│   │   │   ├── search-bar-section.tsx # 搜索栏（引擎切换、建议、AI 推荐）
│   │   │   ├── site-content-area.tsx  # 网站内容区域（卡片网格、分页）
│   │   │   ├── site-footer.tsx      # 页脚
│   │   │   ├── floating-actions.tsx # 浮动操作按钮
│   │   │   ├── content-title-bar.tsx # 内容区标题栏（新建卡片/新建标签按钮）
│   │   │   ├── toast-layer.tsx      # 通知提示层
│   │   │   ├── appearance-drawer.tsx  # 外观设置抽屉
│   │   │   ├── config-drawer.tsx    # 配置管理抽屉
│   │   │   ├── editor-modal.tsx     # 编辑器弹窗（网站卡片/标签编辑）
│   │   │   ├── admin-drawer.tsx     # 管理面板抽屉
│   │   │   ├── drawer-sections.tsx  # 抽屉分区定义
│   │   │   ├── settings-modal.tsx   # 设置弹窗（外观+快捷+其他统一入口）
│   │   │   ├── card-type-picker.tsx       # 卡片类型选择器（新建卡片统一入口：网站卡片/社交卡片/笔记卡片）
│   │   │   ├── social-card-type-picker.tsx # 社交卡片类型选择器（QQ/微信/邮箱等）
│   │   │   ├── social-card-editor.tsx      # 社交卡片编辑器
│   │   │   ├── note-card-editor.tsx       # 笔记卡片编辑器（标题 + Markdown 内容，支持列表自动续行、剪贴板粘贴图片/文件）
│   │   │   └── style-helpers.ts     # 样式工具函数（主题感知的弹窗、抽屉、Toast、磨砂效果等样式适配）
│   │   ├── admin/                   # 管理面板组件
│   │   │   ├── index.ts             # 统一导出
│   │   │   ├── types.ts             # 管理面板类型定义
│   │   │   ├── oauth-panel.tsx      # OAuth 第三方登录配置面板（供应商配置/测试/启停）
│   │   │   ├── editor-console.tsx   # 编辑器控制台（标签/网站批量管理）
│   │   │   ├── editor-sites-tab.tsx # 编辑器网站标签页
│   │   │   ├── editor-tags-tab.tsx  # 编辑器标签标签页
│   │   │   ├── sites-admin-panel.tsx   # 网站管理面板
│   │   │   ├── tags-admin-panel.tsx    # 标签管理面板
│   │   │   ├── site-editor-form.tsx    # 网站编辑表单（基本信息 Tab）
│   │   │   ├── access-rules-tab.tsx    # 访问控制 Tab（备选 URL 管理、在线检测配置）
│   │   │   ├── access-rules-components.tsx # 访问控制子组件（URL 列表项、条件编辑器等）
│   │   │   ├── related-sites-tab.tsx   # 关联推荐 Tab（推荐上下文 + AI 智能关联 + 网站关联列表）
│   │   │   ├── notes-tab.tsx           # 备忘便签 Tab（备注输入 + 待办列表搜索/筛选/增删改查）
│   │   │   ├── tag-editor-form.tsx     # 标签编辑表单
│   │   │   ├── appearance-admin-panel.tsx # 外观管理面板
│   │   │   ├── config-admin-panel.tsx    # 配置管理面板
│   │   │   ├── floating-buttons-panel.tsx # 快捷按钮配置面板
│   │   │   ├── ai-model-panel.tsx        # AI 模型配置面板（供应商选择 / 模型类型 / API Key / 连通性测试）
│   │   │   ├── search-engine-editor.tsx  # 搜索引擎编辑器
│   │   │   ├── site-icon-selector.tsx    # 网站图标选择器
│   │   │   ├── wallpaper-slot-card.tsx   # 壁纸插槽卡片
│   │   │   ├── asset-slot-card.tsx       # 资源插槽卡片
│   │   │   ├── sortable-site-row.tsx     # 可排序网站行
│   │   │   └── admin-subsection.tsx      # 子区块通用组件
│   │   ├── auth/                    # 认证相关组件
│   │   │   ├── index.ts             # 统一导出
│   │   │   ├── login-screen.tsx     # 登录/注册界面（支持模式切换 + OAuth 第三方登录）
│   │   │   ├── oauth-provider-icon.tsx # OAuth 供应商 SVG 图标（GitHub/微信/企微/飞书/钉钉）
│   │   │   ├── already-logged-in.tsx # 已登录提示组件
│   │   │   ├── setup-screen.tsx     # 管理员初始化引导界面（首次启动）
│   │   │   ├── register-switch-screen.tsx # 切换用户场景专用注册界面
│   │   │   └── dynamic-background.tsx # 动态背景（樱花/星星）
│   │   ├── dialogs/                 # 对话框组件
│   │   │   ├── index.ts             # 统一导出
│   │   │   ├── floating-search-dialog.tsx # 浮动搜索弹窗
│   │   │   ├── notification-toast.tsx     # 通知提示
│   │   │   ├── config-confirm-dialog.tsx  # 配置确认对话框
│   │   │   ├── image-crop-dialog.tsx      # 图片裁剪对话框（裁剪、旋转、缩放）
│   │   │   ├── delete-social-tag-dialog.tsx # 删除社交标签确认对话框
│   │   │   ├── delete-tag-dialog.tsx     # 删除普通标签确认对话框（删除所有卡片/仅删除标签/取消）
│   │   │   ├── import-mode-dialog.tsx     # 导入模式选择对话框（外部文件清除/增量/覆盖，走 AI 分析）
│   │   │   ├── bookmark-import-dialog.tsx # 书签导入分析结果对话框（AI 分析列表）
│   │   │   ├── sakura-import-confirm-dialog.tsx # SakuraNav 配置文件导入确认对话框（清空后导入）
│   │   │   ├── switch-user-dialog.tsx  # 切换用户弹窗（用户列表 + 登录表单 + 删除确认）
│   │   │   ├── session-expired-dialog.tsx # 会话失效确认弹窗（独立覆盖层）
│   │   │   ├── ai-workflow-dialog.tsx # AI 工作流助手弹窗（需求 → 工作流规划）
│   │   │   └── export-mode-dialog.tsx # 导出模式选择对话框（全部备份/仅标签卡片/仅网站卡片）
│   │   │   ├── delete-note-tag-dialog.tsx  # 笔记卡片标签删除确认对话框
│   │   │   ├── note-card-view-dialog.tsx   # 笔记卡片查看弹窗（Markdown 渲染，支持 Todo checkbox 交互）
│   │   │   └── delete-duplicate-site-dialog.tsx # 重复网站删除确认对话框
│   │   └── ui/                      # UI 基础组件
│   │       ├── index.ts             # 统一导出
│   │       ├── card-header.tsx      # 卡片共用头部（类型 Logo + 拖拽手柄 + 编辑按钮）
│   │       ├── site-card-content.tsx # 网站卡片内容（图标、名称、描述、标签、悬浮弹窗）
│   │       ├── site-card-shell.tsx   # 网站卡片壳
│   │       ├── site-card-popover.tsx # 通用悬浮弹窗（描述/标签交互，支持 top/bottom/right，全局互斥）
│   │       ├── site-context-menu.tsx # 网站卡片右键/长按菜单（主站跳转 + 备选URL子菜单 + 关联网站子菜单 + 查看备注/待办）
│   │       ├── site-memo-dialogs.tsx  # 备忘便签查看弹窗（备注只读查看 + 待办搜索/筛选/勾选）
│   │       ├── tag-row-card.tsx      # 标签行卡片壳
│   │       ├── tag-row-content.tsx   # 标签行内容（Logo + 名称 + 描述 + 悬浮弹窗）
│   │       ├── sortable-site-card.tsx # 可排序网站卡片（自动区分网站/社交卡片/笔记卡片）
│   │       ├── sortable-tag-row.tsx  # 可排序标签行
│   │       ├── social-card-content.tsx # 社交卡片内容（放大的品牌 Logo + 提示文字 + 标题）
│   │       ├── note-card-content.tsx # 笔记卡片内容（笔记图标 + 居中标题）
│   │       └── tooltip.tsx           # 轻量 Tooltip（createPortal 渲染，主题感知，替代原生 title）
│   │
│   ├── lib/                         # 工具库
│   │   ├── base/                    # 基础模块
│   │   │   ├── types.ts             # TypeScript 类型定义
│   │   │   ├── api.ts               # API 请求封装（客户端，含 401 会话失效拦截）
│   │   │   ├── auth.ts              # 认证模块（JWT + Cookie，导出 SESSION_COOKIE_NAME）
│   │   │   └── logger.ts            # 日志记录器
│   │   ├── config/                  # 配置模块
│   │   │   ├── server-config.ts     # 服务端配置（从 YAML 加载）
│   │   │   ├── schemas.ts           # Zod 验证模式
│   │   │   └── config.ts            # 客户端配置
│   │   ├── database/                # 数据库核心
│   │   │   ├── connection.ts        # 连接管理（单例、WAL）
│   │   │   ├── schema.ts            # 表结构定义
│   │   │   ├── migrations.ts        # 迁移脚本
│   │   │   ├── seed.ts              # 种子数据
│   │   │   └── index.ts             # 统一导出
│   │   ├── utils/                   # 工具函数
│   │   │   ├── utils.ts             # 通用工具函数
│   │   │   ├── access-rules-resolver.ts # 访问规则解析器（根据模式/条件解析实际跳转 URL）
│   │   │   ├── oauth-providers.ts   # OAuth 供应商工具（授权 URL/Token 交换/用户信息获取，server-only）
│   │   │   ├── appearance-utils.ts  # 外观相关工具
│   │   │   ├── icon-utils.ts        # 图标处理工具（文字图标 SVG、域名提取、favicon.im 验证、图标上传、资产 ID 提取）
│   │   │   ├── crop-utils.ts        # 图片裁剪工具（Canvas 裁剪、旋转）
│   │   │   ├── ai-config.ts         # AI 配置解析（服务端，从请求体/数据库解析最终 AI 配置，掩码防护）
│   │   │   ├── ai-provider-factory.ts # AI Provider 工厂（根据供应商 SDK 类型创建 LanguageModel 实例）
│   │   │   ├── ai-text.ts           # AI 文本处理（从模型原始返回中提取 JSON，兼容多种供应商格式）
│   │   │   ├── ai-draft-ref.ts      # AI 草稿配置全局访问点（客户端，跨组件共享 AI 配置草稿）
│   │   │   └── theme-styles.ts      # 主题样式工具
│   │   └── services/                # 服务层
│   │       ├── index.ts             # 统一导出
│   │       ├── site-repository.ts   # 网站数据访问
│   │       ├── tag-repository.ts    # 标签数据访问
│   │       ├── card-repository.ts   # 社交卡片数据访问（兼容 cards 表 + sites 表社交卡片）
│   │       ├── appearance-repository.ts # 外观数据访问
│   │       ├── asset-repository.ts  # 资源数据访问
│   │       ├── user-repository.ts   # 注册用户数据访问（含 OAuth 用户创建/密码标记）
│   │       ├── oauth-repository.ts  # OAuth 账号数据访问（绑定/解绑/查询）
│   │       ├── config-service.ts    # 配置导入导出服务
│   │       ├── data-portability-service.ts # 用户数据可移植性服务（可扩展导出/导入、隐私保护、HMAC 签名校验）
│   │       ├── search-service.ts    # 搜索服务
│   │       └── site-relation-repository.ts # 网站关联推荐数据访问（关联关系 CRUD + AI 分析队列）
│   │
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── index.ts                 # 统一导出
│   │   ├── use-sakura-nav-orchestrator.ts # 编排 Hook（应用的 Composition Root，整合全部 hooks 调用）
│   │   ├── use-theme.ts             # 主题切换
│   │   ├── use-site-list.ts         # 网站列表管理（分页加载）
│   │   ├── use-appearance.ts        # 外观配置
│   │   ├── use-drag-sort.ts         # 拖拽排序
│   │   ├── use-search-bar.ts        # 搜索栏状态管理
│   │   ├── use-search-engine-config.ts # 搜索引擎配置管理
│   │   ├── use-ai-recommend.ts      # AI 智能推荐
│   │   ├── use-toast-notify.ts      # 通知提示
│   │   ├── use-config-actions.ts    # 配置操作
│   │   ├── use-site-tag-editor.ts   # 网站标签编辑器
│   │   ├── use-site-name.ts         # 站点名称管理
│   │   ├── use-online-check.ts      # 网站在线检测
│   │   ├── use-undo-stack.ts        # 操作撤销栈（push/pop/clear，配合 Ctrl+Z 和 Toast）
│   │   ├── use-editor-console.ts    # 编辑器控制台
│   │   ├── use-social-cards.ts      # 社交卡片管理
│   │   ├── use-switch-user.ts       # 切换用户（列表持久化、弹窗状态）
│   │   ├── use-session-expired.ts   # 会话失效检测与弹窗管理（SSR / API 401 / 目标不存在）
│   │   └── use-tag-delete.ts        # 标签删除（普通标签三选项 + 社交标签专用对话框）
│   │
├── storage/                         # 数据存储（运行后生成，禁止手动修改）
│   ├── database/
│   │   └── sakuranav.sqlite         # SQLite 数据库
│   └── uploads/                     # 上传文件目录
│
├── config.example.yml               # 配置文件模板
├── build-and-run.js                 # 构建并运行脚本
└── package.json                     # 项目配置
```

---

## 数据存储

### 数据库技术栈

| 项目 | 说明 |
|:-----|:-----|
| 数据库引擎 | SQLite (better-sqlite3) |
| 存储位置 | `storage/database/sakuranav.sqlite` |
| Docker 映射 | 通过软链接映射到 `/app/data/database/` |
| 模式 | WAL (Write-Ahead Logging) |

### 数据表结构

#### 0️⃣ `users` 表 — 注册用户

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                 -- 用户ID (user-UUID)
  username TEXT NOT NULL UNIQUE,       -- 用户名（唯一）
  password_hash TEXT NOT NULL,         -- 密码哈希 (scrypt, salt:key)
  role TEXT NOT NULL DEFAULT 'user',   -- 角色 (admin/user)
  nickname TEXT,                       -- 用户昵称（为空时显示用户名）
  avatar_asset_id TEXT,                -- 头像资源 ID
  avatar_color TEXT,                   -- 默认头像背景颜色（十六进制，注册时随机分配）
  username_changed INTEGER NOT NULL DEFAULT 0, -- 用户名是否已修改（0: 否, 1: 是，OAuth 用户可改一次）
  has_password INTEGER NOT NULL DEFAULT 1,     -- 是否已设置密码（OAuth 用户首次为 0）
  created_at TEXT NOT NULL             -- 创建时间 (ISO 8601)
);
```

> 💡 **角色说明**: `admin` 管理员（首次启动时通过引导页创建，存储在 `users` 表中，`id = ADMIN_USER_ID`）；`user` 普通用户。管理员的昵称和头像存储在 `app_settings` 表（`admin_nickname`、`admin_avatar_asset_id`）。管理员可在个人空间修改密码。

> 💡 **注册默认值**: 新用户注册时自动设置 `nickname = username`、`avatar_color` 从 15 种预定义颜色中随机选择。未上传头像时，前端显示昵称首字母 + 背景色。

> 💡 **OAuth 用户**: 通过第三方登录创建的用户默认 `has_password = 0`（未设置密码），可在个人空间首次设置密码（无需旧密码验证）。`username_changed = 0` 表示可修改一次用户名（从 `oauth_xxxxxxxx` 改为自定义名称）。

#### 1️⃣ `tags` 表 — 标签

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,                 -- 标签ID (UUID)
  name TEXT NOT NULL,                  -- 标签名称
  slug TEXT NOT NULL,                  -- URL友好的标识
  sort_order INTEGER NOT NULL,         -- 排序顺序
  is_hidden INTEGER NOT NULL DEFAULT 0, -- 是否隐藏 (0: 否, 1: 是)
  logo_url TEXT,                       -- Logo URL
  logo_bg_color TEXT,                  -- Logo 背景色
  description TEXT,                    -- 标签描述
  owner_id TEXT NOT NULL DEFAULT '__admin__' -- 数据所有者 ID
);
```

> 💡 **关键特性**: `sort_order` 支持拖拽排序 · `slug` URL 友好标识（多用户下不唯一） · `owner_id` 数据隔离，管理员为 `__admin__`
>
> ⚠️ `is_hidden` 字段保留在数据库中但前端已不再暴露该选项（多用户后隐藏标签功能废弃）

#### 2️⃣ `sites` 表 — 网站

```sql
CREATE TABLE sites (
  id TEXT PRIMARY KEY,                 -- 网站ID (UUID)
  name TEXT NOT NULL,                  -- 网站名称
  url TEXT NOT NULL,                   -- 网站URL
  description TEXT,                    -- 描述
  icon_url TEXT,                       -- 图标URL
  icon_bg_color TEXT,                  -- 图标背景色
  is_online INTEGER,                   -- 在线状态 (0: 离线, 1: 在线, NULL: 未检测)
  skip_online_check INTEGER NOT NULL DEFAULT 0, -- 跳过在线检测 (0: 不跳过, 1: 跳过)
  online_check_frequency TEXT NOT NULL DEFAULT '1d', -- 检测频率 (5min / 1h / 1d)
  online_check_timeout INTEGER NOT NULL DEFAULT 3, -- 检测超时时间（秒，默认 3）
  online_check_match_mode TEXT NOT NULL DEFAULT 'status', -- 在线判定模式 (status=HTTP状态码, keyword=关键词匹配)
  online_check_keyword TEXT NOT NULL DEFAULT '', -- 在线判定关键词（仅 keyword 模式有效）
  online_check_fail_threshold INTEGER NOT NULL DEFAULT 3, -- 连续失败判定离线阈值（默认 3 次）
  online_check_last_run TEXT,           -- 上次检测时间 (ISO 8601)
  online_check_fail_count INTEGER NOT NULL DEFAULT 0, -- 连续失败计数
  is_pinned INTEGER NOT NULL DEFAULT 0, -- 是否置顶 (0: 否, 1: 是)
  global_sort_order INTEGER NOT NULL,  -- 全局排序顺序
  card_type TEXT,                      -- 卡片类型 (NULL=普通网站, 社交卡片: qq/wechat/email/bilibili/github/blog/wechat-official/telegram/xiaohongshu/douyin/qq-group/enterprise-wechat, 笔记卡片: note)
  card_data TEXT,                      -- 卡片载荷 JSON (社交卡片: 品牌字段+二维码URL, 笔记卡片: {title,content})
  access_rules TEXT,                   -- 访问规则 JSON (备选URL、自动/条件模式、开关)
  recommend_context TEXT NOT NULL DEFAULT '', -- 推荐上下文（辅助站内搜索 + AI 推荐）
  recommend_context_enabled INTEGER NOT NULL DEFAULT 1, -- 推荐上下文开关（始终开启）
  recommend_context_auto_gen INTEGER NOT NULL DEFAULT 1, -- 推荐上下文智能生成开关
  pending_context_gen INTEGER NOT NULL DEFAULT 0, -- 推荐上下文待 AI 生成标记
  search_text TEXT NOT NULL DEFAULT '', -- 搜索文本（合并可搜索字段，加速 LIKE 搜索）
  ai_relation_enabled INTEGER NOT NULL DEFAULT 1, -- AI 智能关联开关
  allow_linked_by_others INTEGER NOT NULL DEFAULT 1, -- 允许被其他网站关联
  related_sites_enabled INTEGER NOT NULL DEFAULT 1, -- 关联网站总开关
  pending_ai_analysis INTEGER NOT NULL DEFAULT 0, -- 待 AI 关联分析标记 (0: 否, 1: 是)
  notes TEXT NOT NULL DEFAULT '',         -- 备忘备注（纯文本）
  notes_ai_enabled INTEGER NOT NULL DEFAULT 1, -- 备注 AI 可读开关 (0: 不可读, 1: 可读)
  todos TEXT NOT NULL DEFAULT '[]',       -- 待办列表 JSON (Array<{id, text, completed}>)
  todos_ai_enabled INTEGER NOT NULL DEFAULT 1, -- 待办 AI 可读开关 (0: 不可读, 1: 可读)
  owner_id TEXT NOT NULL DEFAULT '__admin__', -- 数据所有者 ID
  created_at TEXT NOT NULL,            -- 创建时间 (ISO 8601)
  updated_at TEXT NOT NULL             -- 更新时间 (ISO 8601)
);
```

> 💡 **关键特性**: `is_pinned` 置顶显示 · `global_sort_order` 全局拖拽排序 · `icon_bg_color` 图标背景色自定义 · `is_online` 在线检测 · `skip_online_check` 单站点跳过在线检测 · `online_check_frequency` 站点级检测频率 · `online_check_timeout` 检测超时时间 · `online_check_match_mode` 在线判定模式（HTTP 状态码 / 关键词匹配） · `online_check_fail_threshold` 连续失败判定离线阈值 · `card_type`/`card_data` 社交卡片和笔记卡片合并存储 · `access_rules` 备选URL与访问规则 · `recommend_context` 推荐上下文（始终生效，辅助站内搜索 + AI 推荐） · `recommend_context_auto_gen` 推荐上下文智能生成开关 · `pending_context_gen` 推荐上下文待生成标记 · `search_text` 搜索文本聚合列（合并名称、描述、标签、备注、待办、推荐上下文，加速搜索） · `ai_relation_enabled`/`allow_linked_by_others`/`related_sites_enabled` 关联推荐配置 · `pending_ai_analysis` 智能关联待分析标记 · `notes`/`notes_ai_enabled`/`todos`/`todos_ai_enabled` 备忘便签（备注 + 待办列表，右键菜单可快速查看，未完成待办显示图标角标；AI 可读开关控制 AI 功能是否读取内容）

#### 3️⃣ `site_tags` 表 — 网站标签关联

```sql
CREATE TABLE site_tags (
  site_id TEXT NOT NULL,               -- 网站ID
  tag_id TEXT NOT NULL,                -- 标签ID
  sort_order INTEGER NOT NULL,         -- 标签内的排序顺序
  PRIMARY KEY (site_id, tag_id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

> 💡 **关键特性**: 一个网站可关联多个标签 · 每个标签内独立排序 · 级联删除保证一致性

#### 4️⃣ `site_relations` 表 — 网站关联推荐

```sql
CREATE TABLE site_relations (
  id TEXT PRIMARY KEY,                 -- 关联ID (rel-UUID)
  source_site_id TEXT NOT NULL,        -- 源网站ID
  target_site_id TEXT NOT NULL,        -- 目标网站ID
  sort_order INTEGER NOT NULL DEFAULT 0, -- 排序顺序
  is_enabled INTEGER NOT NULL DEFAULT 1, -- 是否启用 (0: 禁用, 1: 启用)
  is_locked INTEGER NOT NULL DEFAULT 0,  -- 是否锁定 (0: 未锁定, 1: 锁定，AI不可修改)
  source TEXT NOT NULL DEFAULT 'manual', -- 关联来源 (manual=手动, ai=AI推荐)
  reason TEXT NOT NULL DEFAULT '',      -- AI 推荐理由（仅 source=ai 时有值）
  created_at TEXT NOT NULL,            -- 创建时间 (ISO 8601)
  UNIQUE(source_site_id, target_site_id),
  FOREIGN KEY (source_site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (target_site_id) REFERENCES sites(id) ON DELETE CASCADE
);
```

> 💡 **关键特性**: `UNIQUE(source_site_id, target_site_id)` 防止重复关联 · `is_enabled` 支持禁用但保留关联 · `is_locked` 锁定后 AI 分析不可修改该条目 · `source` 区分手动/AI 关联来源 · `reason` 记录 AI 推荐理由 · 级联删除保证一致性 · 数据访问通过 `site-relation-repository.ts` · AI 关联支持双向自动同步

#### 5️⃣ `ai_relation_queue` 表 — AI 关联分析队列（已废弃）

> ⚠️ **已废弃**: 此表保留用于数据库兼容，不再使用。AI 关联分析已合并到统一分析接口 `/api/ai/analyze-site`（scope: "full"）。

#### 6️⃣ `assets` 表 — 资源文件

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,                 -- 资源ID (UUID)
  kind TEXT NOT NULL,                  -- 资源类型 (wallpaper, logo, favicon)
  file_path TEXT NOT NULL,             -- 文件路径
  mime_type TEXT NOT NULL,             -- MIME类型
  width INTEGER,                       -- 宽度 (像素)
  height INTEGER,                      -- 高度 (像素)
  created_at TEXT NOT NULL             -- 创建时间 (ISO 8601)
);
```

| kind | 说明 |
|:-----|:-----|
| `wallpaper` | 壁纸 |
| `logo` | Logo |
| `favicon` | Favicon |

#### 7️⃣ `theme_appearances` 表 — 主题外观

```sql
CREATE TABLE theme_appearances (
  owner_id TEXT NOT NULL DEFAULT '__admin__',  -- 数据所有者 ID（管理员为 __admin__，用户为 user-UUID）
  theme TEXT NOT NULL,                         -- 主题 (light, dark)
  wallpaper_asset_id TEXT,                     -- 壁纸资源ID (已废弃)
  desktop_wallpaper_asset_id TEXT,             -- 桌面壁纸资源ID
  mobile_wallpaper_asset_id TEXT,              -- 移动壁纸资源ID
  font_preset TEXT NOT NULL,                   -- 字体预设 (grotesk, serif, balanced)
  font_size REAL NOT NULL DEFAULT 16,          -- 字体大小
  overlay_opacity REAL NOT NULL,               -- 遮罩透明度 (0.0 - 1.0)
  text_color TEXT NOT NULL,                    -- 文字颜色 (十六进制)
  logo_asset_id TEXT,                          -- Logo资源ID
  favicon_asset_id TEXT,                       -- Favicon资源ID
  card_frosted INTEGER NOT NULL DEFAULT 0,     -- 卡片毛玻璃 (已废弃)
  desktop_card_frosted INTEGER NOT NULL DEFAULT 0, -- 桌面卡片毛玻璃强度 (0-100, 0=透明, 100=最强)
  mobile_card_frosted INTEGER NOT NULL DEFAULT 0,  -- 移动卡片毛玻璃强度 (0-100, 0=透明, 100=最强)
  is_default INTEGER NOT NULL DEFAULT 0,       -- 是否为默认主题
  PRIMARY KEY (owner_id, theme),
  FOREIGN KEY (wallpaper_asset_id) REFERENCES assets(id) ON DELETE SET NULL
);
```

> 💡 **多用户隔离**: `owner_id` + `theme` 为复合主键，每个用户拥有独立的 `light`/`dark` 外观配置行。管理员（`__admin__`）的外观配置同时作为游客看到的默认配置。新用户注册时自动复制管理员外观到自己的数据空间。

#### 8️⃣ `app_settings` 表 — 应用设置

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,                -- 设置键名
  value TEXT                           -- 设置值 (JSON)
);
```

| key | 说明 |
|:----|:-----|
| `site_logo_light_asset_id` | 明亮主题 Logo |
| `site_logo_dark_asset_id` | 暗黑主题 Logo |
| `site_name` | 站点名称 |
| `floating_buttons` | 悬浮按钮配置（JSON） |
| `social_tag_description` | 社交卡片标签描述（null 则显示站点数量） |
| `registration_enabled` | 注册功能是否开启（"true" / "false"） |
| `ai_api_key` | AI API 密钥（GET 时返回掩码，PUT 时接受明文） |
| `ai_base_url` | AI API 基础地址（如 `https://api.deepseek.com/v1`） |
| `ai_model` | AI 模型名称（如 `deepseek-chat`） |
| `admin_nickname` | 管理员昵称（管理员无 users 表记录，存储在 app_settings 中） |
| `admin_avatar_asset_id` | 管理员头像资源 ID（管理员无 users 表记录，存储在 app_settings 中） |
| `oauth_base_url` | OAuth 基础 URL（导航站完整访问地址，用于生成回调 URL） |
| `oauth_providers` | OAuth 供应商配置（JSON，含各供应商 clientId/clientSecret/appId 等） |

#### 9️⃣ `oauth_accounts` 表 — OAuth 第三方账号绑定

```sql
CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,                 -- 绑定记录ID (oauth-UUID)
  user_id TEXT NOT NULL,               -- 关联的用户ID
  provider TEXT NOT NULL,              -- OAuth 供应商 (github/wechat/wecom/feishu/dingtalk)
  provider_account_id TEXT NOT NULL,   -- 供应商侧的用户ID
  profile_data TEXT,                   -- 用户资料 JSON（displayName/avatarUrl/email）
  created_at TEXT NOT NULL,            -- 绑定时间 (ISO 8601)
  updated_at TEXT NOT NULL,            -- 更新时间 (ISO 8601)
  UNIQUE(provider, provider_account_id),  -- 同一供应商同一账号唯一
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

> 💡 **OAuth 登录流程**: 用户点击第三方登录 → 重定向到授权页 → 回调后获取用户信息 → 查找 `oauth_accounts` 绑定 → 已绑定则直接登录，未绑定则创建新用户（随机用户名 `oauth_xxxxxxxx`、随机密码、`has_password = 0`）+ 绑定记录。

> 💡 **安全机制**: 同一供应商同一第三方账号只能绑定一个用户（UNIQUE 约束）。解绑时检查：如果用户没有密码且这是最后一个绑定，不允许解绑。CSRF 保护通过 `state` 参数 + Cookie 实现。

#### 🔟 `cards` 表 — 社交卡片（已废弃）

> ⚠️ **已废弃**: 社交卡片已合并到 `sites` 表（通过 `card_type` + `card_data` 字段），`cards` 表仅保留以防降级。新建的社交卡片直接存入 `sites` 表。payload 类型定义见 `sites` 表的 `card_type`/`card_data` 说明。

> 💡 **虚拟标签**: 导航标签列表 API 会动态注入两个虚拟标签：
> - `__social_cards__`：点击后筛选显示所有社交卡片（通过 `sites.card_type IS NOT NULL AND card_type != 'note'` 过滤）。删除该标签会同时删除所有社交卡片。
> - `__note_cards__`：点击后筛选显示所有笔记卡片（通过 `sites.card_type = 'note'` 过滤）。删除该标签会同时删除所有笔记卡片。
>
> 标签名"社交卡片"和"笔记卡片"被系统保留，用户无法创建同名标签。

### 数据关系图

```
┌──────────┐           ┌──────────┐     ┌──────────┐
│  users   │           │  assets  │     │   tags   │
└────┬─────┘           └──────────┘     └──────────┘
     │                        │               │
     │                        ▼               ▼
     │             ┌───────────────────┐ ┌──────────┐
     │             │theme_appearances  │ │site_tags │
     │             └───────────────────┘ └──────────┘
     │                                        │
     │                                        ▼
     │             ┌──────────────┐     ┌──────────┐
     │             │ app_settings │     │  sites   │
     │             └──────────────┘     └──────────┘
     │
     └──────────┐
                │
     ┌──────────┴──────┐
     │ oauth_accounts  │
     └─────────────────┘
```

---

## 核心模块

### 1. 认证模块 (`lib/base/auth.ts`)

**技术栈**: JWT (jose, HS256) + HTTP-Only Cookie + scrypt 密码哈希

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

// 验证会话令牌
async function verifySessionToken(token: string): Promise<{ username?: string; userId?: string; role?: string }>

// 获取当前会话（所有用户从 users 表验证）
async function getSession(): Promise<SessionUser | null>

// 设置会话 Cookie
async function setSessionCookie(username: string, userId: string, role: UserRole, rememberMe?: boolean): Promise<void>

// 清除会话 Cookie
async function clearSessionCookie(): Promise<void>

// 要求管理员会话（仅 admin 角色）
async function requireAdminSession(): Promise<SessionUser>

// 要求特权用户会话（与 requireAdminSession 等价）
async function requirePrivilegedSession(): Promise<SessionUser>

// 要求已登录用户会话（任意角色）
async function requireUserSession(): Promise<SessionUser>

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

> 💡 **绑定模式**: 已登录用户从个人空间点击"绑定"按钮发起 OAuth 时，启动路由会检测 `sakura-nav-session` 有效并写入 `oauth_bind_user` cookie。回调时检测到该 cookie 则进入绑定模式，将第三方账号绑定到当前登录用户而非创建新用户。支持冲突检测（已绑定到其他用户时返回 `?oauth=conflict`）。

> 💡 **Session 验证**: 使用 JWT 中的 `userId`（而非 `username`）查找用户，确保用户名变更后 session 仍然有效。

支持的 OAuth 供应商：GitHub、微信、企业微信、飞书、钉钉。配置存储在 `app_settings` 表（`oauth_providers` JSON），密钥通过 `server-only` 保护，GET 请求返回掩码值。

### 2. 数据库模块 (`lib/database`)

| 文件 | 职责 |
|:-----|:-----|
| `connection.ts` | 单例模式管理数据库连接，自动启用 WAL 模式和外键约束 |
| `schema.ts` | 创建所有数据表，定义外键关系和索引 |
| `migrations.ts` | 检测表结构变化，自动执行 ALTER TABLE，版本化管理 |
| `seed.ts` | 初始化示例标签、示例网站和默认主题配置 |

### 3. Repository 模式 (`lib/services`)

<details>
<summary><strong>SiteRepository</strong> — 网站数据访问</summary>

```typescript
// 获取分页网站列表（按 owner_id 隔离）
// 搜索匹配字段：名称、描述、标签名、已启用的推荐上下文、备注、待办
function getPaginatedSites(options: {
  ownerId: string;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
}): PaginatedSites

// 获取所有网站（管理员，跨所有用户）
function getAllSitesForAdmin(): Site[]

// 获取单个网站
function getSiteById(id: string): Site | null

// 创建 / 更新 / 删除网站
function createSite(input: {..., ownerId: string}): Site | null
function updateSite(input: {...}): Site | null
function deleteSite(id: string): void

// 仅更新备忘便签字段（轻量更新，避免全量 site 更新）
function updateSiteMemo(id: string, data: { notes?: string; notesAiEnabled?: boolean; todos?: TodoItem[]; todosAiEnabled?: boolean }): void

// 仅更新推荐上下文字段（AI 智能生成时使用，轻量更新）
function updateSiteRecommendContext(id: string, context: string): void

// 重建搜索文本（将可搜索字段合并到 search_text 列）
function recomputeSearchText(siteId: string): void

// 排序
function reorderSitesGlobal(siteIds: string[]): void
function reorderSitesInTag(tagId: string, siteIds: string[]): void

// 在线检测
function getAllSiteUrls(): { id: string; url: string }[]
function getOnlineCheckSites(): SiteOnlineCheckConfig[]
function updateSiteOnlineStatus(siteId: string, isOnline: boolean): void
function updateSitesOnlineStatus(statuses: { id: string; isOnline: boolean }[]): void

// 社交卡片（card_type 非空且非 note 的 sites 记录）
function getSocialCardCount(ownerId?: string): number
function getSocialCardSites(ownerId?: string): Site[]
function deleteAllSocialCardSites(ownerId: string): void
function deleteAllNormalSites(ownerId: string): void

// 笔记卡片（card_type = 'note' 的 sites 记录）
function getNoteCardCount(ownerId?: string): number
function getNoteCardSites(ownerId?: string): Site[]
function deleteAllNoteCardSites(ownerId: string): void
```

</details>

<details>
<summary><strong>TagRepository</strong> — 标签数据访问</summary>

```typescript
function getVisibleTags(ownerId: string): Tag[]
function getTagById(id: string): Tag | null
function getTagCountByOwner(ownerId: string): number
function createTag(input: {..., ownerId: string}): Tag
function updateTag(input: {...}): Tag | null
function deleteTag(id: string): void
function reorderTags(tagIds: string[]): void
function restoreTagSites(tagId: string, siteIds: string[]): void
function getSiteTagsForIds(db: Database, siteIds: string[]): Map<string, SiteTag[]>
```

</details>

<details>
<summary><strong>AppearanceRepository</strong> — 外观数据访问</summary>

```typescript
// 按 ownerId 获取外观配置（管理员用 __admin__，普通用户用自身 userId）
function getAppearances(ownerId: string): Record<ThemeMode, ThemeAppearance>

// 按 ownerId 更新外观配置
function updateAppearances(ownerId: string, appearances: {...}): void

// 获取游客默认主题（从 __admin__ 行读取 is_default 标记）
function getDefaultTheme(): ThemeMode

// 删除指定用户的外观配置（重置时使用）
function deleteUserAppearances(ownerId: string): void

// 全局应用设置（所有用户共享）
function getAppSettings(): AppSettings
function updateAppSettings(settings: {...}): AppSettings
```

</details>

<details>
<summary><strong>AssetRepository</strong> — 资源数据访问</summary>

```typescript
function createAsset(input: {...}): StoredAsset
function getAsset(id: string): StoredAsset | null
function listStoredAssets(): StoredAsset[]
function deleteAsset(id: string): void
```

</details>

<details>
<summary><strong>CardRepository</strong> — 社交卡片数据访问</summary>

```typescript
// 获取所有社交卡片
function getAllCards(): SocialCard[]

// 获取单个卡片
function getCardById(id: string): SocialCard | null

// 创建 / 更新 / 删除卡片
function createCard(input: {...}): SocialCard
function updateCard(input: {...}): SocialCard | null
function deleteCard(id: string): void

// 排序
function reorderCards(cardIds: string[]): void

// 统计
function getCardCount(): number

// 批量删除
function deleteAllCards(): void
```

</details>

<details>
<summary><strong>UserRepository</strong> — 注册用户数据访问（<code>user-repository.ts</code>）</summary>

```typescript
// 密码哈希与验证
function hashPassword(password: string): string
function verifyPassword(password: string, storedHash: string): boolean

// CRUD
function getAllUsers(): User[]
function getUserById(id: string): User | null
function getUserByUsernameWithHash(username: string): (User & { passwordHash: string }) | null
function isUsernameTaken(username: string): boolean
function createUser(username: string, password: string): User
function deleteUser(userId: string): void

// 角色管理
function updateUserRole(userId: string, role: string): void

// 用户资料
function updateUserNickname(userId: string, nickname: string | null): void
function updateUserAvatar(userId: string, avatarAssetId: string | null): void
function updateUserPassword(userId: string, newPassword: string): void

// OAuth 相关
function createOAuthUser(provider: string, displayName?: string | null): User  // 创建随机用户名+密码的 OAuth 用户
function updateUserUsername(userId: string, newUsername: string): boolean       // 一次性用户名修改
function markUserHasPassword(userId: string): void                              // 标记已设置密码
function userHasPassword(userId: string): boolean                               // 检查是否已设置密码

// 数据复制（注册时复制管理员数据到新用户空间：标签、站点、外观配置）
function copyAdminDataToUser(newUserId: string): void
```

</details>

<details>
<summary><strong>OAuthRepository</strong> — OAuth 账号数据访问（<code>oauth-repository.ts</code>）</summary>

```typescript
// 查询
function getOAuthAccount(provider: string, providerAccountId: string): OAuthAccount | null
function getOAuthAccountsByUserId(userId: string): OAuthAccount[]
function getOAuthBindingsByUserId(userId: string): OAuthBindingInfo[]  // 脱敏，前端展示用
function getOAuthAccountCount(userId: string): number

// 绑定/解绑
function createOAuthAccount(input: { userId, provider, providerAccountId, profileData? }): OAuthAccount
function deleteOAuthAccount(userId: string, provider: string): boolean
function deleteOAuthAccountsByUserId(userId: string): void  // 用户注销时调用
```

</details>

### 4. 服务层

| 服务 | 文件 | 职责 |
|:-----|:-----|:-----|
| ConfigService | `config-service.ts` | 重置默认配置、重置用户数据、从 ZIP 增量/覆盖导入配置 |
| DataPortabilityService | `data-portability-service.ts` | 用户数据可移植性：可扩展导出（表白名单+列黑名单，支持全部/仅标签卡片/仅网站卡片）、clean 导入（全部清理/仅网站卡片清理）、HMAC-SHA256 签名校验防篡改 |
| SearchService | `search-service.ts` | 获取搜索建议 |
| OAuthProviders | `oauth-providers.ts` | OAuth 供应商管理：配置读写、授权 URL 构建、Token 交换、用户信息获取（server-only） |

### 5. 撤销系统 (`use-undo-stack.ts`)

撤销系统基于栈结构，支持网站/标签的创建、编辑、删除操作后通过 Ctrl+Z 撤销。

**核心架构**：

| 组件 | 文件 | 职责 |
|:-----|:-----|:-----|
| `useUndoStack` | `hooks/use-undo-stack.ts` | 撤销栈管理（push/pop/clear），返回栈引用 |
| `UndoAction` | `components/admin/types.ts` | 撤销操作类型定义（含 `toastSignature` 去重） |
| `SiteFormState` | `components/admin/types.ts` | 网站/标签表单快照类型，撤销操作的数据载体 |

**撤销触发方式**：
1. **Ctrl+Z 快捷键** — `use-sakura-nav-orchestrator.ts` 监听 `keydown`，调用 `undoStack.pop()` 执行最近的 undo 回调
2. **Toast 撤销按钮** — 操作成功后 Toast 显示「撤销」按钮，点击触发 undo

**撤销操作分类**：

| 操作 | 撤销方式 | 说明 |
|:-----|:---------|:-----|
| 创建网站 | DELETE 新网站 | 恢复全局排序 |
| 编辑网站 | PUT 原始快照 | 恢复图标资源 |
| 删除网站 | POST 重建网站 | 恢复全局排序 + 标签内排序 + 关联 |
| 创建标签 | DELETE 新标签 | — |
| 编辑标签 | PUT 原始快照 | — |
| 删除标签 | POST 重建标签 | 恢复标签排序 + 站点关联 |
| 删除标签+网站 | POST 先标签再网站 | **必须先恢复标签（FK 约束），再恢复网站** |

> ⚠️ **删除标签+网站撤销顺序**：撤销时必须 **先恢复标签，再恢复网站**。因为网站的 `tagIds` 引用标签，SQLite FK 约束要求标签必须先存在。创建网站时需将旧标签 ID 映射为新标签 ID。

**可扩展性约定**：

撤销系统的设计遵循两条统一的扩展规则，适用于任何实体（标签、网站卡片、社交卡片、未来新卡片类型），无需区分。

> 💡 **规则一：字段扩展** — 每种实体都有一个 **表单快照函数**，负责将实体对象映射为撤销可用的完整快照。新增字段时，只需在该实体的快照函数中添加映射，所有撤销逻辑（创建/编辑/删除快照）会通过 `...snap` 展开自动跟随，无需同步其他位置。
>
> | 实体 | 快照函数 | 文件 |
> |:-----|:---------|:-----|
> | 网站/标签 | `siteToFormState()` | `components/admin/types.ts` |
> | 社交卡片 | `cardToForm()`（由 `SOCIAL_CARD_TYPE_META.idField` 驱动） | `hooks/use-social-cards.ts` + `lib/base/types.ts` |
> | 笔记卡片 | `noteCardToForm()`（固定 title + content） | `hooks/use-note-cards.ts` |
> | *未来实体* | *自定义快照函数* | *自定义 hook* |

> 💡 **规则二：类型扩展** — 每种实体都有一个 **类型元数据注册表**，声明该实体的子类型及其字段映射。新增子类型时，只需在注册表中添加一条配置，CRUD 函数和撤销逻辑会由元数据驱动自动适配。
>
> | 实体 | 类型注册表 | 需同步更新的类型定义 |
> |:-----|:----------|:--------------------|
> | 社交卡片 | `SOCIAL_CARD_TYPE_META`（含 `idField`/`hasQrCode`/`isUrl`/`clickAction`） | `SocialCardType` + `SocialCardPayload` |
> | *未来实体* | *自定义类型注册表* | *自定义类型* |
>
> 没有子类型的实体（如网站卡片、标签）无需类型注册表，字段扩展通过规则一即可覆盖。

> 💡 **接入全新实体** — 撤销栈的 `UndoAction` 是 **类型无关的纯接口**（`{ label, undo, toastSignature? }`），不绑定任何数据结构。接入新实体只需：
> 1. 编写 CRUD hook，定义快照函数和（可选的）类型注册表
> 2. 通过 `setMessage(msg, undoAction)` 传入 undo 回调（回调末尾调用 `syncNavigationData()` + `syncAdminBootstrap()` 刷新数据）
> 3. 无需修改 `use-undo-stack.ts`、Ctrl+Z 监听、Toast 撤销按钮等任何基础设施

**延迟资源删除**：编辑/删除操作中使用 `pendingDeleteAssetIds`（React ref）暂存待删除的图标资源 ID，撤销时从中移除（避免误删）。资源在退出编辑模式或页面刷新时统一清理。

### 6. 数据可移植性（`data-portability-service.ts` + `user/data/import/route.ts`）

数据导入/导出系统遵循统一的可扩展约束，适用于任何卡片类型和字段。

> 💡 **导出** — 使用 `SELECT *` 获取所有列 + 黑名单过滤（`PRIVACY_COLUMN_DENYLIST` + `RUNTIME_STATE_COLUMNS`）。新增字段自动导出，无需改动。

> 💡 **clean 模式导入** — 使用 `dynamicInsert()` 动态检测目标表结构，只插入存在的列。新增字段自动导入，无需改动。

> 💡 **增量/覆盖模式导入 · INSERT** — 使用 `dynamicInsert()` 动态检测，新增字段自动导入。

> 💡 **增量/覆盖模式导入 · UPDATE** — 动态构建 `SET` 子句，遍历导入数据的所有字段并与表结构比对。新增字段自动跟随。

> 💡 **增量/覆盖模式导入 · 去重匹配** — 由 `getCardIdentityKey()` 统一驱动：
>
> | card_type | 匹配策略 | identity key 格式 |
> |:----------|:---------|:------------------|
> | `IS NULL`（普通网站） | 归一化 URL | `url:<normalizedUrl>` |
> | 在 `SOCIAL_CARD_TYPE_META` 中（社交卡片） | `meta.idField` 提取值 | `<cardType>:<uniqueId>` |
> | `'note'`（笔记卡片） | 无匹配，总是 INSERT | — |
> | 未知类型（未来新卡片） | 无匹配，总是 INSERT | — |
>
> 新增卡片类型时，在 `SOCIAL_CARD_TYPE_META` 或 `getCardIdentityKey` 中注册身份提取策略即可参与去重。

> 💡 **笔记卡片可扩展性约定** — 笔记卡片（`card_type = 'note'`）的完整生命周期遵循以下约定式扩展点，新增字段或子类型时只需更新对应定义，其余逻辑自动跟随：
>
> | 扩展点 | 文件 | 说明 |
> |:-------|:-----|:-----|
> | 类型定义 `NoteCard` / `NoteCardFormState` | `lib/base/types.ts` + `hooks/use-note-cards.ts` | 新增字段时同步更新两处 |
> | 转换函数 `siteToNoteCard()` | `lib/base/types.ts` | 从 `site.cardData` JSON 解析映射到 `NoteCard` |
> | Repository 层 `getNoteCardCount` / `getNoteCardSites` / `deleteAllNoteCardSites` | `lib/services/site-repository.ts` | 纯 SQL 查询，新增字段无需改动 |
> | API 路由 `/api/cards/note` | `app/api/cards/note/route.ts` | `cardData` JSON 序列化/反序列化 |
> | SSR 标签注入 `getTagsWithSocialCard()` | `app/page.tsx` | 已包含笔记卡片虚拟标签注入，无需重复添加 |
> | 客户端标签注入 `/api/navigation/tags` | `app/api/navigation/tags/route.ts` | 已包含笔记卡片虚拟标签注入，与 SSR 保持一致 |
> | 查看弹窗 checkbox 交互 | `components/dialogs/note-card-view-dialog.tsx` | 正则匹配 `- [ ]` / `- [x]` 切换，关闭弹窗时自动 `syncNavigationData()` |
> | 编辑器 Markdown 自动续行 | `components/sakura-nav/note-card-editor.tsx` | 支持有/无序列表、复选框自动续行 |
| 图片上传 | `app/api/cards/note/upload-image/route.ts` | 剪贴板粘贴图片上传，kind=`note-image`，最大 5MB |
| 文件上传 | `app/api/cards/note/upload-file/route.ts` | 剪贴板粘贴非图片文件，kind=`note-file`，最大 10MB |
| 图片访问（伪装 URL） | `app/api/cards/note/img/[imageId]/route.ts` | `/api/cards/note/img/{id}` 不暴露内部 asset 路径 |
| 文件下载（伪装 URL） | `app/api/cards/note/file/[fileId]/route.ts` | `/api/cards/note/file/{id}` Content-Disposition: attachment |
| 图片灯箱 | `components/dialogs/note-image-lightbox.tsx` | 全屏查看图片，左右切换，键盘导航，点击遮罩关闭 |
| 孤立附件清理 | `app/api/cards/note/route.ts` → `cleanupOrphanNoteImages()` | POST/PUT/DELETE 后异步清理未引用的 `note-image`/`note-file` 资源 |
>
> **关键约定**：社交卡片过滤条件已统一为 `card_type IS NOT NULL AND card_type != 'note'`，新增卡片类型时需同步更新此过滤条件以避免误包含。

> 💡 **card_data asset 引用映射** — `remapCardDataAssets()` 通用扫描 JSON payload 中的 asset 引用并映射。社交卡片使用 `/api/assets/{id}/file` 格式（如 `qrCodeUrl`），笔记卡片使用 `/api/cards/note/img/{id}` 格式（图片）和 `/api/cards/note/file/{id}` 格式（文件），支持一张笔记内多个附件。适用于任何卡片类型的 payload 结构。

> 💡 **外观导入** — 动态构建 `INSERT ... ON CONFLICT DO UPDATE SET`，自动跟随 `theme_appearances` 表的新增列。

> 💡 **清除/重置** — 表级 `DELETE` 操作，不受字段和卡片类型变化影响。

### 7. 自定义 Hooks (`hooks/`)

| Hook | 用途 |
|:-----|:-----|
| `useSakuraNavOrchestrator` | 编排 Hook（Composition Root），整合全部 hooks 调用、状态管理和 effects，为应用级 Context 提供数据 |
| `useTheme` | 主题切换和外观配置 |
| `useSiteList` | 网站列表管理（分页加载、无限滚动） |
| `useAppearance` | 外观配置管理 |
| `useDragSort` | 拖拽排序（标签/网站） |
| `useSearchBar` | 搜索栏状态管理（引擎切换、建议、AI 推荐） |
| `useSearchEngineConfig` | 自定义搜索引擎配置（localStorage 持久化） |
| `useAiRecommend` | AI 智能推荐 |
| `useToastNotify` | 通知提示（配合撤销栈） |
| `useUndoStack` | 操作撤销栈（push/pop/clear，配合 Ctrl+Z 和 Toast） |
| `useConfigActions` | 配置导入/导出/重置操作、AI 书签分析导入 |
| `useSiteTagEditor` | 网站标签编辑器（含创建/编辑/删除的撤销逻辑） |
| `useSiteName` | 站点名称管理 |
| `useOnlineCheck` | 网站在线检测 |
| `useEditorConsole` | 编辑器控制台（批量管理标签和网站） |
| `useTagDelete` | 标签删除（普通标签三选项确认 + 社交标签专用对话框） |
| `useSocialCards` | 社交卡片管理（CRUD、点击行为，列表由 useSiteList 统一管理） |
| `useNoteCards` | 笔记卡片管理（CRUD、查看弹窗 checkbox 交互，编辑/新建支持撤销，查看弹窗直接持久化） |
| `useSwitchUser` | 用户切换（列表持久化、弹窗状态） |
| `useSessionExpired` | 会话失效检测与弹窗管理（SSR 检测、API 401 拦截、切换目标不存在） |

### 8. React 19 特性使用

| 特性 | 使用位置 | 说明 |
|:-----|:---------|:-----|
| `useEffectEvent` | `use-site-list.ts`、`use-appearance.ts` | Effect 内安全引用最新状态 |
| `useTransition` | 页面切换 | 低优先级过渡 |
| React Compiler | `next.config.ts` | `reactCompiler: true`，自动组件记忆化 |

---

## API 接口

### 认证接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/auth/login` | 登录（支持管理员和注册用户） |
| `POST` | `/api/auth/logout` | 登出 |
| `POST` | `/api/auth/register` | 注册新用户 |
| `POST` | `/api/auth/switch` | 已登录用户免密码切换到其他用户 |
| `GET` | `/api/auth/session` | 获取会话状态（含 userId 和 role） |
| `GET` | `/api/auth/oauth-providers` | 获取已启用的 OAuth 供应商列表（公开，不含密钥） |
| `GET` | `/api/auth/oauth/[provider]` | 发起 OAuth 登录（重定向到第三方授权页） |
| `GET` | `/api/auth/oauth/[provider]/callback` | OAuth 回调处理（交换令牌、创建/登录用户） |

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

### 导航接口（公开）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/navigation/sites` | 分页网站列表 |
| `GET` | `/api/navigation/tags` | 可见标签列表 |
| `GET` | `/api/navigation/notes` | 笔记卡片列表（公开） |

<details>
<summary>查询参数与响应示例</summary>

**GET /api/navigation/sites**

| 参数 | 说明 |
|:-----|:-----|
| `scope` | `"all"` 或 `"tag"` |
| `tagId` | 标签ID（scope=tag 时必需） |
| `q` | 搜索关键词 |
| `cursor` | 分页游标 |

```json
{ "items": [Site], "total": 100, "nextCursor": "eyJvZmZzZXQiOjEyfQ==" }
```

**GET /api/navigation/tags**

```json
{ "items": [Tag] }
```

</details>

### 管理接口（需认证）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET / POST` | `/api/sites` | 获取所有 / 创建网站 |
| `PUT / DELETE` | `/api/sites` | 更新 / 删除网站 |
| `POST` | `/api/sites/batch` | 批量创建网站（书签导入） |
| `POST` | `/api/sites/check-online` | 批量在线检测 |
| `POST` | `/api/sites/check-online-single` | 单站点即时在线检测 |
| `PATCH` | `/api/sites/memo` | 更新网站备忘便签（notes / notesAiEnabled / todos / todosAiEnabled） |
| `POST` | `/api/sites/reorder-global` | 全局网站排序 |
| `GET / POST` | `/api/tags` | 获取所有 / 创建标签 |
| `PUT / DELETE` | `/api/tags` | 更新 / 删除标签 |
| `POST` | `/api/tags/reorder` | 标签排序 |
| `POST` | `/api/tags/[tagId]/sites/reorder` | 标签内排序 |
| `PUT` | `/api/tags/[tagId]/sites/restore` | 恢复标签与站点的关联（标签删除撤销） |
| `GET / PUT` | `/api/appearance` | 获取 / 更新外观配置 |
| `GET / PUT` | `/api/settings` | 获取 / 更新应用设置 |
| `GET / PUT` | `/api/floating-buttons` | 获取 / 更新悬浮按钮配置 |

### 管理员接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/admin/bootstrap` | 获取编辑器初始化所需的所有数据 |
| `GET / PUT` | `/api/admin/registration` | 获取/更新注册开关（仅管理员） |
| `GET / PUT / DELETE` | `/api/admin/users` | 用户列表/角色更新/用户删除（仅管理员） |
| `GET / PUT` | `/api/admin/oauth` | 获取/更新 OAuth 供应商配置（仅管理员，GET 返回掩码密钥） |
| `POST` | `/api/admin/oauth/test` | 测试指定 OAuth 供应商连通性（仅管理员） |

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

**GET /api/admin/users**

```json
{ "items": [{ "id": "user-xxx", "username": "alice", "role": "user", "createdAt": "..." }] }
```

**PUT /api/admin/registration**

```json
// 请求
{ "enabled": true }
// 响应
{ "ok": true, "registrationEnabled": true }
```

</details>

> 💡 社交卡片和笔记卡片已合并到 `sites` 数组中（通过 `cardType` 字段区分），不再单独返回。

### 资源接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/assets/wallpaper` | 上传壁纸/Logo/Favicon/图标（FormData，支持 `oldAssetId` 自动清理旧资源） |
| `GET` | `/api/assets/[assetId]/file` | 获取资源文件 |
| `POST` | `/api/assets/cleanup` | 批量清理孤立的 icon 资源（延迟删除，退出编辑模式或页面刷新时调用） |

### 配置接口（管理员全局级，需管理员认证）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/config/export` | 导出全局配置为 ZIP |
| `POST` | `/api/config/import` | 从 ZIP 导入全局配置 |
| `POST` | `/api/config/detect` | 检测上传文件类型（SakuraNav ZIP 或外部文件） |
| `POST` | `/api/config/reset` | 重置全局配置到默认（需密码确认） |

### 用户数据接口（需认证，按用户隔离）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/user/data/export` | 导出当前用户的标签、站点、外观和资源（壁纸+站点图标）为 ZIP（scope: full/data-only/sites-only） |
| `POST` | `/api/user/data/import` | 从 ZIP 导入数据到当前用户空间（支持 clean/incremental/overwrite 三种模式） |
| `POST` | `/api/user/data/reset` | 重置当前用户数据（删除标签、站点、外观配置和资源文件） |
| `POST` | `/api/user/data/clear` | 清除当前用户的标签和站点（保留外观配置和全局设置） |
| `POST` | `/api/user/data/detect` | 检测导入文件类型（SakuraNav ZIP 或外部文件），返回 scope/sitesOnly 字段 |

### 搜索接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/search/suggest?q=keyword` | 获取搜索建议 |

### AI 接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `POST` | `/api/ai/recommend` | AI 智能推荐网站 |
| `POST` | `/api/ai/workflow` | AI 工作流规划（需求 → 有序步骤） |
| `POST` | `/api/ai/analyze-site` | AI 分析网站（支持 scope: basic / full） |
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

> 💡 `_draftAiConfig` 为可选参数，管理员（admin）可通过此字段临时覆盖 AI 配置进行预览调试。非管理员用户忽略此参数，始终使用数据库中的全局配置。

**POST /api/ai/analyze-site**

```json
// 请求（基本信息分析）
{ "url": "https://example.com", "scope": "basic", "_draftAiConfig": { ... } }

// 请求（全部分析：基本信息 + 推荐上下文 + 关联网站）
{ "url": "https://example.com", "siteId": "site-uuid", "scope": "full", "_draftAiConfig": { ... } }

// 响应（basic）
{ "title": "Example Site", "description": "网站描述", "matchedTagIds": ["tag-id"], "recommendedTags": ["新标签"] }

// 响应（full，额外包含推荐上下文和关联网站）
{ "title": "Example Site", "description": "网站描述", "matchedTagIds": ["tag-id"], "recommendedTags": ["新标签"], "recommendContext": "使用场景...", "recommendations": [{ "siteId": "...", "reason": "互补关联", "score": 0.85 }] }
```

**POST /api/ai/check**（支持 `_draftAiConfig` 草稿配置）

```json
// 请求（可选携带草稿配置）
{ "_draftAiConfig": { "aiApiKey": "sk-xxx", "aiBaseUrl": "https://api.example.com/v1", "aiModel": "deepseek-chat" } }

```json
// 响应
{ "ok": true }
```

**POST /api/ai/import-bookmarks**

```json
// 请求
{ "content": "书签文件内容（HTML/Markdown/纯文本）", "filename": "bookmarks.html", "_draftAiConfig": { ... } }

// 响应
{ "items": [{ "name": "网站名称", "url": "https://example.com", "description": "描述", "matchedTagIds": ["tag-id"], "recommendedTags": ["新标签"] }] }
```

</details>

### 社交卡片接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/cards` | 获取所有社交卡片（需认证） |
| `POST` | `/api/cards` | 创建社交卡片（需认证） |
| `PUT` | `/api/cards` | 更新社交卡片（需认证） |
| `DELETE` | `/api/cards?id=xxx` | 删除单张卡片（需认证） |
| `DELETE` | `/api/cards` | 删除全部社交卡片（需认证） |
| `PUT` | `/api/cards/reorder` | 卡片拖拽排序（需认证） |
| `GET` | `/api/cards/[id]` | 获取单张卡片（公开，无需认证） |

<details>
<summary>请求/响应示例</summary>

**POST /api/cards（创建 QQ 卡片）**:

```json
// 请求
{
  "cardType": "qq",
  "label": "QQ",
  "iconUrl": null,
  "iconBgColor": "#12B7F5",
  "payload": {
    "type": "qq",
    "qqNumber": "123456789",
    "qrCodeUrl": "/api/assets/xxx/file"
  }
}

// 响应
{ "item": SocialCard }
```

**PUT /api/cards/reorder（排序）**:

```json
{ "ids": ["card-uuid-1", "card-uuid-2", "card-uuid-3"] }
```

**GET /api/cards/[id]（QQ 卡片详情，公开接口）**:

```json
{ "item": { "id": "card-xxx", "cardType": "qq", "label": "QQ", "payload": { "type": "qq", "qqNumber": "123456789" } } }
```

</details>

### 笔记卡片接口

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/cards/note` | 获取所有笔记卡片（需认证） |
| `POST` | `/api/cards/note` | 创建笔记卡片（需认证） |
| `PUT` | `/api/cards/note` | 更新笔记卡片（需认证） |
| `DELETE` | `/api/cards/note?id=xxx` | 删除单张笔记卡片（需认证） |
| `DELETE` | `/api/cards/note` | 删除全部笔记卡片（需认证） |
| `POST` | `/api/cards/note/upload-image` | 上传笔记图片（需认证，FormData，最大 5MB） |
| `POST` | `/api/cards/note/upload-file` | 上传笔记文件（需认证，FormData，最大 10MB） |
| `GET` | `/api/cards/note/img/[imageId]` | 获取笔记图片（公开，伪装 URL） |
| `GET` | `/api/cards/note/file/[fileId]` | 下载笔记文件（公开，伪装 URL，Content-Disposition: attachment） |
| `GET` | `/api/navigation/notes` | 获取笔记卡片列表（公开） |

<details>
<summary>请求/响应示例</summary>

**POST /api/cards/note（创建笔记卡片）**:

```json
// 请求
{ "title": "学习计划", "content": "## 本周目标\n- [ ] 完成 TypeScript 学习\n- [x] 搭建项目框架" }

// 响应
{ "item": { "id": "site-xxx", "title": "学习计划", "content": "## 本周目标\n- [ ] 完成 TypeScript 学习\n- [x] 搭建项目框架", ... } }
```

> 💡 `title` 为选填，不提供时自动从 content 提取前 20 字符。笔记卡片数据存储在 `sites` 表（`card_type = 'note'`，`card_data = {"title":"","content":"..."}`）。

</details>

### 健康检查

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/health` | Docker HEALTHCHECK 使用 |

### 用户接口（需认证）

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| `GET` | `/api/user/profile` | 获取当前用户资料（管理员从 app_settings 读取昵称/头像） |
| `PUT` | `/api/user/profile` | 更新用户昵称（管理员存入 app_settings） |
| `POST` | `/api/user/avatar` | 上传/更新头像（FormData 文件或 JSON URL，管理员存入 app_settings） |
| `DELETE` | `/api/user/avatar` | 删除头像 |
| `PUT` | `/api/user/password` | 修改密码（OAuth 用户首次设置无需旧密码） |
| `PUT` | `/api/user/username` | 修改用户名（仅一次，OAuth 用户可用） |
| `GET` | `/api/user/oauth-bind` | 获取当前用户 OAuth 绑定列表 |
| `DELETE` | `/api/user/oauth-bind` | 解绑 OAuth 账号（安全检查：最后登录方式不可解绑） |
| `POST` | `/api/user/delete-account` | 注销账号（仅注册用户，删除所有数据并清除会话） |

<details>
<summary>请求/响应示例</summary>

**GET /api/user/profile**

```json
{
  "id": "user-xxx",
  "username": "alice",
  "nickname": "Alice",
  "avatarUrl": "/api/assets/asset-xxx/file",
  "avatarColor": "#6366f1",
  "role": "user",
  "hasPassword": true,
  "usernameChanged": false
}
```

**PUT /api/user/profile**

```json
// 请求
{ "nickname": "新昵称" }
// 响应
{ "id": "user-xxx", "username": "alice", "nickname": "新昵称", "avatarUrl": null, "avatarColor": "#6366f1", "role": "user", "hasPassword": true, "usernameChanged": false }
```

**PUT /api/user/password**

```json
// 请求
{ "oldPassword": "123456", "newPassword": "654321", "confirmPassword": "654321" }
// 响应
{ "ok": true }
```

**POST /api/user/delete-account**

```json
// 响应（成功注销，自动清除会话）
{ "ok": true }
// 管理员调用返回 403
{ "error": "管理员账号不支持注销" }
```

</details>

### 个人空间页面

| 路径 | 说明 |
|:-----|:-----|
| `/profile` | 个人空间页面（查看/编辑资料、上传头像、修改密码、修改用户名、OAuth 绑定/解绑、退出登录、注销账号、切换用户） |

---

## 开发指南

### 本地开发

```bash
# 安装依赖
npm install

# 复制配置文件
cp config.example.yml config.yml

# 启动开发服务器
npm run dev
```

### 代码规范

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

### 添加新功能

#### 前端架构扩展约定

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
>
> 弹窗层内部已按职责拆分为 `SettingsDialogs`、`EditorDialogs`、`AdminDialogs` 三个内聚子组件，新增弹窗时应放入对应的子组件中。

#### 完整开发流程

```
1. src/lib/base/types.ts          → 定义类型
2. src/lib/config/schemas.ts      → 添加 Zod 验证模式
3. src/lib/services/              → 添加数据访问层（Repository）
4. src/app/api/                   → 添加 API 路由
5. src/components/                → 添加 UI 组件
6. src/hooks/                     → 添加自定义 Hook
```

### 数据库迁移

修改表结构时：

```
1. src/lib/database/schema.ts     → 更新表结构定义
2. src/lib/database/migrations.ts → 添加迁移逻辑
3. 相关 Repository                → 更新数据访问层
```

### 构建 & 部署

```bash
# 生产构建并启动
npm run build:start

# 跳过 lint 的快速构建
npm run build:start:skip-lint

# 跳过构建（使用已有产物）
npm run build:start:skip-build
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|:-----|:-----|:---------|
| 数据库锁定 | SQLite WAL 模式并发问题 | 使用 better-sqlite3 同步 API，避免并发写入 |
| 主题闪烁 | 服务端渲染与客户端主题不一致 | 使用 `beforeInteractive` 脚本提前初始化主题 |
| 拖拽卡顿 | 大量元素时性能问题 | 使用虚拟化和延迟更新 |
| AI 功能不可用 | 未配置 AI 模型 | 在「设置 → 站点 → AI 模型」面板中配置 API Key / Base URL / 模型名称 |
| 注册功能不可用 | `registration_enabled` 设置为 false | 在管理设置中开启注册功能 |

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

---

## 许可证

MIT License
