/**
 * @description 数据库种子数据 - 为空数据库填充初始数据（标签、卡片、关联关系、主题外观、搜索引擎配置）
 * 使用 DatabaseAdapter 接口，兼容 SQLite/MySQL/PostgreSQL
 */

import type { DatabaseAdapter } from "./adapter";
import { themeAppearanceDefaults, DEFAULT_SEARCH_ENGINE_CONFIGS } from "@/lib/config/config";

/**
 * 从搜索 URL 中提取域名并生成 favicon.im 官方图标 URL
 * @param searchUrl 搜索 URL（如 https://www.google.com/search?q=%s）
 * @returns favicon 图标 URL，解析失败返回 null
 */
function buildFaviconUrl(searchUrl: string): string | null {
  try {
    // %s 不是合法 URL 字符，先替换为占位符再解析
    const safeUrl = searchUrl.replace("%s", "placeholder");
    const { hostname } = new URL(safeUrl);
    return `https://favicon.im/${hostname}?larger=true&throw-error-on-404=true`;
  } catch {
    return null;
  }
}

/**
 * 填充数据库种子数据（仅在对应表为空时执行）
 * @param adapter 数据库适配器实例
 */
export async function seedDatabase(adapter: DatabaseAdapter): Promise<void> {
  const hasTags = await adapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tags");
  const hasCards = await adapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM cards");
  const hasAppearance = await adapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM theme_appearances");

  if (!hasTags?.count) {
    const seedTags = [
      { id: "tag-89454cdb-9978-4fac-aac8-afe0bc80041a", name: "AI工具", slug: "ai工具", sortOrder: 3, isHidden: 0, logoUrl: null, logoBgColor: null, description: null },
      { id: "tag-53670bb1-588c-4a67-952f-7651a0f5e12b", name: "开发者工具", slug: "开发者工具", sortOrder: 4, isHidden: 0, logoUrl: null, logoBgColor: null, description: null },
      { id: "tag-72d181d1-589f-4d63-a329-f30df772aae4", name: "在线工具", slug: "在线工具", sortOrder: 5, isHidden: 0, logoUrl: null, logoBgColor: null, description: null },
    ];

    await adapter.transaction(async () => {
      for (const tag of seedTags) {
        await adapter.execute(
          "INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id) VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, @logoBgColor, @description, '__admin__')",
          tag
        );
      }
    });
  }

  if (!hasCards?.count) {
    const now = new Date().toISOString();

    const cards = [
      // ── 社交卡片 ──
      {
        id: "site-32aac70f-43d1-449c-bfd4-b49ffb3d71b3",
        name: "GitHub",
        siteUrl: "#",
        siteDescription: null,
        socialHint: "我的项目代码都在这，欢迎 Star",
        iconUrl: null,
        iconBgColor: "#181717",
        siteSkipOnlineCheck: 1,
        cardType: "github",
        cardData: JSON.stringify({ type: "github", url: "https://github.com/QingYu-Su" }),
        globalSortOrder: 0,
        siteRecommendContext: "",
      },
      {
        id: "site-6a068a35-d0fd-46ae-b500-5824836b741c",
        name: "博客",
        siteUrl: "#",
        siteDescription: null,
        socialHint: "欢迎来看看我的技术折腾日记",
        iconUrl: null,
        iconBgColor: "#FF6B35",
        siteSkipOnlineCheck: 1,
        cardType: "blog",
        cardData: JSON.stringify({ type: "blog", url: "https://blog.suqingyu.com/" }),
        globalSortOrder: 1,
        siteRecommendContext: "",
      },
      {
        id: "site-f497952a-607c-4ae0-b0ee-c5e737a1caf8",
        name: "B站",
        siteUrl: "#",
        siteDescription: null,
        socialHint: "二次元相关视频，求关注~",
        iconUrl: null,
        iconBgColor: "#FB7299",
        siteSkipOnlineCheck: 1,
        cardType: "bilibili",
        cardData: JSON.stringify({ type: "bilibili", url: "https://space.bilibili.com/5012299" }),
        globalSortOrder: 2,
        siteRecommendContext: "",
      },
      {
        id: "site-f5c4810e-b1cf-453d-8728-ba2a20d23f5a",
        name: "微信公众号",
        siteUrl: "#",
        siteDescription: null,
        socialHint: "聊点有趣的事，扫码关注~",
        iconUrl: null,
        iconBgColor: "#07C160",
        siteSkipOnlineCheck: 1,
        cardType: "wechat-official",
        // 二维码图片存放在 public/wechat-qrcode.png，seed 时直接引用静态路径
        cardData: JSON.stringify({ type: "wechat-official", accountName: "苏青羽", qrCodeUrl: "/wechat-qrcode.png" }),
        globalSortOrder: 3,
        siteRecommendContext: "",
      },
      // ── 笔记卡片 ──
      {
        id: "site-3bbe4128-d16f-432f-b781-80a12d682d6f",
        name: "🎨 精致界面体验",
        siteUrl: "note://2e3b58f1-3637-4b2f-a6a9-01006253c698",
        siteDescription: null,
        socialHint: null,
        iconUrl: null,
        iconBgColor: "#6366f1",
        siteSkipOnlineCheck: 0,
        cardType: "note",
        cardData: JSON.stringify({
          title: "🎨 精致界面体验",
          content: [
            "## SakuraNav 的精致界面",
            "",
            "SakuraNav 致力于提供优雅、流畅的视觉体验，让导航页不仅是工具，更是一种享受。",
            "",
            "### 🌸 动态背景",
            "- **樱花飘落** — 轻柔的樱花粒子动画，营造浪漫氛围",
            "- **星空模式** — 深邃的星空背景，适合暗色主题",
            "- 支持自定义壁纸上传，搭配毛玻璃效果独立定制",
            "",
            "### 🌗 主题切换",
            "- 明亮模式 / 暗黑模式一键切换",
            "- 自动跟随系统主题偏好",
            "- 自定义壁纸下的高亮/暗色智能适配",
            "",
            "### 📱 响应式设计",
            "- 完美适配桌面端、平板和手机",
            "- 标签切换动画流畅自然",
            "- 移动端操作体验经过精心优化",
          ].join("\n"),
        }),
        globalSortOrder: 4,
        siteRecommendContext: "",
      },
      {
        id: "site-e48d2a86-c275-43ef-a204-13d89fe0ff00",
        name: "🏷️ 灵活的卡片管理",
        siteUrl: "note://d2caa2e0-e1ec-44ae-a956-77f7992bd050",
        siteDescription: null,
        socialHint: null,
        iconUrl: null,
        iconBgColor: "#06b6d4",
        siteSkipOnlineCheck: 0,
        cardType: "note",
        cardData: JSON.stringify({
          title: "🏷️ 灵活的卡片管理",
          content: [
            "## SakuraNav 的卡片管理体系",
            "",
            "SakuraNav 提供三种卡片类型，满足不同场景的信息管理需求。",
            "",
            "### 🌐 网站卡片",
            "- **拖拽排序** — 支持全局排序和标签内排序，自由调整展示顺序",
            "- **多标签关联** — 一个网站可关联多个标签分类",
            "- **在线检测** — 实时检测网站可达性，离线自动标记",
            "- **备忘便签** — 每个网站可附带笔记和 Todo",
            "- **备选 URL** — 主地址不可用时自动切换备用地址",
            "",
            "### 📱 社交卡片",
            "- 支持 12 种主流社交平台",
            "- 独立详情页展示账号信息和二维码",
            "- 一键分享你的社交账号",
            "",
            "### 📝 笔记卡片",
            "- Markdown 编辑与实时预览",
            "- 支持图片和文件上传",
            "- `sakura-site://` 引用协议可同步关联网站的 Todo",
          ].join("\n"),
        }),
        globalSortOrder: 5,
        siteRecommendContext: "",
      },
      {
        id: "site-827da959-0736-4d34-8006-293fdb8ac924",
        name: "🤖 AI 智能驱动",
        siteUrl: "note://fcc6f827-c5bd-4853-9258-53487a703e0e",
        siteDescription: null,
        socialHint: null,
        iconUrl: null,
        iconBgColor: "#8b5cf6",
        siteSkipOnlineCheck: 0,
        cardType: "note",
        cardData: JSON.stringify({
          title: "🤖 AI 智能驱动",
          content: [
            "## SakuraNav 的 AI 能力",
            "",
            "SakuraNav 深度集成了 AI 能力，让导航管理更智能、更高效。",
            "",
            "### 🧠 智能网站分析",
            "- 自动分析网站内容，生成精准描述和关键词",
            "- 支持多语言内容识别",
            "- 一键补充完善网站信息",
            "",
            "### 🔗 智能推荐",
            "- 根据已有网站智能推荐相关站点",
            "- 基于标签关联发现你可能感兴趣的资源",
            "- AI 工作流规划 — 根据需求串联多个网站步骤",
            "",
            "### 📚 书签智能导入",
            "- 支持导入浏览器书签文件",
            "- AI 自动分类和打标签",
            "- 批量创建，一键迁移所有收藏",
            "",
            "### 🔌 MCP 协议支持",
            "- 兼容 Claude Desktop / Cursor / Cline 等主流 AI 客户端",
            "- 通过标准 MCP 协议操作导航站数据",
            "- 让 AI Agent 成为你管理导航的得力助手",
          ].join("\n"),
        }),
        globalSortOrder: 6,
        siteRecommendContext: "",
      },
      {
        id: "site-d139918f-d346-4ffe-9bc9-9bef3fd45ff8",
        name: "🔒 安全与多用户体系",
        siteUrl: "note://e0f452ec-edb4-4238-bd83-2af3506ffc13",
        siteDescription: null,
        socialHint: null,
        iconUrl: null,
        iconBgColor: "#10b981",
        siteSkipOnlineCheck: 0,
        cardType: "note",
        cardData: JSON.stringify({
          title: "🔒 安全与多用户体系",
          content: [
            "## SakuraNav 的安全与多用户",
            "",
            "SakuraNav 从架构层面保障数据安全，同时支持多用户独立使用。",
            "",
            "### 👥 多用户系统",
            "- 每位用户拥有独立的数据空间，互不干扰",
            "- 支持管理员角色，控制注册开关和用户管理",
            "- **OAuth 第三方登录** — GitHub / 微信 / 飞书 / 钉钉",
            "- 首次启动引导页创建管理员，无需手动配置",
            "",
            "### 🔐 安全加固",
            "- **CSRF 防护** — 所有状态变更请求验证来源",
            "- **SSRF 防护** — 服务端请求严格限制目标范围",
            "- **XSS 防护** — 用户输入全面消毒和转义",
            "- **速率限制** — 防止暴力破解和滥用",
            "- **JWT + HttpOnly Cookie** — 安全的会话管理",
            "- **Token 吊销** — 支持主动使已发放的 Token 失效",
            "",
            "### 💾 多数据库支持",
            "- SQLite / MySQL / PostgreSQL 一键切换",
            "- DatabaseAdapter 统一接口，零代码改动切换数据库",
            "- ZIP 导入导出，方便备份和迁移",
          ].join("\n"),
        }),
        globalSortOrder: 7,
        siteRecommendContext: "",
      },
      // ── 网站卡片 ──
      {
        id: "site-460cea18-ea29-48db-865e-8ae5f8a87081",
        name: "DeepSeek",
        siteUrl: "https://www.deepseek.com/",
        siteDescription: "深度求索开发的AI对话助手，支持问答、编程、文件处理等多场景交互。",
        socialHint: null,
        iconUrl: "https://favicon.im/www.deepseek.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        siteSkipOnlineCheck: 0,
        cardType: null,
        cardData: null,
        globalSortOrder: 8,
        siteRecommendContext: "DeepSeek是一款专注于深度思考与推理的AI对话助手，典型使用场景包括复杂问题解析、代码编写与调试、学术研究辅助、长文档总结等。适合程序员、学生、研究人员及日常需要知识问答的用户。核心功能为深度推理对话、文件处理与上下文理解，支持联网搜索与思维链展示，帮助用户高效获取精准答案。",
      },
      {
        id: "site-25f51c64-2677-4198-a748-c8833c7a7b44",
        name: "Notion",
        siteUrl: "https://www.notion.com/zh-cn",
        siteDescription: "一款集笔记、文档、数据库、任务管理于一体的全能协作平台。",
        socialHint: null,
        iconUrl: "https://favicon.im/www.notion.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        siteSkipOnlineCheck: 0,
        cardType: null,
        cardData: null,
        globalSortOrder: 9,
        siteRecommendContext: "",
      },
      {
        id: "site-844375db-55c7-41f6-8209-fbf2ed1886b7",
        name: "ProcessOn",
        siteUrl: "https://www.processon.com/",
        siteDescription: "在线思维导图与流程图协作平台，支持多人实时编辑和多种图表类型创作。",
        socialHint: null,
        iconUrl: "https://favicon.im/www.processon.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        siteSkipOnlineCheck: 0,
        cardType: null,
        cardData: null,
        globalSortOrder: 10,
        siteRecommendContext: "ProcessOn是一款专业的在线绘图与协作工具，主要满足用户绘制思维导图、流程图、UML图、原型图等需求。支持云端保存、团队实时协作编辑、版本历史管理，适合产品经理、开发者、学生及项目团队使用。典型场景包括头脑风暴整理、产品原型设计、项目管理流程梳理、学习笔记可视化等。无需安装客户端，通过浏览器即可高效完成专业级图表创作与分享。",
      },
      {
        id: "site-951f5181-90e6-47c7-a86e-fdf902bf34ac",
        name: "GitHub",
        siteUrl: "https://github.com/",
        siteDescription: "全球最大的代码托管与协作开发平台，支持版本控制、项目管理、CI/CD和开源社区。",
        socialHint: null,
        iconUrl: "https://favicon.im/github.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        siteSkipOnlineCheck: 0,
        cardType: null,
        cardData: null,
        globalSortOrder: 11,
        siteRecommendContext: "GitHub是开发者的核心协作平台，用于托管Git仓库、管理项目代码、进行代码审查、运行CI/CD流水线。典型用户包括软件工程师、开源贡献者、团队开发者。常见场景：克隆仓库、提交PR、管理Issue、使用Actions自动化、部署静态页面。",
      },
    ];

    // 卡片-标签关联
    const cardTags = [
      { cardId: "site-844375db-55c7-41f6-8209-fbf2ed1886b7", tagId: "tag-72d181d1-589f-4d63-a329-f30df772aae4", sortOrder: 0 },
      { cardId: "site-460cea18-ea29-48db-865e-8ae5f8a87081", tagId: "tag-89454cdb-9978-4fac-aac8-afe0bc80041a", sortOrder: 0 },
      { cardId: "site-951f5181-90e6-47c7-a86e-fdf902bf34ac", tagId: "tag-53670bb1-588c-4a67-952f-7651a0f5e12b", sortOrder: 0 },
      { cardId: "site-25f51c64-2677-4198-a748-c8833c7a7b44", tagId: "tag-72d181d1-589f-4d63-a329-f30df772aae4", sortOrder: 1 },
    ];

    await adapter.transaction(async () => {
      for (const card of cards) {
        await adapter.execute(
          `INSERT INTO cards (id, name, site_url, site_description, social_hint, icon_url, icon_bg_color, site_is_pinned, global_sort_order,
            site_skip_online_check, site_online_check_frequency, site_online_check_timeout, site_online_check_match_mode,
            site_online_check_keyword, site_online_check_fail_threshold, site_online_check_fail_count,
            site_access_rules, card_type, card_data, owner_id,
            site_recommend_context, site_ai_relation_enabled, site_allow_linked_by_others, site_related_sites_enabled,
            site_recommend_context_enabled, site_recommend_context_auto_gen,
            site_pending_ai_analysis, site_pending_context_gen, search_text,
            site_notes, site_notes_ai_enabled, site_todos, site_todos_ai_enabled,
            created_at, updated_at)
           VALUES (@id, @name, @siteUrl, @siteDescription, @socialHint, @iconUrl, @iconBgColor, 0, @globalSortOrder,
            @siteSkipOnlineCheck, '1d', 3, 'status', '', 3, 0,
            NULL, @cardType, @cardData, '__admin__',
            @siteRecommendContext, 1, 1, 1,
            1, 1,
            0, 0, '',
            '', 1, '[]', 1,
            @createdAt, @updatedAt)`,
          {
            ...card,
            createdAt: now,
            updatedAt: now,
          }
        );
      }

      for (const ct of cardTags) {
        await adapter.execute(
          "INSERT INTO card_tags (card_id, tag_id, sort_order) VALUES (@cardId, @tagId, @sortOrder)",
          ct
        );
      }
    });
  }

  if (!hasAppearance?.count) {
    // 暗黑模式为默认主题
    await adapter.execute(
      `INSERT INTO theme_appearances (
        owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id,
        font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id,
        card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      ) VALUES (
        '__admin__', @theme, @wallpaperAssetId, @desktopWallpaperAssetId, @mobileWallpaperAssetId,
        @fontPreset, @fontSize, @overlayOpacity, @textColor, NULL, NULL,
        0, @desktopCardFrosted, @mobileCardFrosted, @isDefault
      )`,
      {
        theme: "dark", wallpaperAssetId: null, desktopWallpaperAssetId: null, mobileWallpaperAssetId: null,
        fontPreset: themeAppearanceDefaults.dark.fontPreset, fontSize: themeAppearanceDefaults.dark.fontSize,
        overlayOpacity: themeAppearanceDefaults.dark.overlayOpacity, textColor: themeAppearanceDefaults.dark.textColor,
        desktopCardFrosted: 0, mobileCardFrosted: 0, isDefault: 1,
      }
    );

    // 明亮模式
    await adapter.execute(
      `INSERT INTO theme_appearances (
        owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id,
        font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id,
        card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      ) VALUES (
        '__admin__', @theme, @wallpaperAssetId, @desktopWallpaperAssetId, @mobileWallpaperAssetId,
        @fontPreset, @fontSize, @overlayOpacity, @textColor, NULL, NULL,
        0, @desktopCardFrosted, @mobileCardFrosted, @isDefault
      )`,
      {
        theme: "light", wallpaperAssetId: null, desktopWallpaperAssetId: null, mobileWallpaperAssetId: null,
        fontPreset: themeAppearanceDefaults.light.fontPreset, fontSize: themeAppearanceDefaults.light.fontSize,
        overlayOpacity: themeAppearanceDefaults.light.overlayOpacity, textColor: themeAppearanceDefaults.light.textColor,
        desktopCardFrosted: 100, mobileCardFrosted: 100, isDefault: 0,
      }
    );
  }

  // ── 搜索引擎配置（含官方 favicon 图标） ──
  const hasSearchEngines = await adapter.queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM app_settings WHERE key = 'search_engines'"
  );
  if (!hasSearchEngines?.count) {
    const seedSearchEngines = DEFAULT_SEARCH_ENGINE_CONFIGS.map((engine) => ({
      ...engine,
      iconUrl: buildFaviconUrl(engine.searchUrl),
    }));
    await adapter.execute(
      "INSERT INTO app_settings (key, value) VALUES ('search_engines', @value)",
      { value: JSON.stringify(seedSearchEngines) }
    );
  }
}
