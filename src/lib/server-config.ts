import "server-only";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

// 配置文件路径
const configPath = join(process.cwd(), "config.yml");

// 读取配置文件
function loadConfig() {
  if (!existsSync(configPath)) {
    console.error("❌ config.yml 文件不存在，请创建配置文件");
    process.exit(1);
  }

  try {
    const fileContent = readFileSync(configPath, "utf-8");
    return parse(fileContent);
  } catch (error) {
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
} as const;
