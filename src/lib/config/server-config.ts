/**
 * @description 服务器配置 - 从 config.yml 加载敏感的服务端配置，如管理员凭据和会话密钥
 * 配置在每次访问时从文件实时读取，确保修改 config.yml 后重启即可生效
 */

import "server-only";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { createLogger } from "@/lib/base/logger";
import { getAppSettings } from "@/lib/services/appearance-repository";

const logger = createLogger("ServerConfig");

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/** 配置文件路径 */
const configPath = join(projectRoot, "config.yml");

/** 配置缓存 */
let cachedConfig: ReturnType<typeof parse> | null = null;
let configLoaded = false;

/**
 * 读取并解析 YAML 配置文件
 * @returns 解析后的配置对象
 */
function loadConfig() {
  if (!existsSync(configPath)) {
    logger.error("config.yml 文件不存在");
    console.error("❌ config.yml 文件不存在，请创建配置文件");
    process.exit(1);
  }

  try {
    const fileContent = readFileSync(configPath, "utf-8");
    const config = parse(fileContent);

    if (!configLoaded) {
      configLoaded = true;
      logger.info("服务端配置加载成功");
    }

    return config;
  } catch (error) {
    logger.error("解析 config.yml 失败", error);
    console.error("❌ 解析 config.yml 失败:", error);
    process.exit(1);
  }
}

/**
 * 获取最新的配置对象（每次调用都从文件读取）
 */
function getLatestConfig() {
  cachedConfig = loadConfig();
  return cachedConfig;
}

// 首次加载时验证必需的配置项
const initialConfig = loadConfig();
if (!initialConfig.admin?.username || !initialConfig.admin?.password) {
  console.error("❌ config.yml 中缺少 admin.username 或 admin.password");
  process.exit(1);
}

// 服务端配置（通过 getter 每次从文件实时读取，确保修改配置后重启即可生效）
// 注意：YAML 对纯数字/纯布尔值会自动推断类型，统一用 String() 转为字符串
export const serverConfig = {
  get adminUsername() { return String(getLatestConfig().admin.username); },
  get adminPassword() { return String(getLatestConfig().admin.password); },

  get sessionSecret() { return "sakura-nav-session-secret-change-me"; },
  get rememberDays() { return 30; },
  /** 服务端口，默认 8080 */
  get port() { return Number(getLatestConfig().server?.port ?? 8080); },
  /** AI 分析配置 — 仅从数据库读取（通过「设置 → 站点」面板配置） */
  get aiApiKey(): string {
    try { return getAppSettings().aiApiKey ?? ""; }
    catch { return ""; }
  },
  get aiBaseUrl(): string {
    try { return getAppSettings().aiBaseUrl ?? ""; }
    catch { return ""; }
  },
  get aiModel(): string {
    try { return getAppSettings().aiModel ?? ""; }
    catch { return ""; }
  },
};
