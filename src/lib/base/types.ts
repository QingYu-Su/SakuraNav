/**
 * @description 类型定义 - 应用程序中使用的所有 TypeScript 类型定义
 */

/** 主题模式类型 */
export type ThemeMode = "light" | "dark";

/** 用户角色 */
export type UserRole = "admin" | "user";

/** 管理员虚拟用户 ID（config.yml 中配置的管理员） */
export const ADMIN_USER_ID = "__admin__";

/** 搜索引擎 ID 类型 */
export type SearchEngine = string;

/** 搜索引擎配置 */
export type SearchEngineConfig = {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 搜索 URL（%s 替换关键字，如 https://www.baidu.com/s?wd=%s） */
  searchUrl: string;
  /** 图标 URL（null 则使用名称首字母） */
  iconUrl: string | null;
  /** 卡片强调色 */
  accent: string;
};

/** 字体预设键类型 */
export type FontPresetKey = "grotesk" | "serif" | "balanced";

/** 在线检测频率类型 */
export type OnlineCheckFrequency = "5min" | "1h" | "1d";

/** 在线检测频率默认值 */
export const DEFAULT_ONLINE_CHECK_FREQUENCY: OnlineCheckFrequency = "1d";

/** 在线判定模式：HTTP 状态码 或 关键词匹配 */
export type OnlineCheckMatchMode = "status" | "keyword";

/** 在线检测默认配置 */
export const DEFAULT_ONLINE_CHECK_TIMEOUT = 3;
export const DEFAULT_ONLINE_CHECK_MATCH_MODE: OnlineCheckMatchMode = "status";
export const DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD = 3;

/** 标签类型 */
export type Tag = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isHidden: boolean;
  logoUrl: string | null;
  logoBgColor: string | null;
  siteCount: number;
  description: string | null;
};

export type SiteTag = {
  id: string;
  name: string;
  slug: string;
  isHidden: boolean;
  sortOrder: number;
};

/** 关联网站条目（Site 类型中使用，包含展示信息） */
export type RelatedSiteItem = {
  /** 目标网站 ID */
  siteId: string;
  /** 目标网站名称 */
  siteName: string;
  /** 目标网站图标 */
  siteIconUrl: string | null;
  /** 目标网站 URL */
  siteUrl: string;
  /** 是否启用关联 */
  enabled: boolean;
  /** 是否锁定（锁定后 AI 不可修改） */
  locked: boolean;
  /** 排序 */
  sortOrder: number;
};

export type Site = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  iconUrl: string | null;
  iconBgColor: string | null;
  isOnline: boolean | null;
  skipOnlineCheck: boolean;
  /** 在线检测频率（仅 skipOnlineCheck=false 时有效） */
  onlineCheckFrequency: OnlineCheckFrequency;
  /** 在线检测超时时间（秒），默认 3 */
  onlineCheckTimeout: number;
  /** 在线判定模式：HTTP 状态码 或 关键词匹配 */
  onlineCheckMatchMode: OnlineCheckMatchMode;
  /** 在线判定关键词（仅 matchMode=keyword 时有效） */
  onlineCheckKeyword: string;
  /** 连续失败多少次后判定为离线，默认 3 */
  onlineCheckFailThreshold: number;
  /** 上次在线检测时间（ISO 8601），null 表示从未检测 */
  onlineCheckLastRun: string | null;
  /** 连续失败计数 */
  onlineCheckFailCount: number;
  /** 访问规则配置（null=未配置，使用主 URL） */
  accessRules: AccessRules | null;
  isPinned: boolean;
  globalSortOrder: number;
  /** 卡片类型：null 为普通网站，非 null 为社交卡片 */
  cardType: SocialCardType | null;
  /** 卡片载荷 JSON 字符串（仅 cardType 非 null 时有值） */
  cardData: string | null;
  /** 推荐上下文：AI 读取但不在卡片描述中显示 */
  recommendContext: string;
  /** 推荐上下文开关（关闭时配置仍保留但不生效） */
  recommendContextEnabled?: boolean;
  /** 是否开启 AI 智能关联 */
  aiRelationEnabled: boolean;
  /** 是否允许被其他网站关联 */
  allowLinkedByOthers: boolean;
  /** 关联的网站列表 */
  relatedSites: RelatedSiteItem[];
  /** 关联网站总开关（关闭时右键菜单不显示，配置仍保留） */
  relatedSitesEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  tags: SiteTag[];
};

export type ThemeAppearance = {
  theme: ThemeMode;
  desktopWallpaperAssetId: string | null;
  desktopWallpaperUrl: string | null;
  mobileWallpaperAssetId: string | null;
  mobileWallpaperUrl: string | null;
  fontPreset: FontPresetKey;
  fontSize: number;
  overlayOpacity: number;
  textColor: string;
  logoAssetId: string | null;
  logoUrl: string | null;
  faviconAssetId: string | null;
  faviconUrl: string | null;
  /** 桌面端磨砂强度 (0-100, 0=完全透明, 100=最大磨砂) */
  desktopCardFrosted: number;
  /** 移动端磨砂强度 (0-100, 0=完全透明, 100=最大磨砂) */
  mobileCardFrosted: number;
  isDefault: boolean;
};

export type AppSettings = {
  lightLogoAssetId: string | null;
  lightLogoUrl: string | null;
  darkLogoAssetId: string | null;
  darkLogoUrl: string | null;
  /** 全局 Favicon 资产 ID（所有用户共享） */
  faviconAssetId: string | null;
  /** 全局 Favicon URL */
  faviconUrl: string | null;
  siteName: string | null;
  onlineCheckEnabled: boolean;
  onlineCheckTime: number;
  onlineCheckLastRun: string | null;
  /** 社交卡片标签的自定义描述，null 则显示站点数量 */
  socialTagDescription: string | null;
  /** 注册功能是否开启 */
  registrationEnabled: boolean;
  /** AI API 密钥（GET 时返回掩码，仅 PUT 时接受明文） */
  aiApiKey: string;
  /** AI API 密钥是否为掩码（客户端可据此判断是否需要重新输入） */
  aiApiKeyMasked: boolean;
  /** AI API 基础地址 */
  aiBaseUrl: string;
  /** AI 模型名称 */
  aiModel: string;
};

export type SessionUser = {
  username: string;
  /** 用户 ID：管理员为 '__admin__'，注册用户为 'user-xxx' */
  userId: string;
  role: UserRole;
  isAuthenticated: boolean;
  /** 用户昵称，为空时显示用户名 */
  nickname: string | null;
  /** 头像 URL */
  avatarUrl: string | null;
  /** 默认头像背景颜色 */
  avatarColor: string | null;
};

/** 注册用户（公开信息，不含密码） */
export type User = {
  id: string;
  username: string;
  role: UserRole;
  /** 用户昵称，为空时显示用户名 */
  nickname: string | null;
  /** 头像资源 ID */
  avatarAssetId: string | null;
  /** 默认头像背景颜色（十六进制） */
  avatarColor: string | null;
  createdAt: string;
};

export type PaginatedSites = {
  items: Site[];
  nextCursor: string | null;
  total: number;
};

export type AdminBootstrap = {
  tags: Tag[];
  sites: Site[];
  appearances: Record<ThemeMode, ThemeAppearance>;
  settings: AppSettings;
};

export type StoredAsset = {
  id: string;
  kind: string;
  filePath: string;
  mimeType: string;
  createdAt: string;
};

/** 社交卡片类型 */
export type SocialCardType =
  | "qq" | "wechat" | "email" | "bilibili" | "github" | "blog"
  | "wechat-official" | "telegram" | "xiaohongshu" | "douyin" | "qq-group" | "enterprise-wechat";

/** 社交卡片载荷 */
export type SocialCardPayload =
  | { type: "qq"; qqNumber: string; qrCodeUrl?: string }
  | { type: "wechat"; wechatId: string; qrCodeUrl?: string }
  | { type: "email"; email: string }
  | { type: "bilibili"; url: string }
  | { type: "github"; url: string }
  | { type: "blog"; url: string }
  | { type: "wechat-official"; accountName: string; qrCodeUrl?: string }
  | { type: "telegram"; url: string }
  | { type: "xiaohongshu"; xhsId: string; qrCodeUrl?: string }
  | { type: "douyin"; douyinId: string; qrCodeUrl?: string }
  | { type: "qq-group"; groupNumber: string; qrCodeUrl?: string }
  | { type: "enterprise-wechat"; ewcId: string; qrCodeUrl?: string };

/** 社交卡片 */
export type SocialCard = {
  id: string;
  cardType: SocialCardType;
  label: string;
  iconUrl: string | null;
  iconBgColor: string | null;
  payload: SocialCardPayload;
  /** 自定义提示文字，为空时卡片上不显示 */
  hint: string | null;
  globalSortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** 虚拟"社交卡片"标签 ID */
export const SOCIAL_TAG_ID = "__social_cards__";

/** 判断 Site 是否为社交卡片 */
export function isSocialCardSite(site: Site): boolean {
  return site.cardType != null;
}

/** 从 Site 解析社交卡片载荷 */
export function parseSocialPayload(site: Site): SocialCardPayload | null {
  if (!site.cardData) return null;
  return JSON.parse(site.cardData) as SocialCardPayload;
}

/** 将社交卡片站点转为 SocialCard 对象（用于兼容现有组件） */
export function siteToSocialCard(site: Site): SocialCard | null {
  if (!site.cardType) return null;
  const payload = parseSocialPayload(site);
  if (!payload) return null;
  return {
    id: site.id,
    cardType: site.cardType,
    label: site.name,
    iconUrl: site.iconUrl,
    iconBgColor: site.iconBgColor,
    payload,
    hint: site.description || null,
    globalSortOrder: site.globalSortOrder,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

/** 悬浮按钮配置项 */
export type FloatingButtonItem = {
  /** 按钮唯一标识 */
  id: string;
  /** 显示名称 */
  label: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否可编辑（如反馈链接可自定义 URL） */
  editable: boolean;
  /** 可编辑项的自定义数据 */
  customData?: Record<string, string>;
};

/** 悬浮按钮默认反馈 URL */
export const DEFAULT_FEEDBACK_URL = "https://github.com/QingYu-Su/SakuraNav/issues";

/** 悬浮按钮默认配置 */
export function getDefaultFloatingButtons(): FloatingButtonItem[] {
  return [
    { id: "scroll-top", label: "回到顶部", enabled: true, editable: false },
    { id: "quick-search", label: "快速搜索", enabled: true, editable: false },
    { id: "feedback", label: "反馈问题", enabled: true, editable: true, customData: { url: DEFAULT_FEEDBACK_URL } },
  ];
}

/** 悬浮按钮配置集合 */
export type FloatingButtonsConfig = {
  buttons: FloatingButtonItem[];
};

/** 导出 ZIP 的清单签名标识 */
export const SAKURA_MANIFEST_KEY = "__sakuranav__";

/** 导出 ZIP 中的清单文件结构 */
export type SakuraManifest = {
  /** 固定签名标识 */
  signature: typeof SAKURA_MANIFEST_KEY;
  /** 导出版本号 */
  version: number;
  /** 导出时间（ISO 8601） */
  exportedAt: string;
};

/** 配置导入模式 */
export type ImportMode = "clean" | "incremental" | "overwrite";

/** AI SDK 类型：决定后端使用哪个 Vercel AI SDK provider */
export type AiSdkType = "openai" | "anthropic" | "google";

/** AI 模型供应商 */
export type AiProvider = {
  /** 供应商名称 */
  label: string;
  /** API Base URL */
  baseUrl: string;
  /** 该供应商下可选的具体模型列表 */
  models: string[];
  /** SDK 类型，决定使用哪个 AI SDK provider */
  sdkType: AiSdkType;
};

/** AI 供应商预设列表 */
export const AI_PROVIDERS: AiProvider[] = [
  {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    sdkType: "openai",
  },
  {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-5.5", "gpt-5.4", "gpt-5.3", "gpt-5", "gpt-4.1", "gpt-4.1-mini", "o4-mini", "o3"],
    sdkType: "openai",
  },
  {
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-opus-4-7-20250416", "claude-sonnet-4-5-20250514", "claude-opus-4-20250514", "claude-sonnet-4-20250514"],
    sdkType: "anthropic",
  },
  {
    label: "Google (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
    sdkType: "google",
  },
  {
    label: "GLM (智谱)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-5.1", "glm-5", "glm-5-turbo", "glm-4.7", "glm-4.7-flashx", "glm-4.6", "glm-4.5"],
    sdkType: "openai",
  },
  {
    label: "Kimi (月之暗面)",
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["kimi-k2.6", "kimi-k2.5", "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"],
    sdkType: "openai",
  },
  {
    label: "Qwen (通义千问)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen3.6-max-preview", "qwen3.6-plus", "qwen3.6-flash", "qwen3-max", "qwen-plus", "qwen-turbo", "qwq-plus"],
    sdkType: "openai",
  },
  {
    label: "Doubao (豆包)",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    models: ["doubao-1-5-pro-32k-250115", "doubao-1-5-lite-32k-250115", "doubao-1-5-lite-4k-250115"],
    sdkType: "openai",
  },
];

/** AI 预设模型自定义标识 */
export const AI_CUSTOM_PROVIDER_KEY = "__custom__";

/** AI 默认供应商和模型（DeepSeek），当数据库无配置时使用 */
export const AI_DEFAULT_PROVIDER = AI_PROVIDERS[0];
export const AI_DEFAULT_MODEL = AI_DEFAULT_PROVIDER.models[0];

/** AI 书签分析结果中的单个条目 */
export type BookmarkAnalysisItem = {
  /** 网站名称 */
  name: string;
  /** 网站 URL */
  url: string;
  /** AI 推荐的描述 */
  description: string;
  /** 匹配到的已有标签 ID */
  matchedTagIds: string[];
  /** AI 推荐的新标签名 */
  recommendedTags: string[];
};

/** AI 书签分析请求结果 */
export type BookmarkAnalysisResult = {
  items: BookmarkAnalysisItem[];
};

/** 导入预检结果：SakuraNav 配置 or 外部文件 */
export type ImportDetectResult =
  | { type: "sakuranav"; filename: string; scope?: string }
  | { type: "external"; filename: string; content: string };

/** 书签导入列表中的编辑项 */
export type BookmarkImportItem = {
  /** 临时唯一标识 */
  uid: string;
  name: string;
  url: string;
  description: string;
  iconUrl: string;
  iconBgColor: string;
  skipOnlineCheck: boolean;
  tagIds: string[];
  /** AI 推荐的新标签（尚未创建） */
  newTags: string[];
  /** 重复提示：如果该站点可能与已有的某个站点重复，给出已有站点的名称和 URL */
  duplicateHint: string | null;
};

/** OAuth 第三方登录供应商类型 */
export type OAuthProvider = "github" | "wechat" | "wecom" | "feishu" | "dingtalk";

/** OAuth 供应商元数据（前端展示用） */
export type OAuthProviderMeta = {
  key: OAuthProvider;
  label: string;
  /** 供应商主色 */
  color: string;
  /** 是否需要在第三方平台配置回调 URL */
  needsCallbackUrl: boolean;
};

/** 所有支持的 OAuth 供应商元数据列表 */
export const OAUTH_PROVIDERS: OAuthProviderMeta[] = [
  { key: "github", label: "GitHub", color: "#181717", needsCallbackUrl: true },
  { key: "wechat", label: "微信", color: "#07C160", needsCallbackUrl: true },
  { key: "wecom", label: "企业微信", color: "#2672FF", needsCallbackUrl: true },
  { key: "feishu", label: "飞书", color: "#3370FF", needsCallbackUrl: true },
  { key: "dingtalk", label: "钉钉", color: "#0082EF", needsCallbackUrl: true },
];

/** OAuth 供应商配置（存储在 app_settings 中） */
export type OAuthProviderConfig = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  /** 以下为供应商特有字段 */
  appId?: string;
  appSecret?: string;
  corpId?: string;
  agentId?: string;
  appKey?: string;
  secret?: string;
};

/** OAuth 账号记录 */
export type OAuthAccount = {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  profileData: string | null;
  createdAt: string;
  updatedAt: string;
};

/** OAuth 账号绑定信息（前端展示用，脱敏） */
export type OAuthBindingInfo = {
  provider: OAuthProvider;
  displayName: string | null;
  avatarUrl: string | null;
  boundAt: string;
};

/** 登录页可用的 OAuth 供应商列表（公开接口，不含密钥） */
export type PublicOAuthProvider = {
  key: OAuthProvider;
  label: string;
  color: string;
};

/** 访问规则模式 */
export type AccessRuleMode = "auto" | "conditional";

/** 条件类型：时间段 */
export type TimeCondition = {
  type: "schedule";
  /** 星期几 (1=周一, 7=周日, 空=每天)，如 [1,2,3,4,5] 表示工作日 */
  weekDays: number[];
  /** 开始小时 (0-23) */
  startHour: number;
  /** 结束小时 (0-23) */
  endHour: number;
  /** 开始日期 (YYYY-MM-DD, null=不限) */
  startDate: string | null;
  /** 结束日期 (YYYY-MM-DD, null=不限) */
  endDate: string | null;
};

/** 条件类型：访问设备 */
export type DeviceCondition = {
  type: "device";
  device: "desktop" | "mobile";
};

/** 访问条件联合类型 */
export type AccessCondition = TimeCondition | DeviceCondition;

/** 备选 URL 条目 */
export type AlternateUrl = {
  /** 唯一标识 */
  id: string;
  /** URL */
  url: string;
  /** 标签（如"国内镜像"、"备用站点"） */
  label: string;
  /** 是否启用 */
  enabled: boolean;
  /** 在线状态（null=未检查） */
  isOnline: boolean | null;
  /** 最后检查时间（ISO 8601） */
  lastCheckTime: string | null;
  /** 延迟 ms */
  latency: number | null;
  /** 条件规则（仅条件模式使用，null=无条件） */
  condition: AccessCondition | null;
};

/** 访问规则配置 */
export type AccessRules = {
  /** 模式 */
  mode: AccessRuleMode;
  /** 自动模式配置 */
  autoConfig: {
    /** 主 URL 恢复在线后是否自动切回 */
    revertOnRecovery: boolean;
  };
  /** 备选 URL 列表（顺序即优先级） */
  urls: AlternateUrl[];
  /** 总开关：关闭时保留 URL 配置但不生效（不自动切换、不显示右键菜单） */
  enabled?: boolean;
};

/** 社交卡片类型元数据 */
export const SOCIAL_CARD_TYPE_META: Record<
  SocialCardType,
  { label: string; color: string; description: string }
> = {
  qq: { label: "QQ", color: "#12B7F5", description: "添加 QQ 联系方式" },
  wechat: { label: "微信", color: "#07C160", description: "添加微信联系方式" },
  email: { label: "邮箱", color: "#EA4335", description: "添加邮箱联系方式" },
  bilibili: { label: "B站", color: "#FB7299", description: "添加 B站 个人空间" },
  github: { label: "GitHub", color: "#181717", description: "添加 GitHub 个人主页" },
  blog: { label: "博客", color: "#FF6B35", description: "添加个人博客地址" },
  "wechat-official": { label: "微信公众号", color: "#07C160", description: "添加公众号名称和二维码" },
  telegram: { label: "Telegram频道", color: "#26A5E4", description: "添加 Telegram 频道链接" },
  xiaohongshu: { label: "小红书", color: "#FE2C55", description: "添加小红书号和二维码" },
  douyin: { label: "抖音", color: "#010000", description: "添加抖音号和二维码" },
  "qq-group": { label: "QQ群", color: "#12B7F5", description: "添加 QQ 群号和二维码" },
  "enterprise-wechat": { label: "企业微信", color: "#2672FF", description: "添加企业微信联系方式" },
};


