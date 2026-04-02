/**
 * @description 日志系统 - 统一的日志记录工具，支持多级别日志、文件输出和终端显示
 */

import fs from "node:fs";
import path from "node:path";

/** 日志级别类型 */
type LogLevel = "info" | "warning" | "error";

/** 日志级别配置 */
const LOG_LEVELS: Record<LogLevel, { priority: number; label: string; color: string }> = {
  info: { priority: 0, label: "INFO", color: "\x1b[36m" },     // 青色
  warning: { priority: 1, label: "WARN", color: "\x1b[33m" },  // 黄色
  error: { priority: 2, label: "ERROR", color: "\x1b[31m" },   // 红色
};

/** 检测是否处于 Next.js 构建阶段 */
const isBuildPhase = typeof process !== "undefined" &&
  process.env.NEXT_PHASE?.startsWith("phase-build");

/** 日志配置 */
const LOG_CONFIG = {
  /** 日志目录路径 */
  logDir: path.join(process.env.PROJECT_ROOT ?? process.cwd(), "logs"),
  /** 是否在终端显示日志（构建阶段自动禁用） */
  consoleOutput: !isBuildPhase,
  /** 是否写入文件（构建阶段自动禁用） */
  fileOutput: !isBuildPhase,
  /** 最低日志级别 */
  minLevel: "info" as LogLevel,
  /** 日志文件保留天数 */
  retentionDays: 30,
};

/** 终端颜色重置码 */
const RESET_COLOR = "\x1b[0m";

/**
 * 获取当前时间戳字符串
 * @returns 格式化的时间字符串
 */
function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * 获取当前日期字符串（用于日志文件名）
 * @returns 格式化的日期字符串 YYYY-MM-DD
 */
function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 确保日志目录存在
 */
function ensureLogDir(): void {
  if (!fs.existsSync(LOG_CONFIG.logDir)) {
    fs.mkdirSync(LOG_CONFIG.logDir, { recursive: true });
  }
}

/**
 * 获取当前日志文件路径
 * @returns 日志文件路径
 */
function getLogFilePath(): string {
  ensureLogDir();
  return path.join(LOG_CONFIG.logDir, `sakuranav-${getCurrentDate()}.log`);
}

/**
 * 清理过期日志文件
 */
function cleanOldLogs(): void {
  try {
    ensureLogDir();
    const files = fs.readdirSync(LOG_CONFIG.logDir);
    const now = new Date();
    const retentionMs = LOG_CONFIG.retentionDays * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      if (!file.startsWith("sakuranav-") || !file.endsWith(".log")) continue;
      
      const filePath = path.join(LOG_CONFIG.logDir, file);
      const stat = fs.statSync(filePath);
      const fileAge = now.getTime() - stat.mtime.getTime();
      
      if (fileAge > retentionMs) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {
    // 清理失败不影响日志记录
  }
}

/**
 * 写入日志到文件
 * @param message 日志消息
 */
function writeToFile(message: string): void {
  try {
    const logPath = getLogFilePath();
    fs.appendFileSync(logPath, message + "\n", "utf-8");
  } catch {
    // 文件写入失败不影响程序运行
  }
}

/**
 * 格式化日志消息
 * @param level 日志级别
 * @param module 模块名称
 * @param message 日志消息
 * @param data 附加数据
 * @returns 格式化后的日志消息
 */
function formatMessage(
  level: LogLevel,
  module: string,
  message: string,
  data?: unknown
): string {
  const timestamp = getTimestamp();
  const levelInfo = LOG_LEVELS[level];
  let formatted = `[${timestamp}] [${levelInfo.label}] [${module}] ${message}`;
  
  if (data !== undefined) {
    if (data instanceof Error) {
      formatted += ` | Error: ${data.message}`;
      if (data.stack) {
        formatted += `\nStack: ${data.stack}`;
      }
    } else if (typeof data === "object") {
      try {
        formatted += ` | Data: ${JSON.stringify(data)}`;
      } catch {
        formatted += ` | Data: [无法序列化]`;
      }
    } else {
      formatted += ` | Data: ${String(data)}`;
    }
  }
  
  return formatted;
}

/**
 * 核心日志函数
 * @param level 日志级别
 * @param module 模块名称
 * @param message 日志消息
 * @param data 附加数据
 */
function log(level: LogLevel, module: string, message: string, data?: unknown): void {
  // 检查日志级别是否满足最低要求
  if (LOG_LEVELS[level].priority < LOG_LEVELS[LOG_CONFIG.minLevel].priority) {
    return;
  }
  
  const formatted = formatMessage(level, module, message, data);
  const levelInfo = LOG_LEVELS[level];
  
  // 输出到终端
  if (LOG_CONFIG.consoleOutput) {
    const consoleFn = level === "error" ? console.error : level === "warning" ? console.warn : console.log;
    consoleFn(`${levelInfo.color}${formatted}${RESET_COLOR}`);
  }
  
  // 写入文件
  if (LOG_CONFIG.fileOutput) {
    writeToFile(formatted);
  }
}

/**
 * 记录 INFO 级别日志
 * @param module 模块名称
 * @param message 日志消息
 * @param data 附加数据（可选）
 */
export function logInfo(module: string, message: string, data?: unknown): void {
  log("info", module, message, data);
}

/**
 * 记录 WARNING 级别日志
 * @param module 模块名称
 * @param message 日志消息
 * @param data 附加数据（可选）
 */
export function logWarning(module: string, message: string, data?: unknown): void {
  log("warning", module, message, data);
}

/**
 * 记录 ERROR 级别日志
 * @param module 模块名称
 * @param message 日志消息
 * @param data 附加数据（可选）
 */
export function logError(module: string, message: string, data?: unknown): void {
  log("error", module, message, data);
}

/**
 * 创建模块专用日志记录器
 * @param moduleName 模块名称
 * @returns 模块专用日志记录器对象
 */
export function createLogger(moduleName: string) {
  return {
    info: (message: string, data?: unknown) => logInfo(moduleName, message, data),
    warning: (message: string, data?: unknown) => logWarning(moduleName, message, data),
    error: (message: string, data?: unknown) => logError(moduleName, message, data),
  };
}

// 启动时清理过期日志（构建阶段跳过）
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test" && !isBuildPhase) {
  cleanOldLogs();
}

// 导出日志配置（用于测试或配置修改）
export const loggerConfig = LOG_CONFIG;
