/**
 * @description 服务器配置 - 从 config.yml 加载服务端配置（端口、会话密钥等）
 * 管理员凭据已迁移到数据库 users 表，不再从配置文件读取
 */

import "server-only";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { parse, stringify } from "yaml";
import { randomBytes } from "node:crypto";
import { createLogger } from "@/lib/base/logger";
import { getAppSettings } from "@/lib/services/appearance-repository";

const logger = createLogger("ServerConfig");

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/** 配置文件路径 */
const configPath = join(projectRoot, "config.yml");

/** 默认会话密钥（仅用于首次启动检测和警告） */
const DEFAULT_SECRET_MARKER = "sakura-nav-session-secret-change-me";

/** 会话密钥缓存（从配置文件或环境变量读取后缓存，避免频繁读文件） */
let cachedSessionSecret: string | null = null;

/** 配置缓存 */
let cachedConfig: ReturnType<typeof parse> | null = null;
let configLoaded = false;

/**
 * 生成随机会话密钥
 * @returns 64 字符的十六进制随机字符串
 */
function generateSecret(): string {
  return randomBytes(32).toString("hex");
}

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

/**
 * 获取会话签名密钥
 *
 * 优先级（从高到低）：
 * 1. 环境变量 SESSION_SECRET
 * 2. config.yml 中 server.secret
 * 3. 自动生成并写回 config.yml
 *
 * 自动生成的密钥持久化在 config.yml 中，重启后不会改变。
 * 同一实例导出的数据签名可被同一实例验证（HMAC）。
 */
function resolveSessionSecret(): string {
  // 1. 环境变量最高优先级
  const envSecret = process.env.SESSION_SECRET;
  if (envSecret && envSecret.length >= 16) return envSecret;

  // 2. 从配置文件读取
  const config = getLatestConfig();
  const fileSecret = config?.server?.secret as string | undefined;
  if (fileSecret && fileSecret !== DEFAULT_SECRET_MARKER && fileSecret.length >= 16) {
    cachedSessionSecret = fileSecret;
    return fileSecret;
  }

  // 3. 缓存命中（避免重复写文件）
  if (cachedSessionSecret) return cachedSessionSecret;

  // 4. 自动生成并写回 config.yml
  const newSecret = generateSecret();
  cachedSessionSecret = newSecret;

  try {
    const updatedConfig = { ...config };
    if (!updatedConfig.server) updatedConfig.server = {};
    updatedConfig.server.secret = newSecret;
    const yamlContent = stringify(updatedConfig);
    const dir = dirname(configPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, yamlContent, "utf-8");
    logger.info("已自动生成会话密钥并写入 config.yml");
    console.log("🔐 已自动生成会话密钥并写入 config.yml");
  } catch (error) {
    // 写入失败时仅使用内存中的密钥（重启后会重新生成）
    logger.warning("无法将会话密钥写回 config.yml，密钥仅在本次运行有效", error);
    console.warn("⚠️ 无法将会话密钥写回 config.yml，重启后会重新生成");
  }

  return newSecret;
}

// 服务端配置（通过 getter 每次从文件实时读取，确保修改配置后重启即可生效）
export const serverConfig = {
  get sessionSecret() { return resolveSessionSecret(); },
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
