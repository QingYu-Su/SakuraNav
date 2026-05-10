# 目录结构

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
│   │       │   ├── cards/           # 全部卡片列表（网站 + 社交 + 笔记）
│   │       │   ├── site-cards/      # 网站卡片列表（仅 card_type 为空）
│   │       │   ├── social-cards/    # 社交卡片列表
│   │       │   ├── note-cards/      # 笔记卡片列表
│   │       │   └── tags/            # 可见标签列表
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
│   │       │   │   ├── attach/      # 笔记附件下载（兼容旧数据，kind='note-attachment'）
│   │       │   │   ├── attachment/  # 笔记附件管理（保留兼容，上传/列表/重命名/删除，最大 100MB）
│   │       │   │   ├── upload-image/  # 笔记图片上传（编辑器内粘贴或 / 指令，最大 10MB）
│   │       │   │   └── upload-file/   # 笔记文件上传（编辑器内粘贴或 / 指令，最大 100MB）
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
│   │       ├── snapshots/           # 快照管理（GET/POST/DELETE/PATCH）
│   │       ├── notifications/       # 通知配置（Webhook 通知渠道 CRUD + 测试）
│   │       │   ├── route.ts         # GET 列表 / POST 创建
│   │       │   ├── test-preview/    # POST 用表单数据直接测试（创建弹窗中使用）
│   │       │   └── [id]/            # 单条操作
│   │       │       ├── route.ts     # PUT 更新 / PATCH 切换启用 / DELETE 删除
│   │       │       └── test/        # POST 发送测试通知
│   │       └── ai/                  # AI 接口
│   │           ├── recommend/       # AI 智能推荐
│   │           ├── workflow/        # AI 工作流规划（根据用户需求串联网站步骤）
│   │           ├── analyze-site/    # AI 网站分析
│   │           ├── check/           # AI 连通性检查
│   │           └── import-bookmarks/ # AI 书签分析
│   │
│   ├── components/                  # React 组件
│   │   ├── sakura-nav/              # 主应用组件（Composition Root 架构）
│   │   ├── admin/                   # 管理面板组件
│   │   ├── auth/                    # 认证相关组件
│   │   ├── dialogs/                 # 对话框组件
│   │   └── ui/                      # UI 基础组件
│   │
│   ├── lib/                         # 工具库
│   │   ├── base/                    # 基础模块（types/api/auth/logger）
│   │   ├── config/                  # 配置模块（server-config/schemas/config）
│   │   ├── database/                # 数据库核心（adapter/dialect/连接/迁移/种子）
│   │   ├── utils/                   # 工具函数
│   │   └── services/                # 服务层（Repository 模式）
│   │
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── use-sakura-nav-orchestrator.ts # 编排 Hook（Composition Root）
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
│   │   ├── use-undo-stack.ts        # 操作撤销栈
│   │   ├── use-editor-console.ts    # 编辑器控制台
│   │   ├── use-social-cards.ts      # 社交卡片管理
│   │   ├── use-switch-user.ts       # 切换用户
│   │   ├── use-session-expired.ts   # 会话失效检测与弹窗管理
│   │   ├── use-tag-delete.ts        # 标签删除
│   │   └── use-snapshots.ts         # 快照管理
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
