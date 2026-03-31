/**
 * @description 服务器配置 - 从 config.yml 加载敏感的服务端配置，如管理员凭据和会话密钥
 */

import "server-only";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ServerConfig");

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/** 配置文件路径 */
const configPath = join(projectRoot, "config.yml");

/**
 * 读取并解析 YAML 配置文件
 * @returns 解析后的配置对象
 */
function loadConfig() {
  logger.info("开始加载服务端配置", { path: configPath });
  
  if (!existsSync(configPath)) {
    logger.error("config.yml 文件不存在");
    console.error("❌ config.yml 文件不存在，请创建配置文件");
    process.exit(1);
  }

  try {
    const fileContent = readFileSync(configPath, "utf-8");
    const config = parse(fileContent);
    logger.info("服务端配置加载成功");
    return config;
  } catch (error) {
    logger.error("解析 config.yml 失败", error);
    console.error("❌ 解析 config.yml 失败:", error);
    process.exit(1);
  }
}

// 从 YAML 文件加载管理员配置
const config = loadConfig();

// 验证必需的配置项
if (!config.admin?.username || !config.admin?.password) {
  console.error("❌ config.yml 中缺少 admin.username 或 admin.password");
  process.exit(1);
}

// 服务端配置（从 config.yml 读取敏感信息，其他硬编码）
export const serverConfig = {
  adminUsername: config.admin.username,
  adminPassword: config.admin.password,
  adminPath: "sakura-entry",
  sessionSecret: "sakura-nav-session-secret-change-me",
  rememberDays: 30,
  /** 服务端口，默认 8080 */
  port: config.server?.port ?? 8080,
} as const;
