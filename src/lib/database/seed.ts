/**
 * @description 数据库种子数据 - 为空数据库填充初始数据（标签、网站、关联网站、主题外观、搜索引擎配置）
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
  const hasSites = await adapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM sites");
  const hasAppearance = await adapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM theme_appearances");

  if (!hasTags?.count) {
    const seedTags = [
      { id: "tag-0f9c2a71-f087-4f50-9fd3-6786df63eadd", name: "视频平台", slug: "视频平台", sortOrder: 0, isHidden: 0 },
      { id: "tag-0504bc02-30c4-44ef-b5cb-75fdd972c46b", name: "翻译工具", slug: "翻译工具", sortOrder: 1, isHidden: 0 },
      { id: "tag-66730487-5bb7-4d4c-97de-4bea186141a5", name: "AI工具", slug: "ai工具", sortOrder: 2, isHidden: 0 },
      { id: "tag-c2f82fd5-5241-4d67-b316-eaf70c5dc24c", name: "开源社区", slug: "开源社区", sortOrder: 3, isHidden: 0 },
    ];

    await adapter.transaction(async () => {
      for (const tag of seedTags) {
        await adapter.execute(
          "INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, owner_id) VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, '__admin__')",
          { ...tag, logoUrl: null }
        );
      }
    });
  }

  if (!hasSites?.count) {
    const now = new Date().toISOString();

    const sites = [
      {
        id: "site-b5f3507a-31d0-44bb-9275-b0925762d8fb",
        name: "博客",
        url: "#",
        description: "我的个人博客，用于分享学习笔记和教程",
        iconUrl: null,
        iconBgColor: "#FF6B35",
        skipOnlineCheck: 1,
        cardType: "blog",
        cardData: JSON.stringify({ type: "blog", url: "https://blog.suqingyu.com/" }),
        globalSortOrder: 0,
        recommendContext: "",
      },
      {
        id: "site-e4351165-0769-4ed3-bd75-32e43c3edd77",
        name: "GitHub",
        url: "#",
        description: "我的GitHub主页，用于分享项目与代码",
        iconUrl: null,
        iconBgColor: "#181717",
        skipOnlineCheck: 1,
        cardType: "github",
        cardData: JSON.stringify({ type: "github", url: "https://github.com/QingYu-Su" }),
        globalSortOrder: 1,
        recommendContext: "",
      },
      {
        id: "site-bc04087d-a457-4abd-9674-bf4d94259677",
        name: "B站",
        url: "#",
        description: "我的B站，分享一些有趣的内容",
        iconUrl: null,
        iconBgColor: "#FB7299",
        skipOnlineCheck: 1,
        cardType: "bilibili",
        cardData: JSON.stringify({ type: "bilibili", url: "https://space.bilibili.com/5012299" }),
        globalSortOrder: 2,
        recommendContext: "",
      },
      {
        id: "site-fa617876-825c-4c1c-be6f-283a82a56861",
        name: "微信公众号",
        url: "#",
        description: "我的公众号，用于分享一些有趣的推文",
        iconUrl: null,
        iconBgColor: "#07C160",
        skipOnlineCheck: 1,
        cardType: "wechat-official",
        // 二维码图片存放在 public/wechat-qrcode.png，seed 时直接引用静态路径
        cardData: JSON.stringify({ type: "wechat-official", accountName: "苏青羽", qrCodeUrl: "/wechat-qrcode.png" }),
        globalSortOrder: 3,
        recommendContext: "",
      },
      {
        id: "site-9f192d8f-518f-4823-af2f-5a16b18b1c5b",
        name: "GitHub",
        url: "https://github.com/",
        description: "全球最大的代码托管与协作开发平台，支持版本控制、开源项目管理和社区交流。",
        iconUrl: "https://favicon.im/github.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        skipOnlineCheck: 0,
        cardType: null,
        cardData: null,
        globalSortOrder: 4,
        recommendContext: "典型使用场景包括：个人开发者托管代码仓库、团队协作开发、参与开源项目贡献、代码审查与持续集成。适合程序员、技术团队、开源爱好者等用户群体。核心功能包括Git仓库托管、Pull Request协作、Issue跟踪、Actions自动化、Pages静态网站部署等。",
      },
      {
        id: "site-1a691b50-4e8e-40f0-95da-184f29144ad4",
        name: "DeepSeek",
        url: "https://www.deepseek.com/",
        description: "先进的人工智能模型平台，提供强大的语言理解和生成能力。",
        iconUrl: "https://favicon.im/www.deepseek.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        skipOnlineCheck: 0,
        cardType: null,
        cardData: null,
        globalSortOrder: 5,
        recommendContext: "DeepSeek 是一个专注于人工智能模型研究与应用的平台，核心功能包括文本生成、代码辅助、逻辑推理等。典型使用场景涵盖智能客服、内容创作、代码开发辅助、学术研究等。适合开发者、研究人员、内容创作者及企业用户使用，可实现高效的知识问答、文档处理与创意生成。",
      },
      {
        id: "site-6c240d02-4f8b-4890-9c43-7a72215d94d2",
        name: "哔哩哔哩 (Bilibili)",
        url: "https://www.bilibili.com/",
        description: "中国领先的年轻文化社区和视频平台，以ACG内容起家，现覆盖广泛兴趣领域。",
        iconUrl: "https://favicon.im/www.bilibili.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        skipOnlineCheck: 0,
        cardType: null,
        cardData: null,
        globalSortOrder: 6,
        recommendContext: "典型使用场景包括观看动漫、影视、游戏、知识科普、鬼畜、音乐等各类视频，参与弹幕互动与社区讨论。适合Z世代年轻用户、ACG爱好者、内容创作者和学习者。核心功能为视频上传与分享、直播、弹幕评论系统、专栏文章、商城及游戏联运。",
      },
      {
        id: "site-5113e0a4-edde-4213-a116-99d27d1a4c79",
        name: "有道",
        url: "https://youdao.com/",
        description: "网易旗下综合性互联网服务门户，提供搜索引擎、翻译、词典、云笔记等工具。",
        iconUrl: "https://favicon.im/youdao.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        skipOnlineCheck: 0,
        cardType: null,
        cardData: null,
        globalSortOrder: 7,
        recommendContext: "有道是网易旗下的综合互联网服务品牌，以词典和翻译工具起家，现已扩展至智能搜索、云笔记（有道云笔记）、在线教育（有道精品课）及AI助手等多个领域。典型使用场景包括：学生和职场人士查词翻译、文档协作与知识管理、学术资料搜索。核心功能为语言翻译、全文搜索、笔记同步与AI写作辅助，适合需要一站式工作学习工具的人群。",
      },
      {
        id: "site-3313970d-ef8d-4ba7-9728-03a376e686d3",
        name: "欢迎使用SakuraNav~",
        url: "#",
        description: null,
        iconUrl: null,
        iconBgColor: "#6366f1",
        skipOnlineCheck: 1,
        cardType: "note",
        cardData: JSON.stringify({ title: "欢迎使用SakuraNav~", content: "欢迎使用SakuraNav~" }),
        globalSortOrder: 8,
        recommendContext: "",
      },
    ];

    // 站点-标签关联
    const siteTags = [
      { siteId: "site-5113e0a4-edde-4213-a116-99d27d1a4c79", tagId: "tag-0504bc02-30c4-44ef-b5cb-75fdd972c46b", sortOrder: 0 },
      { siteId: "site-5113e0a4-edde-4213-a116-99d27d1a4c79", tagId: "tag-66730487-5bb7-4d4c-97de-4bea186141a5", sortOrder: 1 },
      { siteId: "site-6c240d02-4f8b-4890-9c43-7a72215d94d2", tagId: "tag-0f9c2a71-f087-4f50-9fd3-6786df63eadd", sortOrder: 0 },
      { siteId: "site-1a691b50-4e8e-40f0-95da-184f29144ad4", tagId: "tag-66730487-5bb7-4d4c-97de-4bea186141a5", sortOrder: 0 },
      { siteId: "site-9f192d8f-518f-4823-af2f-5a16b18b1c5b", tagId: "tag-c2f82fd5-5241-4d67-b316-eaf70c5dc24c", sortOrder: 0 },
    ];

    // 关联网站（双向关联：GitHub ↔ DeepSeek）
    const siteRelations = [
      {
        id: "rel-de18e960-159d-4343-bd65-9b333d163dcc",
        sourceSiteId: "site-9f192d8f-518f-4823-af2f-5a16b18b1c5b",
        targetSiteId: "site-1a691b50-4e8e-40f0-95da-184f29144ad4",
        sortOrder: 0, isEnabled: 1, isLocked: 0,
        source: "ai", reason: "开发者常结合代码托管与AI辅助开发",
      },
      {
        id: "rel-cd94cfde-314a-43ed-8901-c965f84751e4",
        sourceSiteId: "site-1a691b50-4e8e-40f0-95da-184f29144ad4",
        targetSiteId: "site-9f192d8f-518f-4823-af2f-5a16b18b1c5b",
        sortOrder: 0, isEnabled: 1, isLocked: 0,
        source: "ai", reason: "开发者常结合代码托管与AI辅助开发",
      },
    ];

    await adapter.transaction(async () => {
      for (const site of sites) {
        await adapter.execute(
          `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_pinned, global_sort_order,
            skip_online_check, online_check_frequency, online_check_timeout, online_check_match_mode,
            online_check_keyword, online_check_fail_threshold, online_check_fail_count,
            access_rules, card_type, card_data, owner_id,
            recommend_context, ai_relation_enabled, allow_linked_by_others, related_sites_enabled,
            recommend_context_enabled, recommend_context_auto_gen,
            pending_ai_analysis, pending_context_gen, search_text,
            notes, notes_ai_enabled, todos, todos_ai_enabled,
            created_at, updated_at)
           VALUES (@id, @name, @url, @description, @iconUrl, @iconBgColor, 0, @globalSortOrder,
            @skipOnlineCheck, '1d', 3, 'status', '', 3, 0,
            NULL, @cardType, @cardData, '__admin__',
            @recommendContext, 1, 1, 1,
            1, 1,
            0, 0, '',
            '', 1, '[]', 1,
            @createdAt, @updatedAt)`,
          {
            ...site,
            createdAt: now,
            updatedAt: now,
          }
        );
      }

      for (const st of siteTags) {
        await adapter.execute(
          "INSERT INTO site_tags (site_id, tag_id, sort_order) VALUES (@siteId, @tagId, @sortOrder)",
          st
        );
      }

      for (const rel of siteRelations) {
        await adapter.execute(
          `INSERT INTO site_relations (id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at)
           VALUES (@id, @sourceSiteId, @targetSiteId, @sortOrder, @isEnabled, @isLocked, @source, @reason, @createdAt)`,
          { ...rel, createdAt: now }
        );
      }
    });
  }

  if (!hasAppearance?.count) {
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
