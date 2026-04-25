/**
 * @description 服务器配置 - 从 config.yml 加载服务端配置（端口等）
 * 管理员凭据已迁移到数据库 users 表，不再从配置文件读取
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

// 服务端配置（通过 getter 每次从文件实时读取，确保修改配置后重启即可生效）
export const serverConfig = {
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
